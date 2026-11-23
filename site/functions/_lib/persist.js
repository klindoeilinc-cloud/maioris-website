/* Enregistrement d'une évaluation transmise avec consentement (D1). Tout est écrit en un seul lot atomique. */
import { nowIso, addDays, sha256Hex, randomToken, clean, cleanText } from "./util.js";
import { ulid } from "./ids.js";

const SECTORS = ["bank", "telco", "retail", "fmcg", "auto", "realestate", "energy", "health", "transport", "public", "media", "other"];
const SIZES = ["lt20", "20_49", "50_99", "100_249", "250_499", "500_999", "1000p"];
const KEY_RE = /[^a-z0-9_.-]/gi;
const INDICATORS = new Set(["external", "hours", "internal", "total"]); // indicateurs de Creative Operations Intelligence : clé = nom de l'indicateur

/** Indicateurs envoyés par l'outil -> lignes evaluation_metrics. Une valeur absente reste « not_computed » : jamais remplacée par zéro. */
export function normalizeMetrics(indicators) {
  const rows = [], isNum = (x) => typeof x === "number" && Number.isFinite(x);
  if (!indicators || typeof indicators !== "object") return rows;
  for (const [rawKey, v] of Object.entries(indicators).slice(0, 30)) {
    const key = clean(rawKey, 30).replace(KEY_RE, "");
    if (!key) continue;
    const unit = { external: "FCFA", internal: "FCFA", total: "FCFA", hours: "hours" }[key] || null;
    if (v === null || v === undefined) rows.push(INDICATORS.has(key) ? { k: key, d: "", v: null, lo: null, hi: null, unit, status: "not_computed" } : { k: key === "global" ? "global" : "dimension_score", d: key === "global" ? "" : key, v: null, lo: null, hi: null, unit, status: "not_computed" });
    else if (isNum(v)) rows.push({ k: key === "global" || key === "level" ? key : "dimension_score", d: key === "global" || key === "level" ? "" : key, v, lo: null, hi: null, unit, status: "ok" });
    else if (typeof v === "object" && (isNum(v.mid_n) || isNum(v.lo_n) || isNum(v.hi_n))) rows.push({ k: key, d: "", v: isNum(v.mid_n) ? v.mid_n : null, lo: isNum(v.lo_n) ? v.lo_n : null, hi: isNum(v.hi_n) ? v.hi_n : null, unit, status: "ok" });
  }
  return rows;
}

async function retentionDays(db, kind) {
  const r = await db.prepare("SELECT days FROM retention_policies WHERE kind = ?").bind(kind).first();
  return r && r.days > 0 ? r.days : 365;
}

/**
 * input : { tool, version, lang, name, email, company, consentTextId, idempotencyKey, elapsed, answers, indicators, report, summary, profileRef, context }
 * Retourne { persisted:true, evaluationId, profileId, resumeToken? , duplicate? } ou { persisted:false, reason }.
 */
