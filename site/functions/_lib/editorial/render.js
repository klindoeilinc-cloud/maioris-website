/* Rendu HTML de la section éditoriale. Tout texte issu de la base est échappé ; le contenu des articles passe par le moteur Markdown sûr. */
import { esc, renderMarkdown } from "./markdown.js";
import { CATEGORIES, FORMATS, catById, catBySlug, fmtById, toolById } from "./taxonomy.js";
import * as SEO from "./seo.js";

const NB = "\u00a0";
const T = {
  fr: { title: "STRATEGIC CASES & PERSPECTIVES", sig: "MAIORIS · THINKING BEYOND CREATIVE EXECUTION.",
    pos: "Une plateforme d'intelligence stratégique consacrée à l'évolution des marques, au Creative Leadership, aux systèmes créatifs, à la transformation des organisations et aux nouvelles dynamiques économiques et technologiques.",
    promise: "Explore the ideas, intelligence and strategic shifts shaping the future of brands and creative leadership.", promiseFr: "Les idées, l'intelligence et les mutations stratégiques qui façonnent l'avenir des marques et du Creative Leadership.",
    feat: "Featured Analysis", latest: "Latest Perspectives", cats: "Editorial Categories", selection: "Strategic Selection", selectionLead: "Une sélection pour les dirigeants.", pov: "MAIORIS Point of View",
    povText: "Creative Leadership is not about producing more creative work. It is about building the conditions, systems and decisions that make creative performance sustainable.",
    povFr: "Le Creative Leadership ne consiste pas à produire davantage de création. Il consiste à construire les conditions, les systèmes et les décisions qui rendent la performance créative durable.",
    ctaT: "De la lecture au diagnostic", ctaP: "Pour passer de l'analyse à votre propre situation : les outils d'intelligence MAIORIS, puis le Creative Audit, mission indépendante de diagnostic stratégique.", ctaTools: "Découvrir les outils d'intelligence", ctaAudit: "Découvrir le Creative Audit",
    archT: "Dans les archives MAIORIS", archP: "Les analyses déjà publiées restent consultables.", archIns: "MAIORIS Insights", archInsP: "Analyses sur la direction créative, la stratégie et la performance.", archCases: "Études de cas stratégiques", archCasesP: "Retours d'expérience et cas fictifs clairement identifiés.",
    emptyT: "Les premières publications de cette plateforme ne sont pas encore en ligne.", emptyP: "En attendant, les analyses déjà publiées par MAIORIS sont disponibles dans les archives ci-dessous.",
    nlT: "Lettre éditoriale", nlP: "Une lettre consacrée à l'intelligence des marques et au Creative Leadership, adressée à celles et ceux qui les dirigent.",
    kLatest: "Dernières publications", kCats: "Cinq rubriques permanentes", kSel: "Pour les dirigeants", pub1: "publication", pubN: "publications",
    read: "min de lecture", all: "Toutes", format: "Format", search: "Rechercher", searchPh: "Rechercher une publication", none: "Aucune publication ne correspond.", prev: "Page précédente", next: "Page suivante", pubs: "publication(s)",
    home: "Perspectives", toc: "Sommaire", take: "Key Takeaways", sources: "Sources et références", related: "Pour prolonger", by: "Par", demo: "Exemple éditorial fictif. Ce contenu illustre le format ; il ne constitue pas une publication ni une étude de cas réelle de MAIORIS.",
    preview: "Aperçu éditorial : contenu non publié, visible par l'équipe uniquement.", toolK: "Pour aller plus loin", toolGo: "Ouvrir l'outil", audit: "Le Creative Audit est une mission indépendante de diagnostic stratégique, au tarif officiel de 750" + NB + "000" + NB + "FCFA.", auditGo: "Découvrir le Creative Audit",
    notFound: "Cette page n'existe pas ou n'est plus publiée.", back: "Retour aux Perspectives", srcAccessed: "consulté le", illustrative: "Scénario fictif construit par MAIORIS à des fins d'illustration.", catPage: "Rubrique", toolsHref: "/fr/analyses", auditHref: "/fr/accompagnement/creative-audit", insHref: "/fr/analyses", casesHref: "/fr/cas-strategiques", langName: "fr-FR" },
  en: { title: "STRATEGIC CASES & PERSPECTIVES", sig: "MAIORIS · THINKING BEYOND CREATIVE EXECUTION.",
    pos: "A strategic intelligence platform on the evolution of brands, Creative Leadership, creative systems, organisational transformation and new economic and technological dynamics.",
    promise: "Explore the ideas, intelligence and strategic shifts shaping the future of brands and creative leadership.", promiseFr: "",
    feat: "Featured Analysis", latest: "Latest Perspectives", cats: "Editorial Categories", selection: "Strategic Selection", selectionLead: "A selection for executives.", pov: "MAIORIS Point of View",
    povText: "Creative Leadership is not about producing more creative work. It is about building the conditions, systems and decisions that make creative performance sustainable.", povFr: "",
    ctaT: "From reading to diagnosis", ctaP: "To move from analysis to your own situation: the MAIORIS intelligence tools, then the Creative Audit, an independent strategic diagnostic engagement.", ctaTools: "Discover the intelligence tools", ctaAudit: "Discover the Creative Audit",
    archT: "From the MAIORIS archives", archP: "The analyses already published remain available.", archIns: "MAIORIS Insights", archInsP: "Analyses on creative direction, strategy and performance.", archCases: "Strategic case studies", archCasesP: "Field experience and clearly identified fictional cases.",
    emptyT: "The first publications on this platform are not online yet.", emptyP: "In the meantime, the analyses MAIORIS has already published are available in the archives below.",
    nlT: "Editorial newsletter", nlP: "A newsletter on brand intelligence and Creative Leadership, for the people who lead them.",
    kLatest: "Latest publications", kCats: "Five permanent sections", kSel: "For executives", pub1: "publication", pubN: "publications",
    read: "min read", all: "All", format: "Format", search: "Search", searchPh: "Search publications", none: "No publication matches.", prev: "Previous page", next: "Next page", pubs: "publication(s)",
    home: "Perspectives", toc: "Contents", take: "Key Takeaways", sources: "Sources and references", related: "Keep reading", by: "By", demo: "Fictional editorial example. This content illustrates the format; it is not a real MAIORIS publication or case study.",
    preview: "Editorial preview: unpublished content, visible to the team only.", toolK: "Go further", toolGo: "Open the tool", audit: "The Creative Audit is an independent strategic diagnostic engagement, at the official fee of 750" + NB + "000" + NB + "FCFA.", auditGo: "Discover the Creative Audit",
    notFound: "This page does not exist or is no longer published.", back: "Back to Perspectives", srcAccessed: "accessed", illustrative: "Fictional scenario built by MAIORIS for illustration.", catPage: "Section", toolsHref: "/en/insights", auditHref: "/en/advisory/creative-audit", insHref: "/en/insights", casesHref: "/en/strategic-cases", langName: "en-GB" },
};
export const t = (lang) => T[lang] || T.fr;
export const urlOf = (lang, a) => `/${lang}/perspectives/${catById(a.category_id).slug}/${a.slug}`;
export const hubUrl = (lang) => `/${lang}/perspectives`;
export const catUrl = (lang, c) => `/${lang}/perspectives/${c.slug}`;
const fdate = (iso, lang) => new Date(iso).toLocaleDateString(t(lang).langName, { day: "numeric", month: "long", year: "numeric" });

