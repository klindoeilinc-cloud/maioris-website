/**
 * MAIORIS.NET : API d'administration (Cloudflare Pages Function), réservée aux personnes authentifiées par Cloudflare Access.
 * Toutes les routes exigent un jeton Access valide (voir _lib/access.js). Sans configuration, tout est refusé (503).
 *   GET  /api/admin/me                      identité de l'administrateur
 *   GET  /api/admin/stats                   comptes par outil, évaluations proches de l'expiration
 *   GET  /api/admin/evaluations             liste (tool, q, limit, before)
 *   GET  /api/admin/evaluations/:id         détail (réponses, indicateurs, rapports, consentement, profil, contact) : journalisé
 *   GET  /api/admin/export?format=csv|json  export (tool facultatif) : journalisé
 *   POST /api/admin/erase                   { profile_id } ou { evaluation_id } : journalisé
 *   POST /api/admin/purge                   purge des données expirées : journalisé
 * Jamais de CORS : l'interface est servie par le même domaine.
 */
import { json, nowIso } from "../../_lib/util.js";
import { requireAdmin } from "../../_lib/access.js";
import { audit, eraseProfile, eraseEvaluation } from "../../_lib/erase.js";
import { purgeExpired } from "../../_lib/purge.js";

const NS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const jsonNS = (b, s = 200) => json(b, s, NS);
const csvCell = (v) => { let s = v === null || v === undefined ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
const LIST_SQL = `SELECT e.id, e.tool_id, e.questionnaire_version_id AS version, e.lang, e.completeness, e.headline, e.score, e.level, e.email_status, e.submitted_at, e.expires_at, e.deleted_at,
  p.id AS profile_id, p.org_name, p.status AS profile_status, c.name AS contact_name, c.email AS contact_email
  FROM evaluations e LEFT JOIN profiles p ON p.id = e.profile_id
  LEFT JOIN contacts c ON c.id = (SELECT id FROM contacts WHERE profile_id = e.profile_id ORDER BY created_at DESC LIMIT 1)`;

async function list(db, url, limitMax) {
  const where = [], binds = [], tool = url.searchParams.get("tool"), q = (url.searchParams.get("q") || "").trim().slice(0, 80), before = url.searchParams.get("before");
  if (tool && ["brief", "diag", "coi", "maturity", "brand"].includes(tool)) { where.push("e.tool_id = ?"); binds.push(tool); }
  if (q) { where.push("(p.org_name LIKE ? OR c.email LIKE ? OR c.name LIKE ?)"); const l = "%" + q.replace(/[%_]/g, "") + "%"; binds.push(l, l, l); }
  if (before) { where.push("e.submitted_at < ?"); binds.push(before.slice(0, 40)); }
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), limitMax);
  const sql = LIST_SQL + (where.length ? " WHERE " + where.join(" AND ") : "") + " ORDER BY e.submitted_at DESC LIMIT ?";
  return (await db.prepare(sql).bind(...binds, limit).all()).results;
}