export async function persistSubmission(env, input) {
  const db = env.MAIORIS_DB;
  if (!db) return { persisted: false, reason: "no_binding" };
  if (input.idempotencyKey) {
    const dup = await db.prepare("SELECT id, profile_id FROM evaluations WHERE idempotency_key = ?").bind(input.idempotencyKey).first();
    if (dup) return { persisted: true, duplicate: true, evaluationId: dup.id, profileId: dup.profile_id };
  }
  const qv = await db.prepare("SELECT id FROM questionnaire_versions WHERE tool_id = ? AND version = ? AND retired_at IS NULL").bind(input.tool, input.version).first();
  if (!qv) return { persisted: false, reason: "unknown_version" };
  const ct = await db.prepare("SELECT id FROM consent_texts WHERE id = ? AND tool_id = ? AND lang = ? AND purpose = 'transmission'").bind(input.consentTextId || "", input.tool, input.lang).first();
  if (!ct) return { persisted: false, reason: "unknown_consent_text" };

  const now = nowIso(), evDays = await retentionDays(db, "evaluation"), rpDays = await retentionDays(db, "report");
  const ctx = input.context || {}, sector = SECTORS.includes(ctx.sector) ? ctx.sector : null, size = SIZES.includes(ctx.size) ? ctx.size : null, market = clean(ctx.market, 200) || null, org = clean(input.company, 200) || null;
  const stmts = [];
  let profileId = null, resumeToken = null, reuse = false;

  // rattachement à un profil existant : uniquement avec son jeton, jamais par simple saisie d'une adresse e-mail
  if (input.profileRef && input.profileRef.id && input.profileRef.token) {
    const p = await db.prepare("SELECT id, resume_token_hash FROM profiles WHERE id = ? AND status = 'active'").bind(String(input.profileRef.id).slice(0, 40)).first();
    if (p && p.resume_token_hash && p.resume_token_hash === await sha256Hex(String(input.profileRef.token).slice(0, 100))) { profileId = p.id; reuse = true; }
  }
  if (reuse) {
    stmts.push(db.prepare("UPDATE profiles SET updated_at = ?, org_name = COALESCE(?, org_name), sector = COALESCE(?, sector), size = COALESCE(?, size), market = COALESCE(?, market) WHERE id = ?").bind(now, org, sector, size, market, profileId));
    const known = await db.prepare("SELECT id FROM contacts WHERE profile_id = ? AND email = ? AND erased_at IS NULL").bind(profileId, input.email).first();
    if (!known) stmts.push(db.prepare("INSERT INTO contacts (id, profile_id, name, email, created_at) VALUES (?, ?, ?, ?, ?)").bind(ulid(), profileId, input.name, input.email, now));
  } else {
    profileId = ulid(); resumeToken = randomToken();
    stmts.push(db.prepare("INSERT INTO profiles (id, created_at, updated_at, org_name, sector, size, market, resume_token_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')").bind(profileId, now, now, org, sector, size, market, await sha256Hex(resumeToken)));
    stmts.push(db.prepare("INSERT INTO contacts (id, profile_id, name, email, created_at) VALUES (?, ?, ?, ?, ?)").bind(ulid(), profileId, input.name, input.email, now));
  }
  const consentId = ulid(), evaluationId = ulid(), s = input.summary || {};
  stmts.push(db.prepare("INSERT INTO consents (id, profile_id, purpose, consent_text_id, granted_at) VALUES (?, ?, 'transmission', ?, ?)").bind(consentId, profileId, ct.id, now));
  stmts.push(db.prepare(`INSERT INTO evaluations (id, tool_id, questionnaire_version_id, profile_id, consent_id, idempotency_key, lang, completeness, headline, score, level, answers_json, result_json, basis, client_elapsed_ms, submitted_at, expires_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'declared', ?, ?, ?)`)
    .bind(evaluationId, input.tool, qv.id, profileId, consentId, input.idempotencyKey || null, input.lang, s.completeness === "partial" ? "partial" : "complete", clean(s.headline, 200) || null,
          Number.isFinite(s.score) ? s.score : null, clean(s.level, 40) || null, JSON.stringify(input.answers || {}), JSON.stringify(input.indicators || {}),
          Number.isFinite(input.elapsed) ? Math.round(input.elapsed) : null, now, addDays(now, evDays)));
  for (const m of normalizeMetrics(input.indicators))
    stmts.push(db.prepare("INSERT INTO evaluation_metrics (evaluation_id, metric_key, dimension_id, value_num, lo_num, hi_num, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(evaluationId, m.k, m.d, m.v, m.lo, m.hi, m.unit, m.status));
  const report = cleanText(input.report, 40000);
  if (report) stmts.push(db.prepare("INSERT INTO reports (id, evaluation_id, kind, format, lang, content, content_hash, generated_by, renderer_version, created_at, expires_at) VALUES (?, ?, ?, 'text', ?, ?, ?, 'client', ?, ?, ?)")
    .bind(ulid(), evaluationId, input.tool === "brand" ? "brand_review" : "summary", input.lang, report, await sha256Hex(report), input.version, now, addDays(now, rpDays)));
  await db.batch(stmts);
  return { persisted: true, evaluationId, profileId, resumeToken: resumeToken || undefined };
}

export async function markEmail(env, evaluationId, status) {
  if (!env.MAIORIS_DB || !evaluationId) return;
  try { await env.MAIORIS_DB.prepare("UPDATE evaluations SET email_status = ? WHERE id = ?").bind(status, evaluationId).run(); } catch { /* sans incidence sur la réponse */ }
}
