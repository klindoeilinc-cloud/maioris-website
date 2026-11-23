/* Effacement : le contenu est supprimé, une ligne minimale (identifiants, outil, dates) reste pour la traçabilité. */
import { nowIso } from "./util.js";
import { ulid } from "./ids.js";

const audit = (db, now, actor, action, type, id, meta) =>
  db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ulid(), now, actor, action, type, id, meta ? JSON.stringify(meta) : null);

/** Efface un profil : contact, évaluations (contenu), rapports, métriques, documents (marqués supprimés), puis le profil lui-même. */
export async function eraseProfile(db, profileId, actor = "visitor", now = nowIso()) {
  const subq = "(SELECT id FROM evaluations WHERE profile_id = ?)";
  const docs = await db.prepare("SELECT id, r2_key FROM documents WHERE profile_id = ? AND status != 'deleted'").bind(profileId).all();
  const res = await db.batch([
    db.prepare("UPDATE contacts SET name = NULL, email = NULL, erased_at = ? WHERE profile_id = ?").bind(now, profileId),
    db.prepare(`DELETE FROM evaluation_metrics WHERE evaluation_id IN ${subq}`).bind(profileId),
    db.prepare(`UPDATE reports SET content = NULL, content_hash = 'erased' WHERE evaluation_id IN ${subq}`).bind(profileId),
    db.prepare("UPDATE evaluations SET answers_json = NULL, result_json = NULL, headline = NULL, score = NULL, level = NULL, deleted_at = COALESCE(deleted_at, ?) WHERE profile_id = ?").bind(now, profileId),
    db.prepare("UPDATE documents SET status = 'deleted', original_name = NULL, deleted_at = ? WHERE profile_id = ? AND status != 'deleted'").bind(now, profileId),
    db.prepare("UPDATE profiles SET org_name = NULL, sector = NULL, size = NULL, market = NULL, resume_token_hash = NULL, status = 'erased', erased_at = ?, updated_at = ? WHERE id = ?").bind(now, now, profileId),
    audit(db, now, actor, "profile.erased", "profile", profileId, { documents: docs.results.length }),
  ]);
  return { ok: true, evaluations: res[3].meta.changes, r2_keys: docs.results.map((d) => d.r2_key) };
}

/** Efface le contenu d'une seule évaluation en conservant le profil. */
export async function eraseEvaluation(db, evaluationId, actor = "system", now = nowIso()) {
  const res = await db.batch([
    db.prepare("DELETE FROM evaluation_metrics WHERE evaluation_id = ?").bind(evaluationId),
    db.prepare("UPDATE reports SET content = NULL, content_hash = 'erased' WHERE evaluation_id = ?").bind(evaluationId),
    db.prepare("UPDATE evaluations SET answers_json = NULL, result_json = NULL, headline = NULL, score = NULL, level = NULL, deleted_at = COALESCE(deleted_at, ?) WHERE id = ?").bind(now, evaluationId),
    audit(db, now, actor, "evaluation.erased", "evaluation", evaluationId, null),
  ]);
  return { ok: true, changed: res[2].meta.changes };
}
export { audit };
