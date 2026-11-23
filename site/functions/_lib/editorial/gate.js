/* Contrôle de publication : une publication ne passe en « published » que si elle satisfait ces règles. Les messages s'adressent à l'éditeur. */
import { catById, fmtById, toolById, qualityTotal, QUALITY, QUALITY_THRESHOLD, WORDS_PER_MINUTE } from "./taxonomy.js";
import { renderMarkdown } from "./markdown.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMERIC_CLAIM = /\d[\d\s.,]*\s?(%|pour cent|percent|FCFA|XOF|€|\$|USD|EUR|millions?|milliards?|billions?)|(\$|€)\s?\d/i;
const minWords = (fmt) => Math.round(fmt.min * WORDS_PER_MINUTE * 0.6);

/** article : { category_id, format_id, tool_suggestion, hero_image, hero_alt, is_demo, quality }, translations : [{lang, ready, slug, title, subtitle, summary, body_md, meta_title, meta_description}], sources : [{label, url, publisher, kind}] */
export function validateForPublish(article, translations, sources) {
  const errors = [], err = (code, message, lang) => errors.push({ code, message, lang });
  const cat = catById(article.category_id), fmt = fmtById(article.format_id);
  if (!cat) err("category", "Choisissez une rubrique."); if (!fmt) err("format", "Choisissez un format.");
  if (article.tool_suggestion && !toolById(article.tool_suggestion)) err("tool", "Outil suggéré inconnu.");
  if (article.hero_image && !/^(\/assets\/|https:\/\/)/.test(article.hero_image)) err("image", "L'image principale doit être un fichier de /assets/ ou une adresse https.");
  if (article.hero_image && !String(article.hero_alt || "").trim()) err("image_alt", "Décrivez l'image principale (texte alternatif).");
  sources = sources || [];
  sources.forEach((s, i) => {
    if (!String(s.label || "").trim()) err("source_label", `Source ${i + 1} : titre manquant.`);
    if (s.kind === "illustrative") { if (!article.is_demo) err("source_illustrative", `Source ${i + 1} : une source illustrative n'est autorisée que dans un exemple fictif.`); }
    else {
      if (!/^https:\/\/[^\s]+$/.test(String(s.url || ""))) err("source_url", `Source ${i + 1} : adresse https consultable requise.`);
      if (!String(s.publisher || "").trim()) err("source_publisher", `Source ${i + 1} : éditeur ou organisme manquant.`);
    }
  });
  const fr = (translations || []).find((t) => t.lang === "fr");
  if (!fr) err("fr_missing", "La version française est obligatoire.", "fr");
  const ready = (translations || []).filter((t) => t.lang === "fr" || t.ready);
  const quality = article.quality, total = qualityTotal(quality);
  if (total === null) err("quality_missing", "Renseignez les six critères de la grille de qualité interne.");
  else if (total < QUALITY_THRESHOLD) err("quality_low", `Grille de qualité : ${total}/100, seuil de publication ${QUALITY_THRESHOLD}. À retravailler.`);
  for (const t of ready) {
    const L = t.lang, tag = (m) => `[${L.toUpperCase()}] ${m}`;
    if (!SLUG.test(String(t.slug || ""))) err("slug", tag("Adresse (slug) invalide : lettres minuscules, chiffres et tirets."), L);
    const title = String(t.title || "").trim(); if (title.length < 10 || title.length > 140) err("title", tag("Titre : 10 à 140 caractères."), L);
    if (String(t.subtitle || "").trim().length < 10) err("subtitle", tag("Sous-titre stratégique manquant."), L);
    const sum = String(t.summary || "").trim(); if (sum.length < 80 || sum.length > 400) err("summary", tag("Résumé : 80 à 400 caractères."), L);
    const md = String(t.meta_description || "").trim(); if (md.length < 70 || md.length > 170) err("meta_description", tag("Meta description : 70 à 170 caractères."), L);
    if (String(t.meta_title || "").length > 70) err("meta_title", tag("Meta title : 70 caractères au plus."), L);
    const r = renderMarkdown(t.body_md, { sourceCount: sources.length, lang: L });
    r.errors.forEach((e) => err("md_" + e.code, tag({ citation_unknown: `Citation [^${e.n}] sans source correspondante.`, link_invalid: "Lien non autorisé (http, https ou chemin interne seulement).", image_invalid: "Image invalide (chemin /assets/ ou https, avec texte alternatif).", block_unclosed: `Bloc :::${e.kind} non fermé.`, block_nested: "Blocs imbriqués interdits." }[e.code] || e.code), L));
    if (fmt && r.words < minWords(fmt)) err("words", tag(`Texte trop court pour un ${fmt.name.fr} : ${r.words} mots, minimum ${minWords(fmt)}.`), L);
    // un chiffre n'est publié que s'il est sourcé ou présenté comme hypothèse
    r.paragraphs.forEach((p, idx) => { if (NUMERIC_CLAIM.test(p.text) && !/\[\^\d+\]/.test(p.text) && p.block !== "hypotheses" && p.block !== "questions") err("figure_unsourced", tag(`Chiffre sans source (paragraphe ${idx + 1}) : ajoutez une citation [^n] ou placez-le dans un bloc d'hypothèses.`), L); });
    if (fmt && fmt.id === "case") {
      for (const b of ["facts", "analysis", "hypotheses", "questions"]) if (!r.blocks.includes(b)) err("case_block", tag(`Une étude de cas distingue faits vérifiés, analyse, hypothèses et questions ouvertes : bloc :::${b} manquant.`), L);
      if (!article.is_demo && sources.filter((s) => s.kind !== "illustrative").length < 2) err("case_sources", tag("Une étude de cas exige au moins deux sources consultables."), L);
    }
    if (fmt && fmt.id === "outlook" && !r.blocks.includes("hypotheses")) err("outlook_block", tag("Une prospective distingue capacités réelles, expérimentations et projections : bloc :::hypotheses manquant."), L);
    if (article.category_id === "future" && !r.blocks.includes("facts") && !r.blocks.includes("hypotheses")) err("future_distinction", tag("Future of Creative : distinguez les capacités établies (:::facts) des projections (:::hypotheses)."), L);
  }
  return { ok: errors.length === 0, errors, quality_total: total };
}
export { QUALITY, QUALITY_THRESHOLD };
