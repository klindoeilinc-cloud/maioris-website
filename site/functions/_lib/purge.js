/* Purge des données expirées. Appelée par le Worker planifié (workers/purge) et par l'administration. Idempotente. */
import { nowIso } from "./util.js";
import { ulid } from "./ids.js";

export async function purgeExpired(db, actor = "system", now = nowIso()) {
  const expired = "(SELECT id FROM evaluations WHERE expires_at <= ? AND deleted_at IS NULL)";
  const docs = await db.prepare("SELECT r2_key FROM documents WHERE expires_at <= ? AND status != 'deleted'").bind(now).all();
  const auditDays = (await db.prepare("SELECT days FROM retention_policies WHERE kind = 'audit'").first())?.days || 730;
  const cutoff = new Date(new Date(now).getTime() - auditDays * 86400000).toISOString();
  // l'ordre compte : les sous-requêtes s'appuient sur deleted_at IS NULL, que l'étape 3 renseigne
  const r = await db.batch([
    db.prepare(`DELETE FROM evaluation_metrics WHERE evaluation_id IN ${expired}`).bind(now),
    db.prepare(`UPDATE reports SET content = NULL, content_hash = 'erased' WHERE evaluation_id IN ${expired}`).bind(now),
    db.prepare("UPDATE evaluations SET answers_json = NULL, result_json = NULL, headline = NULL, score = NULL, level = NULL, deleted_at = ? WHERE expires_at <= ? AND deleted_at IS NULL").bind(now, now),
    db.prepare("UPDATE contacts SET name = NULL, email = NULL, erased_at = ? WHERE erased_at IS NULL AND profile_id IN (SELECT p.id FROM profiles p WHERE p.status = 'active' AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.profile_id = p.id AND e.deleted_at IS NULL))").bind(now),
    db.prepare("UPDATE profiles SET org_name = NULL, sector = NULL, size = NULL, market = NULL, resume_token_hash = NULL, status = 'erased', erased_at = ?, updated_at = ? WHERE status = 'active' AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.profile_id = profiles.id AND e.deleted_at IS NULL)").bind(now, now),
    db.prepare("UPDATE documents SET status = 'deleted', original_name = NULL, deleted_at = ? WHERE expires_at <= ? AND status != 'deleted'").bind(now, now),
    db.prepare("DELETE FROM audit_events WHERE at < ?").bind(cutoff),
  ]);
  const counts = { evaluations: r[2].meta.changes, profiles: r[4].meta.changes, documents: r[5].meta.changes, audit_events: r[6].meta.changes };
  await db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id, meta_json) VALUES (?, ?, ?, 'purge.run', NULL, NULL, ?)").bind(ulid(), now, actor, JSON.stringify(counts)).run();
  return { ok: true, ...counts, r2_keys: docs.results.map((d) => d.r2_key) };
}