/* Visuel éditorial par défaut : composition géométrique déterministe aux couleurs de la charte, utilisée quand une publication n'a pas d'image. */
export function defaultVisual(seed, catId) {
  let h = 2166136261; for (const ch of String(seed || catId)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const r = (n) => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return Math.abs(h) % n; };
  const accent = { cases: "#243BFF", perspectives: "#FFD84D", future: "#19B77A", intelligence: "#FF6B5E", african: "#FFD84D" }[catId] || "#243BFF", cream = "#FFF8EA";
  const shapes = [`<rect width="640" height="400" fill="#101A3A"/>`, `<circle cx="${120 + r(380)}" cy="${80 + r(240)}" r="${70 + r(70)}" fill="${accent}"/>`, `<rect x="${40 + r(300)}" y="${60 + r(200)}" width="${120 + r(160)}" height="${30 + r(90)}" fill="${cream}" opacity=".92"/>`,
    `<path d="M${r(200)} 400 L${220 + r(200)} ${150 + r(120)} L${420 + r(220)} 400Z" fill="${accent}" opacity=".55"/>`, `<line x1="0" y1="${300 + r(70)}" x2="640" y2="${240 + r(110)}" stroke="${cream}" stroke-width="2" opacity=".7"/>`];
  return `<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">${shapes.join("")}</svg>`;
}
const visual = (a, lang, eager) => a.hero_image ? `<img src="${esc(a.hero_image)}" alt="${esc(a.hero_alt || "")}" ${eager ? "" : 'loading="lazy" '}decoding="async" width="${a.hero_w || 1200}" height="${a.hero_h || 750}">` : defaultVisual(a.slug || a.id, a.category_id);
const metaLine = (a, lang) => { const f = fmtById(a.format_id); return `<ul class="ed-meta"><li class="ed-fmt">${esc(f.name[lang])}</li><li>${a.reading_minutes}${NB}${t(lang).read}</li><li><time datetime="${esc(a.published_at)}">${esc(fdate(a.published_at, lang))}</time></li></ul>`; };
const demoTag = (a, lang) => a.is_demo ? `<p class="ed-meta"><span class="ed-fmt">${lang === "fr" ? "Exemple éditorial fictif" : "Fictional editorial example"}</span></p>` : "";
export function card(a, lang, level = 3) {
  const c = catById(a.category_id);
  return `<a class="ed-card" href="${esc(urlOf(lang, a))}"><span class="ed-vis">${visual(a, lang)}</span><p class="ed-k" style="margin:0;font-size:11.5px">${esc(c.name[lang])}</p>${metaLine(a, lang)}${demoTag(a, lang)}<h${level} class="ed-h3">${esc(a.title)}</h${level}><p class="ed-sum">${esc(a.summary)}</p></a>`;
}

