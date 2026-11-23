/* API d'administration éditoriale : appelée par /api/admin/[[path]].js APRÈS vérification du jeton Cloudflare Access.
   Routes (préfixe /api/admin/editorial/) :
     GET  meta                              rubriques, formats, outils, statuts, grille de qualité
     GET  articles?status=&category=&q=     liste
     POST articles                          { category_id, format_id } crée un brouillon
     GET  articles/:id                      document complet
     PUT  articles/:id                      enregistre champs, versions FR/EN, sources, articles associés
     POST articles/:id/transition           { to, publish_at? } statut (la mise en ligne applique les règles de publication)
     POST articles/:id/delete               supprime un brouillon jamais publié
     GET  articles/:id/preview?lang=        aperçu rendu (brouillons compris), jamais indexable
     GET  revisions/:id                     version enregistrée d'un texte
     GET  media                             bibliothèque d'images
     POST media                             téléversement (multipart : file, alt) : type vérifié sur les octets, métadonnées retirées
     PUT  media/:id                         { alt }
     POST media/:id/delete                  suppression (refusée si l'image est utilisée) */
import { json } from "../util.js";
import { CATEGORIES, FORMATS, TOOLS, STATUSES, TRANSITIONS, QUALITY, QUALITY_THRESHOLD } from "./taxonomy.js";
import { EditorialError, createArticle, getArticle, listArticles, saveArticle, transition, deleteDraft, publicByIds } from "./store.js";
import { articlePage } from "./pages.js";
import { MediaError, uploadMedia, listMedia, updateAlt, deleteMedia, ID_RE as MEDIA_ID } from "./media.js";
import { nowIso } from "../util.js";

const NS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const out = (b, s = 200) => json(b, s, NS);
const STATUS = { in_use: 409, no_storage: 503, alt: 422, media_missing: 422, too_large: 413, format: 422, corrupt: 422, dimensions: 422, empty: 422, unsupported: 422, quota: 409, not_found: 404, gate: 422, invalid: 422, invalid_slug: 422, slug_locked: 422, slug_taken: 409, transition: 409, not_deletable: 409 };
const ID = /^[0-9A-Za-z]{10,40}$/;

async function body(request) {
  const txt = (await request.text()).slice(0, 600000);
  try { return JSON.parse(txt || "{}"); } catch { throw new EditorialError("invalid", "Corps de requête illisible."); }
}

