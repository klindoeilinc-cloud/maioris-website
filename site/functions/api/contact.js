/**
 * MAIORIS.NET — réception du formulaire de qualification (Cloudflare Pages Function).
 * POST /api/contact  →  envoie la demande par e-mail via l'API Resend.
 *
 * Variables d'environnement à définir dans Cloudflare Pages :
 *   RESEND_API_KEY   clé API Resend (secret)
 *   CONTACT_TO       adresse qui reçoit les demandes (ex. hello@maioris.net)
 *   CONTACT_FROM     expéditeur vérifié dans Resend (ex. "MAIORIS <site@maioris.net>")
 * Optionnel :
 *   RATE_KV          espace KV lié, pour limiter à 5 envois par heure et par adresse IP
 */
const MAX = { organisation: 200, role: 40, sector: 40, country: 80, context: 4000, support: 40, budget: 40, name: 120, email: 200, phone: 40, lang: 2 };
const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const clean = (v, max) => String(Array.isArray(v) ? v.join(", ") : v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
  if (!f.organisation || !f.name || !emailOk || (f.context.match(/\S+/g) || []).length < 35 || !f.support || !data.consent) {
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: f.email,
      subject: `[MAIORIS] ${f.organisation} | ${f.support}`, html, text,
    }),
  });
  if (!res.ok) return json({ ok: false, error: "send" }, 502);
  return json({ ok: true });
}