export function hub(lang, { featured, latest, selection, counts, newsletter }) {
  const L = t(lang), cnt = Object.fromEntries((counts || []).map((c) => [c.category_id, c.n]));
  const heroSide = featured ? `<a class="ed-feature" href="${esc(urlOf(lang, featured))}"><span class="ed-vis">${visual(featured, lang, true)}</span><p class="ed-k" style="margin:0">${esc(L.feat)}</p><h2 class="ed-h3" style="font-size:clamp(21px,2.4vw,30px)">${esc(featured.title)}</h2><p class="ed-sum">${esc(featured.summary)}</p>${metaLine(featured, lang)}${demoTag(featured, lang)}</a>` : "";
  const archives = `<section class="ed-sec" aria-labelledby="ed-arch"><div class="ed-wrap"><p class="ed-k">Archives</p><h2 class="ed-h2" id="ed-arch">${esc(L.archT)}</h2><p class="ed-lead">${esc(L.archP)}</p><div class="ed-arch"><a href="${L.insHref}"><b>${esc(L.archIns)}</b><span>${esc(L.archInsP)}</span></a></div></div></section>`;
  const empty = !featured && !(latest && latest.length) ? `<div class="ed-wrap"><div class="ed-empty"><p><strong>${esc(L.emptyT)}</strong></p><p>${esc(L.emptyP)}</p></div></div>` : "";
  return `<div class="ed">
<section class="ed-sec"><div class="ed-wrap"><div class="ed-hero"><div><p class="ed-sig">${esc(L.sig)}</p><h1 class="ed-h1">${esc(L.title)}</h1><p class="ed-lead">${esc(L.pos)}</p>${L.promiseFr ? `<p class="ed-lead" style="margin-top:14px">${esc(L.promiseFr)}</p>` : ""}<p class="ed-promise">${esc(L.promise)}</p></div>${heroSide}</div>${empty}</div></section>
${latest && latest.length ? `<section class="ed-sec" aria-labelledby="ed-latest"><div class="ed-wrap"><p class="ed-k">${esc(L.kLatest)}</p><h2 class="ed-h2" id="ed-latest">${esc(L.latest)}</h2><div class="ed-grid">${latest.map((a) => card(a, lang)).join("")}</div></div></section>` : ""}
<section class="ed-sec" aria-labelledby="ed-cats"><div class="ed-wrap"><p class="ed-k">${esc(L.kCats)}</p><h2 class="ed-h2" id="ed-cats">${esc(L.cats)}</h2><nav class="ed-cats" aria-label="${esc(L.cats)}">${CATEGORIES.map((c) => `<a class="ed-cat" href="${catUrl(lang, c)}"><b>${c.n}</b><strong>${esc(c.name[lang])}</strong><span>${esc(c.desc[lang])}</span><em>${cnt[c.id] || 0} ${esc((cnt[c.id] || 0) === 1 ? L.pub1 : L.pubN)}</em></a>`).join("")}</nav></div></section>
${selection && selection.length ? `<section class="ed-sec" aria-labelledby="ed-sel"><div class="ed-wrap"><p class="ed-k">${esc(L.kSel)}</p><h2 class="ed-h2" id="ed-sel">${esc(L.selection)}</h2><p class="ed-lead">${esc(L.selectionLead)}</p><div class="ed-grid">${selection.map((a) => card(a, lang)).join("")}</div></div></section>` : ""}
${archives}
<section class="ed-sec" aria-labelledby="ed-nl"><div class="ed-wrap ed-nl"><div><p class="ed-k">Newsletter</p><h2 class="ed-h2" id="ed-nl">${esc(L.nlT)}</h2><p class="ed-lead">${esc(L.nlP)}</p></div>${newsletter || ""}</div></section>
<section class="ed-sec ed-pov" aria-labelledby="ed-pov"><div class="ed-wrap"><p class="ed-k" id="ed-pov">${esc(L.pov)}</p><blockquote>${esc(L.povText)}</blockquote>${L.povFr ? `<p>${esc(L.povFr)}</p>` : ""}</div></section>
<section class="ed-sec" aria-labelledby="ed-cta"><div class="ed-wrap ed-cta"><div><p class="ed-k">Next</p><h2 class="ed-h2" id="ed-cta">${esc(L.ctaT)}</h2><p>${esc(L.ctaP)}</p></div><div class="ed-links"><a class="ed-btn" href="${L.toolsHref}">${esc(L.ctaTools)}</a><a class="ed-link" href="${L.auditHref}">${esc(L.ctaAudit)}</a></div></div></section>
</div>`;
}