export async function handleEditorial({ request, env, auth, path, url }) {
  const db = env.MAIORIS_DB, method = request.method, actor = auth.email;
  try {
    if (method === "GET" && path === "meta") return out({ ok: true, categories: CATEGORIES, formats: FORMATS, tools: TOOLS, statuses: STATUSES, transitions: TRANSITIONS, quality: QUALITY, threshold: QUALITY_THRESHOLD });
    if (method === "GET" && path === "articles") return out({ ok: true, items: await listArticles(db, { status: url.searchParams.get("status") || undefined, category: url.searchParams.get("category") || undefined, q: url.searchParams.get("q") || undefined }) });
    if (method === "POST" && path === "articles") { const d = await body(request); return out({ ok: true, id: await createArticle(db, { category_id: d.category_id, format_id: d.format_id }, actor) }, 201); }
    if (path === "media" || path.startsWith("media/")) {
      if (method === "GET" && path === "media") return out({ ok: true, storage: !!env.MAIORIS_MEDIA, items: await listMedia(db) });
      if (method === "POST" && path === "media") {
        if (parseInt(request.headers.get("Content-Length") || "0", 10) > 6 * 1024 * 1024) return out({ ok: false, error: "too_large", message: "Image trop lourde : 5 Mo au maximum." }, 413);
        let form; try { form = await request.formData(); } catch { throw new MediaError("format", "Envoi illisible : utilisez un formulaire de téléversement."); }
        const file = form.get("file"); if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") throw new MediaError("empty", "Choisissez une image.");
        if (file.size > 5 * 1024 * 1024) throw new MediaError("too_large", "Image trop lourde : 5 Mo au maximum.");
        const r = await uploadMedia(env, { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, alt: String(form.get("alt") || ""), actor });
        return out({ ok: true, media: { id: r.id, url: "/media/" + r.id, mime: r.mime, width: r.width, height: r.height, size_bytes: r.size_bytes, alt: r.alt, duplicate: !!r.duplicate } }, r.duplicate ? 200 : 201);
      }
      const mm = /^media\/([^/]+)(?:\/(delete))?$/.exec(path);
      if (mm && MEDIA_ID.test(mm[1])) {
        if (method === "PUT" && !mm[2]) { const d = await body(request); await updateAlt(db, mm[1], d.alt, actor); return out({ ok: true }); }
        if (method === "POST" && mm[2] === "delete") { await deleteMedia(env, mm[1], actor); return out({ ok: true }); }
      }
      return out({ ok: false, error: "not_found" }, 404);
    }
    let m = /^articles\/([^/]+)$/.exec(path);
    if (m) {
      if (!ID.test(m[1])) return out({ ok: false, error: "not_found" }, 404);
      if (method === "GET") { const g = await getArticle(db, m[1]); return g ? out({ ok: true, ...g }) : out({ ok: false, error: "not_found" }, 404); }
      if (method === "PUT") { const d = await body(request); delete d.is_demo; delete d.status; return out({ ok: true, ...(await saveArticle(db, m[1], d, actor)) }); }
    }
    m = /^articles\/([^/]+)\/(transition|delete|preview)$/.exec(path);
    if (m && ID.test(m[1])) {
      if (m[2] === "transition" && method === "POST") { const d = await body(request); return out({ ok: true, ...(await transition(db, m[1], String(d.to || ""), actor, { publish_at: d.publish_at || undefined })) }); }
      if (m[2] === "delete" && method === "POST") { await deleteDraft(db, m[1], actor); return out({ ok: true }); }
      if (m[2] === "preview" && method === "GET") {
        const g = await getArticle(db, m[1]); if (!g) return out({ ok: false, error: "not_found" }, 404);
        const lang = url.searchParams.get("lang") === "en" ? "en" : "fr", tr = g.translations.find((t) => t.lang === lang);
        if (!tr) return out({ ok: false, error: "no_translation" }, 404);
        const now = nowIso(), a = g.article;
        const art = { id: a.id, category_id: a.category_id, format_id: a.format_id, tool_suggestion: a.tool_suggestion, hero_image: a.hero_image, hero_alt: a.hero_alt, author: a.author, is_demo: a.is_demo, published_at: a.published_at || now, updated_at: a.updated_at,
          slug: tr.slug || "apercu", title: tr.title || "(sans titre)", subtitle: tr.subtitle, summary: tr.summary, body_md: tr.body_md, meta_title: tr.meta_title, meta_description: tr.meta_description, reading_minutes: tr.reading_minutes, takeaways: tr.takeaways,
          sources: g.sources, alternate: null, related: await publicByIds(db, lang, g.related, now) };
        return articlePage(env, request, lang, art, { preview: true });
      }
    }
    m = /^revisions\/([^/]+)$/.exec(path);
    if (m && method === "GET" && ID.test(m[1])) { const r = await db.prepare("SELECT id, article_id, lang, saved_at, saved_by, snapshot_json FROM article_revisions WHERE id = ?").bind(m[1]).first(); return r ? out({ ok: true, revision: { ...r, snapshot: JSON.parse(r.snapshot_json) } }) : out({ ok: false, error: "not_found" }, 404); }
    return out({ ok: false, error: "not_found" }, 404);
  } catch (e) {
    if (e instanceof MediaError) return out({ ok: false, error: e.code, message: e.message, details: e.details || null }, STATUS[e.code] || 400);
    if (e instanceof EditorialError) return out({ ok: false, error: e.code, message: e.message, details: e.details || null }, STATUS[e.code] || 400);
    console.error("editorial admin", e && e.message); return out({ ok: false, error: "server" }, 500);
  }
}
