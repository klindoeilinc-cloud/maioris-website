/* MAIORIS Creative Operations Intelligence™ : textes de l'interface et construction du rapport.
   Aucun accès au DOM. Le rapport ne s'appuie que sur les réponses données : rien n'est affirmé au-delà. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data.js"), require("./calc.js"));
  else root.COIReport = factory(root.COIData, root.COICalc);
})(typeof self !== "undefined" ? self : this, function (D, C) {
  "use strict";

  var T = {
    fr: {
      step: "Étape", of: "sur", done: "complété", optional: "facultatif", back: "Précédent", next: "Continuer", recapBtn: "Voir le récapitulatif",
      compute: "Calculer mon Creative Operations Snapshot", edit: "Modifier", restart: "Recommencer", recapTitle: "Récapitulatif de vos réponses",
      recapIntro: "Vérifiez vos réponses avant le calcul. Vous pouvez modifier chaque étape.", notAnswered: "Non renseigné", mainPick: "Parmi vos choix, lequel est le principal ?",
      maxReached: "Maximum atteint : décochez un choix pour en sélectionner un autre.", countSel: "sélectionné(s)",
      errors: { required: "Cette réponse est nécessaire pour continuer.", invalid: "Saisissez un nombre valide, par exemple 40 000 000.", negative: "La valeur ne peut pas être négative.",
                integer: "Saisissez un nombre entier.", range: "Cette valeur est hors de la plage acceptée.", max: "Trois choix au maximum.", main: "Indiquez lequel de vos choix est le principal.",
                exclusive: "Cette réponse ne peut pas être combinée avec d'autres." },
      warns: { high: "Cette valeur est très élevée. Vérifiez-la avant de continuer." },
      fixErrors: "Une ou plusieurs réponses sont à corriger avant de continuer.",
      resultTitle: "Votre Creative Operations Snapshot", resultLead: "Une estimation indicative, construite uniquement à partir de vos réponses.",
      flag: "Estimation indicative, non garantie",
      ind: { external: "Coût externe des reprises", hours: "Heures évitables par an", internal: "Coût interne des frictions", total: "Coût annuel estimé des inefficiences" },
      between: "Entre", and: "et", central: "Valeur centrale", perYear: "par an", hoursUnit: "heures par an",
      status: {
        missing_budget: "Non calculable : budget non renseigné.", missing_share: "Non calculable : réponse manquante.", unknown_share: "Non calculable : la part n'a pas pu être estimée.",
        missing_hours: "Non calculable : heures non renseignées.", missing_hourly: "Non calculé : coût horaire interne non renseigné. Les heures évitables restent indiquées.",
        none: "Non calculable avec les réponses actuelles."
      },
      totalNote: { complete: "Somme du coût externe des reprises et du coût interne des frictions, calculés sur des bases distinctes.",
                   partial_external: "Total partiel : seul le coût externe des reprises est inclus. Le coût interne n'a pas pu être calculé.",
                   partial_internal: "Total partiel : seul le coût interne des frictions est inclus. Le coût externe n'a pas pu être calculé." },
      profileTitle: "Profil opérationnel", pFriction: "Principal facteur de friction", pGov: "Principal point de gouvernance à examiner", pChallenge: "Principal enjeu stratégique", pConf: "Niveau de confiance",
      pNone: "Non précisé", pNoGov: "Aucun signal marqué dans vos réponses", pOutcome: "Résultat prioritaire", pHorizon: "Horizon",
      conf: { medium: "Moyen", low: "Limité", very_low: "Très limité" },
      confWhy: { medium: "Toutes les données de calcul sont renseignées, mais elles restent déclaratives et non vérifiées.",
                 low: "Certaines données de calcul manquent ou n'ont pas pu être estimées : {m}.", very_low: "La plupart des données de calcul manquent : {m}." },
      missingNames: { rework: "part des reprises", avoidable: "part évitable", hourly: "coût horaire", hours: "heures hebdomadaires", budget: "budget" },
      govDim: { cycles: "Cycles de correction", levels: "Niveaux de validation", people: "Nombre d'intervenants", changes: "Modifications après validation du brief" },
      synthTitle: "Synthèse", gDeclared: "Ce que vous déclarez", gEstimated: "Ce que nous estimons", gVerify: "À vérifier",
      sContext: "Organisation : {size}, secteur «\u00a0{sector}\u00a0», modèle de production «\u00a0{model}\u00a0».",
      sGov: "{dim} : {opt}.", sFactors: "Facteurs de reprise cités : {list}.", sFactorMain: "Facteur principal désigné : {main}.", sChallenges: "Enjeux cités : {list}.",
      sPriority: "Résultat prioritaire recherché : «\u00a0{outcome}\u00a0». Horizon : «\u00a0{horizon}\u00a0».",
      sExt: "Avec {share} de projets nécessitant des reprises importantes, le coût externe des reprises serait compris entre {lo} et {hi} par an.",
      sHrs: "Avec {h} heures par semaine sur {w} semaines et {share} de ce temps jugé évitable, environ {lo} à {hi} heures par an seraient concernées.",
      sInt: "Au coût horaire indiqué, ces heures représenteraient entre {lo} et {hi} par an.",
      vHourly: "Le coût horaire interne n'est pas renseigné : le coût interne n'est pas chiffré, et le total est partiel.",
      vUnknown: "Certaines parts n'ont pas pu être estimées : les indicateurs correspondants ne sont pas calculés plutôt que remplacés par zéro.",
      vExtra: "Surcoûts externes déclarés : {list}. Ils enrichissent le profil mais ne sont pas ajoutés au calcul, pour ne pas compter deux fois des coûts déjà couverts par la part de reprises.",
      vGovSignal: "Les réponses de gouvernance ci-dessus signalent un point à examiner. Elles ne démontrent pas une cause : seule une analyse des documents et des pratiques réelles peut l'établir.",
      vHigh: "Certaines valeurs saisies sont très élevées : vérifiez-les.",
      vAlways: "Ces chiffres reposent sur des déclarations non vérifiées et sur des fourchettes. Ils indiquent un ordre de grandeur, pas une économie garantie.",
      gov: "Gouvernance", yes: "Oui"
    },
    en: {
      step: "Step", of: "of", done: "complete", optional: "optional", back: "Back", next: "Continue", recapBtn: "Review summary",
      compute: "Calculate my Creative Operations Snapshot", edit: "Edit", restart: "Start over", recapTitle: "Summary of your answers",
      recapIntro: "Check your answers before the calculation. You can edit each step.", notAnswered: "Not provided", mainPick: "Among your choices, which is the main one?",
      maxReached: "Maximum reached: untick a choice to select another.", countSel: "selected",
      errors: { required: "An answer is needed to continue.", invalid: "Enter a valid number, for example 40,000,000.", negative: "The value cannot be negative.",
                integer: "Enter a whole number.", range: "This value is outside the accepted range.", max: "Three choices at most.", main: "Say which of your choices is the main one.",
                exclusive: "This answer cannot be combined with others." },
      warns: { high: "This value is very high. Please check it before continuing." },
      fixErrors: "One or more answers need correcting before you continue.",
      resultTitle: "Your Creative Operations Snapshot", resultLead: "An indicative estimate, built only from your answers.",
      flag: "Indicative estimate, not guaranteed",
      ind: { external: "External cost of rework", hours: "Avoidable hours per year", internal: "Internal cost of friction", total: "Estimated annual cost of inefficiencies" },
      between: "Between", and: "and", central: "Central value", perYear: "per year", hoursUnit: "hours per year",
      status: {
        missing_budget: "Cannot be calculated: budget not provided.", missing_share: "Cannot be calculated: answer missing.", unknown_share: "Cannot be calculated: the share could not be estimated.",
        missing_hours: "Cannot be calculated: hours not provided.", missing_hourly: "Not calculated: internal hourly cost not provided. The avoidable hours are still shown.",
        none: "Cannot be calculated with the current answers."
      },
      totalNote: { complete: "Sum of the external cost of rework and the internal cost of friction, calculated on separate bases.",
                   partial_external: "Partial total: only the external cost of rework is included. The internal cost could not be calculated.",
                   partial_internal: "Partial total: only the internal cost of friction is included. The external cost could not be calculated." },
      profileTitle: "Operational profile", pFriction: "Main friction factor", pGov: "Main governance point to examine", pChallenge: "Main strategic challenge", pConf: "Confidence level",
      pNone: "Not specified", pNoGov: "No marked signal in your answers", pOutcome: "Priority outcome", pHorizon: "Horizon",
      conf: { medium: "Medium", low: "Limited", very_low: "Very limited" },
      confWhy: { medium: "All calculation inputs are provided, but they remain declarative and unverified.",
                 low: "Some calculation inputs are missing or could not be estimated: {m}.", very_low: "Most calculation inputs are missing: {m}." },
      missingNames: { rework: "share of rework", avoidable: "avoidable share", hourly: "hourly cost", hours: "weekly hours", budget: "budget" },
      govDim: { cycles: "Correction cycles", levels: "Approval levels", people: "Number of people involved", changes: "Changes after the brief is approved" },
      synthTitle: "Summary", gDeclared: "What you declare", gEstimated: "What we estimate", gVerify: "To verify",
      sContext: "Organisation: {size}, sector “{sector}”, production model “{model}”.",
      sGov: "{dim}: {opt}.", sFactors: "Rework factors mentioned: {list}.", sFactorMain: "Main factor you selected: {main}.", sChallenges: "Challenges mentioned: {list}.",
      sPriority: "Priority outcome sought: “{outcome}”. Horizon: “{horizon}”.",
      sExt: "With {share} of projects needing major rework, the external cost of rework would be between {lo} and {hi} per year.",
      sHrs: "With {h} hours a week over {w} weeks and {share} of that time judged avoidable, about {lo} to {hi} hours a year would be involved.",
      sInt: "At the hourly cost you gave, those hours would represent between {lo} and {hi} per year.",
      vHourly: "The internal hourly cost is not provided: the internal cost is not quantified, and the total is partial.",
      vUnknown: "Some shares could not be estimated: the matching indicators are not calculated rather than replaced by zero.",
      vExtra: "External extra costs declared: {list}. They enrich the profile but are not added to the calculation, so that costs already covered by the share of rework are not counted twice.",
      vGovSignal: "The governance answers above point to something worth examining. They do not prove a cause: only an analysis of documents and real practices can establish one.",
      vHigh: "Some values entered are very high: please check them.",
      vAlways: "These figures rest on unverified declarations and on ranges. They show an order of magnitude, not a guaranteed saving.",
      gov: "Governance", yes: "Yes"
    }
  };

  function label(qid, id, lang) { var o = C.opt(qid, id); return o ? o.l[lang] : ""; }
  function low(qid, id, lang) { return lowerFirst(label(qid, id, lang)); }
  function labels(qid, ids, lang) { return (ids || []).map(function (i) { return label(qid, i, lang); }).filter(Boolean); }
  function fill(s, m) { return s.replace(/\{(\w+)\}/g, function (_, k) { return m[k] === undefined ? "" : m[k]; }); }
  function join(list, lang) { return list.join(lang === "en" ? ", " : ", "); }
  function lowerFirst(s) { return s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function fmtRange(x, lang) { return { lo: C.formatMoney(x.lo, lang), hi: C.formatMoney(x.hi, lang), mid: C.formatMoney(x.mid, lang) }; }

  function build(answers, lang) {
    var t = T[lang], v = C.validate(answers, lang), input = v.input, c = C.compute(input), p = C.profile(answers, input);
    var out = { lang: lang, errors: v.errors, input: input, calc: c, profile: p, indicators: [], profileRows: [], synthesis: { declared: [], estimated: [], verify: [] } };

    function ind(id, r, kind) {
      var row = { id: id, label: t.ind[id], kind: kind };
      var st = r.status;
      if (st === "ok" || st === "complete" || st === "partial_external" || st === "partial_internal") {
        row.ok = true;
        row.lo_n = r.lo; row.mid_n = r.mid; row.hi_n = r.hi;
        if (kind === "hours") { row.lo = C.formatNumber(r.lo, lang); row.hi = C.formatNumber(r.hi, lang); row.mid = C.formatNumber(r.mid, lang); row.unit = t.hoursUnit; }
        else { var f = fmtRange(r, lang); row.lo = f.lo; row.hi = f.hi; row.mid = f.mid; row.unit = t.perYear; }
        if (id === "total") row.note = t.totalNote[st];
      } else { row.ok = false; row.note = t.status[st] || t.status.none; }
      return row;
    }
    out.indicators = [ind("external", c.external, "money"), ind("hours", c.hours, "hours"), ind("internal", c.internal, "money"), ind("total", c.total, "money")];

    // profil
    out.profileRows.push({ k: t.pFriction, v: p.frictionMain ? label("factors", p.frictionMain, lang) : t.pNone });
    out.profileRows.push({ k: t.pGov, v: p.governanceMain ? t.govDim[p.governanceMain.id] + " : " + label(p.governanceMain.id, p.governanceMain.option, lang) : t.pNoGov });
    out.profileRows.push({ k: t.pChallenge, v: p.challengeMain ? label("challenges", p.challengeMain, lang) : t.pNone });
    var miss = p.confidence.missing.map(function (m) { return t.missingNames[m]; }).join(", ");
    out.profileRows.push({ k: t.pConf, v: t.conf[p.confidence.level], why: fill(t.confWhy[p.confidence.level], { m: miss }) });

    // synthèse : déclaré
    var S = out.synthesis;
    S.declared.push(fill(t.sContext, { size: low("size", answers.size, lang), sector: low("sector", answers.sector, lang), model: low("model", answers.model, lang) }));
    ["levels", "people", "cycles", "changes"].forEach(function (d) { if (C.opt(d, answers[d])) S.declared.push(fill(t.sGov, { dim: t.govDim[d], opt: d === "changes" ? low(d, answers[d], lang) : label(d, answers[d], lang) })); });
    if (p.factors.length) S.declared.push(fill(t.sFactors, { list: join(labels("factors", p.factors, lang).map(lowerFirst), lang) }));
    if (p.challenges.length) S.declared.push(fill(t.sChallenges, { list: join(labels("challenges", p.challenges, lang).map(lowerFirst), lang) }));
    if (p.outcome && p.horizon) S.declared.push(fill(t.sPriority, { outcome: low("outcome", p.outcome, lang), horizon: low("horizon", p.horizon, lang) }));

    // estimé
    if (c.external.status === "ok") S.estimated.push(fill(t.sExt, { share: low("rework", answers.rework, lang), lo: C.formatMoney(c.external.lo, lang), hi: C.formatMoney(c.external.hi, lang) }));
    if (c.hours.status === "ok") S.estimated.push(fill(t.sHrs, { h: C.formatNumber(input.hours, lang), w: C.formatNumber(input.weeks, lang), share: low("avoidable", answers.avoidable, lang), lo: C.formatNumber(c.hours.lo, lang), hi: C.formatNumber(c.hours.hi, lang) }));
    if (c.internal.status === "ok") S.estimated.push(fill(t.sInt, { lo: C.formatMoney(c.internal.lo, lang), hi: C.formatMoney(c.internal.hi, lang) }));

    // à vérifier
    if (c.internal.status === "missing_hourly") S.verify.push(t.vHourly);
    if (c.external.status === "unknown_share" || c.hours.status === "unknown_share") S.verify.push(t.vUnknown);
    var extra = p.extra; if (extra.length) S.verify.push(fill(t.vExtra, { list: join(labels("extra", extra, lang).map(lowerFirst), lang) }));
    if (p.governance.length) S.verify.push(t.vGovSignal);
    if (Object.keys(v.warnings).length) S.verify.push(t.vHigh);
    S.verify.push(t.vAlways);
    return out;
  }

  return { T: T, build: build, label: label, labels: labels, fill: fill };
});
