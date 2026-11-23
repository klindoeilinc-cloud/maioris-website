const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/mat/calc.js");
const D = require("../src/mat/data.js");
const all = (v) => Object.fromEntries(D.ORDER.map((id) => [id, v]));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " != " + b);

test("24 questions, 6 dimensions de 4 questions, ordre cohérent", () => {
  assert.equal(D.COUNT, 24); assert.equal(D.DIMS.length, 6); D.DIMS.forEach((d) => assert.equal(d.q.length, 4));
  assert.equal(new Set(D.ORDER).size, 24);
  D.ORDER.forEach((id) => { assert.ok(D.Q[id].t.fr && D.Q[id].t.en && D.Q[id].s.fr && D.Q[id].s.en); });
});
test("score dimensionnel = moyenne des réponses valides / 5 x 100", () => {
  const a = all(3); a.q1 = 5; a.q2 = 1; // dimension 1 : 5,1,3,3 = 3
  near(C.dimension(D.DIMS[0], a).score, 60);
  const b = all(4); near(C.dimension(D.DIMS[1], b).score, 80);
  near(C.dimension(D.DIMS[0], all(5)).score, 100); near(C.dimension(D.DIMS[0], all(1)).score, 20);
});
test("« na » et réponses absentes ne comptent jamais comme zéro", () => {
  const a = all(4); a.q1 = "na"; delete a.q2;
  const d = C.dimension(D.DIMS[0], a); assert.equal(d.valid, 2); near(d.score, 80);
  assert.notEqual(d.score, 40);
});
test("statuts de couverture : scored, indicative, none", () => {
  const a = all(4); a.q1 = "na";
  assert.equal(C.dimension(D.DIMS[0], a).status, "scored"); // 3 valides sur 4, seuil 3
  a.q2 = "na"; assert.equal(C.dimension(D.DIMS[0], a).status, "indicative");
  a.q3 = "na"; a.q4 = "na"; const d = C.dimension(D.DIMS[0], a); assert.equal(d.status, "none"); assert.equal(d.score, null); assert.equal(d.level, null);
});
test("score global = moyenne des six dimensions, avec niveau", () => {
  const a = all(3); a.q1 = 5; a.q5 = 1; // dim1 = (5+3+3+3)/4 = 3.5 -> 70 ; dim2 = (1+3+3+3)/4 = 2.5 -> 50
  const r = C.compute(a); assert.equal(r.complete, true);
  const expected = (70 + 50 + 60 + 60 + 60 + 60) / 6; near(r.global, expected); assert.equal(r.level.n, 3);
});
test("couverture insuffisante : aucun niveau global, diagnostic partiel documenté", () => {
  const a = all(5); a.q1 = "na"; a.q2 = "na"; // dimension 1 : 2 valides
  const r = C.compute(a); assert.equal(r.complete, false); assert.equal(r.global, null); assert.equal(r.level, null);
  assert.deepEqual(r.partialReasons.map((x) => x.dim), ["strategy"]);
});
test("dimension totalement manquante : pas de niveau global", () => {
  const a = all(5); D.DIMS[2].q.forEach((id) => { a[id] = "na"; });
  const r = C.compute(a); assert.equal(r.global, null); assert.equal(r.dims[2].status, "none");
});
test("seuils de niveau : bornes exactes", () => {
  assert.equal(C.levelOf(20).n, 1); assert.equal(C.levelOf(35.99).n, 1); assert.equal(C.levelOf(36).n, 2);
  assert.equal(C.levelOf(51.99).n, 2); assert.equal(C.levelOf(52).n, 3); assert.equal(C.levelOf(67.99).n, 3);
  assert.equal(C.levelOf(68).n, 4); assert.equal(C.levelOf(83.99).n, 4); assert.equal(C.levelOf(84).n, 5); assert.equal(C.levelOf(100).n, 5);
  assert.equal(C.levelOf(null), null);
});
test("toutes les réponses au maximum : niveau 5 ; au minimum : niveau 1", () => {
  assert.equal(C.compute(all(5)).level.n, 5); near(C.compute(all(5)).global, 100);
  assert.equal(C.compute(all(1)).level.n, 1); near(C.compute(all(1)).global, 20);
});
test("réponses invalides ignorées (hors 1 à 5, décimales, texte)", () => {
  const a = all(3); a.q1 = 0; a.q2 = 6; a.q3 = 2.5; a.q4 = "x";
  assert.equal(C.dimension(D.DIMS[0], a).valid, 0);
});
test("priorités : trois dimensions les plus faibles, départage par ordre fixe", () => {
  const a = all(4); a.q1 = 2; a.q5 = 2; a.q9 = 2; a.q13 = 2; // dim1,2,3,4 = 3.5 -> tous 70 ? non : (2+4+4+4)/4 = 3.5
  const p = C.priorities(C.compute(a));
  assert.equal(p.length, 3); assert.deepEqual(p.map((x) => x.dim), ["strategy", "governance", "leadership"]);
  assert.equal(p[0].q, "q1"); assert.equal(p[0].verb, "strengthen");
});
test("forces : dimensions >= 68 et réponses de niveau 4 ou 5", () => {
  const a = all(4); a.q1 = 1; const s = C.strengths(C.compute(a));
  assert.ok(s.dims.every((d) => d.score >= 68)); assert.ok(s.items.length >= 5);
});
test("attention : seulement sous le niveau Structuré (score < 52), trois au plus", () => {
  const a = all(4); assert.deepEqual(C.attention(C.compute(a)), []);
  const b = all(2); assert.equal(C.attention(C.compute(b)).length, 3);
  const c3 = all(3); assert.deepEqual(C.attention(C.compute(c3)), [], "niveau Structuré : pas d'alerte");   // 60
  const e = all(3); e.q1 = 2; e.q2 = 2; e.q3 = 1; e.q4 = 2; // dimension 1 = 1,75 -> 35
  assert.deepEqual(C.attention(C.compute(e)).map((d) => d.id), ["strategy"]);
  const f = all(3); f.q1 = 2; f.q2 = 3; f.q3 = 2; f.q4 = 3; // 2,5 -> 50 : sous 52
  assert.equal(C.attention(C.compute(f)).length, 1);
});
test("questions manquantes détectées, na compte comme répondu", () => {
  const a = all("na"); assert.deepEqual(C.missing(a), []); delete a.q7; assert.deepEqual(C.missing(a), ["q7"]);
});
