const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/fcl/calc.js");
const base = { internal: 60000000, recruit: 9000000, coord: 12000000, rework: 18000000, level: 40, fee: 2000000, years: 3, reworkCut: 0, coordCut: 0 };

test("scénarios annualisés : composition exacte, sans hypothèse d'efficacité par défaut", () => {
  const r = C.compute(base);
  assert.equal(r.ok, true);
  assert.equal(r.scenarios.permanent.total, 60000000 + 3000000 + 12000000 + 18000000);
  assert.equal(r.scenarios.distributed.total, 12000000 + 18000000);
  assert.equal(r.scenarios.external.total, 24000000 + 12000000 + 18000000);
  assert.equal(r.hypotheses.applied, false);
});
test("différences signées par rapport au pilotage réparti, jamais une économie présumée", () => {
  const r = C.compute(base);
  assert.equal(r.differences.permanent, 63000000);
  assert.equal(r.differences.external, 24000000);
});
test("les hypothèses du visiteur s'appliquent de la même façon aux deux scénarios de leadership senior, pas au pilotage réparti", () => {
  const r = C.compute({ ...base, reworkCut: 10, coordCut: 20 });
  assert.equal(r.scenarios.distributed.total, 30000000);
  assert.equal(r.scenarios.permanent.total, 60000000 + 3000000 + 12000000 * 0.8 + 18000000 * 0.9);
  assert.equal(r.scenarios.external.total, 24000000 + 12000000 * 0.8 + 18000000 * 0.9);
  assert.equal(r.hypotheses.applied, true);
});
test("honoraires externes vides : scénario non chiffré, aucun tarif présumé", () => {
  const r = C.compute({ ...base, fee: "" });
  assert.equal(r.scenarios.external, null); assert.equal(r.differences.external, null);
  assert.ok(r.scenarios.permanent.total > 0);
});
test("capacité non requise d'un poste permanent selon le niveau de besoin", () => {
  assert.equal(C.compute({ ...base, level: 40 }).unusedCapacity, 36000000);
  assert.equal(C.compute({ ...base, level: 100 }).unusedCapacity, 0);
});
test("durée d'amortissement : le recrutement est réparti sur la durée saisie", () => {
  assert.equal(C.compute({ ...base, years: 1 }).scenarios.permanent.lines[1].amount, 9000000);
  assert.equal(C.compute({ ...base, years: 5 }).scenarios.permanent.lines[1].amount, 1800000);
});
test("saisies invalides : négatif, non numérique, hors bornes, séparateurs de milliers acceptés", () => {
  for (const bad of [{ internal: -1 }, { rework: "abc" }, { years: 0 }, { years: 11 }, { level: 4 }, { level: 101 }, { reworkCut: 51 }, { coordCut: -5 }, { fee: -2 }]) assert.equal(C.compute({ ...base, ...bad }).ok, false, JSON.stringify(bad));
  const r = C.compute({ ...base, internal: "60 000 000", rework: "18 000 000,5" });
  assert.equal(r.ok, true); assert.equal(r.values.internal, 60000000); assert.equal(r.values.rework, 18000000.5);
});
test("champs vides : zéro, durée par défaut 3 ans, niveau 50 %", () => {
  const r = C.compute({});
  assert.equal(r.ok, true); assert.equal(r.values.years, 3); assert.equal(r.values.level, 50); assert.equal(r.scenarios.distributed.total, 0); assert.equal(r.scenarios.external, null);
});
