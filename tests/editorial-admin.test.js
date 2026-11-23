const test = require("node:test");
const assert = require("node:assert/strict");
const { start } = require("./helpers/pages-dev.js");
const words = (n) => Array.from({ length: n }, (_, i) => "mot" + (i % 50)).join(" ");
const Q = { sources: 18, depth: 18, analysis: 18, business: 13, originality: 13, writing: 9 };
const SRC = [{ label: "Rapport annuel", url: "https://exemple.org/rapport", publisher: "Organisme", kind: "primary" }, { label: "Étude de marché", url: "https://exemple.org/etude", publisher: "Cabinet", kind: "secondary" }];
const BODY = `## Contexte\n\n${words(420)} [^1]\n\n:::facts\nUn fait établi. [^2]\n\n${words(320)}\n:::\n\n:::analysis\n${words(320)}\n:::\n\n:::hypotheses\nUne hypothèse.\n:::\n\n:::questions\n- Question ouverte ?\n:::\n\n## Limites\n\n${words(300)}\n\n## Enseignements\n\nTexte final.`;
const DOC = (slug, o = {}) => ({ tool_suggestion: "coi", quality: Q, sources: SRC, translations: [{ lang: "fr", ready: 1, slug, title: "Un cas stratégique suffisamment solide", subtitle: "Ce que révèle ce repositionnement", summary: "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.", meta_description: "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants.", body_md: BODY, takeaways: ["Un enseignement clé"] }], ...o });
async function api(s, p, { method = "GET", body, jwt, email } = {}) {
  const tok = jwt === undefined ? await s.token(email) : jwt, h = { "Content-Type": "application/json", ...(tok ? { "Cf-Access-Jwt-Assertion": tok } : {}), Origin: s.base };
  const r = await fetch(s.base + "/api/admin/editorial/" + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); const ct = r.headers.get("content-type") || "";
  return { status: r.status, json: ct.includes("json") ? await r.json() : null, text: ct.includes("json") ? null : await r.text(), h: r.headers };
}
const publicGet = async (s, p) => { const r = await fetch(s.base + p); return { status: r.status, text: await r.text() }; };
async function create(s, cat = "cases", fmt = "case") { return (await api(s, "articles", { method: "POST", body: { category_id: cat, format_id: fmt } })).json.id; }

