/* Médias éditoriaux : téléversement, registre, suppression et lecture. Fichiers dans R2 (MAIORIS_MEDIA), registre dans D1 (table media). */
import { inspect, ImageError } from "./image.js";
import { randomToken, sha256Hex, nowIso, clean } from "../util.js";
import { ulid } from "../ids.js";

export class MediaError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
export const MAX_MEDIA = 1000, ID_RE = /^[A-Za-z0-9_-]{16,40}$/;
const one = (s) => s.first(), all = async (s) => (await s.all()).results;

async function sha256Bytes(bytes) { const d = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const audit = (db, actor, action, id, meta) => db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id, meta_json) VALUES (?, ?, ?, ?, 'media', ?, ?)").bind(ulid(), nowIso(), actor, action, id, meta ? JSON.stringify(meta) : null).run();
const safeName = (n) => clean(String(n || "").split(/[\\/]/).pop(), 120);

export async function uploadMedia(env, { bytes, name, alt, actor }) {
  if (!env.MAIORIS_MEDIA || !env.MAIORIS_DB) throw new MediaError("no_storage", "Le stockage d'images n'est pas configuré (bucket R2 MAIORIS_MEDIA et base D1).");
  const altText = String(alt || "").trim(); if (altText.length < 3 || altText.length > 300) throw new MediaError("alt", "Décrivez l'image (texte alternatif de 3 à 300 caractères) : il est obligatoire pour l'accessibilité.");
  let img; try { img = inspect(bytes); } catch (e) { if (e instanceof ImageError) throw new MediaError(e.code, e.message); throw e; }
  const db = env.MAIORIS_DB, sha = await sha256Bytes(img.bytes);
  const dup = await one(db.prepare("SELECT * FROM media WHERE sha256 = ? AND deleted_at IS NULL").bind(sha)); if (dup) return { ...dup, duplicate: true };
  const count = (await one(db.prepare("SELECT COUNT(*) AS n FROM media WHERE deleted_at IS NULL"))).n; if (count >= MAX_MEDIA) throw new MediaError("quota", `Limite de ${MAX_MEDIA} images atteinte : supprimez des images inutilisées.`);
  const id = randomToken().slice(0, 24), key = `editorial/${id}.${img.ext}`, now = nowIso();
  await env.MAIORIS_MEDIA.put(key, img.bytes, { httpMetadata: { contentType: img.mime }, customMetadata: { sha256: sha } });
  try {
    await db.prepare("INSERT INTO media (id, r2_key, original_name, mime, size_bytes, width, height, sha256, alt, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, key, safeName(name) || null, img.mime, img.bytes.length, img.width, img.height, sha, altText, actor, now).run();
  } catch (e) { try { await env.MAIORIS_MEDIA.delete(key); } catch { /* le fichier orphelin sera sans effet : aucune ligne ne le référence */ } throw e; }
  await audit(db, actor, "media.uploaded", id, { mime: img.mime, bytes: img.bytes.length, w: img.width, h: img.height });
  return { id, r2_key: key, original_name: safeName(name) || null, mime: img.mime, size_bytes: img.bytes.length, width: img.width, height: img.height, sha256: sha, alt: altText, uploaded_by: actor, uploaded_at: now, deleted_at: null };
}

export const USED = "(EXISTS (SELECT 1 FROM articles a WHERE a.hero_image = '/media/' || m.id) OR EXISTS (SELECT 1 FROM article_translations t WHERE instr(t.body_md, '/media/' || m.id) > 0))";
export async function listMedia(db, limit = 200) {
  return all(db.prepare(`SELECT m.id, m.original_name, m.mime, m.size_bytes, m.width, m.height, m.alt, m.uploaded_by, m.uploaded_at, ${USED} AS used FROM media m WHERE m.deleted_at IS NULL ORDER BY m.uploaded_at DESC, m.id DESC LIMIT ?`).bind(Math.min(Math.max(limit, 1), 500)));
}
export async function updateAlt(db, id, alt, actor) {
  const a = String(alt || "").trim(); if (a.length < 3 || a.length > 300) throw new MediaError("alt", "Texte alternatif de 3 à 300 caractères.");
  const r = await db.prepare("UPDATE media SET alt = ? WHERE id = ? AND deleted_at IS NULL").bind(a, id).run(); if (!r.meta.changes) throw new MediaError("not_found", "Image introuvable.");
  await audit(db, actor, "media.alt", id, null);
}
export async function deleteMedia(env, id, actor) {
  const db = env.MAIORIS_DB, m = await one(db.prepare(`SELECT m.id, m.r2_key, ${USED} AS used FROM media m WHERE m.id = ? AND m.deleted_at IS NULL`).bind(id)); if (!m) throw new MediaError("not_found", "Image introuvable.");
  if (m.used) { const refs = await all(db.prepare("SELECT DISTINCT a.id FROM articles a LEFT JOIN article_translations t ON t.article_id = a.id WHERE a.hero_image = ? OR instr(t.body_md, ?) > 0").bind("/media/" + id, "/media/" + id)); throw new MediaError("in_use", "Cette image est utilisée par une publication : retirez-la d'abord.", refs.map((r) => r.id)); }
  if (env.MAIORIS_MEDIA) await env.MAIORIS_MEDIA.delete(m.r2_key);
  await db.prepare("UPDATE media SET deleted_at = ? WHERE id = ?").bind(nowIso(), id).run(); await audit(db, actor, "media.deleted", id, null);
}

/** Références /media/<id> d'un texte ou d'un champ : toutes doivent exister dans le registre. */
export const refsIn = (text) => [...String(text || "").matchAll(/\/media\/([A-Za-z0-9_-]{16,40})/g)].map((m) => m[1]);
export async function missingRefs(db, ids) {
  const uniq = [...new Set(ids)]; if (!uniq.length) return [];
  const found = new Set((await all(db.prepare(`SELECT id FROM media WHERE deleted_at IS NULL AND id IN (${uniq.map(() => "?").join(",")})`).bind(...uniq))).map((r) => r.id));
  return uniq.filter((i) => !found.has(i));
}
export async function dims(db, path) {
  const m = /^\/media\/([A-Za-z0-9_-]{16,40})$/.exec(path || ""); if (!m) return null;
  try { return await one(db.prepare("SELECT width, height FROM media WHERE id = ? AND deleted_at IS NULL").bind(m[1])); } catch { return null; }
}
