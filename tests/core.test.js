const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/core/core.js");
const OPT = require("../src/core/options.js");
const COI = require("../src/coi/data.js");

function mem() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m }; }
const fresh = () => { let n = 0; const st = mem(); return { st, c: Core.create({ storage: st, now: () => "2026-11-23T10:0" + n++ + ":00.000Z", random: () => "abcd" + n }) }; };

test("désactivé par défaut : rien n'est conservé", () => {
  const { st, c } = fresh();
  assert.equal(c.enabled(), false);
  assert.equal(c.record("brief", { headline: "x" }), false);
  assert.equal(c.setProfile({ org: "X" }), false);
  assert.deepEqual(st._m, {});
});
test("activation : profil avec identifiant, consentement et date", () => {
  const { c } = fresh(); assert.ok(c.enable());
  const p = c.profile(); assert.match(p.id, /^p_/); assert.ok(p.createdAt);
  assert.ok(JSON.parse(JSON.stringify(c.profile())));
});
test("setProfile : valide les listes, ne remplace pas par du vide, trace la source", () => {
  const { c } = fresh(); c.enable();
  c.setProfile({ org: "Acme", sector: "bank", size: "100_249", market: "Côte d'Ivoire", contactEmail: "a@b.co" });
  c.setProfile({ org: "", sector: "inconnu", size: "zzz", contactEmail: "pas-un-email" });
  const p = c.profile();
  assert.equal(p.org, "Acme"); assert.equal(p.sector, "bank"); assert.equal(p.size, "100_249"); assert.equal(p.contactEmail, "a@b.co");
  assert.equal(p.sources.org, "declared");
});
test("known : ne retourne que ce qui est déjà connu (aucune double saisie)", () => {
  const { c } = fresh(); c.enable(); c.setProfile({ sector: "telco" });
  assert.deepEqual(c.known(["sector", "size"]), { sector: "telco" });
});
test("historique conservé, jamais écrasé, une entrée par évaluation", () => {
  const { c } = fresh(); c.enable();
  c.record("maturity", { version: "1.0", headline: "Niveau 2", score: 41, level: "2" });
  c.record("maturity", { version: "1.0", headline: "Niveau 3", score: 58, level: "3" });
  c.record("brand", { headline: "3 dimensions documentées" });
  assert.equal(c.history().length, 3);
  assert.equal(c.latest("maturity").score, 58);
  const cons = c.consolidated(); assert.equal(cons.brief, null); assert.equal(cons.brand.headline, "3 dimensions documentées");
  assert.equal(c.history().find((e) => e.tool === "maturity").basis, "declared");
});
test("outil inconnu refusé ; texte nettoyé et borné", () => {
  const { c } = fresh(); c.enable();
  assert.equal(c.record("autre", {}), false);
  c.record("brief", { headline: "a\u0000b".repeat(200) });
  assert.ok(c.latest("brief").headline.length <= 200 && !/\u0000/.test(c.latest("brief").headline));
});
test("effacement : tout disparaît", () => {
  const { st, c } = fresh(); c.enable(); c.record("brief", {}); c.clear();
  assert.equal(c.enabled(), false); assert.deepEqual(st._m, {}); assert.deepEqual(c.history(), []);
});
test("isolation : deux stockages distincts ne partagent rien", () => {
  const a = fresh(), b = fresh(); a.c.enable(); a.c.setProfile({ org: "Client A" }); b.c.enable();
  assert.equal(b.c.profile().org, undefined); assert.notEqual(a.c.profile().id, undefined);
  assert.equal(JSON.stringify(b.st._m).includes("Client A"), false);
});
test("stockage indisponible : aucune erreur", () => {
  const c = Core.create({ storage: { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } } });
  assert.equal(c.enabled(), false); assert.equal(c.enable(), false); assert.equal(c.record("brief", {}), false);
});
test("options secteur et taille identiques entre le noyau et Creative Operations Intelligence", () => {
  assert.deepEqual(COI.Q.sector.opts.map((o) => o.id), OPT.sector.map((o) => o.id));
  assert.deepEqual(COI.Q.size.opts.map((o) => o.id), OPT.size.map((o) => o.id));
});
