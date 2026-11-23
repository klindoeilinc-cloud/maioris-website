/* MAIORIS Creative Operations Intelligence™ : questions, options et textes (FR et EN).
   Ce fichier ne contient aucune logique de calcul ni d'affichage. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../core/options.js"));
  else root.COIData = factory(root.MaiorisOptions);
})(typeof self !== "undefined" ? self : this, function (SHARED) {
  "use strict";
  function o(id, fr, en, extra) { var r = { id: id, l: { fr: fr, en: en } }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
  // fourchettes en pourcentage : lo et hi sont les bornes de la réponse, unknown signale « impossible à estimer »
  function pc(id, fr, en, lo, hi) { return o(id, fr, en, { lo: lo, hi: hi }); }

  var VERSION = "1.0";
  var STEPS = [
    { id: "context", q: ["sector", "size", "model"],
      t: { fr: "Organisation et contexte", en: "Organisation and context" },
      i: { fr: "Nous souhaitons comprendre comment votre organisation conçoit, pilote, valide et déploie ses productions créatives.", en: "We would like to understand how your organisation designs, manages, approves and rolls out its creative output." } },
    { id: "invest", q: ["budget", "projects", "types", "rework"],
      t: { fr: "Investissements créatifs", en: "Creative investment" },
      i: { fr: "Quelques repères sur ce que votre organisation investit dans la production créative et sur le volume de reprises.", en: "A few markers of what your organisation invests in creative production and how much rework it involves." } },
    { id: "gov", q: ["levels", "people", "cycles", "changes", "factors"],
      t: { fr: "Gouvernance et validations", en: "Governance and approvals" },
      i: { fr: "Comment les décisions créatives sont prises, validées et corrigées dans votre organisation.", en: "How creative decisions are made, approved and corrected in your organisation." } },
    { id: "costs", q: ["hours", "avoidable", "hourly", "extra", "weeks"],
      t: { fr: "Coûts et ressources opérationnelles", en: "Costs and operational resources" },
      i: { fr: "Le temps et les coûts que représentent aujourd'hui les validations, retours et corrections.", en: "The time and cost that approvals, feedback and corrections represent today." } },
    { id: "strategy", q: ["challenges", "outcome", "horizon"],
      t: { fr: "Enjeux stratégiques", en: "Strategic priorities" },
      i: { fr: "Ce que vous cherchez à améliorer, et dans quel délai.", en: "What you are trying to improve, and within what timeframe." } }
  ];

  var Q = {};
  function add(q) { Q[q.id] = q; }

  function shared(list) { return list.map(function (x) { return o(x.id, x.l.fr, x.l.en); }); }
  add({ id: "sector", n: 1, type: "single", req: true,
    l: { fr: "Secteur d'activité", en: "Sector of activity" }, opts: shared(SHARED.sector) });

  add({ id: "size", n: 2, type: "single", req: true,
    l: { fr: "Taille de l'organisation", en: "Size of the organisation" }, opts: shared(SHARED.size) });

  add({ id: "model", n: 3, type: "single", req: true,
    l: { fr: "Modèle de production créative", en: "Creative production model" },
    opts: [o("internal", "Équipe interne uniquement", "In house team only"), o("agency", "Agence externe", "One external agency"), o("multi", "Plusieurs agences spécialisées", "Several specialist agencies"),
           o("internal_agencies", "Équipe interne + agences", "In house team + agencies"), o("freelance", "Freelances et indépendants", "Freelancers and independents"), o("hybrid", "Modèle hybride", "Hybrid model")] });

  add({ id: "budget", n: 4, type: "money", req: true, min: 0, max: 1e13, warnAbove: 1e11,
    l: { fr: "Budget annuel de production créative (FCFA)", en: "Annual creative production budget (FCFA)" },
    d: { fr: "Incluez les honoraires d'agences, studios, freelances, conception, design, vidéo, photographie, motion design, postproduction, déclinaisons et adaptations. Excluez l'achat média et les salaires des équipes internes.", en: "Include fees for agencies, studios, freelancers, concept, design, video, photography, motion design, post production, adaptations and versions. Exclude media buying and the salaries of internal teams." },
    ph: { fr: "ex. 40 000 000", en: "e.g. 40,000,000" } });

  add({ id: "projects", n: 5, type: "single", req: true,
    l: { fr: "Nombre de campagnes ou projets créatifs produits par an", en: "Number of campaigns or creative projects produced per year" },
    opts: [o("lt10", "Moins de 10", "Fewer than 10"), o("10_24", "10 à 24", "10 to 24"), o("25_49", "25 à 49", "25 to 49"), o("50_99", "50 à 99", "50 to 99"), o("100_199", "100 à 199", "100 to 199"), o("200p", "200 et plus", "200 or more")] });

  add({ id: "types", n: 6, type: "multi", req: true,
    l: { fr: "Types de productions", en: "Types of production" },
    d: { fr: "Plusieurs réponses possibles.", en: "Several answers possible." },
    opts: [o("c360", "Campagnes publicitaires 360°", "360 degree advertising campaigns"), o("branding", "Branding et identité", "Branding and identity"),
           o("video", "Vidéos publicitaires et institutionnelles", "Advertising and corporate videos"), o("motion", "Motion design", "Motion design"), o("social", "Social media", "Social media"),
           o("photo", "Photographie et audiovisuel", "Photography and audiovisual"), o("plv", "PLV et affichage", "Point of sale and outdoor"), o("events", "Activations et événementiel", "Activations and events"),
           o("packaging", "Packaging", "Packaging"), o("multiformat", "Déclinaisons multiformats et multilingues", "Multi format and multilingual adaptations")] });

  add({ id: "rework", n: 7, type: "single", req: true,
    l: { fr: "Part des projets nécessitant des reprises importantes", en: "Share of projects needing major rework" },
    d: { fr: "Une reprise importante désigne une modification dépassant la simple retouche : changement de concept, réécriture substantielle, refonte d'un visuel, nouvelle version vidéo ou reprise d'une production déjà validée.", en: "Major rework means a change beyond simple retouching: a change of concept, a substantial rewrite, a redesigned visual, a new video version or the redoing of an already approved production." },
    opts: [pc("lt10", "Moins de 10 %", "Under 10%", 0, 10), pc("10_25", "10 à 25 %", "10 to 25%", 10, 25), pc("26_50", "26 à 50 %", "26 to 50%", 26, 50), pc("51_75", "51 à 75 %", "51 to 75%", 51, 75),
           pc("gt75", "Plus de 75 %", "Over 75%", 76, 100), o("unknown", "Difficile à estimer", "Hard to estimate", { unknown: true })] });

  add({ id: "levels", n: 8, type: "single", req: true, gov: "levels",
    l: { fr: "Nombre de niveaux de validation", en: "Number of approval levels" },
    opts: [o("1", "1", "1", { rank: 0 }), o("2", "2", "2", { rank: 1 }), o("3", "3", "3", { rank: 2 }), o("4", "4", "4", { rank: 3 }), o("5p", "5 ou plus", "5 or more", { rank: 4 }), o("var", "Variable", "Varies", { rank: 4 })] });

  add({ id: "people", n: 9, type: "single", req: true, gov: "people",
    l: { fr: "Nombre de personnes intervenant dans la validation d'une campagne importante", en: "Number of people involved in approving a major campaign" },
    opts: [o("1_2", "1 à 2", "1 to 2", { rank: 0 }), o("3_4", "3 à 4", "3 to 4", { rank: 1 }), o("5_6", "5 à 6", "5 to 6", { rank: 2 }), o("7_10", "7 à 10", "7 to 10", { rank: 3 }), o("gt10", "Plus de 10", "More than 10", { rank: 4 })] });

  add({ id: "cycles", n: 10, type: "single", req: true, gov: "cycles",
    l: { fr: "Nombre de cycles de correction", en: "Number of correction cycles" },
    opts: [o("1", "1", "1", { rank: 0 }), o("2", "2", "2", { rank: 1 }), o("3", "3", "3", { rank: 2 }), o("4_5", "4 à 5", "4 to 5", { rank: 3 }), o("gt5", "Plus de 5", "More than 5", { rank: 4 }),
           o("none", "Aucun processus standardisé", "No standardised process", { rank: 4 })] });

  add({ id: "changes", n: 11, type: "single", req: true, gov: "changes",
    l: { fr: "Fréquence des modifications après validation du brief ou du concept", en: "Frequency of changes after the brief or concept is approved" },
    opts: [o("never", "Jamais ou exceptionnellement", "Never or exceptionally", { rank: 0 }), o("rarely", "Rarement", "Rarely", { rank: 1 }), o("regular", "Régulièrement", "Regularly", { rank: 2 }),
           o("frequent", "Fréquemment", "Frequently", { rank: 3 }), o("very", "Très fréquemment", "Very frequently", { rank: 4 })] });

  add({ id: "factors", n: 12, type: "multi", req: true, main: true,
    l: { fr: "Facteurs à l'origine des reprises", en: "Factors behind the rework" },
    d: { fr: "Plusieurs réponses possibles.", en: "Several answers possible." },
    opts: [o("brief", "Brief initial incomplet", "Incomplete initial brief"), o("objectives", "Objectifs marketing insuffisamment définis", "Marketing objectives not defined enough"),
           o("stakeholders", "Multiplication des interlocuteurs", "Too many stakeholders"), o("contradictory", "Retours contradictoires", "Contradictory feedback"),
           o("direction", "Changements de direction", "Changes of direction"), o("late", "Intervention tardive de la direction", "Late involvement of management"),
           o("misunderstood", "Mauvaise compréhension du besoin", "Misunderstanding of the need"), o("concept", "Désaccord sur le concept", "Disagreement on the concept"),
           o("technical", "Contraintes techniques découvertes tardivement", "Technical constraints found late"), o("regulatory", "Modifications commerciales ou réglementaires", "Commercial or regulatory changes"),
           o("deadlines", "Délais trop courts", "Deadlines too short"), o("noowner", "Absence de responsable final de validation", "No final approval owner"), o("other", "Autre", "Other")] });

  add({ id: "hours", n: 13, type: "number", req: true, min: 0, max: 10000, warnAbove: 1000,
    l: { fr: "Nombre total d'heures hebdomadaires consacrées aux validations, retours, corrections et reprises", en: "Total weekly hours spent on approvals, feedback, corrections and rework" },
    d: { fr: "Additionnez les heures de toutes les personnes concernées, côté marketing, communication, direction et équipes créatives internes. Ne comptez pas deux fois une même heure.", en: "Add up the hours of everyone involved, on the marketing, communication, management and internal creative teams. Do not count the same hour twice." },
    ph: { fr: "ex. 40", en: "e.g. 40" }, unit: { fr: "heures par semaine", en: "hours per week" } });

  add({ id: "avoidable", n: 14, type: "single", req: true,
    l: { fr: "Part de ce temps consacrée aux retours évitables et cycles supplémentaires", en: "Share of that time spent on avoidable feedback and extra cycles" },
    opts: [pc("lt10", "Moins de 10 %", "Under 10%", 0, 10), pc("10_25", "10 à 25 %", "10 to 25%", 10, 25), pc("26_50", "26 à 50 %", "26 to 50%", 26, 50), pc("51_75", "51 à 75 %", "51 to 75%", 51, 75),
           pc("gt75", "Plus de 75 %", "Over 75%", 76, 100), o("unknown", "Impossible à estimer", "Impossible to estimate", { unknown: true })] });

  add({ id: "hourly", n: 15, type: "money", req: false, min: 0, max: 1e7, warnAbove: 1e5,
    l: { fr: "Coût horaire interne moyen (FCFA), facultatif", en: "Average internal hourly cost (FCFA), optional" },
    d: { fr: "Estimation du coût salarial chargé des collaborateurs concernés, rapporté à une heure de travail. Utilisez une moyenne pondérée si plusieurs profils interviennent.", en: "Estimate of the loaded salary cost of the people involved, per hour of work. Use a weighted average if several profiles are involved." },
    ph: { fr: "ex. 6 000", en: "e.g. 6,000" } });

  add({ id: "extra", n: 16, type: "multi", req: true, exclusive: ["none", "unavailable"], profileOnly: true,
    l: { fr: "Surcoûts externes constatés au cours des 12 derniers mois", en: "External extra costs seen over the last 12 months" },
    d: { fr: "Plusieurs réponses possibles. Cette information enrichit le profil mais n'est jamais ajoutée au calcul, pour éviter de compter deux fois des coûts déjà couverts par la part de reprises.", en: "Several answers possible. This enriches the profile but is never added to the calculation, to avoid counting twice costs already covered by the share of rework." },
    opts: [o("overtime", "Heures supplémentaires facturées", "Overtime billed"), o("newprod", "Nouvelles prestations de production", "New production services"), o("reshoot", "Reprises vidéo ou photographiques", "Video or photo reshoots"),
           o("outofscope", "Déclinaisons hors périmètre initial", "Adaptations outside the initial scope"), o("urgency", "Frais d'urgence", "Rush fees"), o("reprint", "Nouvelle impression ou fabrication", "Reprinting or remanufacturing"),
           o("none", "Aucun surcoût identifié", "No extra cost identified"), o("unavailable", "Information indisponible", "Information not available")] });

  add({ id: "weeks", n: 17, type: "number", req: true, min: 1, max: 52, init: "48", int: true,
    l: { fr: "Nombre de semaines effectivement travaillées par an", en: "Number of weeks actually worked per year" },
    ph: { fr: "48", en: "48" }, unit: { fr: "semaines", en: "weeks" } });

  add({ id: "challenges", n: 18, type: "multi", req: true, max: 3, main: true,
    l: { fr: "Trois principaux défis créatifs (maximum trois choix)", en: "Three main creative challenges (maximum three choices)" },
    opts: [o("diff", "Manque de différenciation des campagnes", "Campaigns lack differentiation"), o("consistency", "Manque de cohérence de marque", "Lack of brand consistency"),
           o("lead", "Délais de production trop longs", "Production lead times too long"), o("corrections", "Multiplication des corrections", "Too many corrections"),
           o("vision", "Absence de vision créative globale", "No overall creative vision"), o("agencies", "Difficulté à piloter les agences", "Difficulty managing agencies"),
           o("coordination", "Manque de coordination", "Lack of coordination"), o("measure", "Difficulté à mesurer la performance créative", "Difficulty measuring creative performance"),
           o("dependence", "Dépendance aux prestataires", "Dependence on suppliers"), o("concepts", "Difficulté à transformer la stratégie en concepts", "Difficulty turning strategy into concepts"),
           o("resources", "Manque de ressources spécialisées", "Lack of specialist resources")] });

  add({ id: "outcome", n: 19, type: "single", req: true,
    l: { fr: "Résultat prioritaire recherché", en: "Priority outcome sought" },
    opts: [o("costs", "Réduire les coûts inutiles", "Reduce unnecessary costs"), o("speed", "Accélérer les validations", "Speed up approvals"), o("quality", "Améliorer la qualité créative", "Improve creative quality"),
           o("consistency", "Renforcer la cohérence de marque", "Strengthen brand consistency"), o("performance", "Améliorer la performance des campagnes", "Improve campaign performance"),
           o("governance", "Structurer la gouvernance créative", "Structure creative governance"), o("agencies", "Améliorer le pilotage des agences", "Improve agency management"),
           o("system", "Construire un système créatif plus performant", "Build a higher performing creative system")] });

  add({ id: "horizon", n: 20, type: "single", req: true,
    l: { fr: "Horizon d'amélioration", en: "Improvement horizon" },
    opts: [o("30d", "Immédiatement, sous 30 jours", "Immediately, within 30 days"), o("3m", "Dans les 3 prochains mois", "Within the next 3 months"), o("6m", "Dans les 6 prochains mois", "Within the next 6 months"),
           o("12m", "Dans les 12 prochains mois", "Within the next 12 months"), o("explore", "Exploration de la situation actuelle", "Exploring the current situation")] });

  var ORDER = [];
  STEPS.forEach(function (s) { s.q.forEach(function (id) { ORDER.push(id); }); });

  return { VERSION: VERSION, STEPS: STEPS, Q: Q, ORDER: ORDER, COUNT: ORDER.length };
});
