/* Métadonnées de référencement de la section éditoriale : title, description, canonical, hreflang, Open Graph, données structurées. */
import { esc } from "./markdown.js";
export const ORIGIN = "https://maioris.net";
const abs = (u) => (/^https?:\/\//.test(u) ? u : ORIGIN + u);

export function head({ lang, title, description, canonical, alternates = [], image, type = "website", published, modified, robots, jsonld = [] }) {
  const og = abs(image || `/assets/og/${lang}-insights.png`);
  const out = [`<title>${esc(title)}</title>`, `<meta name="description" content="${esc(description)}"/>`, `<link rel="canonical" href="${esc(canonical)}"/>`];
  if (robots) out.push(`<meta name="robots" content="${esc(robots)}"/>`);
  for (const a of alternates) out.push(`<link rel="alternate" hreflang="${a.lang}" href="${esc(a.url)}"/>`);
  if (alternates.length) out.push(`<link rel="alternate" hreflang="x-default" href="${esc((alternates.find((a) => a.lang === "fr") || alternates[0]).url)}"/>`);
  out.push(`<meta property="og:type" content="${type}"/>`, `<meta property="og:site_name" content="MAIORIS"/>`, `<meta property="og:title" content="${esc(title)}"/>`, `<meta property="og:description" content="${esc(description)}"/>`,
    `<meta property="og:url" content="${esc(canonical)}"/>`, `<meta property="og:locale" content="${lang === "fr" ? "fr_FR" : "en_GB"}"/>`, `<meta property="og:image" content="${esc(og)}"/>`, `<meta name="twitter:card" content="summary_large_image"/>`, `<meta name="twitter:image" content="${esc(og)}"/>`);
  if (published) out.push(`<meta property="article:published_time" content="${esc(published)}"/>`);
  if (modified) out.push(`<meta property="article:modified_time" content="${esc(modified)}"/>`);
  for (const j of jsonld) out.push(`<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`);
  return out.join("\n");
}
const org = { "@type": "Organization", name: "MAIORIS", logo: { "@type": "ImageObject", url: ORIGIN + "/assets/symbol.svg" } };
export const articleLd = ({ lang, url, title, description, image, published, modified }) => ({ "@context": "https://schema.org", "@type": "Article", headline: title, description, inLanguage: lang, url, mainEntityOfPage: url,
  datePublished: published, dateModified: modified || published, author: org, publisher: org, ...(image ? { image: [abs(image)] } : {}) });
export const breadcrumbLd = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })) });
