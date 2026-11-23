/**
 * MAIORIS.NET : envoi facultatif du résultat d'un outil de diagnostic (Cloudflare Pages Function).
 * Outils acceptés : coi (Creative Operations Intelligence), maturity (Creative Maturity Assessment), brand (Brand Consistency Review).
 * POST /api/diagnostic  →  e-mail à l'équipe via Resend, puis accusé de réception au visiteur.
 * Appelé uniquement lorsque le visiteur le demande et coche le consentement : le calcul lui-même ne quitte jamais le navigateur.
 *
 * Variables d'environnement (les mêmes que /api/contact) :
 *   RESEND_API_KEY, CONTACT_TO, CONTACT_FROM
 * Optionnel : RATE_KV (KV lié) pour limiter à 5 envois par heure et par adresse IP.
 * Optionnel : MAIORIS_DB (binding D1). Présent, l'évaluation est d'abord enregistrée (profil, consentement, évaluation, indicateurs, rapport),
 *   puis l'e-mail part. Absent (ex. déploiement de prévisualisation), seul l'e-mail est envoyé, comme avant.
 */
import { json, clean, cleanText } from "../_lib/util.js";
import { persistSubmission, markEmail } from "../_lib/persist.js";

const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TOOLS = { coi: "Creative Operations Snapshot", maturity: "Creative Maturity Assessment", brand: "Brand Consistency Review" };
const BOOKING = "https://cal.com/maioris";

