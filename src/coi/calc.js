/* MAIORIS Creative Operations Intelligence : moteur de calcul et validations.
   Fonctions pures, sans accès au DOM. Les formules sont centralisées dans compute().

   Variables
     B = budget annuel externe de production créative
     R = part du budget absorbée par les reprises (fourchette, issue de la question 7)
     H = heures hebdomadaires consacrées aux validations et reprises
     P = part de ces heures évitable (fourchette, issue de la question 14)
     T = coût horaire interne moyen (facultatif)
     S = semaines travaillées par an

   Indicateurs
     A  coût externe des reprises          = B x R
     B' heures annuelles évitables         = H x S x P
     C  coût interne des frictions         = B' x T
     D  coût annuel des inefficiences      = A + C   (A et C reposent sur des bases distinctes : budget externe, heures internes)

   Une donnée inconnue n'est jamais remplacée par zéro : l'indicateur correspondant est déclaré non calculable. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data.js"));
  else root.COICalc = factory(root.COIData);
})(typeof self !== "undefined" ? self : this, function (D) {
  "use strict";

  function opt(qid, id) {
    var q = D.Q[qid];
    if (!q || !q.opts) return null;
    for (var i = 0; i < q.opts.length; i++) if (q.opts[i].id === id) return q.opts[i];
    return null;
  }

  /** Fourchette d'une réponse en pourcentage : {lo, hi, mid} ou {unknown:true}, null si réponse absente. */
  function range(qid, id) {
    var o = opt(qid, id);
    if (!o) return null;
    if (o.unknown) return { unknown: true };
    return { lo: o.lo, hi: o.hi, mid: (o.lo + o.hi) / 2 };
  }

  /** Lecture d'un nombre saisi : espaces ignorés, virgule décimale en français, virgule des milliers en anglais.
      Retourne null si vide, NaN si invalide. */
  function parseNumber(raw, lang) {
    if (raw === null || raw === undefined) return null;
    var s = String(raw).replace(/[\s\u00a0\u202f]/g, "");
    if (s === "") return null;
    s = lang === "en" ? s.replace(/,/g, "") : s.replace(",", ".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return parseFloat(s);
  }

  /** Validation d'une réponse numérique : {state:'empty'|'ok'|'error', value, error?, warn?} */
  function checkNumber(qid, raw, lang) {
    var q = D.Q[qid], n = parseNumber(raw, lang);
    if (n === null) return { state: q.req ? "error" : "empty", value: null, error: q.req ? "required" : undefined };
    if (isNaN(n)) return { state: "error", value: null, error: "invalid" };
    if (n < 0) return { state: "error", value: null, error: "negative" };
    if (q.int && Math.floor(n) !== n) return { state: "error", value: null, error: "integer" };
    if (q.min !== undefined && n < q.min) return { state: "error", value: null, error: "range" };
    if (q.max !== undefined && n > q.max) return { state: "error", value: null, error: "range" };
    var out = { state: "ok", value: n };
    if (q.warnAbove !== undefined && n > q.warnAbove) out.warn = "high";
    return out;
  }

  function scale(base, r) { return { lo: base * r.lo / 100, mid: base * r.mid / 100, hi: base * r.hi / 100 }; }
  function isNum(x) { return typeof x === "number" && isFinite(x); }

  /** Calcul des quatre indicateurs. input = {budget, rework, hours, avoidable, hourly, weeks}
      (nombres ou null ; rework et avoidable sont des identifiants d'options). */
  function compute(input) {
    var R = input.rework ? range("rework", input.rework) : null;
    var P = input.avoidable ? range("avoidable", input.avoidable) : null;
    var out = { external: null, hours: null, internal: null, total: null, notes: [] };

    // A : coût externe des reprises
    if (!isNum(input.budget) || input.budget < 0) out.external = { status: "missing_budget" };
    else if (!R) out.external = { status: "missing_share" };
    else if (R.unknown) out.external = { status: "unknown_share" };
    else { var a = scale(input.budget, R); out.external = { status: "ok", lo: a.lo, mid: a.mid, hi: a.hi }; }

    // B' : heures annuelles évitables
    if (!isNum(input.hours) || input.hours < 0 || !isNum(input.weeks) || input.weeks <= 0) out.hours = { status: "missing_hours" };
    else if (!P) out.hours = { status: "missing_share" };
    else if (P.unknown) out.hours = { status: "unknown_share" };
    else { var h = scale(input.hours * input.weeks, P); out.hours = { status: "ok", lo: h.lo, mid: h.mid, hi: h.hi }; }

    // C : coût interne des frictions évitables
    if (out.hours.status !== "ok") out.internal = { status: out.hours.status };
    else if (!isNum(input.hourly)) out.internal = { status: "missing_hourly" };
    else out.internal = { status: "ok", lo: out.hours.lo * input.hourly, mid: out.hours.mid * input.hourly, hi: out.hours.hi * input.hourly };

    // D : total, sans jamais compter deux fois ni remplacer une donnée inconnue par zéro
    var e = out.external.status === "ok", i = out.internal.status === "ok";
    if (e && i) out.total = { status: "complete", lo: out.external.lo + out.internal.lo, mid: out.external.mid + out.internal.mid, hi: out.external.hi + out.internal.hi };
    else if (e) out.total = { status: "partial_external", lo: out.external.lo, mid: out.external.mid, hi: out.external.hi };
    else if (i) out.total = { status: "partial_internal", lo: out.internal.lo, mid: out.internal.mid, hi: out.internal.hi };
    else out.total = { status: "none" };
    return out;
  }

  /** Niveau de confiance des estimations. Les données étant déclaratives, il ne peut jamais être « élevé ». */
  function confidence(input) {
    var R = input.rework ? range("rework", input.rework) : null, P = input.avoidable ? range("avoidable", input.avoidable) : null;
    var checks = [
      ["rework", !!R && !R.unknown], ["avoidable", !!P && !P.unknown], ["hourly", isNum(input.hourly)],
      ["hours", isNum(input.hours)], ["budget", isNum(input.budget)]
    ];
    var missing = checks.filter(function (c) { return !c[1]; }).map(function (c) { return c[0]; });
    var known = checks.length - missing.length;
    return { level: known === 5 ? "medium" : known >= 3 ? "low" : "very_low", known: known, of: checks.length, missing: missing };
  }

  /** Points de gouvernance à examiner : une dimension est signalée lorsque sa réponse atteint le rang 3 ou 4 sur 4.
      La principale est la plus élevée ; à rang égal, l'ordre fixe est cycles, niveaux, intervenants, modifications. */
  var GOV_ORDER = ["cycles", "levels", "people", "changes"];
  function governance(answers) {
    var out = [];
    GOV_ORDER.forEach(function (d) {
      var o = opt(d, answers[d]);
      if (o && o.rank >= 3) out.push({ id: d, option: o.id, rank: o.rank });
    });
    out.sort(function (x, y) { return y.rank - x.rank; }); // tri stable : l'ordre fixe départage les égalités
    return out;
  }

  /** « Principal » parmi plusieurs choix : le choix désigné s'il fait partie de la sélection, sinon l'unique choix. */
  function mainOf(list, main) {
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    return list.indexOf(main) >= 0 ? main : null;
  }

  /** Profil opérationnel à partir des réponses brutes. */
  function profile(answers, input) {
    var gov = governance(answers);
    return {
      frictionMain: mainOf(answers.factors, answers.factorsMain), factors: answers.factors || [],
      governance: gov, governanceMain: gov.length ? gov[0] : null,
      challengeMain: mainOf(answers.challenges, answers.challengesMain), challenges: answers.challenges || [],
      outcome: answers.outcome || null, horizon: answers.horizon || null,
      extra: (answers.extra || []).filter(function (x) { return x !== "none" && x !== "unavailable"; }),
      confidence: confidence(input)
    };
  }

  /** Validation complète. Retourne {errors:{qid:code}, warnings:{qid:code}, input}. */
  function validate(answers, lang) {
    var errors = {}, warnings = {}, num = {};
    D.ORDER.forEach(function (qid) {
      var q = D.Q[qid], v = answers[qid];
      if (q.type === "money" || q.type === "number") {
        var r = checkNumber(qid, v, lang);
        if (r.state === "error") errors[qid] = r.error;
        else if (r.state === "ok") { num[qid] = r.value; if (r.warn) warnings[qid] = r.warn; }
      } else if (q.type === "single") {
        if (!opt(qid, v)) { if (q.req) errors[qid] = "required"; }
      } else if (q.type === "multi") {
        var arr = Array.isArray(v) ? v : [];
        if (q.req && arr.length === 0) errors[qid] = "required";
        else if (q.max && arr.length > q.max) errors[qid] = "max";
        else if (q.exclusive && arr.some(function (x) { return q.exclusive.indexOf(x) >= 0; }) && arr.length > 1) errors[qid] = "exclusive";
        else if (q.main && arr.length > 1 && arr.indexOf(answers[qid + "Main"]) < 0) errors[qid] = "main";
        arr.forEach(function (x) { if (!opt(qid, x)) errors[qid] = "invalid"; });
      }
    });
    var input = {
      budget: num.budget === undefined ? null : num.budget, rework: answers.rework || null,
      hours: num.hours === undefined ? null : num.hours, avoidable: answers.avoidable || null,
      hourly: num.hourly === undefined ? null : num.hourly, weeks: num.weeks === undefined ? null : num.weeks
    };
    return { errors: errors, warnings: warnings, input: input };
  }

  function validateStep(stepIndex, answers, lang) {
    var v = validate(answers, lang), ids = D.STEPS[stepIndex].q, e = {}, w = {};
    ids.forEach(function (id) { if (v.errors[id]) e[id] = v.errors[id]; if (v.warnings[id]) w[id] = v.warnings[id]; });
    return { errors: e, warnings: w };
  }

  /** Part des questions obligatoires auxquelles il a été répondu de façon valide, en pourcentage entier. */
  function progress(answers, lang) {
    var v = validate(answers, lang), req = D.ORDER.filter(function (id) { return D.Q[id].req; });
    var done = req.filter(function (id) { return !v.errors[id]; }).length;
    return Math.round(done / req.length * 100);
  }

  function formatMoney(n, lang) {
    var f = new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 0 });
    return f.format(Math.round(n)).replace(/\u202f/g, "\u00a0") + "\u00a0FCFA";
  }
  function formatNumber(n, lang) {
    return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)).replace(/\u202f/g, "\u00a0");
  }

  return { opt: opt, range: range, parseNumber: parseNumber, checkNumber: checkNumber, compute: compute, confidence: confidence, governance: governance,
           mainOf: mainOf, profile: profile, validate: validate, validateStep: validateStep, progress: progress, formatMoney: formatMoney, formatNumber: formatNumber };
});
