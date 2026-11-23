/**
 * MAIORIS.NET : inscription à la lettre MAIORIS Insights (Cloudflare Pages Function).
 * POST /api/subscribe  →  ajoute l'adresse à une audience Resend, puis envoie un e-mail de bienvenue.
 *
 * Variables d'environnement à définir dans Cloudflare Pages :
 *   RESEND_API_KEY        clé API Resend (déjà utilisée par le formulaire de contact)
 *   RESEND_AUDIENCE_ID    identifiant de l'audience Resend qui reçoit les inscriptions
 *   CONTACT_FROM          expéditeur vérifié dans Resend (déjà utilisé par le formulaire de contact)
 * Optionnel :
 *   RESEND_AUDIENCE_ID_EN audience distincte pour les inscriptions faites depuis les pages en anglais
 *   CONTACT_TO            adresse en réponse aux e-mails de bienvenue (ex. hello@maioris.net)
 *   RATE_KV               espace KV lié, pour limiter à 5 inscriptions par heure et par adresse IP
 *
 * Aucune réponse ne prétend qu'une inscription a réussi sans que Resend l'ait acceptée.
 */
import { buildPdf, toBase64, pdfName } from "../_lib/pdf.js";

const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

const WELCOME = {
  fr: {
    subject: "Bienvenue dans MAIORIS Insights",
    html: "<p>Bonjour,</p><p>Votre inscription à la lettre <b>MAIORIS Insights</b> est bien enregistrée. Vous recevrez une analyse par mois sur la direction créative stratégique, la performance créative et les marchés africains.</p><p>Pour vous désinscrire à tout moment, répondez simplement à ce message en écrivant « désinscription », ou utilisez le lien présent dans chaque lettre.</p><p>MAIORIS Group<br>Abidjan, Côte d'Ivoire</p>",
    text: "Bonjour,\n\nVotre inscription à la lettre MAIORIS Insights est bien enregistrée. Vous recevrez une analyse par mois sur la direction créative stratégique, la performance créative et les marchés africains.\n\nPour vous désinscrire à tout moment, répondez à ce message en écrivant « désinscription », ou utilisez le lien présent dans chaque lettre.\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire",
  },
  en: {
    subject: "Welcome to MAIORIS Insights",
    html: "<p>Hello,</p><p>Your subscription to the <b>MAIORIS Insights</b> newsletter is confirmed. You will receive one analysis a month on strategic creative direction, creative performance and African markets.</p><p>To unsubscribe at any time, simply reply to this message with “unsubscribe”, or use the link in every issue.</p><p>MAIORIS Group<br>Abidjan, Côte d'Ivoire</p>",
    text: "Hello,\n\nYour subscription to the MAIORIS Insights newsletter is confirmed. You will receive one analysis a month on strategic creative direction, creative performance and African markets.\n\nTo unsubscribe at any time, reply to this message with \"unsubscribe\", or use the link in every issue.\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire",
  },
};

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith(".pages.dev")) return json({ ok: false, error: "origin" }, 403);

  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "format" }, 400); }

  // champ piège : un humain ne le remplit jamais
  if (data.website) return json({ ok: true });

  const email = clean(data.email, 200).toLowerCase();
  const lang = data.lang === "en" ? "en" : "fr";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!emailOk || data.consent !== true) return json({ ok: false, error: "validation" }, 422);

  if (env.RATE_KV) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = "sub:" + ip;
    const n = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (n >= 5) return json({ ok: false, error: "rate" }, 429);
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }

  const audience = (lang === "en" && env.RESEND_AUDIENCE_ID_EN) || env.RESEND_AUDIENCE_ID;
  if (!env.RESEND_API_KEY || !audience || !env.CONTACT_FROM) return json({ ok: false, error: "config" }, 500);

  const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" };

  let res;
  try {
    res = await fetch(`https://api.resend.com/audiences/${encodeURIComponent(audience)}/contacts`, {
      method: "POST", headers, body: JSON.stringify({ email, unsubscribed: false }),
    });
  } catch { return json({ ok: false, error: "subscribe" }, 502); }
  if (!res.ok) return json({ ok: false, error: "subscribe" }, 502);

  // e-mail de bienvenue : un échec d'envoi n'annule pas l'inscription
  try {
    const w = WELCOME[lang];
    await fetch("https://api.resend.com/emails", {
      method: "POST", headers,
      body: JSON.stringify({ from: env.CONTACT_FROM, to: [email], reply_to: env.CONTACT_TO || undefined, subject: w.subject, html: w.html, text: w.text }),
    });
  } catch { /* ignoré */ }

  // notification à l'équipe avec un PDF de l'inscription (si CONTACT_TO est défini) ; sans effet sur la réponse
  if (env.CONTACT_TO) {
    try {
      const pdf = buildPdf({
        lang: "fr", kicker: "Lettre MAIORIS Insights", title: "Nouvelle inscription à la lettre", subtitle: "Adresse saisie par le visiteur sur maioris.net.", ref: "INS-" + [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase(),
        blocks: [{ h: "Inscription", rows: [["E-mail", email], ["Langue de la page", lang]] }, { note: "Le visiteur a coché le consentement avant de s'inscrire. L'adresse a été ajoutée à l'audience Resend et un e-mail de bienvenue lui a été envoyé." }],
      });
      await fetch("https://api.resend.com/emails", {
        method: "POST", headers,
        body: JSON.stringify({ from: env.CONTACT_FROM, to: [env.CONTACT_TO], subject: `[MAIORIS] Inscription lettre | ${email}`, text: `Nouvelle inscription à la lettre MAIORIS Insights : ${email} (${lang}). Détail en pièce jointe.`, attachments: [{ filename: pdfName("inscription", email.split("@")[0]), content: toBase64(pdf) }] }),
      });
    } catch { /* ignoré */ }
  }
  return json({ ok: true });
}
