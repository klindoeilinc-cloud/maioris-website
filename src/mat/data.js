/* MAIORIS Creative Maturity Assessment™ : dimensions, 24 questions, échelle comportementale et niveaux (FR et EN).
   Version du questionnaire : voir VERSION. Aucune logique de calcul ni d'affichage ici. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../core/options.js"));
  else root.MATData = factory(root.MaiorisOptions);
})(typeof self !== "undefined" ? self : this, function (OPT) {
  "use strict";
  var VERSION = "1.0";
  function L(fr, en) { return { fr: fr, en: en }; }

  var SCALE = [
    { v: 1, name: L("Absent", "Absent"), d: L("Aucune pratique identifiable.", "No identifiable practice.") },
    { v: 2, name: L("Informel", "Informal"), d: L("Pratique ponctuelle, non documentée.", "Occasional practice, not documented.") },
    { v: 3, name: L("En développement", "Developing"), d: L("Pratiques existantes mais irrégulières.", "Practices exist but are irregular.") },
    { v: 4, name: L("Structuré", "Structured"), d: L("Pratiques formalisées et régulièrement appliquées.", "Practices are formalised and regularly applied.") },
    { v: 5, name: L("Intégré", "Integrated"), d: L("Pratiques maîtrisées, mesurées et continuellement améliorées.", "Practices are mastered, measured and continuously improved.") }
  ];
  var NA = { name: L("Je ne sais pas / Non applicable", "I don't know / Not applicable") };

  var LEVELS = [
    { n: 1, max: 36, name: L("Initial", "Initial"), d: L("Les pratiques sont principalement réactives et dépendent des individus.", "Practices are mostly reactive and depend on individuals.") },
    { n: 2, max: 52, name: L("Émergent", "Emerging"), d: L("Des pratiques existent, mais leur application reste irrégulière.", "Practices exist, but their application remains irregular.") },
    { n: 3, max: 68, name: L("Structuré", "Structured"), d: L("Les principaux processus et responsabilités sont définis.", "The main processes and responsibilities are defined.") },
    { n: 4, max: 84, name: L("Intégré", "Integrated"), d: L("La stratégie, les processus, les équipes et les outils fonctionnent de manière cohérente.", "Strategy, processes, teams and tools work together coherently.") },
    { n: 5, max: 101, name: L("Optimisé", "Optimised"), d: L("L'organisation dispose de mécanismes de mesure, d'apprentissage et d'amélioration continue.", "The organisation has mechanisms for measurement, learning and continuous improvement.") }
  ];

  var DIMS = [
    { id: "strategy", name: L("Creative Strategy", "Creative Strategy"), d: L("La capacité à définir une direction créative claire.", "The ability to set a clear creative direction."), q: ["q1", "q2", "q3", "q4"] },
    { id: "governance", name: L("Brand Governance", "Brand Governance"), d: L("La gouvernance et la cohérence de la marque.", "Brand governance and consistency."), q: ["q5", "q6", "q7", "q8"] },
    { id: "leadership", name: L("Creative Leadership", "Creative Leadership"), d: L("La qualité du pilotage créatif.", "The quality of creative leadership."), q: ["q9", "q10", "q11", "q12"] },
    { id: "operating", name: L("Creative Operating Model", "Creative Operating Model"), d: L("L'organisation du travail créatif.", "How creative work is organised."), q: ["q13", "q14", "q15", "q16"] },
    { id: "performance", name: L("Creative Performance", "Creative Performance"), d: L("La capacité à mesurer et améliorer la performance créative.", "The ability to measure and improve creative performance."), q: ["q17", "q18", "q19", "q20"] },
    { id: "technology", name: L("AI & Technology Readiness", "AI & Technology Readiness"), d: L("La capacité à utiliser les technologies et l'intelligence artificielle.", "The ability to use technology and artificial intelligence."), q: ["q21", "q22", "q23", "q24"] }
  ];

  var Q = {};
  function q(id, dim, fr, en, sfr, sen) { Q[id] = { id: id, n: +id.slice(1), dim: dim, t: L(fr, en), s: L(sfr, sen) }; }
  q("q1", "strategy", "Votre organisation dispose-t-elle d'une vision créative formalisée, reliée à ses objectifs commerciaux et marketing ?", "Does your organisation have a formalised creative vision linked to its commercial and marketing objectives?", "une vision créative formalisée et reliée aux objectifs", "a formalised creative vision linked to objectives");
  q("q2", "strategy", "Les équipes disposent-elles d'une compréhension commune du positionnement et du territoire créatif de la marque ?", "Do the teams share a common understanding of the brand's positioning and creative territory?", "une compréhension commune du positionnement et du territoire créatif", "a shared understanding of positioning and creative territory");
  q("q3", "strategy", "Les briefs créatifs traduisent-ils systématiquement les objectifs marketing en orientations créatives précises ?", "Do creative briefs systematically translate marketing objectives into precise creative directions?", "la traduction des objectifs marketing en orientations créatives dans les briefs", "the translation of marketing objectives into creative directions in briefs");
  q("q4", "strategy", "Les décisions créatives sont-elles évaluées selon des critères stratégiques définis plutôt que selon les préférences personnelles des décideurs ?", "Are creative decisions assessed against defined strategic criteria rather than decision makers' personal preferences?", "des critères stratégiques définis pour évaluer les décisions créatives", "defined strategic criteria for assessing creative decisions");
  q("q5", "governance", "Les responsabilités liées à la gouvernance de la marque sont-elles clairement attribuées ?", "Are responsibilities for brand governance clearly assigned?", "des responsabilités de gouvernance de marque clairement attribuées", "clearly assigned brand governance responsibilities");
  q("q6", "governance", "Existe-t-il des règles documentées encadrant l'utilisation et l'évolution de l'identité de marque ?", "Are there documented rules governing the use and evolution of the brand identity?", "des règles documentées sur l'usage et l'évolution de l'identité de marque", "documented rules on the use and evolution of the brand identity");
  q("q7", "governance", "Les équipes internes et les agences disposent-elles d'un référentiel de marque accessible et actualisé ?", "Do internal teams and agencies have an accessible, up to date brand reference?", "un référentiel de marque accessible et actualisé", "an accessible, up to date brand reference");
  q("q8", "governance", "Les adaptations locales, commerciales ou événementielles sont-elles contrôlées pour préserver la cohérence globale de la marque ?", "Are local, commercial or event adaptations controlled to preserve overall brand consistency?", "le contrôle des adaptations locales, commerciales ou événementielles", "control of local, commercial or event adaptations");
  q("q9", "leadership", "Une personne ou une fonction possède-t-elle la responsabilité de la direction créative globale ?", "Does a person or function hold responsibility for overall creative direction?", "une responsabilité claire de la direction créative globale", "clear responsibility for overall creative direction");
  q("q10", "leadership", "Les arbitrages créatifs sont-ils réalisés par des personnes disposant des responsabilités et compétences appropriées ?", "Are creative decisions made by people with the appropriate responsibilities and skills?", "des arbitrages créatifs réalisés par les personnes appropriées", "creative decisions made by the appropriate people");
  q("q11", "leadership", "Les équipes disposent-elles de critères communs pour évaluer et challenger les propositions créatives ?", "Do teams have common criteria to assess and challenge creative proposals?", "des critères communs pour évaluer et challenger les propositions", "common criteria to assess and challenge proposals");
  q("q12", "leadership", "La direction intervient-elle suffisamment tôt pour orienter les projets plutôt que modifier tardivement des productions déjà engagées ?", "Does management step in early enough to steer projects rather than changing productions already under way?", "une intervention de la direction suffisamment tôt dans les projets", "early involvement of management in projects");
  q("q13", "operating", "Les processus de production et de validation sont-ils formalisés et compris par les parties prenantes ?", "Are production and approval processes formalised and understood by stakeholders?", "des processus de production et de validation formalisés et compris", "formalised, understood production and approval processes");
  q("q14", "operating", "Les rôles entre équipes internes, agences et prestataires sont-ils clairement définis ?", "Are roles between internal teams, agencies and suppliers clearly defined?", "des rôles clairement définis entre équipes internes, agences et prestataires", "clearly defined roles between internal teams, agencies and suppliers");
  q("q15", "operating", "Les briefs sont-ils validés avant le démarrage des productions ?", "Are briefs approved before production starts?", "la validation des briefs avant le démarrage des productions", "approval of briefs before production starts");
  q("q16", "operating", "L'organisation dispose-t-elle de mécanismes permettant de traiter les retours contradictoires et les changements de priorité ?", "Does the organisation have mechanisms to handle contradictory feedback and changing priorities?", "des mécanismes pour traiter les retours contradictoires et les changements de priorité", "mechanisms to handle contradictory feedback and changing priorities");
  q("q17", "performance", "Des indicateurs permettent-ils d'évaluer la contribution des activités créatives aux objectifs marketing ?", "Do indicators make it possible to assess the contribution of creative activities to marketing objectives?", "des indicateurs de contribution des activités créatives aux objectifs marketing", "indicators of the contribution of creative activities to marketing objectives");
  q("q18", "performance", "Les performances des campagnes sont-elles analysées après leur diffusion ?", "Is campaign performance analysed after release?", "l'analyse des performances des campagnes après diffusion", "analysis of campaign performance after release");
  q("q19", "performance", "Les enseignements des campagnes précédentes sont-ils réutilisés dans les briefs et les décisions suivantes ?", "Are the lessons of previous campaigns reused in later briefs and decisions?", "la réutilisation des enseignements des campagnes précédentes", "reuse of lessons from previous campaigns");
  q("q20", "performance", "L'organisation distingue-t-elle la qualité de production, l'efficacité opérationnelle et les résultats marketing ?", "Does the organisation distinguish production quality, operational efficiency and marketing results?", "la distinction entre qualité de production, efficacité opérationnelle et résultats marketing", "the distinction between production quality, operational efficiency and marketing results");
  q("q21", "technology", "Votre organisation a-t-elle identifié les tâches créatives ou opérationnelles pouvant bénéficier de l'automatisation ?", "Has your organisation identified the creative or operational tasks that could benefit from automation?", "l'identification des tâches pouvant bénéficier de l'automatisation", "identification of tasks that could benefit from automation");
  q("q22", "technology", "Les équipes disposent-elles d'outils adaptés à la collaboration, au partage des actifs et au suivi des productions ?", "Do teams have tools suited to collaboration, asset sharing and production tracking?", "des outils adaptés à la collaboration, au partage des actifs et au suivi", "tools suited to collaboration, asset sharing and tracking");
  q("q23", "technology", "Existe-t-il des règles encadrant l'utilisation de l'intelligence artificielle dans les activités créatives ?", "Are there rules governing the use of artificial intelligence in creative activities?", "des règles encadrant l'usage de l'intelligence artificielle", "rules governing the use of artificial intelligence");
  q("q24", "technology", "L'organisation évalue-t-elle régulièrement la pertinence de ses outils et technologies créatives ?", "Does the organisation regularly assess the relevance of its creative tools and technologies?", "l'évaluation régulière de la pertinence des outils et technologies", "regular assessment of the relevance of tools and technologies");

  var ORDER = []; DIMS.forEach(function (d) { d.q.forEach(function (id) { ORDER.push(id); }); });
  return { VERSION: VERSION, SCALE: SCALE, NA: NA, LEVELS: LEVELS, DIMS: DIMS, Q: Q, ORDER: ORDER, COUNT: ORDER.length, OPT: OPT,
    /* seuil de couverture : réponses valides minimales par dimension pour calculer un niveau global.
       La spécification recommande 4 ; avec 4 questions par dimension, cela exclut toute réponse « Je ne sais pas ». Fixé à 3, modifiable ici. */
    MIN_VALID: 3 };
});
