const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { start } = require("./helpers/pages-dev.js");
const SITE = path.join(__dirname, "../site");
const walk = (d, out = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name), out) : out.push(path.join(d, f.name)); return out; };
const ST = () => import(path.resolve(SITE, "functions/_lib/editorial/store.js"));

test("pages retirées : fichiers supprimés (cas stratégiques FR et EN, images de partage associées)", () => {
  for (const p of ["fr/cas-strategiques.html", "fr/cas-strategiques", "en/strategic-cases.html", "en/strategic-cases"]) assert.ok(!fs.existsSync(path.join(SITE, p)), p);
  assert.deepEqual(fs.readdirSync(path.join(SITE, "assets/og")).filter((f) => /case/.test(f)), []);
});
test("aucune page du site ne renvoie vers les sections retirées (liens, pied de page, sections de renvoi)", () => {
  const bad = /(?:cas-strategiques|strategic-cases)(?:\.html|["/?#])|href="\/(?:fr|en)\/perspectives/;
  const hits = walk(SITE).filter((f) => f.endsWith(".html") && !f.includes("/admin/")).filter((f) => bad.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(hits.map((f) => path.relative(SITE, f)), []);
});
test("plan du site et robots.txt : plus aucune entrée des sections retirées", () => {
  const sm = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8"); assert.ok(!/cas-strategiques|strategic-cases|perspectives/.test(sm));
  assert.ok(!/sitemap-perspectives/.test(fs.readFileSync(path.join(SITE, "robots.txt"), "utf8"))); assert.ok(/Disallow: \/admin\//.test(fs.readFileSync(path.join(SITE, "robots.txt"), "utf8")), "l'administration reste exclue");
});
test("anciennes adresses : redirections 301 permanentes vers MAIORIS Insights, sans doublon ni boucle", () => {
  const r = fs.readFileSync(path.join(SITE, "_redirects"), "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.trim().split(/\s+/));
  const rule = (from) => r.find((x) => x[0] === from);
  for (const [from, to] of [["/fr/cas-strategiques", "/fr/analyses"], ["/fr/cas-strategiques/*", "/fr/analyses"], ["/fr/cas-strategiques.html", "/fr/analyses"], ["/en/strategic-cases", "/en/insights"], ["/en/strategic-cases/*", "/en/insights"], ["/en/strategic-cases.html", "/en/insights"]]) { const x = rule(from); assert.ok(x, from); assert.equal(x[1], to); assert.equal(x[2], "301"); }
  const froms = r.map((x) => x[0]); assert.equal(new Set(froms).size, froms.length, "aucune règle en double"); for (const x of r) assert.ok(!froms.includes(x[1]) || x[1] === x[0] === false, "pas de redirection en chaîne : " + x.join(" "));
  assert.ok(fs.existsSync(path.join(SITE, "fr/analyses.html")) && fs.existsSync(path.join(SITE, "en/insights.html")), "les destinations existent");
});
test("section publique désactivée : /perspectives renvoie vers Insights (302 réversible), plan du site absent, rien d'indexable", async () => {
  const s = await start({ publicSection: false }); try {
    const get = (p) => fetch(s.base + p, { redirect: "manual" });
    for (const [p, to] of [["/fr/perspectives", "/fr/analyses"], ["/fr/perspectives/strategic-cases", "/fr/analyses"], ["/fr/perspectives/strategic-cases/maison-oree-un-cadre-a-trois-niveaux", "/fr/analyses"], ["/en/perspectives", "/en/insights"], ["/en/perspectives/executive-perspectives", "/en/insights"]]) { const r = await get(p); assert.equal(r.status, 302, p); assert.equal(r.headers.get("location"), to, p); assert.equal(r.headers.get("cache-control"), "no-store"); }
    assert.equal((await get("/sitemap-perspectives.xml")).status, 404);
  } finally { await s.close(); }
});
test("section publique désactivée : le moteur éditorial reste intact (administration, aperçu, base, images)", async () => {
  const s = await start({ publicSection: false }); const S = await ST(); try {
    const tok = await s.token(), h = { "Cf-Access-Jwt-Assertion": tok, "Content-Type": "application/json", Origin: s.base };
    const meta = await (await fetch(s.base + "/api/admin/editorial/meta", { headers: h })).json(); assert.equal(meta.categories.length, 5); assert.equal(meta.formats.length, 6);
    const list = await (await fetch(s.base + "/api/admin/editorial/articles", { headers: h })).json(); assert.equal(list.items.length, 3, "les contenus en base sont conservés");
    const id = list.items[0].id, prev = await fetch(s.base + `/api/admin/editorial/articles/${id}/preview?lang=fr`, { headers: h }); assert.equal(prev.status, 200, "l'aperçu fonctionne"); assert.equal(prev.headers.get("x-robots-tag"), "noindex, nofollow");
    const created = await (await fetch(s.base + "/api/admin/editorial/articles", { method: "POST", headers: h, body: JSON.stringify({ category_id: "cases", format_id: "case" }) })).json(); assert.ok(created.id, "création toujours possible");
    assert.equal(s.db._db.prepare("select count(*) n from articles").get().n, 4);
    assert.equal((await fetch(s.base + "/media/AAAAAAAAAAAAAAAAAAAAAAAA")).status, 404, "la lecture d'images reste en service");
  } finally { await s.close(); }
});
test("section publique réactivable : avec EDITORIAL_PUBLIC=1 les pages répondent de nouveau", async () => {
  const s = await start({ publicSection: true }); try { assert.equal((await fetch(s.base + "/fr/perspectives")).status, 200); assert.equal((await fetch(s.base + "/fr/perspectives/strategic-cases/maison-oree-un-cadre-a-trois-niveaux")).status, 200); } finally { await s.close(); }
});
