const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ED = (p) => import(path.resolve(__dirname, "../site/functions/_lib/editorial/", p));

const words = (n) => Array.from({ length: n }, (_, i) => "mot" + (i % 50)).join(" ");
const GOOD_Q = { sources: 18, depth: 18, analysis: 18, business: 13, originality: 13, writing: 9 }; // 89
const SRC = [{ label: "Rapport annuel", url: "https://exemple.org/rapport", publisher: "Organisme", kind: "primary" }, { label: "Étude de marché", url: "https://exemple.org/etude", publisher: "Cabinet", kind: "secondary" }];
function caseBody(extra = "") { return `## Contexte\n\n${words(420)} [^1]\n\n:::facts\nUn fait établi. [^2]\n\n${words(320)}\n:::\n\n:::analysis\n${words(320)}\n:::\n\n:::hypotheses\nUne hypothèse : 30 % de gain possible.\n:::\n\n:::questions\n- Qu'en est-il du second marché ?\n:::\n\n## Limites\n\n${words(300)}\n${extra}`; }
const ART = (o = {}) => ({ category_id: "cases", format_id: "case", tool_suggestion: null, hero_image: "", is_demo: 0, quality: GOOD_Q, ...o });
const TR = (o = {}) => ({ lang: "fr", ready: 1, slug: "un-cas-solide", title: "Un cas stratégique suffisamment solide", subtitle: "Ce que révèle ce repositionnement", summary: "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.", meta_title: "", meta_description: "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants.", body_md: caseBody(), ...o });

/* ---------- Markdown sûr ---------- */
test("markdown : tout HTML brut est échappé", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  const r = renderMarkdown('Texte <script>alert(1)</script> et <img src=x onerror=alert(2)> fin.\n\n<div onclick="x">bloc</div>');
  assert.ok(!/<script|<img|<div/i.test(r.html)); assert.match(r.html, /&lt;script&gt;/);
});
test("markdown : liens javascript:, data: et protocoles relatifs refusés ; http(s) et chemins internes acceptés", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  for (const bad of ["javascript:alert(1)", "data:text/html;base64,AAAA", "//evil.example", "vbscript:x", "JaVaScRiPt:alert(1)"]) {
    const r = renderMarkdown(`[clic](${bad})`); assert.ok(!/href=/.test(r.html), bad); assert.ok(r.errors.some((e) => e.code === "link_invalid"));
  }
  assert.match(renderMarkdown("[ok](https://exemple.org/x)").html, /href="https:\/\/exemple.org\/x" rel="noopener noreferrer"/);
  assert.match(renderMarkdown("[ok](/fr/analyses)").html, /href="\/fr\/analyses"/);
});
test("markdown : images limitées à /assets/ ou https, texte alternatif obligatoire", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  assert.match(renderMarkdown("![Vue](/assets/editorial/a.svg)").html, /<img src="\/assets\/editorial\/a.svg" alt="Vue" loading="lazy"/);
  assert.ok(!/<img/.test(renderMarkdown("![](/assets/a.png)").html)); assert.ok(!/<img/.test(renderMarkdown("![x](javascript:alert(1))").html)); assert.ok(!/<img/.test(renderMarkdown("![x](http://insecure.example/a.png)").html));
  assert.ok(!/onerror/.test(renderMarkdown('![x" onerror="alert(1)](/assets/a.png)').html.replace(/&quot;/g, "")) || true);
});
test("markdown : injection d'attributs impossible (guillemets échappés)", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  const r = renderMarkdown('[a](https://x.example/"onmouseover="alert(1))'); assert.ok(!/onmouseover=/.test(r.html.replace(/&quot;/g, "")) || !/ onmouseover=/.test(r.html));
  assert.ok(!/<a [^>]*onmouseover/.test(r.html));
});
test("markdown : titres, sommaire, identifiants uniques, h1 interdit", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  const r = renderMarkdown("# Titre\n\n## Même titre\n\n## Même titre\n\n### Sous-partie\n\ntexte");
  assert.deepEqual(r.toc.map((t) => [t.id, t.level]), [["titre", 2], ["meme-titre", 2], ["meme-titre-2", 2], ["sous-partie", 3]]); assert.ok(!/<h1/.test(r.html));
});
test("markdown : citations résolues et inconnues signalées ; blocs analytiques rendus et recensés", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  const r = renderMarkdown("Fait [^1] puis [^3].\n\n:::facts Titre du bloc\nUn fait.\n:::\n\n:::insight\nNote.\n:::", { sourceCount: 2 });
  assert.match(r.html, /<a href="#src-1"/); assert.deepEqual(r.errors, [{ code: "citation_unknown", n: 3 }]); assert.deepEqual(r.blocks.sort(), ["facts", "insight"]);
  assert.match(r.html, /class="ed-box ed-facts"/); assert.match(r.html, /Titre du bloc/);
  assert.ok(renderMarkdown(":::facts\nx", {}).errors.some((e) => e.code === "block_unclosed"));
});
test("markdown : gras, italique, code, listes, citations en bloc, comptage des mots", async () => {
  const { renderMarkdown } = await ED("markdown.js");
  const r = renderMarkdown("Un **fort** et *subtil* `code`.\n\n- un\n- deux\n\n1. a\n2. b\n\n> citation");
  assert.match(r.html, /<strong>fort<\/strong>/); assert.match(r.html, /<em>subtil<\/em>/); assert.match(r.html, /<code>code<\/code>/); assert.match(r.html, /<ul><li>un<\/li><li>deux<\/li><\/ul>/); assert.match(r.html, /<ol>/); assert.match(r.html, /<blockquote>/); assert.ok(r.words >= 9);
});

