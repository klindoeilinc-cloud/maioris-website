/* MAIORIS Brand Consistency Review™ : profil de marque, catégories de supports, six dimensions et critères d'observation (FR et EN).
   Mode guidé : aucun fichier n'est lu ni analysé automatiquement. Le visiteur référence les supports et consigne ses observations avec leurs preuves. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../core/options.js"));
  else root.BRData = factory(root.MaiorisOptions);
})(typeof self !== "undefined" ? self : this, function (OPT) {
  "use strict";
  var VERSION = "1.0";
  function L(fr, en) { return { fr: fr, en: en }; }

  var LIMITS = { maxSupports: 25, maxFileBytes: 10 * 1024 * 1024, formats: ["pdf", "png", "jpg", "jpeg", "webp"], mime: ["application/pdf", "image/png", "image/jpeg", "image/webp"], minFact: 10, maxText: 600 };

  var STATUS = [
    { id: "conform", observed: true, w: 1, name: L("Conforme", "Compliant") },
    { id: "partial", observed: true, w: 0.5, name: L("Partiellement conforme", "Partially compliant") },
    { id: "non", observed: true, w: 0, name: L("Non conforme", "Non compliant") },
    { id: "unobservable", observed: false, name: L("Non observable", "Not observable") },
    { id: "na", observed: false, name: L("Non applicable", "Not applicable") }
  ];

  var CHANNELS = [["site", "Site web", "Website"], ["social", "Réseaux sociaux", "Social media"], ["ads", "Publicité digitale", "Digital advertising"], ["tv", "Télévision et radio", "TV and radio"],
    ["ooh", "Affichage et PLV", "Outdoor and point of sale"], ["print", "Presse et imprimés", "Press and print"], ["packaging", "Packaging", "Packaging"], ["events", "Événements et activations", "Events and activations"],
    ["email", "E-mail et CRM", "Email and CRM"], ["sales", "Supports commerciaux", "Sales materials"]].map(function (c) { return { id: c[0], l: L(c[1], c[2]) }; });

  var CATS = [
    { id: "A", name: L("Identité de marque", "Brand identity"), kinds: [["logo", "Logo", "Logo"], ["guidelines", "Brand guidelines", "Brand guidelines"], ["charter", "Charte graphique", "Graphic charter"]] },
    { id: "B", name: L("Communication", "Communication"), kinds: [["campaign", "Campagne publicitaire", "Advertising campaign"], ["social", "Publication social media", "Social media post"], ["promo", "Visuel promotionnel", "Promotional visual"], ["video", "Vidéo ou capture représentative", "Video or representative capture"]] },
    { id: "C", name: L("Présence digitale", "Digital presence"), kinds: [["site", "Site web", "Website"], ["socialpage", "Page sociale", "Social page"], ["sales", "Support commercial", "Sales material"]] },
    { id: "D", name: L("Références concurrentielles", "Competitive references"), kinds: [["identity", "Identité", "Identity"], ["campaign", "Campagne", "Campaign"], ["public", "Support public", "Public material"]] }
  ];

  var DIMS = [
    { id: "visual", name: L("Visual Identity Consistency", "Visual Identity Consistency"), d: L("La cohérence de l'identité visuelle d'un support à l'autre.", "The consistency of the visual identity from one material to the next."),
      risk: L("des variations visuelles peuvent affaiblir la lisibilité et la reconnaissance de la marque", "visual variations can weaken the legibility and recognition of the brand"), stem: L("Harmoniser", "Harmonise"),
      c: [["colors", "Cohérence des couleurs", "Colour consistency"], ["type", "Cohérence typographique", "Typographic consistency"], ["logo", "Usage du logo", "Use of the logo"], ["graphics", "Cohérence des éléments graphiques", "Consistency of graphic elements"],
          ["rules", "Respect des règles visuelles", "Compliance with visual rules"], ["variations", "Variations non justifiées", "Unjustified variations"]] },
    { id: "verbal", name: L("Verbal Identity Consistency", "Verbal Identity Consistency"), d: L("La cohérence du ton et du discours d'une prise de parole à l'autre.", "The consistency of tone and discourse from one statement to the next."),
      risk: L("un discours qui varie peut brouiller ce que la marque dit d'elle-même", "a discourse that varies can blur what the brand says about itself"), stem: L("Aligner", "Align"),
      c: [["tone", "Ton de communication", "Tone of communication"], ["vocab", "Vocabulaire", "Vocabulary"], ["messages", "Messages clés", "Key messages"], ["promise", "Promesse de marque", "Brand promise"],
          ["voices", "Cohérence des prises de parole", "Consistency of statements"], ["continuity", "Continuité du discours", "Continuity of discourse"]] },
    { id: "positioning", name: L("Brand Positioning Alignment", "Brand Positioning Alignment"), d: L("L'alignement entre le positionnement déclaré et l'expression réelle.", "The alignment between declared positioning and actual expression."),
      risk: L("un écart entre positionnement et expression peut rendre la proposition de valeur moins lisible", "a gap between positioning and expression can make the value proposition less legible"), stem: L("Clarifier", "Clarify"),
      c: [["match", "Correspondance entre positionnement déclaré et expression réelle", "Match between declared positioning and actual expression"], ["value", "Clarté de la proposition de valeur", "Clarity of the value proposition"],
          ["commercial", "Cohérence des messages commerciaux", "Consistency of commercial messages"], ["discourse", "Cohérence entre discours et supports", "Consistency between discourse and materials"]] },
    { id: "distinct", name: L("Creative Distinctiveness", "Creative Distinctiveness"), d: L("Les éléments distinctifs observables, par comparaison avec les références concurrentielles. Elle ne mesure pas la reconnaissance auprès des audiences.", "The observable distinctive elements, compared with competitive references. It does not measure recognition among audiences."),
      risk: L("des codes proches de ceux du secteur peuvent rendre la marque moins distinctive à l'observation", "codes close to those of the sector can make the brand less distinctive on observation"), stem: L("Renforcer", "Strengthen"), needsCompetitor: true,
      c: [["codes", "Singularité des codes visuels", "Uniqueness of visual codes"], ["territories", "Originalité des territoires créatifs", "Originality of creative territories"], ["diff", "Différenciation apparente", "Apparent differentiation"],
          ["conventions", "Répétition des conventions sectorielles", "Repetition of sector conventions"], ["elements", "Cohérence des éléments distinctifs", "Consistency of distinctive elements"]] },
    { id: "cross", name: L("Cross-Channel Consistency", "Cross-Channel Consistency"), d: L("La cohérence de l'expression d'un canal à l'autre.", "The consistency of expression from one channel to another."),
      risk: L("une expression qui change d'un canal à l'autre peut fragmenter l'expérience de la marque", "expression that changes from one channel to another can fragment the brand experience"), stem: L("Unifier", "Unify"),
      c: [["websocial", "Cohérence entre site web et réseaux sociaux", "Consistency between website and social media"], ["adsales", "Cohérence entre publicité et supports commerciaux", "Consistency between advertising and sales materials"],
          ["instpromo", "Cohérence entre communication institutionnelle et promotionnelle", "Consistency between institutional and promotional communication"], ["formats", "Adaptation aux formats", "Adaptation to formats"], ["territory", "Continuité du territoire de marque", "Continuity of the brand territory"]] },
    { id: "governance", name: L("Brand Governance & Application", "Brand Governance & Application"), d: L("L'existence et l'application des règles de marque.", "The existence and application of brand rules."),
      risk: L("des règles absentes ou peu appliquées peuvent laisser les écarts s'installer d'une production à l'autre", "absent or poorly applied rules can let gaps settle in from one production to the next"), stem: L("Formaliser", "Formalise"),
      c: [["rules", "Existence des règles de marque", "Existence of brand rules"], ["access", "Accessibilité des guidelines", "Accessibility of guidelines"], ["adapt", "Cohérence des adaptations", "Consistency of adaptations"],
          ["external", "Contrôle des productions externes", "Control of external productions"], ["standards", "Respect des standards", "Compliance with standards"], ["validation", "Mécanismes de validation", "Validation mechanisms"]] }
  ];
  DIMS.forEach(function (d) { d.c = d.c.map(function (x) { return { id: d.id + "." + x[0], dim: d.id, l: L(x[1], x[2]) }; }); });
  var CRITERIA = {}, ORDER = []; DIMS.forEach(function (d) { d.c.forEach(function (c) { CRITERIA[c.id] = c; ORDER.push(c.id); }); });

  var PROFILE = [
    { id: "name", req: true, type: "text", l: L("Nom de la marque", "Brand name") },
    { id: "sector", req: true, type: "select", l: L("Secteur d'activité", "Sector of activity"), opts: OPT.sector },
    { id: "market", req: true, type: "text", l: L("Marché géographique", "Geographic market") },
    { id: "audience", req: true, type: "text", l: L("Public cible principal", "Main target audience") },
    { id: "positioning", req: true, type: "textarea", l: L("Positionnement déclaré", "Declared positioning"), d: L("Telle que la marque se décrit elle-même, en quelques phrases.", "As the brand describes itself, in a few sentences.") },
    { id: "competitors", req: false, type: "textarea", l: L("Principaux concurrents", "Main competitors") },
    { id: "channels", req: true, type: "multi", l: L("Principaux canaux de communication", "Main communication channels"), opts: CHANNELS }
  ];

  return { VERSION: VERSION, LIMITS: LIMITS, STATUS: STATUS, CATS: CATS, DIMS: DIMS, CRITERIA: CRITERIA, ORDER: ORDER, PROFILE: PROFILE, OPT: OPT,
    /* règles de preuve pour produire un indice de cohérence sur une dimension */
    RULES: { minObserved: 3, minDistinctSupports: 2, minShareOfApplicable: 0.5 } };
});