export async function onRequest({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return jsonNS({ ok: false, error: auth.error }, auth.status);
  if (!env.MAIORIS_DB) return jsonNS({ ok: false, error: "no_database" }, 503);
  const db = env.MAIORIS_DB, url = new URL(request.url), path = url.pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, ""), method = request.method;
  if (method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return jsonNS({ ok: false, error: "origin" }, 403);
  }
  const now = nowIso();

  if (method === "GET" && path === "me") return jsonNS({ ok: true, email: auth.email });
  if (method === "GET" && path === "stats") {
    const byTool = (await db.prepare("SELECT tool_id, COUNT(*) AS n FROM evaluations WHERE deleted_at IS NULL GROUP BY tool_id").all()).results;
    const soon = await db.prepare("SELECT COUNT(*) AS n FROM evaluations WHERE deleted_at IS NULL AND expires_at <= ?").bind(new Date(Date.now() + 30 * 86400000).toISOString()).first();
    const total = await db.prepare("SELECT COUNT(*) AS n FROM evaluations WHERE deleted_at IS NULL").first();
    return jsonNS({ ok: true, total: total.n, by_tool: byTool, expiring_30d: soon.n });
  }
  if (method === "GET" && path === "evaluations") return jsonNS({ ok: true, items: await list(db, url, 200) });
  const m = /^evaluations\/([0-9A-Za-z]{10,40})$/.exec(path);
  if (method === "GET" && m) {
    const ev = await db.prepare("SELECT * FROM evaluations WHERE id = ?").bind(m[1]).first();
    if (!ev) return jsonNS({ ok: false, error: "not_found" }, 404);
    const [metrics, reports, consent, profile, contact] = await Promise.all([
      db.prepare("SELECT metric_key, dimension_id, value_num, lo_num, hi_num, unit, status FROM evaluation_metrics WHERE evaluation_id = ?").bind(ev.id).all(),
      db.prepare("SELECT id, kind, format, lang, content, generated_by, created_at, expires_at FROM reports WHERE evaluation_id = ?").bind(ev.id).all(),
      db.prepare("SELECT c.id, c.purpose, c.granted_at, c.withdrawn_at, t.id AS text_id, t.body FROM consents c JOIN consent_texts t ON t.id = c.consent_text_id WHERE c.id = ?").bind(ev.consent_id).first(),
      ev.profile_id ? db.prepare("SELECT id, org_name, sector, size, market, status, created_at FROM profiles WHERE id = ?").bind(ev.profile_id).first() : null,
      ev.profile_id ? db.prepare("SELECT name, email, created_at, erased_at FROM contacts WHERE profile_id = ? ORDER BY created_at DESC LIMIT 1").bind(ev.profile_id).first() : null,
    ]);
    await audit(db, now, auth.email, "evaluation.viewed", "evaluation", ev.id, null).run();
    const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
    const { answers_json, result_json, ...rest } = ev;
    return jsonNS({ ok: true, evaluation: rest, answers: parse(answers_json), result: parse(result_json), metrics: metrics.results, reports: reports.results, consent, profile, contact });
  }
  if (method === "GET" && path === "export") {
    const format = url.searchParams.get("format") === "json" ? "json" : "csv", rows = await list(db, url, 1000);
    await audit(db, now, auth.email, "export", "evaluation", null, { format, rows: rows.length, tool: url.searchParams.get("tool") || null }).run();
    if (format === "json") return jsonNS({ ok: true, items: rows });
    const cols = ["id", "tool_id", "version", "lang", "completeness", "headline", "score", "level", "email_status", "submitted_at", "expires_at", "org_name", "contact_name", "contact_email"];
    const body = [cols.join(",")].concat(rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))).join("\n");
    return new Response(body, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="maioris-evaluations.csv"', ...NS } });
  }
  if (method === "POST" && (path === "erase" || path === "purge")) {
    if (path === "purge") return jsonNS(await purgeExpired(db, auth.email, now));
    let data; try { data = await request.json(); } catch { return jsonNS({ ok: false, error: "format" }, 400); }
    if (data.profile_id) { const p = await db.prepare("SELECT id FROM profiles WHERE id = ?").bind(String(data.profile_id).slice(0, 40)).first(); if (!p) return jsonNS({ ok: false, error: "not_found" }, 404); return jsonNS(await eraseProfile(db, p.id, auth.email, now)); }
    if (data.evaluation_id) { const e = await db.prepare("SELECT id FROM evaluations WHERE id = ?").bind(String(data.evaluation_id).slice(0, 40)).first(); if (!e) return jsonNS({ ok: false, error: "not_found" }, 404); return jsonNS(await eraseEvaluation(db, e.id, auth.email, now)); }
    return jsonNS({ ok: false, error: "invalid" }, 400);
  }
  return jsonNS({ ok: false, error: "not_found" }, 404);
}
