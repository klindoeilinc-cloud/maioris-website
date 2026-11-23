/* Assemblage des pages publiques de la section éditoriale (accueil, rubriques, articles) : utilisé par la route publique et par l'aperçu de l'administration. */
import { esc } from "./markdown.js";
import { CATEGORIES, catById, catBySlug } from "./taxonomy.js";
import * as R from "./render.js";
import * as SEO from "./seo.js";
import { publicList, publicGet, categoryCounts } from "./store.js";
import { nowIso } from "../util.js";
import { SECURITY_HEADERS } from "../security.js";

const O = SEO.ORIGIN;
const page = async (env, request, lang, { head, main, status = 200, headers = {}, langHref }) => {
  const shell = await R.loadFragment(env, request, `/editorial-shell/${lang}.html`);
  return new Response(R.fillShell(shell, { head, main, langHref }), { status, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS, ...headers } });
};
const PUBLIC_CACHE = { "Cache-Control": "public, max-age=60" };

export async function notFoundPage(env, request, lang) {
  const L = R.t(lang);
  return page(env, request, lang, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }, langHref: `/${lang === "fr" ? "en" : "fr"}/perspectives`,
    head: SEO.head({ lang, title: `404 | ${L.title} | MAIORIS`, description: L.notFound, canonical: `${O}/${lang}/perspectives`, robots: "noindex" }), main: R.notFound(lang) });
}

export async function hubPage(env, request, lang, now = nowIso()) {
  const L = R.t(lang); let featured = null, latest = [], selection = [], counts = [];
  if (env.MAIORIS_DB) {
    try {
      const db = env.MAIORIS_DB, f = await publicList(db, lang, { featured: true, limit: 1 }, now); featured = f.items[0] || null;
      if (!featured) { const l1 = await publicList(db, lang, { limit: 1 }, now); featured = l1.items[0] || null; }
      latest = (await publicList(db, lang, { limit: 7, excludeId: featured && featured.id }, now)).items.slice(0, 6);
      selection = (await publicList(db, lang, { selection: true, limit: 3, excludeId: featured && featured.id }, now)).items; counts = await categoryCounts(db, lang, now);
    } catch (e) { console.error("editorial hub", e && e.message); }
  }
  const newsletter = await R.loadFragment(env, request, `/editorial-shell/newsletter-${lang}.html`);
  const url = `${O}${R.hubUrl(lang)}`, other = lang === "fr" ? "en" : "fr";
  return page(env, request, lang, { headers: PUBLIC_CACHE, langHref: R.hubUrl(other),
    head: SEO.head({ lang, title: `Strategic Cases & Perspectives | MAIORIS`, description: L.pos, canonical: url, alternates: [{ lang: "fr", url: `${O}/fr/perspectives` }, { lang: "en", url: `${O}/en/perspectives` }],
      jsonld: [SEO.breadcrumbLd([{ name: "MAIORIS", url: `${O}/${lang}/` }, { name: L.home, url }])] }),
    main: R.hub(lang, { featured, latest, selection, counts, newsletter }) });
}

export async function categoryPage(env, request, lang, slug, url, now = nowIso()) {
  const cat = catBySlug(slug); if (!cat) return notFoundPage(env, request, lang);
  const L = R.t(lang), format = url.searchParams.get("format") || "", q = (url.searchParams.get("q") || "").trim().slice(0, 60), pageNo = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1), size = 12;
  let items = [], total = 0;
  if (env.MAIORIS_DB) { try { const r = await publicList(env.MAIORIS_DB, lang, { category: cat.id, format: ["case", "brief", "deep", "signals", "framework", "outlook"].includes(format) ? format : undefined, q: q || undefined, limit: size, offset: (pageNo - 1) * size }, now); items = r.items; total = r.total; } catch (e) { console.error("editorial category", e && e.message); } }
  const canonical = `${O}${R.catUrl(lang, cat)}`, other = lang === "fr" ? "en" : "fr", filtered = !!(format || q || pageNo > 1);
  return page(env, request, lang, { headers: PUBLIC_CACHE, langHref: R.catUrl(other, cat),
    head: SEO.head({ lang, title: `${cat.name[lang]} | Strategic Cases & Perspectives | MAIORIS`, description: cat.desc[lang], canonical, robots: filtered ? "noindex, follow" : undefined,
      alternates: [{ lang: "fr", url: `${O}${R.catUrl("fr", cat)}` }, { lang: "en", url: `${O}${R.catUrl("en", cat)}` }], jsonld: [SEO.breadcrumbLd([{ name: "MAIORIS", url: `${O}/${lang}/` }, { name: L.home, url: `${O}${R.hubUrl(lang)}` }, { name: cat.name[lang], url: canonical }])] }),
    main: R.category(lang, cat, { items, total, page: pageNo, pageSize: size, format, q }) });
}

/** Page d'un article. `art` vient de publicGet (public) ou de l'administration (aperçu : brouillons compris). */
export async function articlePage(env, request, lang, art, { preview = false } = {}) {
  const cat = catById(art.category_id), L = R.t(lang), url = `${O}${R.urlOf(lang, art)}`, other = lang === "fr" ? "en" : "fr";
  const alternates = art.alternate ? [{ lang, url }, { lang: art.alternate.lang, url: `${O}/${art.alternate.lang}/perspectives/${cat.slug}/${art.alternate.slug}` }] : [];
  const headers = preview ? { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } : { ...PUBLIC_CACHE, ...(art.is_demo ? { "X-Robots-Tag": "noindex" } : {}) };
  return page(env, request, lang, { headers, langHref: art.alternate ? `/${art.alternate.lang}/perspectives/${cat.slug}/${art.alternate.slug}` : R.hubUrl(other),
    head: SEO.head({ lang, title: `${art.meta_title || art.title} | MAIORIS`.slice(0, 120), description: art.meta_description || art.summary, canonical: url, alternates, image: art.hero_image || undefined, type: "article", published: art.published_at || undefined, modified: art.updated_at,
      robots: preview || art.is_demo ? "noindex, nofollow" : undefined,
      jsonld: [SEO.articleLd({ lang, url, title: art.title, description: art.meta_description || art.summary, image: art.hero_image || undefined, published: art.published_at || art.updated_at, modified: art.updated_at }),
        SEO.breadcrumbLd([{ name: "MAIORIS", url: `${O}/${lang}/` }, { name: L.home, url: `${O}${R.hubUrl(lang)}` }, { name: cat.name[lang], url: `${O}${R.catUrl(lang, cat)}` }, { name: art.title, url }])] }),
    main: R.article(lang, art, { preview }) });
}

export async function route(env, request, lang, segs, now = nowIso()) {
  const url = new URL(request.url);
  if (!segs.length) return hubPage(env, request, lang, now);
  if (segs.length === 1) return categoryPage(env, request, lang, segs[0], url, now);
  if (segs.length === 2 && env.MAIORIS_DB) {
    const cat = catBySlug(segs[0]); let art = null;
    try { art = cat ? await publicGet(env.MAIORIS_DB, lang, segs[1], now) : null; } catch (e) { console.error("editorial article", e && e.message); }
    if (art && art.category_id === cat.id) return articlePage(env, request, lang, art);
  }
  return notFoundPage(env, request, lang);
}
export { CATEGORIES, esc };
