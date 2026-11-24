/* MAIORIS : comparateur de scénarios de leadership créatif. Fonctions pures, sans DOM.

   Trois scénarios annualisés : recrutement permanent, pilotage réparti entre agences et prestataires, leadership créatif externalisé.
   Le calcul n'utilise que les montants saisis par le visiteur. Aucun tarif MAIORIS n'est présumé : le coût du scénario externalisé
   est le montant mensuel que le visiteur renseigne (par exemple celui d'une proposition) ; vide, ce scénario n'est pas chiffré.
   Les effets d'efficacité sont des hypothèses du visiteur, à zéro par défaut, appliquées de la même façon aux deux scénarios dotés
   d'un leadership senior. Ce n'est ni une prévision ni une garantie d'économie. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FCLCalc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var LIMITS = { years: [1, 10], level: [5, 100], cut: [0, 50], money: 1e13 };
  function num(v) { var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(/[\s  ]/g, "").replace(",", ".")); return isFinite(n) ? n : NaN; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  /** Normalise les saisies : retourne { ok, errors, values }. Un montant vide vaut 0, sauf les honoraires externes (vide = non chiffré). */
  function normalize(inp) {
    inp = inp || {}; var errors = {}, v = {};
    ["internal", "recruit", "coord", "rework"].forEach(function (k) {
      var raw = inp[k]; if (raw === "" || raw == null) { v[k] = 0; return; }
      var n = num(raw); if (!isFinite(n) || n < 0 || n > LIMITS.money) errors[k] = "invalid"; else v[k] = n;
    });
    if (inp.fee === "" || inp.fee == null) v.fee = null; else { var f = num(inp.fee); if (!isFinite(f) || f < 0 || f > LIMITS.money) errors.fee = "invalid"; else v.fee = f; }
    var y = inp.years === "" || inp.years == null ? 3 : num(inp.years); if (!isFinite(y) || y < LIMITS.years[0] || y > LIMITS.years[1]) errors.years = "invalid"; else v.years = y;
    var l = inp.level === "" || inp.level == null ? 50 : num(inp.level); if (!isFinite(l) || l < LIMITS.level[0] || l > LIMITS.level[1]) errors.level = "invalid"; else v.level = l;
    ["reworkCut", "coordCut"].forEach(function (k) { var c = inp[k] === "" || inp[k] == null ? 0 : num(inp[k]); if (!isFinite(c) || c < LIMITS.cut[0] || c > LIMITS.cut[1]) errors[k] = "invalid"; else v[k] = c; });
    return { ok: Object.keys(errors).length === 0, errors: errors, values: v };
  }
  function sum(lines) { return lines.reduce(function (a, l) { return a + l.amount; }, 0); }
  /** Calcule les trois scénarios. Retourne null si les saisies sont invalides. */
  function compute(inp) {
    var n = normalize(inp); if (!n.ok) return { ok: false, errors: n.errors };
    var v = n.values, rc = 1 - v.reworkCut / 100, cc = 1 - v.coordCut / 100;
    var A = [{ id: "internal", amount: v.internal }, { id: "recruit", amount: v.recruit / v.years }, { id: "coord", amount: v.coord * cc }, { id: "rework", amount: v.rework * rc }];
    var B = [{ id: "coord", amount: v.coord }, { id: "rework", amount: v.rework }];
    var C = v.fee === null ? null : [{ id: "fee", amount: v.fee * 12 }, { id: "coord", amount: v.coord * cc }, { id: "rework", amount: v.rework * rc }];
    var totals = { permanent: sum(A), distributed: sum(B), external: C ? sum(C) : null };
    return {
      ok: true, values: v,
      scenarios: { permanent: { lines: A, total: totals.permanent }, distributed: { lines: B, total: totals.distributed }, external: C ? { lines: C, total: totals.external } : null },
      /* différence par rapport au pilotage réparti : valeur signée, jamais présentée comme une économie garantie */
      differences: { permanent: totals.permanent - totals.distributed, external: C ? totals.external - totals.distributed : null },
      /* part du coût d'un poste permanent qui excède le besoin déclaré, si le poste était dédié à ce seul besoin */
      unusedCapacity: v.internal * (1 - v.level / 100),
      hypotheses: { reworkCut: v.reworkCut, coordCut: v.coordCut, applied: v.reworkCut > 0 || v.coordCut > 0 },
    };
  }
  return { compute: compute, normalize: normalize, LIMITS: LIMITS };
});