const ACK = {
  fr: { subject: (tool) => `Votre ${tool} a bien été transmis à MAIORIS`,
        text: (n, tool) => `Bonjour ${n},\n\nVotre ${tool} nous est bien parvenu. Il s'agit d'une évaluation déclarative, construite à partir de vos réponses. Nous le lisons personnellement et nous vous répondons par e-mail.\n\nSi vous préférez ne pas attendre, vous pouvez réserver un échange : ${BOOKING}\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire` },
  en: { subject: (tool) => `Your ${tool} has been sent to MAIORIS`,
        text: (n, tool) => `Hello ${n},\n\nYour ${tool} has reached us. It is a declarative assessment built from your answers. We read it personally and will reply by email.\n\nIf you would rather not wait, you can book a conversation: ${BOOKING}\n\nMAIORIS Group\nAbidjan, Côte d'Ivoire` },
};

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith(".pages.dev")) return json({ ok: false, error: "origin" }, 403);
  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (len > 90000) return json({ ok: false, error: "size" }, 413);

  let data;
  try { data = JSON.parse((await request.text()).slice(0, 90000)); } catch { return json({ ok: false, error: "format" }, 400); }
  if (data.website) return json({ ok: true });                       // champ piège
  if (typeof data.elapsed === "number" && data.elapsed < 15000) return json({ ok: false, error: "validation" }, 422); // trop rapide pour un humain

  const lang = data.lang === "en" ? "en" : "fr";
  const toolKey = Object.prototype.hasOwnProperty.call(TOOLS, data.tool) ? data.tool : "coi", toolName = TOOLS[toolKey];
  const name = clean(data.name, 120), email = clean(data.email, 200), company = clean(data.company, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || data.consent !== true) return json({ ok: false, error: "validation" }, 422);

  if (env.RATE_KV) {
    const key = "rl:diag:" + (request.headers.get("CF-Connecting-IP") || "unknown");
    const n = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (n >= 5) return json({ ok: false, error: "rate" }, 429);
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }
  const mailReady = !!(env.RESEND_API_KEY && env.CONTACT_TO && env.CONTACT_FROM);
  if (!mailReady && !env.MAIORIS_DB) return json({ ok: false, error: "config" }, 500);

  // seules des valeurs simples sont retenues : texte court, nombre ou liste de textes courts
  const answers = {};
  if (data.answers && typeof data.answers === "object") {
    for (const k of Object.keys(data.answers).slice(0, 40)) {
      const v = data.answers[k];
      answers[clean(k, 30)] = Array.isArray(v) ? v.slice(0, 15).map((x) => clean(x, 40)).join(", ") : clean(v, 40);
    }
  }
  // version destinée à la base : listes conservées, valeurs simples seulement
  const answersDb = {};
  if (data.answers && typeof data.answers === "object") {
    for (const k of Object.keys(data.answers).slice(0, 60)) {
      const v = data.answers[k];
      answersDb[clean(k, 30)] = Array.isArray(v) ? v.slice(0, 40).map((x) => clean(x, 80)) : typeof v === "number" && Number.isFinite(v) ? v : clean(v, 200);
    }
  }
  const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  const indicatorsDb = {};
  if (data.indicators && typeof data.indicators === "object") {
    for (const k of Object.keys(data.indicators).slice(0, 30)) {
      const v = data.indicators[k], key = clean(k, 30);
      indicatorsDb[key] = v === null || v === undefined ? null : typeof v === "number" ? num(v) : typeof v === "object" ? { lo_n: num(v.lo_n), mid_n: num(v.mid_n), hi_n: num(v.hi_n) } : null;
    }
  }
  const ind = data.indicators && typeof data.indicators === "object" ? data.indicators : {};
  const indRows = Object.keys(ind).slice(0, 20).map((k) => {
    const x = ind[k];
    return [clean(k, 30), x && typeof x === "object" ? `${clean(x.lo, 40)} à ${clean(x.hi, 40)} (valeur centrale ${clean(x.mid, 40)})` : x === null || x === undefined ? "non calculé" : clean(x, 40)];
  });
  const rows = [["Outil", toolName], ["Version du questionnaire", clean(data.version, 20) || "non précisée"], ["Nom", name], ["E-mail", email], ["Organisation", company || "non renseignée"], ["Langue", lang], ["Confiance", clean(data.confidence, 20)],
                ...indRows, ...Object.entries(answers)];
  const report = cleanText(data.report, 40000);
  const text = `${toolName} (évaluation déclarative calculée dans le navigateur du visiteur, consentement donné)\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (report ? "\n\n--- Rapport ---\n" + report : "");
  const html = `<h2>${esc(toolName)}</h2><p>Évaluation déclarative calculée dans le navigateur du visiteur. Consentement donné. Aucun fichier n'est transmis.</p><table cellpadding='6'>` +
    rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("") + "</table>" + (report ? `<h3>Rapport</h3><pre style="white-space:pre-wrap;font:14px/1.5 sans-serif">${esc(report)}</pre>` : "");

  // 1. enregistrement (si la base est liée) ; une erreur de base n'empêche pas l'e-mail
  let saved = { persisted: false, reason: "no_binding" };
  try {
    saved = await persistSubmission(env, {
      tool: toolKey, version: clean(data.version, 20), lang, name, email, company, consentTextId: clean(data.consent_text_id, 60), idempotencyKey: clean(data.idempotency_key, 80),
      elapsed: data.elapsed, answers: answersDb, indicators: indicatorsDb, report, summary: data.summary && typeof data.summary === "object" ? data.summary : {},
      profileRef: data.profile && typeof data.profile === "object" ? { id: clean(data.profile.id, 40), token: clean(data.profile.token, 100) } : null,
      context: data.context && typeof data.context === "object" ? data.context : {},
    });
  } catch (e) { console.error("persist", e && e.message); saved = { persisted: false, reason: "db_error" }; }
  const idInfo = saved.persisted ? { persisted: true, evaluation_id: saved.evaluationId, profile_id: saved.profileId, ...(saved.resumeToken ? { resume_token: saved.resumeToken } : {}) } : { persisted: false };
  if (saved.duplicate) return json({ ok: true, duplicate: true, ...idInfo });

  const send = (body) => fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  // 2. e-mail à l'équipe, puis accusé au visiteur
  if (!mailReady) { await markEmail(env, saved.evaluationId, "skipped"); return json({ ok: true, emailed: false, ...idInfo }); }
  let res;
  try { res = await send({ from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email, subject: `[MAIORIS] ${toolName} | ${company || name}`, html, text }); } catch { res = { ok: false }; }
  if (!res.ok) {
    await markEmail(env, saved.evaluationId, "failed");
    return saved.persisted ? json({ ok: true, emailed: false, ...idInfo }) : json({ ok: false, error: "send" }, 502);
  }
  await markEmail(env, saved.evaluationId, "sent");
  try { const a = ACK[lang]; await send({ from: env.CONTACT_FROM, to: [email], reply_to: env.CONTACT_TO, subject: a.subject(toolName), text: a.text(name, toolName) }); } catch { /* ignoré */ }
  return json({ ok: true, ...idInfo });
}
