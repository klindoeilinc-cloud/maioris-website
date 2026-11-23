const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/brand/calc.js");
const D = require("../src/brand/data.js");

const file = (name, size = 1000, type) => ({ name, size, type });
function sup(cat, kind, title, extra = {}) { return Object.assign({ cat, kind, title, source: "link", url: "https://example.com/" + title }, extra); }
function registry() { let l = []; [["A", "logo", "Logo"], ["B", "campaign", "Campagne"], ["C", "site", "Site"], ["D", "identity", "Concurrent"]].forEach((s) => { l = C.addSupport(l, sup(...s)).supports; }); return l; }
const obs = (status, doc, fact = "Observation précise sur le support.") => ({ status, doc, loc: "p. 2", fact });
function review(dimId, statuses, docs) { const d = D.DIMS.find((x) => x.id === dimId), r = {}; d.c.forEach((c, i) => { r[c.id] = i < statuses.length ? obs(statuses[i], docs[i % docs.length]) : { status: "unobservable" }; }); return r; }

test("32 critères, six dimensions, libellés FR et EN", () => {
  assert.equal(D.ORDER.length, 32); assert.equal(D.DIMS.length, 6);
  D.ORDER.forEach((id) => { const c = D.CRITERIA[id]; assert.ok(c.l.fr && c.l.en); });
  D.DIMS.forEach((d) => { assert.ok(d.risk.fr && d.risk.en && d.stem.fr && d.stem.en); });
});

