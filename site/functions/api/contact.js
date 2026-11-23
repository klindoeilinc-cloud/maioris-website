/**
 * MAIORIS.NET — réception du formulaire de qualification (Cloudflare Pages Function).
 * POST /api/contact  →  envoie la demande par e-mail via l'API Resend,
 * puis un e-mail de suite au visiteur avec un lien de réservation (un échec de cet envoi n'annule pas la demande).
 *
 * Variables d'environnement à définir dans Cloudflare Pages :
 *   RESEND_API_KEY   clé API Resend (secret)
 *   CONTACT_TO       adresse qui reçoit les demandes (ex. hello@maioris.net)
 *   CONTACT_FROM     expéditeur vérifié dans Resend (ex. "MAIORIS <site@maioris.net>")
 * Optionnel :
 *   RATE_KV          espace KV lié, pour limiter à 5 envois par heure et par adresse IP
 */
import { buildPdf, toBase64, pdfName } from "../_lib/pdf.js";

const MAX = { organisation: 200, role: 40, sector: 40, country: 80, context: 4000, support: 40, budget: 40, name: 120, email: 200, phone: 40, lang: 2 };
const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const clean = (v, max) => String(Array.isArray(v) ? v.join(", ") : v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const BOOKING = "https://cal.com/maioris";
const CONFIRM = {
  fr: {
    subject: "Votre demande à MAIORIS est bien reçue",
    html: (n) => `<p>Bonjour ${esc(n)},</p><p>Nous avons bien reçu votre demande et nous la lisons personnellement. Nous vous répondons par e-mail pour proposer un premier échange.</p><p>Si vous préférez ne pas attendre, vous pouvez réserver directement un échange de 30 minutes :<br><a href="${BOOKING}">Réserver un échange</a></p><p>Vous pouvez aussi répondre à ce message pour compléter votre demande.</p><p>MAIORIS Group<br>Abidjan, Côte d'Ivoire</p>`,
    text: (n) => `Bonjour ${n},\n\nNous avons bien reçu votre demande et nous la lisons personnellement. Nous vous répondons par e-mail pour proposer un premier échange.\n\nSi vous préférez ne pas attendre, vous pouvez réserver directement un échange de 30 minutes : ${BOOKING}\n\nVous pouvez aussi répondre à ce message pour compléter votre demande.\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire`,
  },
  en: {
    subject: "Your request to MAIORIS has been received",
    html: (n) => `<p>Hello ${esc(n)},</p><p>We have received your request and we read it personally. We will reply by email to propose a first conversation.</p><p>If you would rather not wait, you can book a 30 minute conversation directly:<br><a href="${BOOKING}">Book a conversation</a></p><p>You can also reply to this message to add to your request.</p><p>MAIORIS Group<br>Abidjan, Côte d'Ivoire</p>`,
    text: (n) => `Hello ${n},\n\nWe have received your request and we read it personally. We will reply by email to propose a first conversation.\n\nIf you would rather not wait, you can book a 30 minute conversation directly: ${BOOKING}\n\nYou can also reply to this message to add to your request.\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire`,
  },
};

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith(".pages.dev")) return json({ ok: false, error: "origin" }, 403);

  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "format" }, 400); }

  // champ piège : un humain ne le remplit jamais
  if (data.website) return json({ ok: true });

  const f = {};
  for (const k of Object.keys(MAX)) f[k] = clean(data[k], MAX[k]);
  f.challenges = clean(data.challenges, 600);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email);
  if (!f.organisation || !f.name || !emailOk || f.context.length < 35 || !f.support || !data.consent) {
    return json({ ok: false, error: "validation" }, 422);
  }

  if (env.RATE_KV) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = "rl:" + ip;
    const n = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (n >= 5) return json({ ok: false, error: "rate" }, 429);
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json({ ok: false, error: "config" }, 500);

  const rows = [
    ["Organisation", f.organisation], ["Fonction", f.role], ["Secteur", f.sector], ["Pays", f.country],
    ["Enjeux", f.challenges], ["Contexte", f.context], ["Accompagnement", f.support], ["Budget", f.budget],
    ["Nom", f.name], ["E-mail", f.email], ["Téléphone", f.phone], ["Langue", f.lang],
  ];
  const html = "<h2>Nouvelle demande maioris.net</h2><table cellpadding='6'>" +
    rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v || "non renseigné").replace(/\n/g, "<br>")}</td></tr>`).join("") + "</table>";
  const text = rows.map(([k, v]) => `${k}: ${v || "non renseigné"}`).join("\n");

  // PDF structuré (logo et couleurs MAIORIS) joint au message ; sa génération ne bloque jamais l'envoi
  let attachments;
  try {
    const ref = "DEM-" + [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const pdf = buildPdf({
      lang: "fr", kicker: "Formulaire de qualification", title: `Demande de ${f.organisation}`, subtitle: "Informations saisies par le visiteur sur maioris.net, sans modification.", ref,
      blocks: [
        { h: "Organisation", rows: [["Organisation", f.organisation], ["Fonction", f.role], ["Secteur", f.sector], ["Pays", f.country]] },
        { h: "Projet et besoin", rows: [["Enjeux", f.challenges], ["Contexte", f.context], ["Accompagnement souhaité", f.support], ["Budget", f.budget]] },
        { h: "Coordonnées", rows: [["Nom", f.name], ["E-mail", f.email], ["Téléphone", f.phone], ["Langue du visiteur", f.lang]] },
        { note: "Le visiteur a coché le consentement au traitement de sa demande avant l'envoi." },
      ],
    });
    attachments = [{ filename: pdfName("demande", f.organisation), content: toBase64(pdf) }];
  } catch (e) { console.error("pdf", e && e.message); }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: f.email,
      subject: `[MAIORIS] ${f.organisation} | ${f.support}`, html, text, ...(attachments ? { attachments } : {}),
    }),
  });
  if (!res.ok) return json({ ok: false, error: "send" }, 502);

  // e-mail de suite au visiteur : la demande est déjà transmise, un échec ici ne l'annule pas
  try {
    const c = CONFIRM[f.lang === "en" ? "en" : "fr"];
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.CONTACT_FROM, to: [f.email], reply_to: env.CONTACT_TO, subject: c.subject, html: c.html(f.name), text: c.text(f.name) }),
    });
  } catch { /* ignoré */ }
  return json({ ok: true });
}