export function category(lang, cat, { items, total, page, pageSize, format, q }) {
  const L = t(lang), base = catUrl(lang, cat), qs = (o) => { const p = new URLSearchParams(); if (o.format) p.set("format", o.format); if (o.q) p.set("q", o.q); if (o.page > 1) p.set("page", o.page); const s = p.toString(); return base + (s ? "?" + s : ""); };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return `<div class="ed"><section class="ed-sec"><div class="ed-wrap"><p class="ed-crumb" style="font-size:13px;margin:0 0 20px"><a href="${hubUrl(lang)}">${esc(L.home)}</a> / ${esc(cat.name[lang])}</p><p class="ed-sig">${esc(L.catPage)} ${cat.n}</p><h1 class="ed-h1" style="font-size:clamp(30px,5vw,60px)">${esc(cat.name[lang])}</h1><p class="ed-lead">${esc(cat.desc[lang])}</p>
<div class="ed-bar"><nav aria-label="${esc(L.format)}"><ul class="ed-chips"><li><a href="${qs({ q })}"${!format ? ' aria-current="true"' : ""}>${esc(L.all)}</a></li>${FORMATS.map((f) => `<li><a href="${qs({ format: f.id, q })}"${format === f.id ? ' aria-current="true"' : ""}>${esc(f.name[lang])}</a></li>`).join("")}</ul></nav>
<form class="ed-search" method="get" action="${base}" role="search">${format ? `<input type="hidden" name="format" value="${esc(format)}">` : ""}<label class="sr" for="ed-q" style="position:absolute;left:-9999px">${esc(L.search)}</label><input id="ed-q" name="q" type="search" value="${esc(q || "")}" placeholder="${esc(L.searchPh)}" maxlength="60"><button type="submit">${esc(L.search)}</button></form></div>
${items.length ? `<div class="ed-grid">${items.map((a) => card(a, lang, 2)).join("")}</div>` : `<div class="ed-empty"><p>${esc(L.none)}</p></div>`}
${pages > 1 ? `<nav class="ed-pager" aria-label="Pagination">${page > 1 ? `<a href="${qs({ format, q, page: page - 1 })}">← ${esc(L.prev)}</a>` : "<span></span>"}<span>${page} / ${pages}</span>${page < pages ? `<a href="${qs({ format, q, page: page + 1 })}">${esc(L.next)} →</a>` : "<span></span>"}</nav>` : ""}</div></section></div>`;
}

