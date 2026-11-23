const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { migrated } = require("./helpers/d1.js");
const ED = (p) => import(path.resolve(__dirname, "../site/functions/_lib/editorial/", p));
const words = (n) => Array.from({ length: n }, (_, i) => "mot" + (i % 50)).join(" ");
const Q = { sources: 18, depth: 18, analysis: 18, business: 13, originality: 13, writing: 9 };
const SRC = [{ label: "Rapport annuel", url: "https://exemple.org/rapport", publisher: "Organisme", kind: "primary" }, { label: "Étude de marché", url: "https://exemple.org/etude", publisher: "Cabinet", kind: "secondary" }];
const BODY = `## Contexte\n\n${words(420)} [^1]\n\n:::facts\nUn fait établi. [^2]\n\n${words(320)}\n:::\n\n:::analysis\n${words(320)}\n:::\n\n:::hypotheses\nUne hypothèse.\n:::\n\n:::questions\n- Question ouverte ?\n:::\n\n## Limites\n\n${words(300)}`;
const TR = (slug, o = {}) => ({ lang: "fr", ready: 1, slug, title: "Un cas stratégique suffisamment solide", subtitle: "Ce que révèle ce repositionnement", summary: "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.", meta_description: "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants.", body_md: BODY, takeaways: ["Un enseignement"], ...o });
const DOC = (slug, o = {}) => ({ tool_suggestion: "brief", quality: Q, sources: SRC, translations: [TR(slug)], ...o });
async function setup() { const d = migrated(), S = await ED("store.js"); return { d, S }; }
async function published(d, S, slug, over = {}, at) { const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a@maioris.net"); await S.saveArticle(d, id, DOC(slug, over), "a@maioris.net"); for (const to of ["review", "approved"]) await S.transition(d, id, to, "b@maioris.net"); await S.transition(d, id, "published", "b@maioris.net", at ? { publish_at: at } : {}); return id; }
const one = (d, sql, ...p) => d._db.prepare(sql).get(...p), rows = (d, sql, ...p) => d._db.prepare(sql).all(...p);

test("création : brouillon avec version française vide, journalisé", async () => {
  const { d, S } = await setup(); const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a@maioris.net");
  const g = await S.getArticle(d, id); assert.equal(g.article.status, "draft"); assert.equal(g.translations.length, 1); assert.equal(g.translations[0].slug, null); assert.equal(g.article.is_demo, 0);
  assert.equal(one(d, "select actor from audit_events where action = 'article.created'").actor, "a@maioris.net");
  await assert.rejects(S.createArticle(d, { category_id: "x", format_id: "case" }, "a"), { code: "invalid" });
});
test("enregistrement : champs, temps de lecture calculé, sources numérotées, révisions", async () => {
  const { d, S } = await setup(); const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a@maioris.net");
  const g = await S.saveArticle(d, id, DOC("un-cas-solide"), "a@maioris.net"); const t = g.translations[0];
  assert.equal(t.slug, "un-cas-solide"); assert.ok(t.word_count > 1000); assert.equal(t.reading_minutes, Math.ceil(t.word_count / 220)); assert.deepEqual(g.sources.map((s) => s.ordinal), [1, 2]); assert.equal(g.article.quality_total, 89);
  assert.deepEqual(t.takeaways, ["Un enseignement"]); assert.equal(g.revisions.length, 1);
  await S.saveArticle(d, id, { sources: [SRC[0]] }, "a@maioris.net"); assert.equal((await S.getArticle(d, id)).sources.length, 1);
});
test("adresses : format, unicité par langue, verrouillage après publication", async () => {
  const { d, S } = await setup(); const a = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "x"), b = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "x");
  await assert.rejects(S.saveArticle(d, a, DOC("Mauvais Slug"), "x"), { code: "invalid_slug" });
  await S.saveArticle(d, a, DOC("meme-adresse"), "x"); await assert.rejects(S.saveArticle(d, b, DOC("meme-adresse"), "x"), { code: "slug_taken" });
  await S.saveArticle(d, a, DOC("meme-adresse"), "x"); // la même publication peut se réenregistrer
  const p = await published(d, S, "adresse-stable"); await assert.rejects(S.saveArticle(d, p, { translations: [{ lang: "fr", slug: "autre" }] }, "x"), { code: "slug_locked" });
});
test("statuts : transitions autorisées seulement, publication impossible sans approbation", async () => {
  const { d, S } = await setup(); const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a"); await S.saveArticle(d, id, DOC("transitions"), "a");
  await assert.rejects(S.transition(d, id, "published", "a"), { code: "transition" }); await assert.rejects(S.transition(d, id, "approved", "a"), { code: "transition" });
  await S.transition(d, id, "review", "a"); await assert.rejects(S.transition(d, id, "published", "a"), { code: "transition" });
  const ap = await S.transition(d, id, "approved", "relecteur@maioris.net"); assert.equal(ap.article.approved_by, "relecteur@maioris.net");
  const pub = await S.transition(d, id, "published", "pub@maioris.net"); assert.equal(pub.article.status, "published"); assert.ok(pub.article.published_at); assert.equal(pub.article.published_by, "pub@maioris.net");
  assert.equal((await S.transition(d, id, "archived", "a")).article.status, "archived"); assert.equal((await S.transition(d, id, "draft", "a")).article.published_at, null);
  assert.deepEqual(rows(d, "select action from audit_events where object_id = ? and action like 'article.%' order by rowid", id).map((r) => r.action).slice(-5), ["article.review", "article.approved", "article.published", "article.archived", "article.draft"]);
});
test("publication : refusée avec la liste des défauts si la grille ou le contenu ne suffit pas", async () => {
  const { d, S } = await setup(); const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a");
  await S.saveArticle(d, id, DOC("trop-faible", { quality: { ...Q, sources: 5 } }), "a"); await S.transition(d, id, "review", "a"); await S.transition(d, id, "approved", "a");
  await assert.rejects(S.transition(d, id, "published", "a"), (e) => e.code === "gate" && e.details.some((x) => x.code === "quality_low"));
  assert.equal((await S.getArticle(d, id)).article.status, "approved");
});
test("visibilité publique : brouillon, relecture, approuvé et archivé ne sont jamais visibles ; publié l'est", async () => {
  const { d, S } = await setup(); const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a"); await S.saveArticle(d, id, DOC("visible-ou-pas"), "a");
  const vis = async () => (await S.publicGet(d, "fr", "visible-ou-pas")) !== null && (await S.publicList(d, "fr")).total === 1;
  assert.equal(await vis(), false); for (const to of ["review", "approved"]) { await S.transition(d, id, to, "b"); assert.equal(await vis(), false, to); }
  await S.transition(d, id, "published", "b"); assert.equal(await vis(), true);
  await S.transition(d, id, "draft", "b"); assert.equal(await vis(), false, "dépublié : disparaît aussitôt");
  await S.transition(d, id, "review", "b"); await S.transition(d, id, "approved", "b"); await S.transition(d, id, "published", "b"); assert.equal(await vis(), true);
  await S.transition(d, id, "archived", "b"); assert.equal(await vis(), false);
});
test("publication programmée : invisible avant la date, visible après", async () => {
  const { d, S } = await setup(); const future = new Date(Date.now() + 7 * 86400000).toISOString(); await published(d, S, "programmee", {}, future);
  assert.equal(await S.publicGet(d, "fr", "programmee"), null); assert.equal((await S.publicList(d, "fr")).total, 0); assert.equal((await S.sitemapEntries(d)).length, 0);
  const later = new Date(Date.now() + 8 * 86400000).toISOString(); assert.ok(await S.publicGet(d, "fr", "programmee", later)); assert.equal((await S.publicList(d, "fr", {}, later)).total, 1);
});
test("langues : l'anglais n'est visible que s'il est prêt, avec lien vers l'autre version", async () => {
  const { d, S } = await setup(); const id = await published(d, S, "version-fr", { translations: [TR("version-fr"), TR("version-en", { lang: "en", ready: 0, title: "A solid strategic case study", subtitle: "What this repositioning reveals" })] });
  assert.equal(await S.publicGet(d, "en", "version-en"), null);
  await S.saveArticle(d, id, { translations: [{ lang: "en", ready: 1 }] }, "a");
  const en = await S.publicGet(d, "en", "version-en"); assert.ok(en); assert.deepEqual({ ...en.alternate }, { lang: "fr", slug: "version-fr" }); assert.deepEqual({ ...(await S.publicGet(d, "fr", "version-fr")).alternate }, { lang: "en", slug: "version-en" });
  assert.equal((await S.publicList(d, "en")).total, 1);
});
test("exemples fictifs : exclus du plan du site", async () => {
  const { d, S } = await setup(); const id = await published(d, S, "reel"); const demo = await published(d, S, "fictif"); d._db.prepare("UPDATE articles SET is_demo = 1 WHERE id = ?").run(demo);
  const sm = await S.sitemapEntries(d); assert.deepEqual(sm.map((e) => e.slug), ["reel"]); assert.equal((await S.publicList(d, "fr")).total, 2, "ils restent lisibles, étiquetés");
});
test("lecture publique : la grille de qualité et les données internes ne sortent jamais", async () => {
  const { d, S } = await setup(); await published(d, S, "confidentiel"); const g = await S.publicGet(d, "fr", "confidentiel");
  for (const k of ["quality_json", "quality_total", "created_by", "approved_by", "published_by", "status"]) assert.equal(k in g, false, k);
  const l = (await S.publicList(d, "fr")).items[0]; for (const k of ["quality_json", "created_by", "body_md"]) assert.equal(k in l, false, k);
});
test("articles associés : seuls les publiés et visibles sont affichés", async () => {
  const { d, S } = await setup(); const pub = await published(d, S, "associe-publie"); const draft = await S.createArticle(d, { category_id: "perspectives", format_id: "brief" }, "a"); await S.saveArticle(d, draft, { translations: [{ lang: "fr", slug: "associe-brouillon", title: "Brouillon associé" }] }, "a");
  const main = await published(d, S, "principal"); await S.saveArticle(d, main, { related: [pub, draft] }, "a");
  const g = await S.publicGet(d, "fr", "principal"); assert.deepEqual(g.related.map((r) => r.slug), ["associe-publie"]);
  await assert.rejects(S.saveArticle(d, main, { related: ["inconnu"] }, "a"), { code: "invalid" });
});
test("filtres et recherche publics : rubrique, format, texte, pagination", async () => {
  const { d, S } = await setup(); await published(d, S, "un"); const b = await S.createArticle(d, { category_id: "african", format_id: "case" }, "a"); await S.saveArticle(d, b, DOC("deux", { translations: [TR("deux", { title: "Marché ivoirien : un arbitrage décisif" })] }), "a"); for (const to of ["review", "approved", "published"]) await S.transition(d, b, to, "b");
  assert.equal((await S.publicList(d, "fr", { category: "african" })).total, 1); assert.equal((await S.publicList(d, "fr", { q: "ivoirien" })).items[0].slug, "deux");
  assert.equal((await S.publicList(d, "fr", { q: "%" })).total, 2, "jokers neutralisés"); assert.equal((await S.publicList(d, "fr", { limit: 1 })).items.length, 1); assert.equal((await S.publicList(d, "fr", { limit: 1, offset: 1 })).items.length, 1);
  assert.deepEqual((await S.categoryCounts(d, "fr")).map((c) => [c.category_id, c.n]).sort(), [["african", 1], ["cases", 1]]);
});
test("modification d'une publication en ligne : refusée si elle viole les règles", async () => {
  const { d, S } = await setup(); const id = await published(d, S, "en-ligne");
  await assert.rejects(S.saveArticle(d, id, { quality: { ...Q, sources: 0 } }, "a"), (e) => e.code === "gate");
  const ok = await S.saveArticle(d, id, { translations: [{ lang: "fr", subtitle: "Un sous-titre corrigé en ligne" }] }, "a"); assert.equal(ok.translations[0].subtitle, "Un sous-titre corrigé en ligne"); assert.equal(ok.article.status, "published");
});
test("suppression : uniquement un brouillon jamais publié", async () => {
  const { d, S } = await setup(); const a = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a"); await S.deleteDraft(d, a, "a"); assert.equal(await S.getArticle(d, a), null);
  const p = await published(d, S, "deja-publie"); await assert.rejects(S.deleteDraft(d, p, "a"), { code: "not_deletable" }); await S.transition(d, p, "draft", "a"); await assert.rejects(S.deleteDraft(d, p, "a"), { code: "not_deletable" });
});
test("révisions : conservées et limitées à quarante", async () => {
  const { d, S } = await setup(); const id = await S.createArticle(d, { category_id: "cases", format_id: "case" }, "a");
  for (let i = 0; i < 45; i++) await S.saveArticle(d, id, { translations: [{ lang: "fr", title: "Version " + i }] }, "a");
  assert.equal(rows(d, "select * from article_revisions where article_id = ?", id).length, 40);
});
test("migration éditoriale : additive, idempotente, contraintes de rubrique, format et statut", async () => {
  const fs = require("node:fs"), sql = fs.readFileSync(path.join(__dirname, "../d1/migrations/0003_editorial.sql"), "utf8").replace(/--.*$/gm, "").replace(/ON DELETE CASCADE/gi, "");
  assert.ok(!/\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(sql)); const { d } = await setup(); d._db.exec(fs.readFileSync(path.join(__dirname, "../d1/migrations/0003_editorial.sql"), "utf8"));
  assert.throws(() => d._db.prepare("INSERT INTO articles (id, category_id, format_id, created_at, updated_at, created_by) VALUES ('x', 'nope', 'case', 'a', 'a', 'a')").run());
  assert.throws(() => d._db.prepare("INSERT INTO articles (id, category_id, format_id, status, created_at, updated_at, created_by) VALUES ('x', 'cases', 'case', 'public', 'a', 'a', 'a')").run());
  assert.deepEqual(d._db.prepare("PRAGMA foreign_key_check").all(), []);
});