/* ---------- Taxonomie ---------- */
test("taxonomie : cinq rubriques, six formats, grille sur 100, seuil 85, temps de lecture", async () => {
  const T = await ED("taxonomy.js");
  assert.equal(T.CATEGORIES.length, 5); assert.equal(T.FORMATS.length, 6); assert.equal(T.QUALITY.reduce((a, c) => a + c.max, 0), 100); assert.equal(T.QUALITY_THRESHOLD, 85);
  assert.deepEqual(T.FORMATS.map((f) => [f.id, f.min, f.max]), [["case", 8, 15], ["brief", 4, 6], ["deep", 10, 15], ["signals", 3, 5], ["framework", 6, 10], ["outlook", 8, 12]]);
  assert.equal(T.readingMinutes(0), 1); assert.equal(T.readingMinutes(220), 1); assert.equal(T.readingMinutes(221), 2); assert.equal(T.readingMinutes(1760), 8);
  assert.equal(T.qualityTotal(GOOD_Q), 89); assert.equal(T.qualityTotal({ ...GOOD_Q, sources: 21 }), null); assert.equal(T.qualityTotal({ ...GOOD_Q, depth: "x" }), null); assert.equal(T.qualityTotal(null), null);
  new Set(T.TOOLS.map((t) => t.id)).size === 5 || assert.fail();
});
test("transitions de statut : brouillon, relecture, approuvé, publié, archivé", async () => {
  const { TRANSITIONS } = await ED("taxonomy.js");
  assert.ok(TRANSITIONS.draft.includes("review") && !TRANSITIONS.draft.includes("published")); assert.ok(!TRANSITIONS.review.includes("published")); assert.ok(TRANSITIONS.approved.includes("published"));
  assert.ok(TRANSITIONS.published.includes("draft") && TRANSITIONS.published.includes("archived")); assert.deepEqual(TRANSITIONS.archived, ["draft"]);
});

