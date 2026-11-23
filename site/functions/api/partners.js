/**
 * MAIORIS.NET : demande de qualification MAIORIS PARTNERS (agences indépendantes et cabinets de conseil).
 * POST /api/partners  →  e-mail à l'équipe via Resend, avec un PDF structuré en pièce jointe,
 * puis accusé de réception au visiteur avec le lien de réservation (un échec de ce second envoi n'annule pas la demande).
 * Aucune réponse « ok » n'est renvoyée tant que Resend n'a pas accepté l'e-mail à l'équipe.
 *
 * Variables d'environnement (les mêmes que /api/contact) : RESEND_API_KEY, CONTACT_TO, CONTACT_FROM.
 * Optionnel : RATE_KV (KV lié) pour limiter à 5 envois par heure et par adresse IP.
 */
import { json, clean, cleanText } from "../_lib/util.js";
import { pdfAttachment, pdfName } from "../_lib/pdf.js";

const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BOOKING = "https://cal.com/maioris";

/* codes du formulaire → libellés lisibles dans l'e-mail et le PDF (valeurs hors liste refusées) */
const OPTIONS = {
  role: { founder: "Fondateur / Fondatrice", md: "Direction générale", strategy: "Direction stratégie", creative: "Direction créative", other: "Autre" },
  team: { "1": "1 personne", "2-5": "2 à 5 collaborateurs", "6-10": "6 à 10 collaborateurs", "11-20": "11 à 20 collaborateurs", "21-30": "21 à 30 collaborateurs", "30+": "Plus de 30 collaborateurs" },
  country: { france: "France", ci: "Côte d'Ivoire", senegal: "Sénégal", canada: "Canada", "fr-africa": "Autre pays d'Afrique francophone", other: "Autre pays" },
  need: { diagnostic: "Comprendre ce qui freine l'agence", structure: "Structurer les opérations et la gouvernance créative", leadership: "Un conseil stratégique senior pour le dirigeant", ai: "Intégrer l'IA de façon structurée", other: "Autre besoin" },
  offer: { audit: "Agency Creative Audit (800 000 FCFA)", cos: "Creative Operating System (2 300 000 FCFA)", fractional: "Fractional Creative Leadership (1 000 000 FCFA par mois)", ai: "AI Creative Transformation (1 650 000 FCFA)", undecided: "Pas encore décidé, je souhaite un conseil" },
};
const MAX = { firstname: 80, lastname: 80, email: 200, agency: 200, agency_site: 200, lang: 2 };

const ACK = {
  fr: { subject: "Votre demande MAIORIS PARTNERS est bien reçue",
        text: (n) => `Bonjour ${n},\n\nNous avons bien reçu votre demande et nous la lisons personnellement. Nous vous répondons par e-mail pour proposer un premier échange.\n\nSi vous préférez ne pas attendre, vous pouvez réserver directement une conversation stratégique de 30 minutes : ${BOOKING}\n\nMAIORIS Group\nhello@maioris.net` },
  en: { subject: "Your MAIORIS PARTNERS request has been received",
        text: (n) => `Hello ${n},\n\nWe have received your request and we read it personally. We will reply by email to propose a first conversation.\n\nIf you would rather not wait, you can book a 30 minute strategic conversation directly: ${BOOKING}\n\nMAIORIS Group\nhello@maioris.net` },
};

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith(".pages.dev")) return json({ ok: false, error: "origin" }, 403);
  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (len > 20000) return json({ ok: false, error: "size" }, 413);
  let data;
  try { data = JSON.parse((await request.text()).slice(0, 20000)); } catch { return json({ ok: false, error: "format" }, 400); }
  if (!data || typeof data !== "object") return json({ ok: false, error: "format" }, 400);
  if (data.website) return json({ ok: true });                     // champ piège : un humain ne le remplit jamais

  const f = {};
  for (const k of Object.keys(MAX)) f[k] = clean(data[k], MAX[k]);
  f.context = cleanText(data.context, 4000);
  const pick = (k) => (typeof data[k] === "string" && Object.prototype.hasOwnProperty.call(OPTIONS[k], data[k]) ? data[k] : "");
  for (const k of Object.keys(OPTIONS)) f[k] = pick(k);
  const lang = f.lang === "en" ? "en" : "fr";
  const siteOk = !f.agency_site || /^(https?:\/\/)?[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(f.agency_site);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email);
  if (!f.firstname || !f.lastname || !emailOk || !f.agency || !siteOk || !f.team || !f.country || !f.role || !f.need || !f.offer || f.context.length < 35 || !data.consent) return json({ ok: false, error: "validation" }, 422);

  if (env.RATE_KV) {
    const key = "rl:partners:" + (request.headers.get("CF-Connecting-IP") || "unknown");
    const n = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (n >= 5) return json({ ok: false, error: "rate" }, 429);
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json({ ok: false, error: "config" }, 500);

  const name = `${f.firstname} ${f.lastname}`;
  const sections = [
    { h: "Agence", rows: [["Nom de l'agence", f.agency], ["Site web", f.agency_site], ["Pays", OPTIONS.country[f.country]], ["Taille de l'équipe", OPTIONS.team[f.team]]] },
    { h: "Contact", rows: [["Prénom", f.firstname], ["Nom", f.lastname], ["Fonction", OPTIONS.role[f.role]], ["E-mail professionnel", f.email], ["Langue du visiteur", lang]] },
    { h: "Besoin", rows: [["Besoin principal", OPTIONS.need[f.need]], ["Offre qui l'intéresse", OPTIONS.offer[f.offer]], ["Problème rencontré", f.context]] },
  ];
  const rows = sections.flatMap((s) => s.rows);
  const text = "Nouvelle demande MAIORIS PARTNERS\n\n" + rows.map(([k, v]) => `${k} : ${v || "non renseigné"}`).join("\n");
  const html = "<h2>Nouvelle demande MAIORIS PARTNERS</h2><table cellpadding='6'>" + rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v || "non renseigné").replace(/\n/g, "<br>")}</td></tr>`).join("") + "</table>";

  const ref = "PTN-" + [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const attachments = pdfAttachment({
    lang: "fr", kicker: "MAIORIS Partners", title: `Demande de ${f.agency}`, subtitle: "Informations saisies par le visiteur sur maioris.net, sans modification.", ref,
    blocks: [...sections, { note: "Le visiteur a coché le consentement au traitement de sa demande avant l'envoi." }],
  }, pdfName("partners", f.agency));

  const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" };
  let res;
  try {
    res = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify({
      from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: f.email,
      subject: `${attachments ? "" : "[PDF non généré] "}[MAIORIS PARTNERS] ${f.agency} | ${OPTIONS.offer[f.offer].split(" (")[0]}`,
      html, text: attachments ? text : "ATTENTION : le PDF n'a pas pu être généré, les informations ci-dessous sont complètes.\n\n" + text, ...(attachments ? { attachments } : {}),
    }) });
  } catch { res = { ok: false }; }
  if (!res.ok) return json({ ok: false, error: "send" }, 502);

  try {
    const a = ACK[lang];
    await fetch("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify({ from: env.CONTACT_FROM, to: [f.email], reply_to: env.CONTACT_TO, subject: a.subject, text: a.text(f.firstname) }) });
  } catch { /* la demande est déjà transmise */ }
  return json({ ok: true, ref });
}