test("accès : refusé sans jeton Access valide, liste blanche respectée", async () => {
  const s = await start({ demo: false }); try {
    assert.equal((await api(s, "meta", { jwt: null })).status, 401); assert.equal((await api(s, "meta", { jwt: "x.y.z" })).status, 401);
    assert.equal((await api(s, "articles", { jwt: null })).status, 401); assert.equal((await api(s, "articles", { method: "POST", jwt: null, body: { category_id: "cases", format_id: "case" } })).status, 401);
    s.env.ADMIN_EMAILS = "autre@maioris.net"; assert.equal((await api(s, "meta")).status, 403); s.env.ADMIN_EMAILS = "admin@maioris.net"; assert.equal((await api(s, "meta")).status, 200);
  } finally { await s.close(); }
});
test("meta : cinq rubriques, six formats, grille sur 100 et seuil 85", async () => {
  const s = await start({ demo: false }); try { const m = (await api(s, "meta")).json; assert.equal(m.categories.length, 5); assert.equal(m.formats.length, 6); assert.equal(m.quality.reduce((a, q) => a + q.max, 0), 100); assert.equal(m.threshold, 85); assert.equal(m.tools.length, 5); assert.deepEqual(m.statuses, ["draft", "review", "approved", "published", "archived"]); }
  finally { await s.close(); }
});
test("parcours complet : brouillon, enregistrement, relecture, approbation, publication visible, dépublication", async () => {
  const s = await start({ demo: false }); try {
    const id = await create(s); assert.equal((await api(s, "articles/" + id)).json.article.status, "draft");
    const saved = await api(s, "articles/" + id, { method: "PUT", body: DOC("parcours-complet") }); assert.equal(saved.status, 200); assert.equal(saved.json.translations[0].slug, "parcours-complet"); assert.equal(saved.json.article.quality_total, 89);
    const url = "/fr/perspectives/strategic-cases/parcours-complet"; assert.equal((await publicGet(s, url)).status, 404);
    const pub = await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "published" } }); assert.equal(pub.status, 409, "pas de publication directe depuis le brouillon");
    assert.equal((await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "review" } })).status, 200); assert.equal((await publicGet(s, url)).status, 404);
    assert.equal((await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "approved" } })).json.article.approved_by, "admin@maioris.net");
    const ok = await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "published" } }); assert.equal(ok.status, 200); assert.equal(ok.json.article.status, "published");
    assert.equal((await publicGet(s, url)).status, 200); assert.equal((await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "draft" } })).status, 200); assert.equal((await publicGet(s, url)).status, 404);
    const log = s.db._db.prepare("select actor, action from audit_events where object_id = ? order by rowid", ).all(id).map((r) => r.action); assert.deepEqual(log.filter((a) => a.startsWith("article.")).slice(0, 6), ["article.created", "article.saved", "article.review", "article.approved", "article.published", "article.draft"]);
  } finally { await s.close(); }
});
test("publication refusée avec la liste précise des défauts (422), contenu resté privé", async () => {
  const s = await start({ demo: false }); try {
    const id = await create(s); await api(s, "articles/" + id, { method: "PUT", body: DOC("trop-faible", { quality: { ...Q, sources: 3 }, sources: [SRC[0]] }) });
    for (const to of ["review", "approved"]) await api(s, `articles/${id}/transition`, { method: "POST", body: { to } });
    const r = await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "published" } }); assert.equal(r.status, 422); assert.equal(r.json.error, "gate");
    const codes = r.json.details.map((d) => d.code); assert.ok(codes.includes("quality_low") && codes.includes("case_sources"));
    assert.equal((await publicGet(s, "/fr/perspectives/strategic-cases/trop-faible")).status, 404); assert.equal((await api(s, "articles/" + id)).json.article.status, "approved");
  } finally { await s.close(); }
});
test("publication programmée : acceptée, invisible avant l'échéance", async () => {
  const s = await start({ demo: false }); try {
    const id = await create(s); await api(s, "articles/" + id, { method: "PUT", body: DOC("programmee-admin") }); for (const to of ["review", "approved"]) await api(s, `articles/${id}/transition`, { method: "POST", body: { to } });
    const r = await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "published", publish_at: new Date(Date.now() + 5 * 86400000).toISOString() } }); assert.equal(r.status, 200);
    assert.equal((await publicGet(s, "/fr/perspectives/strategic-cases/programmee-admin")).status, 404); assert.equal((await api(s, `articles/${id}/transition`, { method: "POST", body: { to: "published", publish_at: "pas une date" } })).status, 409);
  } finally { await s.close(); }
});
test("aperçu : brouillon rendu pour l'équipe, jamais indexable, refusé sans accès, contenu échappé", async () => {
  const s = await start({ demo: false }); try {
    const id = await create(s); await api(s, "articles/" + id, { method: "PUT", body: { translations: [{ lang: "fr", slug: "apercu-test", title: "Titre <b>brut</b>", body_md: "## A\n\nTexte <script>alert(1)</script>" }] } });
    const p = await api(s, `articles/${id}/preview?lang=fr`); assert.equal(p.status, 200); assert.match(p.text, /Aperçu éditorial/); assert.equal(p.h.get("x-robots-tag"), "noindex, nofollow"); assert.equal(p.h.get("cache-control"), "no-store");
    assert.ok(!/<script>alert|<b>brut/.test(p.text.replace(/<script type="application\/ld\+json">.*?<\/script>/gs, ""))); assert.match(p.text, /name="robots" content="noindex, nofollow"/);
    assert.equal((await api(s, `articles/${id}/preview?lang=fr`, { jwt: null })).status, 401); assert.equal((await api(s, `articles/${id}/preview?lang=en`)).status, 404, "pas de version anglaise");
    assert.equal((await publicGet(s, "/fr/perspectives/strategic-cases/apercu-test")).status, 404);
  } finally { await s.close(); }
});
test("conflits et verrous : adresse déjà prise (409), adresse invalide (422), adresse figée après publication, grille hors bornes", async () => {
  const s = await start({ demo: false }); try {
    const a = await create(s), b = await create(s); await api(s, "articles/" + a, { method: "PUT", body: DOC("adresse-unique") });
    assert.equal((await api(s, "articles/" + b, { method: "PUT", body: DOC("adresse-unique") })).status, 409); assert.equal((await api(s, "articles/" + b, { method: "PUT", body: DOC("Mauvaise Adresse") })).status, 422);
    for (const to of ["review", "approved", "published"]) await api(s, `articles/${a}/transition`, { method: "POST", body: { to } });
    const lock = await api(s, "articles/" + a, { method: "PUT", body: { translations: [{ lang: "fr", slug: "autre-adresse" }] } }); assert.equal(lock.status, 422); assert.equal(lock.json.error, "slug_locked");
    const bad = await api(s, "articles/" + b, { method: "PUT", body: DOC("grille-hors-bornes", { quality: { ...Q, sources: 25 } }) }); assert.equal(bad.status, 200, "enregistrée en brouillon mais total invalide"); assert.equal(bad.json.article.quality_total, null);
    assert.equal((await api(s, "articles", { method: "POST", body: { category_id: "x", format_id: "case" } })).status, 422);
  } finally { await s.close(); }
});
test("un exemple fictif ne se crée jamais par l'interface : is_demo et status ignorés", async () => {
  const s = await start({ demo: false }); try {
    const id = await create(s); const r = await api(s, "articles/" + id, { method: "PUT", body: DOC("tentative", { is_demo: 1, status: "published" }) });
    assert.equal(r.json.article.is_demo, 0); assert.equal(r.json.article.status, "draft");
  } finally { await s.close(); }
});
test("liste et filtres, rubriques, à la une, sélection, version anglaise prête", async () => {
  const s = await start({ demo: false }); try {
    const a = await create(s, "cases", "case"), b = await create(s, "african", "brief"); await api(s, "articles/" + a, { method: "PUT", body: DOC("liste-un", { featured: true, selection: true, translations: [DOC("liste-un").translations[0], { lang: "en", ready: 0, slug: "list-one", title: "English title here" }] }) });
    assert.equal((await api(s, "articles")).json.items.length, 2); assert.equal((await api(s, "articles?category=african")).json.items.length, 1); assert.equal((await api(s, "articles?status=draft&q=suffisamment")).json.items.length, 1);
    const g = (await api(s, "articles/" + a)).json; assert.equal(g.article.featured, 1); assert.equal(g.article.selection, 1); assert.equal(g.translations.length, 2); assert.equal(g.translations.find((t) => t.lang === "en").ready, 0);
    assert.equal((await api(s, "articles?status=draft")).json.items.find((i) => i.id === a).has_en, null);
  } finally { await s.close(); }
});
test("suppression d'un brouillon, archivage, révisions consultables", async () => {
  const s = await start({ demo: false }); try {
    const a = await create(s); await api(s, "articles/" + a, { method: "PUT", body: DOC("a-supprimer") }); const g = (await api(s, "articles/" + a)).json; const rev = await api(s, "revisions/" + g.revisions[0].id); assert.equal(rev.status, 200); assert.equal(rev.json.revision.snapshot.slug, "a-supprimer");
    assert.equal((await api(s, `articles/${a}/delete`, { method: "POST" })).status, 200); assert.equal((await api(s, "articles/" + a)).status, 404);
    const b = await create(s); await api(s, "articles/" + b, { method: "PUT", body: DOC("a-archiver") }); for (const to of ["review", "approved", "published"]) await api(s, `articles/${b}/transition`, { method: "POST", body: { to } });
    assert.equal((await api(s, `articles/${b}/delete`, { method: "POST" })).status, 409); assert.equal((await api(s, `articles/${b}/transition`, { method: "POST", body: { to: "archived" } })).status, 200); assert.equal((await publicGet(s, "/fr/perspectives/strategic-cases/a-archiver")).status, 404);
  } finally { await s.close(); }
});
test("écritures : origine contrôlée, corps illisible et identifiants invalides refusés", async () => {
  const s = await start({ demo: false }); try {
    const tok = await s.token(); const call = (o) => fetch(s.base + "/api/admin/editorial/articles", { method: "POST", headers: { "Content-Type": "application/json", "Cf-Access-Jwt-Assertion": tok, ...o.h }, body: o.body });
    assert.equal((await call({ h: { Origin: "https://evil.example" }, body: JSON.stringify({ category_id: "cases", format_id: "case" }) })).status, 403); assert.equal((await call({ h: { Origin: s.base }, body: "{pas du json" })).status, 422);
    assert.equal((await api(s, "articles/../../etc")).status, 404); assert.equal((await api(s, "articles/'; DROP TABLE articles;--")).status, 404); assert.equal(s.db._db.prepare("select count(*) n from articles").get().n, 0);
  } finally { await s.close(); }
});
