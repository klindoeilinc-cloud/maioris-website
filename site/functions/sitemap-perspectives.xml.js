/* Plan du site de la section éditoriale : publications visibles uniquement (exemples fictifs exclus), avec alternatives de langue. */
import { sitemapEntries } from "./_lib/editorial/store.js";
import { CATEGORIES, catById } from "./_lib/editorial/taxonomy.js";

const O = "https://maioris.net", esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export async function onRequestGet({ env }) {
  const urls = [];
  const alt = (fr, en) => `<xhtml:link rel="alternate" hreflang="fr" href="${esc(fr)}"/><xhtml:link rel="alternate" hreflang="en" href="${esc(en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${esc(fr)}"/>`;
  urls.push(...["fr", "en"].map((l) => `<url><loc>${O}/${l}/perspectives</loc>${alt(`${O}/fr/perspectives`, `${O}/en/perspectives`)}</url>`));
  for (const c of CATEGORIES) urls.push(...["fr", "en"].map((l) => `<url><loc>${O}/${l}/perspectives/${c.slug}</loc>${alt(`${O}/fr/perspectives/${c.slug}`, `${O}/en/perspectives/${c.slug}`)}</url>`));
  if (env.MAIORIS_DB) {
    try {
      const rows = await sitemapEntries(env.MAIORIS_DB), by = new Map();
      for (const r of rows) { const g = by.get(r.id) || {}; g[r.lang] = r; by.set(r.id, g); }
      for (const g of by.values()) for (const l of ["fr", "en"]) if (g[l]) {
        const u = (x) => `${O}/${x.lang}/perspectives/${catById(x.category_id).slug}/${x.slug}`;
        urls.push(`<url><loc>${u(g[l])}</loc><lastmod>${String(g[l].updated_at).slice(0, 10)}</lastmod>${g.fr && g.en ? alt(u(g.fr), u(g.en)) : ""}</url>`);
      }
    } catch (e) { console.error("sitemap", e && e.message); }
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
