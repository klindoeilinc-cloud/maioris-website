const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/brand/calc.js"), D = require("../src/brand/data.js"), R = require("../src/brand/report.js");

function state() {
  let sup = [];
  [["A", "logo", "Logo"], ["B", "campaign", "Campagne"], ["D", "identity", "Concurrent"]].forEach((s) => { sup = C.addSupport(sup, { cat: s[0], kind: s[1], title: s[2], source: "link", url: "https://exemple.com/" + s[2] }).supports; });
  const rev = {}, set = (id, o) => { rev[id] = o; };
  D.DIMS[0].c.forEach((c, i) => set(c.id, { status: ["conform", "partial", "non", "conform", "conform", "unobservable"][i], doc: i % 2 ? "S2" : "S1", loc: "p." + i, fact: "Constat factuel numéro " + i + " décrit.", interp: i === 2 ? "Palette non fixée" : "", hypo: i === 2 ? "Guidelines absentes ?" : "" }));
  return { profile: { name: "Marque X", sector: "bank", market: "CI", audience: "Jeunes actifs", positioning: "La banque proche", competitors: "A\nB", channels: ["site", "social"] }, supports: sup, reviews: rev };
}
test("rapport A à H structuré, FR et EN", () => {
  ["fr", "en"].forEach((lang) => {
    const r = R.build(state(), lang);
    assert.ok(r.A.length >= 5); assert.equal(r.B.length, 6); assert.ok(r.C.length === 6); assert.ok(r.D.length === 3);
    assert.ok(r.E.length === 2); assert.ok(r.F.length === 1); assert.ok(r.G.length >= 1 && r.G.length <= 5); assert.ok(r.H.length >= 4);
  });
});
test("dimension documentée : indice ; autres dimensions : aucun score, raison indiquée", () => {
  const r = R.build(state(), "fr");
  assert.equal(r.B[0].scored, true); assert.equal(r.B[0].index, Math.round((1 + 0.5 + 0 + 1 + 1) / 5 * 100));
  r.B.slice(1).forEach((d) => { assert.equal(d.scored, false); assert.equal(d.index, null); assert.ok(d.reasons.length > 0); });
});
test("faits, interprétations et hypothèses restent distincts dans le registre et dans le texte", () => {
  const r = R.build(state(), "fr"), row = r.C.find((x) => x.interp);
  assert.equal(row.fact, "Constat factuel numéro 2 décrit."); assert.equal(row.interp, "Palette non fixée"); assert.equal(row.hypo, "Guidelines absentes ?");
  assert.equal(r.H0.length, 1);
  const txt = R.toText(r); assert.match(txt, /Fait observé : Constat factuel numéro 2/); assert.match(txt, /Interprétation : Palette non fixée/); assert.match(txt, /Hypothèse à vérifier : Guidelines absentes/);
});
test("jamais de certitude élevée, risque signalé avec son niveau de certitude", () => {
  const r = R.build(state(), "fr"); assert.match(r.F[0], /Niveau de certitude : (faible|modéré)/); assert.ok(!/élevé/i.test(r.F.join(" ")));
});
test("limites : catégories manquantes, dimensions non scorées, fichiers non analysés", () => {
  const r = R.build(state(), "fr"), h = r.H.join(" ");
  assert.match(h, /Aucun fichier n'a été lu ni analysé/); assert.match(h, /Présence digitale/); assert.match(h, /Dimensions non scorées/); assert.match(h, /reconnaissent/);
});
test("aucun score global dans le rapport", () => {
  const r = R.build(state(), "fr"); assert.equal(r.global, undefined); assert.ok(!/score global/i.test(R.toText(r).replace(/Aucun score global/i, "")));
});
test("actions : les écarts non conformes passent avant les partiels", () => {
  const r = R.build(state(), "fr"); assert.match(r.G[0], /usage du logo|cohérence des éléments|Harmoniser/); assert.match(r.G[0], /Harmoniser/);
  assert.match(r.G[0], /usage du logo/);
});
test("revue vide : rapport honnête sans conclusion", () => {
  const r = R.build({ profile: {}, supports: [], reviews: {} }, "en");
  assert.equal(r.D.length, 0); assert.equal(r.E.length, 0); assert.equal(r.F.length, 0); assert.equal(r.G.length, 0); assert.ok(r.H.some((x) => /No file was read/.test(x)));
});
