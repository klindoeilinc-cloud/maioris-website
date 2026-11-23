const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/coi/calc.js");
const D = require("../src/coi/data.js");

const base = { budget: 100000000, rework: "26_50", hours: 20, avoidable: "26_50", hourly: 5000, weeks: 48 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, a + " != " + b);

test("coût externe A = B x R (bas, milieu, haut)", () => {
  const r = C.compute(base).external;
  assert.equal(r.status, "ok");
  near(r.lo, 26000000); near(r.hi, 50000000); near(r.mid, 38000000);
});
test("heures évitables B' = H x S x P", () => {
  const r = C.compute(base).hours;
  near(r.lo, 20 * 48 * 0.26); near(r.hi, 20 * 48 * 0.5);
});
test("coût interne C = B' x T", () => {
  const r = C.compute(base).internal;
  near(r.mid, 20 * 48 * 0.38 * 5000);
});
test("total D = A + C, sans double comptage", () => {
  const c = C.compute(base);
  assert.equal(c.total.status, "complete");
  near(c.total.mid, c.external.mid + c.internal.mid);
  near(c.total.lo, c.external.lo + c.internal.lo);
});
test("coût horaire absent : C non calculable, total partiel externe, jamais zéro", () => {
  const c = C.compute({ ...base, hourly: null });
  assert.equal(c.internal.status, "missing_hourly");
  assert.equal(c.total.status, "partial_external");
  near(c.total.mid, c.external.mid);
  assert.equal(c.hours.status, "ok");
});
test("part de reprises inconnue : A non calculable", () => {
  const c = C.compute({ ...base, rework: "unknown" });
  assert.equal(c.external.status, "unknown_share");
  assert.equal(c.total.status, "partial_internal");
});
test("budget absent ou négatif : A non calculable", () => {
  assert.equal(C.compute({ ...base, budget: null }).external.status, "missing_budget");
  assert.equal(C.compute({ ...base, budget: -5 }).external.status, "missing_budget");
});
test("tout inconnu : total none", () => {
  const c = C.compute({ budget: null, rework: "unknown", hours: null, avoidable: "unknown", hourly: null, weeks: 48 });
  assert.equal(c.total.status, "none");
});
test("zéro est une valeur valide et donne zéro", () => {
  const c = C.compute({ ...base, budget: 0, hours: 0 });
  assert.equal(c.external.mid, 0); assert.equal(c.hours.mid, 0); assert.equal(c.total.status, "complete");
});
test("très grandes valeurs restent finies", () => {
  const c = C.compute({ ...base, budget: 1e13 });
  assert.ok(Number.isFinite(c.total.hi));
});
test("semaines invalides : heures non calculables", () => {
  assert.equal(C.compute({ ...base, weeks: 0 }).hours.status, "missing_hours");
  assert.equal(C.compute({ ...base, weeks: null }).hours.status, "missing_hours");
});
test("bas <= milieu <= haut pour toutes les options", () => {
  D.Q.rework.opts.concat(D.Q.avoidable.opts).filter(o => !o.unknown).forEach(o => { assert.ok(o.lo <= o.hi && o.lo >= 0 && o.hi <= 100, o.id); });
});

test("lecture des nombres FR et EN", () => {
  assert.equal(C.parseNumber("1 500 000", "fr"), 1500000);
  assert.equal(C.parseNumber("12,5", "fr"), 12.5);
  assert.equal(C.parseNumber("1,500,000", "en"), 1500000);
  assert.equal(C.parseNumber("", "fr"), null);
  assert.ok(Number.isNaN(C.parseNumber("abc", "fr")));
  assert.ok(Number.isNaN(C.parseNumber("1e5", "fr")));
});
test("validation numérique : négatif, entier, plage, alerte", () => {
  assert.equal(C.checkNumber("budget", "-1", "fr").error, "negative");
  assert.equal(C.checkNumber("weeks", "47,5", "fr").error, "integer");
  assert.equal(C.checkNumber("weeks", "60", "fr").error, "range");
  assert.equal(C.checkNumber("weeks", "0", "fr").error, "range");
  assert.equal(C.checkNumber("hours", "5000", "fr").warn, "high");
  assert.equal(C.checkNumber("budget", "abc", "fr").error, "invalid");
  assert.equal(C.checkNumber("hourly", "", "fr").state, "empty");
  assert.equal(C.checkNumber("budget", "", "fr").error, "required");
});

