/* MAIORIS Creative Maturity Assessment : textes et rapport. Les interprétations reposent exclusivement sur les réponses données. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data.js"), require("./calc.js"));
  else root.MATReport = factory(root.MATData, root.MATCalc);
})(typeof self !== "undefined" ? self : this, function (D, C) {
  "use strict";
  var T = {
    fr: {
      step: "Étape", of: "sur", done: "complété", back: "Précédent", next: "Continuer", ctxTitle: "Votre contexte", seeProfile: "Voir mon profil de maturité", start: "Commencer l'évaluation",
      ctxIntro: "Quatre informations facultatives, qui permettent de relier cette évaluation à vos autres outils MAIORIS si vous activez la conservation dans l'onglet. Elles ne changent pas le calcul.",
      fOrg: "Organisation", fSector: "Secteur d'activité", fSize: "Taille de l'organisation", fMarket: "Marché principal", choose: "Choisir", prefilled: "Repris de votre profil commun",
      scaleHelp: "Choisissez le niveau qui décrit le mieux la pratique réelle de votre organisation, pas l'intention.",
      required: "Choisissez une réponse, ou « Je ne sais pas / Non applicable ».", fixErrors: "Une ou plusieurs questions n'ont pas de réponse.",
      title: "Votre profil de maturité créative", lead: "Une autoévaluation déclarative, construite uniquement à partir de vos réponses.", flag: "Autoévaluation déclarative, non certifiée",
      global: "Score global", level: "Niveau de maturité", validAns: "réponses valides", outOf: "sur", partialT: "Diagnostic partiel",
      partialP: "Certaines dimensions ne comptent pas assez de réponses valides : aucun niveau global n'est calculé. Les réponses « Je ne sais pas / Non applicable » ne sont jamais comptées comme zéro.",
      dimsTitle: "Les six dimensions", dim: "Dimension", score: "Score", noScore: "Non évaluée", indicative: "Indicatif",
      radarLabel: "Graphique radar des six dimensions", tableCaption: "Scores par dimension",
      strengthsT: "Forces identifiées", noStrengths: "Aucune dimension n'atteint le niveau Intégré dans vos réponses. Les réponses les plus solides sont indiquées ci-dessous.", attentionT: "Dimensions nécessitant une attention particulière",
      noAttention: "Aucune dimension ne se situe sous le niveau Structuré.", prioT: "Trois priorités d'amélioration", strengthen: "Renforcer", consolidate: "Consolider", current: "Réponse actuelle",
      interpT: "Lecture de chaque dimension", limitsT: "Limites de cette évaluation",
      limits: ["Il s'agit d'un instrument propriétaire d'autoévaluation, et non d'une certification indépendante.", "Les scores reposent sur vos déclarations, non vérifiées par MAIORIS.",
               "L'échelle va de 20 (tout « Absent ») à 100 (tout « Intégré »), puisque le niveau le plus bas vaut 1 sur 5.", "Les réponses « Je ne sais pas / Non applicable » sortent du calcul : elles ne sont jamais comptées comme zéro.",
               "Seule une analyse des documents et des pratiques réelles peut confirmer ou nuancer ces résultats."],
      synth: "Votre organisation présente un niveau de maturité {level} sur les dimensions évaluées. Les principaux axes d'attention concernent {dims}.", synthNone: "Votre organisation présente un niveau de maturité {level} sur les dimensions évaluées. Aucune dimension ne se situe sous le niveau Structuré.",
      synthPartial: "Diagnostic partiel : la couverture des réponses ne permet pas de calculer un niveau global. Les dimensions les plus faibles parmi celles évaluées sont {dims}.", synthPartialNone: "Diagnostic partiel : la couverture des réponses ne permet pas de calculer un niveau global.",
      levelWord: "niveau", pLevel: "Vos réponses situent cette dimension au niveau {level} ({score} sur 100, {valid} réponses valides sur {total}).", pNone: "Aucune réponse valide : cette dimension n'est pas évaluée.",
      pIndic: "Couverture insuffisante : ce résultat est indicatif.", pBest: "Pratique la plus solide : {s} ({a}).", pWeak: "Pratique la plus fragile : {s} ({a}).", pFlat: "Vos réponses sont homogènes sur cette dimension : {a}.",
      restart: "Recommencer", na: "Je ne sais pas / Non applicable", dot: " ", dimIntro: "Dimension"
    },
    en: {
      step: "Step", of: "of", done: "complete", back: "Back", next: "Continue", ctxTitle: "Your context", seeProfile: "See my maturity profile", start: "Start the assessment",
      ctxIntro: "Four optional details, which let you link this assessment to your other MAIORIS tools if you turn on keeping in this tab. They do not change the calculation.",
      fOrg: "Organisation", fSector: "Sector of activity", fSize: "Size of the organisation", fMarket: "Main market", choose: "Choose", prefilled: "Taken from your shared profile",
      scaleHelp: "Choose the level that best describes your organisation's actual practice, not its intention.",
      required: "Choose an answer, or “I don't know / Not applicable”.", fixErrors: "One or more questions have no answer.",
      title: "Your creative maturity profile", lead: "A declarative self assessment, built only from your answers.", flag: "Declarative self assessment, not certified",
      global: "Overall score", level: "Maturity level", validAns: "valid answers", outOf: "of", partialT: "Partial diagnostic",
      partialP: "Some dimensions do not have enough valid answers: no overall level is calculated. “I don't know / Not applicable” answers are never counted as zero.",
      dimsTitle: "The six dimensions", dim: "Dimension", score: "Score", noScore: "Not assessed", indicative: "Indicative",
      radarLabel: "Radar chart of the six dimensions", tableCaption: "Scores by dimension",
      strengthsT: "Strengths identified", noStrengths: "No dimension reaches the Integrated level in your answers. The strongest answers are shown below.", attentionT: "Dimensions needing particular attention",
      noAttention: "No dimension is below the Structured level.", prioT: "Three improvement priorities", strengthen: "Strengthen", consolidate: "Consolidate", current: "Current answer",
      interpT: "Reading of each dimension", limitsT: "Limits of this assessment",
      limits: ["This is a proprietary self assessment instrument, not an independent certification.", "Scores rest on your declarations, which MAIORIS has not verified.",
               "The scale runs from 20 (all “Absent”) to 100 (all “Integrated”), because the lowest level is worth 1 out of 5.", "“I don't know / Not applicable” answers are left out of the calculation: they are never counted as zero.",
               "Only an analysis of documents and real practices can confirm or qualify these results."],
      synth: "Your organisation shows a {level} maturity level across the dimensions assessed. The main areas of attention are {dims}.", synthNone: "Your organisation shows a {level} maturity level across the dimensions assessed. No dimension is below the Structured level.",
      synthPartial: "Partial diagnostic: answer coverage does not allow an overall level to be calculated. The weakest dimensions among those assessed are {dims}.", synthPartialNone: "Partial diagnostic: answer coverage does not allow an overall level to be calculated.",
      levelWord: "level", pLevel: "Your answers place this dimension at the {level} level ({score} out of 100, {valid} valid answers out of {total}).", pNone: "No valid answer: this dimension is not assessed.",
      pIndic: "Insufficient coverage: this result is indicative.", pBest: "Strongest practice: {s} ({a}).", pWeak: "Weakest practice: {s} ({a}).", pFlat: "Your answers are uniform on this dimension: {a}.",
      restart: "Start over", na: "I don't know / Not applicable", dot: " ", dimIntro: "Dimension"
    }
  };
  function fill(s, m) { return s.replace(/\{(\w+)\}/g, function (_, k) { return m[k] === undefined ? "" : m[k]; }); }
  function lc(s) { return s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function dimOf(id) { return D.DIMS.filter(function (d) { return d.id === id; })[0]; }
  function ansName(v, lang) { return D.SCALE[v - 1].name[lang]; }
  function list(arr, lang) { if (arr.length <= 1) return arr.join(""); return arr.slice(0, -1).join(", ") + (lang === "en" ? " and " : " et ") + arr[arr.length - 1]; }

  function build(answers, lang) {
    var t = T[lang], res = C.compute(answers), out = { lang: lang, res: res, t: t };
    out.rows = res.dims.map(function (d) {
      var dm = dimOf(d.id);
      return { id: d.id, name: dm.name[lang], desc: dm.d[lang], score: d.score === null ? null : Math.round(d.score), valid: d.valid, total: d.total, status: d.status, levelName: d.level ? d.level.name[lang] : null, levelN: d.level ? d.level.n : null };
    });
    out.global = res.global === null ? null : Math.round(res.global);
    out.level = res.level ? { n: res.level.n, name: res.level.name[lang], d: res.level.d[lang] } : null;

    // lecture de chaque dimension : uniquement à partir des réponses
    out.interp = res.dims.map(function (d) {
      var dm = dimOf(d.id), parts = [];
      if (d.status === "none") parts.push(t.pNone);
      else {
        parts.push(fill(t.pLevel, { level: d.level.name[lang], score: Math.round(d.score), valid: d.valid, total: d.total }) + " " + d.level.d[lang]);
        if (d.status === "indicative") parts.push(t.pIndic);
        if (d.highest && d.lowest && d.highest.v === d.lowest.v) parts.push(fill(t.pFlat, { a: lc(ansName(d.lowest.v, lang)) }));
        else if (d.highest && d.lowest) {
          parts.push(fill(t.pBest, { s: D.Q[d.highest.id].s[lang], a: lc(ansName(d.highest.v, lang)) }));
          parts.push(fill(t.pWeak, { s: D.Q[d.lowest.id].s[lang], a: lc(ansName(d.lowest.v, lang)) }));
        }
      }
      return { id: d.id, name: dm.name[lang], text: parts.join(" ") };
    });

    var s = C.strengths(res);
    out.strengthDims = s.dims.map(function (d) { return { name: dimOf(d.id).name[lang], score: Math.round(d.score) }; });
    out.strengthItems = s.items.slice(0, 5).map(function (x) { return { dim: dimOf(x.dim).name[lang], text: D.Q[x.q].s[lang], a: ansName(x.v, lang) }; });
    var at = C.attention(res);
    out.attention = at.map(function (d) { return { id: d.id, name: dimOf(d.id).name[lang], score: Math.round(d.score), indicative: d.status !== "scored" }; });
    out.priorities = C.priorities(res).map(function (p) {
      return { dim: dimOf(p.dim).name[lang], text: (p.verb === "consolidate" ? t.consolidate : t.strengthen) + " : " + D.Q[p.q].s[lang] + ".", current: ansName(p.v, lang), indicative: p.indicative };
    });

    var names = out.attention.map(function (a) { return a.name; });
    if (res.complete) out.synthesis = names.length ? fill(t.synth, { level: out.level.name.toLowerCase(), dims: list(names, lang) }) : fill(t.synthNone, { level: out.level.name.toLowerCase() });
    else out.synthesis = names.length ? fill(t.synthPartial, { dims: list(names, lang) }) : t.synthPartialNone;
    return out;
  }
  return { T: T, build: build, fill: fill, lc: lc };
});