test("fichiers : formats acceptés PDF, PNG, JPG, JPEG, WEBP", () => {
  ["a.pdf", "b.PNG", "c.jpg", "d.jpeg", "e.webp"].forEach((n) => assert.equal(C.validateFile(file(n)).ok, true, n));
  ["a.gif", "b.docx", "c.exe", "d", "e.svg", "f.pdf.exe"].forEach((n) => assert.equal(C.validateFile(file(n)).error, "format", n));
});
test("fichiers : taille maximale, fichier vide, type déclaré incohérent", () => {
  assert.equal(C.validateFile(file("a.pdf", D.LIMITS.maxFileBytes)).ok, true);
  assert.equal(C.validateFile(file("a.pdf", D.LIMITS.maxFileBytes + 1)).error, "size");
  assert.equal(C.validateFile(file("a.pdf", 0)).error, "empty");
  assert.equal(C.validateFile(file("a.png", 10, "application/x-msdownload")).error, "mime");
  assert.equal(C.validateFile(null).error, "empty");
});
test("liens : http et https publics seulement", () => {
  assert.equal(C.validateLink("https://exemple.com/page").ok, true);
  assert.equal(C.validateLink("javascript:alert(1)").error, "protocol");
  assert.equal(C.validateLink("ftp://exemple.com").error, "protocol");
  assert.equal(C.validateLink("pas un lien").error, "invalid");
  assert.equal(C.validateLink("https://user:pw@exemple.com").error, "invalid");
  ["http://localhost:3000", "http://127.0.0.1", "http://192.168.1.4", "http://10.0.0.2", "http://intranet", "https://x.local"].forEach((u) => assert.equal(C.validateLink(u).error, "private", u));
  assert.equal(C.validateLink("").error, "empty");
});
test("registre : identifiants uniques, limite, catégories et types contrôlés, titre requis", () => {
  let l = registry(); assert.deepEqual(l.map((s) => s.id), ["S1", "S2", "S3", "S4"]);
  assert.equal(C.addSupport(l, sup("Z", "logo", "x")).error, "kind");
  assert.equal(C.addSupport(l, sup("A", "campaign", "x")).error, "kind");
  assert.equal(C.addSupport(l, sup("A", "logo", "  ")).error, "title");
  assert.equal(C.addSupport(l, { cat: "A", kind: "logo", title: "x", source: "file", file: file("x.gif") }).error, "file_format");
  assert.equal(C.addSupport(l, sup("A", "logo", "x", { url: "http://localhost" })).error, "link_private");
  const f = C.addSupport(l, { cat: "A", kind: "logo", title: "Logo vect", source: "file", file: file("logo.png", 500, "image/png") });
  assert.equal(f.ok, true); assert.equal(f.support.fileName, "logo.png"); assert.equal(f.support.id, "S5");
  let big = []; for (let i = 0; i < D.LIMITS.maxSupports; i++) big = C.addSupport(big, sup("B", "social", "p" + i)).supports;
  assert.equal(C.addSupport(big, sup("B", "social", "de trop")).error, "max");
});
test("suppression d'un support : les constats qui le citaient perdent leur preuve", () => {
  const l = registry(), rev = { "visual.colors": obs("conform", "S1") };
  const r = C.removeSupport(l, "S1", rev);
  assert.equal(r.supports.length, 3); assert.equal(r.reviews["visual.colors"].doc, "");
  assert.equal(C.criterion(r.reviews["visual.colors"], r.supports).state, "incomplete");
});
test("un constat observé exige un support du registre et un fait décrit", () => {
  const l = registry();
  assert.equal(C.criterion({ status: "conform", doc: "S1", fact: "court" }, l).state, "incomplete");
  assert.equal(C.criterion({ status: "conform", doc: "", fact: "Un fait observé suffisamment décrit." }, l).state, "incomplete");
  assert.equal(C.criterion({ status: "conform", doc: "S99", fact: "Un fait observé suffisamment décrit." }, l).state, "incomplete");
  assert.equal(C.criterion(obs("partial", "S2"), l).state, "observed");
  assert.equal(C.criterion({ status: "unobservable" }, l).state, "not_observed");
  assert.equal(C.criterion({ status: "na" }, l).state, "na");
  assert.equal(C.criterion({}, l).state, "unanswered"); assert.equal(C.criterion({ status: "bizarre" }, l).state, "unanswered");
});
test("dimension suffisamment documentée : indice = moyenne pondérée, sans score global", () => {
  const l = registry(), rev = review("visual", ["conform", "partial", "non", "conform"], ["S1", "S2"]);
  const d = C.dimension(D.DIMS[0], rev, l);
  assert.equal(d.scored, true); assert.equal(d.index, (1 + 0.5 + 0 + 1) / 4 * 100); assert.equal(d.band, "partial");
  assert.equal(C.compute(rev, l).global, undefined);
});
test("un support isolé ne permet pas de conclure sur une dimension", () => {
  const l = registry(), d = C.dimension(D.DIMS[0], review("visual", ["conform", "conform", "conform", "conform"], ["S1"]), l);
  assert.equal(d.scored, false); assert.ok(d.reasons.includes("few_supports")); assert.equal(d.index, null);
});
test("trop peu de critères observés : pas de score", () => {
  const l = registry(), d = C.dimension(D.DIMS[0], review("visual", ["conform", "non"], ["S1", "S2"]), l);
  assert.equal(d.scored, false); assert.ok(d.reasons.includes("few_observed"));
});
test("dimension majoritairement non observable : pas de score", () => {
  const l = registry(), r = review("verbal", ["conform", "conform", "conform"], ["S1", "S2"]); // 3 observés sur 6 applicables : 50 %, seuil atteint
  assert.equal(C.dimension(D.DIMS[1], r, l).scored, true);
  const r2 = review("verbal", ["conform", "conform", "conform"], ["S1", "S2"]); D.DIMS[1].c.slice(3).forEach((c) => { r2[c.id] = { status: "unobservable" }; }); r2["verbal.tone"] = { status: "unobservable" };
  assert.equal(C.dimension(D.DIMS[1], r2, l).scored, false);
});
test("critères non applicables sortent du dénominateur", () => {
  const l = registry(), r = review("positioning", ["conform", "non", "partial"], ["S1", "S2"]); r["positioning.discourse"] = { status: "na" };
  const d = C.dimension(D.DIMS[2], r, l); assert.equal(d.applicable, 3); assert.equal(d.scored, true);
  D.DIMS[2].c.forEach((c) => { r[c.id] = { status: "na" }; }); assert.deepEqual(C.dimension(D.DIMS[2], r, l).reasons.includes("not_applicable"), true);
});
test("Creative Distinctiveness exige une référence concurrentielle", () => {
  const l = registry(), r = review("distinct", ["conform", "partial", "non", "conform"], ["S1", "S2"]);
  const without = C.dimension(D.DIMS[3], r, l); assert.equal(without.scored, false); assert.ok(without.reasons.includes("no_competitor"));
  const r2 = review("distinct", ["conform", "partial", "non", "conform"], ["S1", "S4"]);
  assert.equal(C.dimension(D.DIMS[3], r2, l).scored, true);
});
test("registre des preuves : fait, interprétation et hypothèse restent séparés", () => {
  const l = registry(), rev = { "visual.colors": { status: "non", doc: "S2", loc: "page 3", fact: "Trois bleus différents sur le même visuel.", interp: "Absence de palette de référence", hypo: "À vérifier auprès de l'agence" } };
  const [row] = C.register(rev, l);
  assert.equal(row.fact, "Trois bleus différents sur le même visuel."); assert.equal(row.interp, "Absence de palette de référence"); assert.equal(row.hypo, "À vérifier auprès de l'agence");
  assert.equal(row.support.id, "S2"); assert.equal(row.loc, "page 3");
});
test("couverture : catégories de supports non fournies signalées", () => {
  const c = C.compute({}, [C.addSupport([], sup("A", "logo", "Logo")).support].map((s) => s));
  assert.deepEqual(c.emptyCats, ["B", "C", "D"]); assert.equal(c.singleSupport, true); assert.equal(c.scoredCount, 0);
});
test("étape de dimension : statut obligatoire pour chaque critère", () => {
  const l = registry(); assert.equal(Object.keys(C.validateDim(0, {}, l)).length, 6);
  const rev = review("visual", ["conform", "conform", "conform", "conform", "conform", "conform"], ["S1", "S2"]); assert.deepEqual(C.validateDim(0, rev, l), {});
});
test("profil : champs obligatoires et secteur valide", () => {
  assert.equal(Object.keys(C.validateProfile({})).length, 6);
  const ok = { name: "Marque", sector: "bank", market: "CI", audience: "Jeunes", positioning: "Banque proche", channels: ["site"] };
  assert.deepEqual(C.validateProfile(ok), {});
  assert.equal(C.validateProfile({ ...ok, sector: "zzz" }).sector, "invalid");
});
