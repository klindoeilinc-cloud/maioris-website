/* MAIORIS Creative Maturity Assessment™ : moteur de scoring. Fonctions pures, sans DOM.

   Réponse valide : entier de 1 (Absent) à 5 (Intégré). « Je ne sais pas / Non applicable » ("na") et l'absence de réponse ne sont JAMAIS comptées comme zéro :
   elles sortent simplement du calcul.
   Score dimensionnel = moyenne des réponses valides / 5 x 100  (échelle de 20 à 100 : le niveau « Absent » vaut 1/5).
   Score global       = moyenne des six scores dimensionnels, uniquement si chaque dimension compte au moins MIN_VALID réponses valides.
   Sinon : diagnostic partiel, aucun niveau global.
   Instrument propriétaire d'autoévaluation : ce n'est pas une certification indépendante. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data.js"));
  else root.MATCalc = factory(root.MATData);
})(typeof self !== "undefined" ? self : this, function (D) {
  "use strict";

  function valid(a) { return typeof a === "number" && isFinite(a) && a >= 1 && a <= 5 && Math.floor(a) === a ? a : null; }
  function isAnswered(a) { return valid(a) !== null || a === "na"; }

  /** Niveau de maturité (1 à 5) d'un score de 0 à 100. */
  function levelOf(score) {
    if (typeof score !== "number" || !isFinite(score)) return null;
    for (var i = 0; i < D.LEVELS.length; i++) if (score < D.LEVELS[i].max) return D.LEVELS[i];
    return D.LEVELS[D.LEVELS.length - 1];
  }

  function dimension(dim, answers) {
    var vals = [], lowest = null;
    dim.q.forEach(function (id) {
      var v = valid(answers[id]);
      if (v !== null) { vals.push(v); if (lowest === null || v < lowest.v) lowest = { id: id, v: v }; }
    });
    var n = vals.length, mean = n ? vals.reduce(function (a, b) { return a + b; }, 0) / n : null, score = mean === null ? null : mean / 5 * 100;
    var status = n >= D.MIN_VALID ? "scored" : n > 0 ? "indicative" : "none";
    var highest = null; vals.length && dim.q.forEach(function (id) { var v = valid(answers[id]); if (v !== null && (highest === null || v > highest.v)) highest = { id: id, v: v }; });
    return { id: dim.id, valid: n, total: dim.q.length, mean: mean, score: score, status: status, level: score === null ? null : levelOf(score), lowest: lowest, highest: highest };
  }

  /** Calcule les six dimensions et, si la couverture le permet, le niveau global. */
  function compute(answers) {
    var dims = D.DIMS.map(function (d) { return dimension(d, answers || {}); });
    var allCovered = dims.every(function (d) { return d.status === "scored"; });
    var validAll = dims.reduce(function (a, d) { return a + d.valid; }, 0);
    var out = { dims: dims, valid: validAll, total: D.COUNT, complete: allCovered, global: null, level: null, partialReasons: [] };
    if (allCovered) {
      out.global = dims.reduce(function (a, d) { return a + d.score; }, 0) / dims.length;
      out.level = levelOf(out.global);
    } else {
      dims.forEach(function (d) { if (d.status !== "scored") out.partialReasons.push({ dim: d.id, valid: d.valid, status: d.status }); });
    }
    return out;
  }

  var ORDER = D.DIMS.map(function (d) { return d.id; });
  function byScoreAsc(a, b) { return a.score - b.score || ORDER.indexOf(a.id) - ORDER.indexOf(b.id); }

  /** Forces : dimensions calculées de niveau Intégré ou plus (score >= 68), puis réponses de niveau 4 ou 5. */
  function strengths(res) {
    var dims = res.dims.filter(function (d) { return d.status === "scored" && d.score >= 68; }).sort(function (a, b) { return -byScoreAsc(a, b); });
    var items = [];
    res.dims.forEach(function (d) { if (d.highest && d.highest.v >= 4 && d.status !== "none") items.push({ dim: d.id, q: d.highest.id, v: d.highest.v }); });
    return { dims: dims, items: items };
  }
  /** Dimensions nécessitant une attention : score inférieur à 52, c'est-à-dire sous le niveau Structuré (niveaux Initial et Émergent), du plus faible au moins faible, trois au plus. */
  function attention(res) {
    return res.dims.filter(function (d) { return d.score !== null && d.score < 52; }).sort(byScoreAsc).slice(0, 3);
  }
  /** Trois priorités : les trois dimensions les plus faibles (même indicatives), chacune avec sa réponse la plus faible. */
  function priorities(res) {
    return res.dims.filter(function (d) { return d.score !== null && d.lowest; }).sort(byScoreAsc).slice(0, 3).map(function (d) {
      return { dim: d.id, q: d.lowest.id, v: d.lowest.v, score: d.score, indicative: d.status !== "scored", verb: d.lowest.v >= 4 ? "consolidate" : "strengthen" };
    });
  }
  /** Aide à la validation : toutes les questions ont-elles une réponse (valide ou « na ») ? */
  function missing(answers) { return D.ORDER.filter(function (id) { return !isAnswered((answers || {})[id]); }); }
  function missingInDim(dimIdx, answers) { return D.DIMS[dimIdx].q.filter(function (id) { return !isAnswered((answers || {})[id]); }); }

  return { valid: valid, isAnswered: isAnswered, levelOf: levelOf, dimension: dimension, compute: compute, strengths: strengths, attention: attention, priorities: priorities, missing: missing, missingInDim: missingInDim };
});
