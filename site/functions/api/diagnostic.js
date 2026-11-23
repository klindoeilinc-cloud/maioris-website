/**
 * MAIORIS.NET : envoi facultatif d'un Creative Operations Snapshot (Cloudflare Pages Function).
 * POST /api/diagnostic  →  e-mail à l'équipe via Resend, puis accusé de réception au visiteur.
 * Appelé uniquement lorsque le visiteur le demande et coche le consentement : le calcul lui-même ne quitte jamais le navigateur.
 *
 * Variables d'environnement (les mêmes que /api/contact) :
 *   RESEND_API_KEY, CONTACT_TO, CONTACT_FROM
 * Optionnel : RATE_KV (KV lié) pour limiter à 5 envois par heure et par adresse IP.
 */
const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BOOKING = "https://cal.com/maioris";

const ACK = {
  fr: { subject: "Votre Creative Operations Snapshot a bien été transmis à MAIORIS",
        text: (n) => `Bonjour ${n},\n\nVotre Creative Operations Snapshot nous est bien parvenu. Il s'agit d'une estimation indicative, construite à partir de vos réponses. Nous le lisons personnellement et nous vous répondons par e-mail.\n\nSi vous préférez ne pas attendre, vous pouvez réserver un échange : ${BOOKING}\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire` },
  en: { subject: "Your Creative Operations Snapshot has been sent to MAIORIS",
        text: (n) => `Hello ${n},\n\nYour Creative Operations Snapshot has reached us. It is an indicative estimate built from your answers. We read it personally and will reply by email.\n\nIf you would rather not wait, you can book a conversation: ${BOOKING}\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire` },
};

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith(".pages.dev")) return json({ ok: false, error: "origin" }, 403);
  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (len > 20000) return json({ ok: false, error: "size" }, 413);

  let data;
  try { data = JSON.parse((await request.text()).slice(0, 20000)); } catch { return json({ ok: false, error: "format" }, 400); }
  if (data.website) return json({ ok: true });                       // champ piège
  if (typeof data.elapsed === "number" && data.elapsed < 15000) return json({ ok: false, error: "validation" }, 422); // trop rapide pour un humain

  const lang = data.lang === "en" ? "en" : "fr";
  const name = clean(data.name, 120), email = clean(data.email, 200), company = clean(data.company, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || data.consent !== true) return json({ ok: false, error: "validation" }, 422);

  if (env.RATE_KV) {
    const key = "rl:diag:" + (request.headers.get("CF-Connecting-IP") || "unknown");
    const n = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (n >= 5) return json({ ok: false, error: "rate" }, 429);
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json({ ok: false, error: "config" }, 500);

  // seules des valeurs simples sont retenues : texte court, nombre ou liste de textes courts
  const answers = {};
  if (data.answers && typeof data.answers === "object") {
    for (const k of Object.keys(data.answers).slice(0, 40)) {
      const v = data.answers[k];
      answers[clean(k, 30)] = Array.isArray(v) ? v.slice(0, 15).map((x) => clean(x, 40)).join(", ") : clean(v, 40);
    }
  }
  const ind = data.indicators && typeof data.indicators === "object" ? data.indicators : {};
  const indRows = ["external", "hours", "internal", "total"].map((k) => {
    const x = ind[k];
    return [k, x && typeof x === "object" ? `${clean(x.lo, 40)} à ${clean(x.hi, 40)} (valeur centrale ${clean(x.mid, 40)})` : "non calculé"];
  });
  const rows = [["Nom", name], ["E-mail", email], ["Organisation", company || "non renseignée"], ["Langue", lang], ["Confiance", clean(data.confidence, 20)],
                ...indRows, ...Object.entries(answers)];
  const text = "Creative Operations Snapshot (estimation indicative calculée dans le navigateur du visiteur, consentement donné)\n\n" + rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = "<h2>Creative Operations Snapshot</h2><p>Estimation indicative calculée dans le navigateur du visiteur. Consentement donné.</p><table cellpadding='6'>" +
    rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("") + "</table>";

  const send = (body) => fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const res = await send({ from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email, subject: `[MAIORIS] Snapshot | ${company || name}`, html, text });
  if (!res.ok) return json({ ok: false, error: "send" }, 502);
  try { const a = ACK[lang]; await send({ from: env.CONTACT_FROM, to: [email], reply_to: env.CONTACT_TO, subject: a.subject, text: a.text(name) }); } catch { /* ignoré */ }
  return json({ ok: true });
}
