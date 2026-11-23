/* STRATEGIC CASES & PERSPECTIVES : taxonomie éditoriale. Une seule définition, utilisée par le rendu public, l'administration et les tests.
   Les cinq rubriques et les six formats sont permanents : on les attribue aux publications, on ne les crée pas depuis l'interface. */
const L = (fr, en) => ({ fr, en });

export const CATEGORIES = [
  { id: "cases", n: "01", slug: "strategic-cases", name: L("Strategic Cases", "Strategic Cases"),
    desc: L("Analyses approfondies de marques, de campagnes, de repositionnements et de transformations d'entreprises.", "In-depth analyses of brands, campaigns, repositionings and corporate transformations.") },
  { id: "perspectives", n: "02", slug: "executive-perspectives", name: L("Executive Perspectives", "Executive Perspectives"),
    desc: L("Réflexions pour dirigeants, directeurs marketing et responsables de marque : Creative Leadership, gouvernance de marque, décision stratégique.", "Reflections for executives, marketing directors and brand leaders: Creative Leadership, brand governance, strategic decision-making.") },
  { id: "future", n: "03", slug: "future-of-creative", name: L("Future of Creative", "Future of Creative"),
    desc: L("Les transformations qui redéfinissent les métiers et les systèmes créatifs : intelligence artificielle, automatisation, Creative Operating Systems.", "The transformations redefining creative professions and systems: artificial intelligence, automation, Creative Operating Systems.") },
  { id: "intelligence", n: "04", slug: "brand-market-intelligence", name: L("Brand & Market Intelligence", "Brand & Market Intelligence"),
    desc: L("Dynamiques concurrentielles et mutations des marchés : différenciation, valeur de marque, cohérence, économie de l'attention.", "Competitive dynamics and market shifts: differentiation, brand equity, consistency, the attention economy.") },
  { id: "african", n: "05", slug: "african-business-perspectives", name: L("African Business Perspectives", "African Business Perspectives"),
    desc: L("Marques, entreprises et transformations économiques africaines : contraintes structurelles, arbitrages, limites et opportunités.", "African brands, companies and economic transformations: structural constraints, trade-offs, limits and opportunities.") },
];

export const FORMATS = [
  { id: "case", name: L("Strategic Case", "Strategic Case"), min: 8, max: 15, role: L("Analyse approfondie", "In-depth analysis") },
  { id: "brief", name: L("Executive Brief", "Executive Brief"), min: 4, max: 6, role: L("Éclairage rapide pour décideurs", "Quick briefing for decision makers") },
  { id: "deep", name: L("Deep Perspective", "Deep Perspective"), min: 10, max: 15, role: L("Analyse de fond", "Long form analysis") },
  { id: "signals", name: L("Market Signals", "Market Signals"), min: 3, max: 5, role: L("Signaux faibles et mutations", "Weak signals and shifts") },
  { id: "framework", name: L("Strategic Framework", "Strategic Framework"), min: 6, max: 10, role: L("Méthode ou grille d'analyse", "Method or analytical framework") },
  { id: "outlook", name: L("Future Outlook", "Future Outlook"), min: 8, max: 12, role: L("Prospective argumentée", "Reasoned foresight") },
];

/* Outils proposables en fin d'article : un seul par article, uniquement s'il répond directement au problème traité. */
export const TOOLS = [
  { id: "brief", name: L("Évaluez votre brief", "Assess your brief"), href: L("/fr/evaluer-votre-brief", "/en/brief-check"), pitch: L("Cinq questions pour mesurer la solidité d'un brief avant la production.", "Five questions to gauge how solid a brief is before production.") },
  { id: "diag", name: L("Où est votre contrainte ?", "Where is your constraint?"), href: L("/fr/autodiagnostic", "/en/self-assessment"), pitch: L("Sept affirmations pour repérer ce qui freine le plus probablement votre marque.", "Seven statements to spot what is most likely holding your brand back.") },
  { id: "coi", name: L("Creative Operations Intelligence", "Creative Operations Intelligence"), href: L("/fr/creative-operations-intelligence", "/en/creative-operations-intelligence"), pitch: L("Une estimation de ce que coûtent vos reprises et ce qui limite votre performance.", "An estimate of what your rework costs and what limits your performance.") },
  { id: "maturity", name: L("Creative Maturity Assessment", "Creative Maturity Assessment"), href: L("/fr/creative-maturity-assessment", "/en/creative-maturity-assessment"), pitch: L("Vingt-quatre questions pour évaluer la maturité de votre système créatif.", "Twenty four questions to assess the maturity of your creative system.") },
  { id: "brand", name: L("Brand Consistency Review", "Brand Consistency Review"), href: L("/fr/brand-consistency-review", "/en/brand-consistency-review"), pitch: L("Une revue guidée de la cohérence de votre marque sur ses supports.", "A guided review of how consistently your brand shows across its materials.") },
];

export const STATUSES = ["draft", "review", "approved", "published", "archived"];
export const TRANSITIONS = { draft: ["review", "archived"], review: ["draft", "approved", "archived"], approved: ["review", "draft", "published", "archived"], published: ["draft", "archived"], archived: ["draft"] };

/* Grille de qualité interne (jamais affichée au public). Seuil de publication : 85 sur 100. */
export const QUALITY = [
  { id: "sources", max: 20, name: L("Rigueur des sources", "Rigour of sources") }, { id: "depth", max: 20, name: L("Profondeur stratégique", "Strategic depth") },
  { id: "analysis", max: 20, name: L("Qualité de l'analyse", "Quality of analysis") }, { id: "business", max: 15, name: L("Implications business", "Business implications") },
  { id: "originality", max: 15, name: L("Originalité du point de vue", "Originality of view") }, { id: "writing", max: 10, name: L("Qualité rédactionnelle", "Quality of writing") },
];
export const QUALITY_THRESHOLD = 85;
export const WORDS_PER_MINUTE = 220;

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || null;
export const catBySlug = (slug) => CATEGORIES.find((c) => c.slug === slug) || null;
export const fmtById = (id) => FORMATS.find((f) => f.id === id) || null;
export const toolById = (id) => TOOLS.find((t) => t.id === id) || null;
export const readingMinutes = (words) => Math.max(1, Math.ceil((words || 0) / WORDS_PER_MINUTE));
export function qualityTotal(q) {
  if (!q || typeof q !== "object") return null;
  let t = 0;
  for (const c of QUALITY) { const v = q[c.id]; if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > c.max) return null; t += v; }
  return t;
}