export function article(lang, a, { preview } = {}) {
  const L = t(lang), cat = catById(a.category_id), fmt = fmtById(a.format_id), md = renderMarkdown(a.body_md, { sourceCount: a.sources.length, lang });
  const toc = md.toc.length >= 3 ? md.toc.map((h) => `<li class="l${h.level}"><a href="#${h.id}">${esc(h.text)}</a></li>`).join("") : "";
  const tool = a.tool_suggestion ? toolById(a.tool_suggestion) : null;
  const sources = a.sources.length ? `<section class="ed-src" aria-labelledby="ed-src"><h2 id="ed-src">${esc(L.sources)}</h2><ol>${a.sources.map((s) => `<li id="src-${s.ordinal}">${s.kind === "illustrative" ? esc(s.label) + `<small>${esc(L.illustrative)}</small>` : `${s.url ? `<a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)}<small>${[s.publisher, s.accessed_on ? `${L.srcAccessed} ${s.accessed_on}` : "", s.note].filter(Boolean).map(esc).join(" · ")}</small>`}</li>`).join("")}</ol></section>` : "";
  const take = a.takeaways && a.takeaways.length ? `<aside class="ed-take" aria-labelledby="ed-take"><h2 id="ed-take">${esc(L.take)}</h2><ul>${a.takeaways.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></aside>` : "";
  const toolBox = tool ? `<aside class="ed-tool" aria-label="${esc(L.toolK)}"><b>${esc(L.toolK)}</b><h2 class="ed-h3">${esc(tool.name[lang])}</h2><p>${esc(tool.pitch[lang])}</p><a class="ed-btn" href="${tool.href[lang]}">${esc(L.toolGo)}</a></aside>` : "";
  const rel = a.related && a.related.length ? `<section class="ed-rel" aria-labelledby="ed-rel"><div class="ed-wrap"><p class="ed-k">${esc(L.related)}</p><h2 class="ed-h2" id="ed-rel" style="font-size:clamp(22px,2.6vw,32px)">${esc(L.related)}</h2><div class="ed-grid">${a.related.map((r) => card(r, lang)).join("")}</div></div></section>` : "";
  const tocHtml = toc ? `<details class="ed-toc ed-inline"><summary>${esc(L.toc)}</summary><ol>${toc}</ol></details>` : "", side = toc ? `<aside class="ed-side" aria-label="${esc(L.toc)}"><nav><b>${esc(L.toc)}</b><ol>${toc}</ol></nav></aside>` : "";
  return `<div class="ed"><div class="ed-prog" id="ed-prog" aria-hidden="true"></div>
<article class="ed-art"><header class="ed-head"><p class="ed-crumb"><a href="${hubUrl(lang)}">${esc(L.home)}</a> / <a href="${catUrl(lang, cat)}">${esc(cat.name[lang])}</a></p>
${preview ? `<p class="ed-demo ed-prev" role="note">${esc(L.preview)}</p>` : ""}${a.is_demo ? `<p class="ed-demo" role="note">${esc(L.demo)}</p>` : ""}
<p class="ed-k">${esc(cat.name[lang])}</p><h1 class="ed-title">${esc(a.title)}</h1><p class="ed-sub">${esc(a.subtitle)}</p>
<ul class="ed-meta ed-byline"><li class="ed-fmt">${esc(fmt.name[lang])}</li><li>${a.reading_minutes}${NB}${L.read}</li><li>${a.published_at ? `<time datetime="${esc(a.published_at)}">${esc(fdate(a.published_at, lang))}</time>` : ""}</li><li>${esc(L.by)} ${esc(a.author || "MAIORIS")}</li></ul></header>
<div class="ed-hero-img"><span class="ed-vis">${visual(a, lang, true)}</span></div>
${tocHtml}<div class="ed-cols"><div class="ed-prose">${md.html}</div>${side}</div>${take}${sources}${toolBox}<p class="ed-audit">${esc(L.audit)} <a href="${L.auditHref}">${esc(L.auditGo)}</a></p></article>${rel}</div>`;
}

export const notFound = (lang) => `<div class="ed"><section class="ed-sec"><div class="ed-wrap"><h1 class="ed-h1" style="font-size:clamp(28px,4vw,48px)">404</h1><p class="ed-lead">${esc(t(lang).notFound)}</p><p><a class="ed-btn" href="${hubUrl(lang)}">${esc(t(lang).back)}</a></p></div></section></div>`;

/* ---------- Pages complètes : gabarit du site (en-tête, pied de page) chargé depuis les fichiers statiques ---------- */
const cache = new Map();
export async function loadFragment(env, request, path) {
  const key = path; if (cache.has(key)) return cache.get(key);
  let txt = ""; try { const r = await env.ASSETS.fetch(new URL(path, request.url)); if (r.ok) txt = await r.text(); } catch { /* repli sans gabarit */ }
  if (txt) cache.set(key, txt); return txt;
}
export function resetFragments() { cache.clear(); }
export function fillShell(shell, { head, main, langHref }) {
  if (!shell) return `<!DOCTYPE html><html><head><meta charset="utf-8">${head}</head><body><main id="main">${main}</main></body></html>`;
  return shell.replace("<!--ED_HEAD-->", () => head).replace("<!--ED_MAIN-->", () => main).split("__LANGHREF__").join(langHref);
}
export { SEO, catBySlug };