const full = { sector: Object.keys({})[0] };
function answersOK() {
  const a = {};
  D.ORDER.forEach(id => {
    const q = D.Q[id];
    if (q.type === "single") a[id] = q.opts[0].id;
    else if (q.type === "multi") a[id] = q.opts.filter(o => !(q.exclusive || []).includes(o.id)).slice(0, 1).map(o => o.id);
    else a[id] = q.init || "10";
  });
  a.hourly = ""; a.budget = "100000000"; a.hours = "20"; a.weeks = "48";
  return a;
}
test("validation complète d'un jeu de réponses valide", () => {
  const v = C.validate(answersOK(), "fr");
  assert.deepEqual(v.errors, {});
  assert.equal(v.input.hourly, null);
  assert.equal(C.progress(answersOK(), "fr"), 100);
});
test("progression baisse quand une réponse obligatoire manque", () => {
  const a = answersOK(); a.budget = "";
  assert.ok(C.progress(a, "fr") < 100);
  assert.equal(C.validate(a, "fr").errors.budget, "required");
});
test("défis : maximum 3 et principal obligatoire si plusieurs", () => {
  const a = answersOK(), ids = D.Q.challenges.opts.map(o => o.id);
  a.challenges = ids.slice(0, 4);
  assert.equal(C.validate(a, "fr").errors.challenges, "max");
  a.challenges = ids.slice(0, 2); a.challengesMain = "";
  assert.equal(C.validate(a, "fr").errors.challenges, "main");
  a.challengesMain = ids[1];
  assert.equal(C.validate(a, "fr").errors.challenges, undefined);
});
test("surcoûts : choix exclusifs", () => {
  const a = answersOK(); a.extra = ["none", D.Q.extra.opts.find(o => !["none", "unavailable"].includes(o.id)).id];
  assert.equal(C.validate(a, "fr").errors.extra, "exclusive");
});
test("gouvernance : seuls les rangs 3 et 4 sont signalés, ordre déterministe", () => {
  const a = {};
  ["levels", "people", "cycles", "changes"].forEach(d => { a[d] = D.Q[d].opts.find(o => o.rank === 4).id; });
  const g = C.governance(a);
  assert.deepEqual(g.map(x => x.id), ["cycles", "levels", "people", "changes"]);
  ["levels", "people", "cycles", "changes"].forEach(d => { a[d] = D.Q[d].opts.find(o => o.rank === 1).id; });
  assert.deepEqual(C.governance(a), []);
});
test("confiance : jamais élevée, dégradée si données inconnues", () => {
  assert.equal(C.confidence(base).level, "medium");
  assert.equal(C.confidence({ ...base, hourly: null }).level, "low");
  assert.equal(C.confidence({ budget: null, rework: "unknown", hours: null, avoidable: "unknown", hourly: null }).level, "very_low");
});
test("principal : unique, désigné ou absent", () => {
  assert.equal(C.mainOf(["a"], null), "a");
  assert.equal(C.mainOf(["a", "b"], "b"), "b");
  assert.equal(C.mainOf(["a", "b"], null), null);
  assert.equal(C.mainOf([], null), null);
});
test("format FCFA", () => {
  assert.equal(C.formatMoney(1500000, "fr"), "1 500 000 FCFA");
  assert.match(C.formatMoney(1500000, "en"), /^1,500,000 FCFA$/);
});
