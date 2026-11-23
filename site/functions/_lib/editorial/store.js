/* Couche de données éditoriale (D1). Aucune route publique n'écrit ici : seules l'administration (Access) et le jeu de démonstration écrivent. */
import { ulid } from "../ids.js";
import { nowIso } from "../util.js";
import { renderMarkdown } from "./markdown.js";
import { readingMinutes, qualityTotal, TRANSITIONS, catById, fmtById, toolById } from "./taxonomy.js";
import { validateForPublish } from "./gate.js";

const LANGS = ["fr", "en"], SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const str = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").slice(0, max);
const one = (s) => s.first(), all = async (s) => (await s.all()).results;

export class EditorialError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }

async function auditEv(db, now, actor, action, id, meta) {
  await db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id, meta_json) VALUES (?, ?, ?, ?, 'article', ?, ?)").bind(ulid(), now, actor, action, id, meta ? JSON.stringify(meta) : null).run();
}

export async function createArticle(db, { category_id, format_id }, actor) {
  if (!catById(category_id) || !fmtById(format_id)) throw new EditorialError("invalid", "Rubrique ou format invalide.");
  const id = ulid(), now = nowIso();
  await db.batch([
    db.prepare("INSERT INTO articles (id, category_id, format_id, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, category_id, format_id, now, now, actor, actor),
    db.prepare("INSERT INTO article_translations (article_id, lang, updated_at) VALUES (?, 'fr', ?)").bind(id, now),
    db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id, meta_json) VALUES (?, ?, ?, 'article.created', 'article', ?, NULL)").bind(ulid(), now, actor, id),
  ]);
  return id;
}

export async function getArticle(db, id) {
  const a = await one(db.prepare("SELECT * FROM articles WHERE id = ?").bind(id)); if (!a) return null;
  const [tr, src, rel, rev] = await Promise.all([
    all(db.prepare("SELECT * FROM article_translations WHERE article_id = ? ORDER BY lang").bind(id)), all(db.prepare("SELECT * FROM article_sources WHERE article_id = ? ORDER BY ordinal").bind(id)),
    all(db.prepare("SELECT related_id FROM article_related WHERE article_id = ? ORDER BY ordinal").bind(id)), all(db.prepare("SELECT id, lang, saved_at, saved_by FROM article_revisions WHERE article_id = ? ORDER BY saved_at DESC LIMIT 20").bind(id))]);
  return { article: { ...a, quality: a.quality_json ? JSON.parse(a.quality_json) : null }, translations: tr.map((t) => ({ ...t, takeaways: JSON.parse(t.takeaways_json || "[]") })), sources: src, related: rel.map((r) => r.related_id), revisions: rev };
}

export async function listArticles(db, { status, category, q, limit = 100 } = {}) {
  const w = [], b = [];
  if (status) { w.push("a.status = ?"); b.push(status); } if (category) { w.push("a.category_id = ?"); b.push(category); }
  if (q) { w.push("(t.title LIKE ? OR t.slug LIKE ?)"); const l = "%" + String(q).replace(/[%_]/g, "").slice(0, 60) + "%"; b.push(l, l); }
  const sql = `SELECT a.id, a.category_id, a.format_id, a.status, a.featured, a.selection, a.is_demo, a.quality_total, a.published_at, a.updated_at, a.updated_by, t.title, t.slug,
    (SELECT 1 FROM article_translations e WHERE e.article_id = a.id AND e.lang = 'en' AND e.ready = 1) AS has_en
    FROM articles a LEFT JOIN article_translations t ON t.article_id = a.id AND t.lang = 'fr'` + (w.length ? " WHERE " + w.join(" AND ") : "") + " ORDER BY a.updated_at DESC LIMIT ?";
  return all(db.prepare(sql).bind(...b, Math.min(Math.max(limit, 1), 300)));
}

function cleanSources(list) {
  return (Array.isArray(list) ? list : []).slice(0, 40).map((s, i) => ({ ordinal: i + 1, label: str(s.label, 300).trim(), url: str(s.url, 500).trim() || null, publisher: str(s.publisher, 200).trim() || null,
    kind: ["primary", "secondary", "data", "illustrative"].includes(s.kind) ? s.kind : "primary", accessed_on: str(s.accessed_on, 20).trim() || null, note: str(s.note, 400).trim() || null }));
}