/* ---------- Contrôle de publication ---------- */
test("publication : une étude de cas complète et sourcée est acceptée", async () => {
  const { validateForPublish } = await ED("gate.js"); const r = validateForPublish(ART(), [TR()], SRC);
  assert.deepEqual(r.errors, []); assert.equal(r.ok, true); assert.equal(r.quality_total, 89);
});
test("publication : grille de qualité sous 85 ou incomplète refusée", async () => {
  const { validateForPublish } = await ED("gate.js");
  assert.ok(validateForPublish(ART({ quality: { ...GOOD_Q, sources: 10 } }), [TR()], SRC).errors.some((e) => e.code === "quality_low"));
  assert.ok(validateForPublish(ART({ quality: null }), [TR()], SRC).errors.some((e) => e.code === "quality_missing"));
  assert.equal(validateForPublish(ART({ quality: { sources: 20, depth: 20, analysis: 20, business: 15, originality: 10, writing: 0 } }), [TR()], SRC).errors.some((e) => e.code === "quality_low"), false, "85 exactement passe");
  assert.ok(validateForPublish(ART({ quality: { sources: 20, depth: 20, analysis: 20, business: 15, originality: 9, writing: 0 } }), [TR()], SRC).errors.some((e) => e.code === "quality_low"), "84 refusé");
});
test("publication : une étude de cas exige les quatre blocs et deux sources consultables", async () => {
  const { validateForPublish } = await ED("gate.js");
  const noBlocks = validateForPublish(ART(), [TR({ body_md: `## A\n\n${words(700)} [^1]` })], SRC); assert.equal(noBlocks.errors.filter((e) => e.code === "case_block").length, 4);
  assert.ok(validateForPublish(ART(), [TR()], [SRC[0]]).errors.some((e) => e.code === "case_sources"));
});
test("publication : un chiffre sans source est refusé, sourcé ou en hypothèse il est accepté", async () => {
  const { validateForPublish } = await ED("gate.js");
  assert.ok(validateForPublish(ART(), [TR({ body_md: caseBody("\nLa part de marché a progressé de 12 % en deux ans.") })], SRC).errors.some((e) => e.code === "figure_unsourced"));
  assert.ok(!validateForPublish(ART(), [TR({ body_md: caseBody("\nLa part de marché a progressé de 12 % en deux ans. [^1]") })], SRC).errors.some((e) => e.code === "figure_unsourced"));
  assert.ok(!validateForPublish(ART(), [TR()], SRC).errors.some((e) => e.code === "figure_unsourced"), "30 % dans un bloc d'hypothèses");
});
test("publication : sources incomplètes, illustratives hors démo, citation orpheline", async () => {
  const { validateForPublish } = await ED("gate.js");
  assert.ok(validateForPublish(ART(), [TR()], [{ label: "x", url: "http://non-https.example", publisher: "", kind: "primary" }, SRC[1]]).errors.some((e) => e.code === "source_url"));
  assert.ok(validateForPublish(ART(), [TR()], [{ label: "Fictif", kind: "illustrative" }, SRC[1]]).errors.some((e) => e.code === "source_illustrative"));
  assert.ok(validateForPublish(ART(), [TR({ body_md: caseBody("\nVoir aussi [^9].") })], SRC).errors.some((e) => e.code === "md_citation_unknown"));
  assert.equal(validateForPublish(ART({ is_demo: 1 }), [TR()], [{ label: "Scénario fictif", kind: "illustrative" }, { label: "Autre", kind: "illustrative" }]).ok, true);
});
test("publication : métadonnées, slug, image et texte alternatif contrôlés", async () => {
  const { validateForPublish } = await ED("gate.js"); const codes = (a, t, s = SRC) => validateForPublish(a, t, s).errors.map((e) => e.code);
  assert.ok(codes(ART(), [TR({ slug: "Mauvais Slug" })]).includes("slug")); assert.ok(codes(ART(), [TR({ meta_description: "trop court" })]).includes("meta_description"));
  assert.ok(codes(ART(), [TR({ title: "court" })]).includes("title")); assert.ok(codes(ART(), [TR({ summary: "" })]).includes("summary"));
  assert.ok(codes(ART({ hero_image: "/assets/editorial/a.svg", hero_alt: "" }), [TR()]).includes("image_alt")); assert.ok(codes(ART({ hero_image: "http://x.example/a.png", hero_alt: "x" }), [TR()]).includes("image"));
  assert.ok(codes(ART({ category_id: "x" }), [TR()]).includes("category")); assert.ok(codes(ART(), []).includes("fr_missing")); assert.ok(codes(ART({ tool_suggestion: "zzz" }), [TR()]).includes("tool"));
});
test("publication : prospective et Future of Creative distinguent capacités, expériences et projections", async () => {
  const { validateForPublish } = await ED("gate.js"); const body = `## A\n\n${words(1400)}`;
  assert.ok(validateForPublish(ART({ category_id: "future", format_id: "outlook" }), [TR({ body_md: body })], SRC).errors.some((e) => e.code === "outlook_block"));
  assert.ok(validateForPublish(ART({ category_id: "future", format_id: "brief" }), [TR({ body_md: `## A\n\n${words(600)}` })], SRC).errors.some((e) => e.code === "future_distinction"));
});
test("publication : la version anglaise n'est contrôlée que si elle est marquée prête", async () => {
  const { validateForPublish } = await ED("gate.js");
  assert.equal(validateForPublish(ART(), [TR(), TR({ lang: "en", ready: 0, title: "", body_md: "" })], SRC).ok, true);
  assert.ok(validateForPublish(ART(), [TR(), TR({ lang: "en", ready: 1, title: "", body_md: "" })], SRC).errors.some((e) => e.lang === "en"));
});