/** Enregistre l'ensemble du document d'un article : champs, versions FR/EN, sources, articles associés. Une publication en ligne reste soumise aux règles de publication. */
export async function saveArticle(db, id, doc, actor) {
  const cur = await getArticle(db, id); if (!cur) throw new EditorialError("not_found", "Article introuvable.");
  const a = cur.article, now = nowIso(), d = doc || {};
  const category_id = d.category_id ?? a.category_id, format_id = d.format_id ?? a.format_id;
  if (!catById(category_id) || !fmtById(format_id)) throw new EditorialError("invalid", "Rubrique ou format invalide.");
  const tool = d.tool_suggestion ? String(d.tool_suggestion) : null; if (tool && !toolById(tool)) throw new EditorialError("invalid", "Outil suggéré inconnu.");
  const quality = d.quality === undefined ? a.quality : d.quality;
  const sources = d.sources === undefined ? cur.sources : cleanSources(d.sources);
  const next = { category_id, format_id, tool_suggestion: tool, hero_image: str(d.hero_image ?? a.hero_image, 300).trim() || null, hero_alt: str(d.hero_alt ?? a.hero_alt, 300).trim() || null,
    author: str(d.author ?? a.author, 120).trim() || "MAIORIS", featured: d.featured === undefined ? a.featured : d.featured ? 1 : 0, selection: d.selection === undefined ? a.selection : d.selection ? 1 : 0, quality };
  // versions linguistiques
  const trs = {}; for (const t of cur.translations) trs[t.lang] = { ...t };
  for (const t of Array.isArray(d.translations) ? d.translations : []) {
    if (!LANGS.includes(t.lang)) continue;
    const prev = trs[t.lang] || { lang: t.lang, slug: null, first_slug_locked: false };
    const slug = t.slug === undefined ? prev.slug : (str(t.slug, 80).trim() || null);
    if (slug && !SLUG.test(slug)) throw new EditorialError("invalid_slug", "Adresse invalide : lettres minuscules, chiffres et tirets.", { lang: t.lang });
    if (a.first_published_at && prev.slug && slug !== prev.slug) throw new EditorialError("slug_locked", "Une adresse déjà publiée ne change plus : les URLs restent stables.", { lang: t.lang });
    trs[t.lang] = { ...prev, lang: t.lang, ready: t.ready === undefined ? prev.ready || 0 : t.ready ? 1 : 0, slug, title: str(t.title ?? prev.title, 200), subtitle: str(t.subtitle ?? prev.subtitle, 300), summary: str(t.summary ?? prev.summary, 600),
      body_md: str(t.body_md ?? prev.body_md, 120000), meta_title: str(t.meta_title ?? prev.meta_title, 120), meta_description: str(t.meta_description ?? prev.meta_description, 300),
      takeaways: (Array.isArray(t.takeaways) ? t.takeaways : prev.takeaways || []).slice(0, 8).map((x) => str(x, 300).trim()).filter(Boolean) };
  }
  for (const t of Object.values(trs)) { const r = renderMarkdown(t.body_md, { sourceCount: sources.length, lang: t.lang }); t.word_count = r.words; t.reading_minutes = readingMinutes(r.words); }
  const related = (d.related === undefined ? cur.related : (Array.isArray(d.related) ? d.related : [])).map(String).filter((x) => x !== id).slice(0, 6);
  if (related.length) { const found = await all(db.prepare(`SELECT id FROM articles WHERE id IN (${related.map(() => "?").join(",")})`).bind(...related)); if (found.length !== related.length) throw new EditorialError("invalid", "Article associé inconnu."); }
  // une publication en ligne ne peut pas être dégradée par une sauvegarde
  if (a.status === "published") {
    const g = validateForPublish({ ...a, ...next, is_demo: a.is_demo }, Object.values(trs), sources);
    if (!g.ok) throw new EditorialError("gate", "Cette publication est en ligne : les modifications doivent respecter les règles de publication.", g.errors);
  }
  // unicité des adresses par langue
  for (const t of Object.values(trs)) if (t.slug) { const c = await one(db.prepare("SELECT article_id FROM article_translations WHERE lang = ? AND slug = ? AND article_id <> ?").bind(t.lang, t.slug, id)); if (c) throw new EditorialError("slug_taken", "Cette adresse est déjà utilisée par une autre publication.", { lang: t.lang }); }
  const stmts = [
    db.prepare(`UPDATE articles SET category_id = ?, format_id = ?, tool_suggestion = ?, hero_image = ?, hero_alt = ?, author = ?, featured = ?, selection = ?, quality_json = ?, quality_total = ?, updated_at = ?, updated_by = ? WHERE id = ?`)
      .bind(next.category_id, next.format_id, next.tool_suggestion, next.hero_image, next.hero_alt, next.author, next.featured, next.selection, quality ? JSON.stringify(quality) : null, qualityTotal(quality), now, actor, id),
    db.prepare("DELETE FROM article_sources WHERE article_id = ?").bind(id), db.prepare("DELETE FROM article_related WHERE article_id = ?").bind(id),
  ];
  for (const s of sources) stmts.push(db.prepare("INSERT INTO article_sources (id, article_id, ordinal, label, url, publisher, kind, accessed_on, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(ulid(), id, s.ordinal, s.label, s.url, s.publisher, s.kind, s.accessed_on, s.note));
  related.forEach((r, i) => stmts.push(db.prepare("INSERT INTO article_related (article_id, related_id, ordinal) VALUES (?, ?, ?)").bind(id, r, i)));
  for (const t of Object.values(trs)) {
    stmts.push(db.prepare(`INSERT INTO article_translations (article_id, lang, ready, slug, title, subtitle, summary, body_md, meta_title, meta_description, takeaways_json, word_count, reading_minutes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(article_id, lang) DO UPDATE SET ready = excluded.ready, slug = excluded.slug, title = excluded.title, subtitle = excluded.subtitle, summary = excluded.summary,
      body_md = excluded.body_md, meta_title = excluded.meta_title, meta_description = excluded.meta_description, takeaways_json = excluded.takeaways_json, word_count = excluded.word_count, reading_minutes = excluded.reading_minutes, updated_at = excluded.updated_at`)
      .bind(id, t.lang, t.ready || 0, t.slug, t.title, t.subtitle, t.summary, t.body_md, t.meta_title, t.meta_description, JSON.stringify(t.takeaways || []), t.word_count, t.reading_minutes, now));
    stmts.push(db.prepare("INSERT INTO article_revisions (id, article_id, lang, saved_at, saved_by, snapshot_json) VALUES (?, ?, ?, ?, ?, ?)").bind(ulid(), id, t.lang, now, actor, JSON.stringify({ title: t.title, subtitle: t.subtitle, summary: t.summary, body_md: t.body_md, slug: t.slug })));
  }
  stmts.push(db.prepare("DELETE FROM article_revisions WHERE article_id = ? AND id NOT IN (SELECT id FROM article_revisions WHERE article_id = ? ORDER BY saved_at DESC, id DESC LIMIT 40)").bind(id, id));
  await db.batch(stmts); await auditEv(db, now, actor, "article.saved", id, null);
  return getArticle(db, id);
}

/** Changement de statut. La mise en ligne exige l'état « approved », la grille de qualité à 85 et les règles de publication. */
export async function transition(db, id, to, actor, { publish_at } = {}) {
  const cur = await getArticle(db, id); if (!cur) throw new EditorialError("not_found", "Article introuvable.");
  const a = cur.article, now = nowIso();
  if (!(TRANSITIONS[a.status] || []).includes(to)) throw new EditorialError("transition", `Passage impossible de « ${a.status} » à « ${to} ».`);
  let publishedAt = a.published_at;
  if (to === "published") {
    const g = validateForPublish(a, cur.translations, cur.sources);
    if (!g.ok) throw new EditorialError("gate", "La publication ne respecte pas les règles éditoriales.", g.errors);
    publishedAt = publish_at ? new Date(publish_at).toISOString() : now;
    if (Number.isNaN(new Date(publishedAt).getTime())) throw new EditorialError("invalid", "Date de publication invalide.");
  }
  await db.batch([
    db.prepare(`UPDATE articles SET status = ?, published_at = ?, first_published_at = COALESCE(first_published_at, ?), approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END,
      published_by = CASE WHEN ? = 'published' THEN ? ELSE published_by END, updated_at = ?, updated_by = ? WHERE id = ?`)
      .bind(to, to === "published" ? publishedAt : to === "draft" ? null : a.published_at, to === "published" ? publishedAt : null, to, actor, to, actor, now, actor, id),
    db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id, meta_json) VALUES (?, ?, ?, ?, 'article', ?, ?)").bind(ulid(), now, actor, "article." + to, id, JSON.stringify({ from: a.status, publish_at: to === "published" ? publishedAt : null })),
  ]);
  return getArticle(db, id);
}

/** Suppression : uniquement un brouillon jamais publié. Sinon, archiver. */
export async function deleteDraft(db, id, actor) {
  const a = await one(db.prepare("SELECT status, first_published_at FROM articles WHERE id = ?").bind(id)); if (!a) throw new EditorialError("not_found", "Article introuvable.");
  if (a.status !== "draft" || a.first_published_at) throw new EditorialError("not_deletable", "Seul un brouillon jamais publié peut être supprimé. Archivez les autres.");
  const now = nowIso(); await db.batch([db.prepare("DELETE FROM articles WHERE id = ?").bind(id), db.prepare("INSERT INTO audit_events (id, at, actor, action, object_type, object_id) VALUES (?, ?, ?, 'article.deleted', 'article', ?)").bind(ulid(), now, actor, id)]);
}

/* ---------- Lecture publique : uniquement « published » dont la date est atteinte, dans une langue disponible ---------- */
const VISIBLE = `a.status = 'published' AND a.published_at IS NOT NULL AND a.published_at <= ? AND t.slug IS NOT NULL AND t.title <> '' AND (t.lang = 'fr' OR t.ready = 1)`;
const COLS = "a.id, a.category_id, a.format_id, a.featured, a.selection, a.is_demo, a.tool_suggestion, a.hero_image, a.hero_alt, a.author, a.published_at, a.updated_at, t.lang, t.slug, t.title, t.subtitle, t.summary, t.reading_minutes";

export async function publicList(db, lang, { category, format, q, limit = 12, offset = 0, featured, selection, excludeId } = {}, now = nowIso()) {
  const w = [VISIBLE], b = [now]; w.unshift("t.lang = ?"); b.unshift(lang);
  if (category) { w.push("a.category_id = ?"); b.push(category); } if (format) { w.push("a.format_id = ?"); b.push(format); }
  if (featured) w.push("a.featured = 1"); if (selection) w.push("a.selection = 1"); if (excludeId) { w.push("a.id <> ?"); b.push(excludeId); }
  if (q) { w.push("(t.title LIKE ? OR t.summary LIKE ? OR t.subtitle LIKE ?)"); const l = "%" + String(q).replace(/[%_]/g, "").slice(0, 60) + "%"; b.push(l, l, l); }
  const where = w.join(" AND ");
  const rows = await all(db.prepare(`SELECT ${COLS} FROM articles a JOIN article_translations t ON t.article_id = a.id WHERE ${where} ORDER BY a.published_at DESC, a.id DESC LIMIT ? OFFSET ?`).bind(...b, Math.min(limit, 60), Math.max(offset, 0)));
  const total = (await one(db.prepare(`SELECT COUNT(*) AS n FROM articles a JOIN article_translations t ON t.article_id = a.id WHERE ${where}`).bind(...b))).n;
  return { items: rows, total };
}

export async function publicGet(db, lang, slug, now = nowIso()) {
  const row = await one(db.prepare(`SELECT ${COLS}, t.body_md, t.takeaways_json, t.meta_title, t.meta_description FROM articles a JOIN article_translations t ON t.article_id = a.id WHERE t.lang = ? AND t.slug = ? AND ${VISIBLE}`).bind(lang, slug, now));
  if (!row) return null;
  const [sources, other, related] = await Promise.all([
    all(db.prepare("SELECT ordinal, label, url, publisher, kind, accessed_on, note FROM article_sources WHERE article_id = ? ORDER BY ordinal").bind(row.id)),
    one(db.prepare(`SELECT t.lang, t.slug FROM articles a JOIN article_translations t ON t.article_id = a.id WHERE a.id = ? AND t.lang <> ? AND ${VISIBLE}`).bind(row.id, lang, now)),
    all(db.prepare(`SELECT ${COLS} FROM article_related r JOIN articles a ON a.id = r.related_id JOIN article_translations t ON t.article_id = a.id AND t.lang = ? WHERE r.article_id = ? AND ${VISIBLE} ORDER BY r.ordinal`).bind(lang, row.id, now))]);
  return { ...row, takeaways: JSON.parse(row.takeaways_json || "[]"), sources, alternate: other || null, related };
}

export async function publicByIds(db, lang, ids, now = nowIso()) {
  if (!ids || !ids.length) return [];
  return all(db.prepare(`SELECT ${COLS} FROM articles a JOIN article_translations t ON t.article_id = a.id AND t.lang = ? WHERE a.id IN (${ids.map(() => "?").join(",")}) AND ${VISIBLE}`).bind(lang, ...ids, now));
}
export async function sitemapEntries(db, now = nowIso()) {
  return all(db.prepare(`SELECT a.id, a.category_id, a.updated_at, a.published_at, t.lang, t.slug FROM articles a JOIN article_translations t ON t.article_id = a.id WHERE a.is_demo = 0 AND ${VISIBLE} ORDER BY a.published_at DESC`).bind(now));
}
export async function categoryCounts(db, lang, now = nowIso()) {
  return all(db.prepare(`SELECT a.category_id, COUNT(*) AS n FROM articles a JOIN article_translations t ON t.article_id = a.id WHERE t.lang = ? AND ${VISIBLE} GROUP BY a.category_id`).bind(lang, now));
}
