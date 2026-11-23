/* MAIORIS Brand Consistency Review™ : textes et Brand Review Report (sections A à H).
   Le rapport ne dit que ce que les constats saisis permettent de dire, et distingue faits observés, interprétations, hypothèses à vérifier et informations manquantes. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data.js"), require("./calc.js"));
  else root.BRReport = factory(root.BRData, root.BRCalc);
})(typeof self !== "undefined" ? self : this, function (D, C) {
  "use strict";
  var T = {
    fr: {
      step: "Étape", of: "sur", done: "complété", back: "Précédent", next: "Continuer", seeReport: "Générer le Brand Review Report", choose: "Choisir", optional: "facultatif",
      profileT: "Brand Profile", profileI: "Sept informations sur la marque examinée. Elles cadrent la revue et figurent dans le rapport.",
      supportsT: "Supports examinés", supportsI: "Référencez les supports sur lesquels vous appuierez vos constats : fichiers (PDF, PNG, JPG, JPEG, WEBP) ou liens publics.",
      guided: "Mode d'évaluation guidé", guidedP: "Aucun fichier n'est lu, analysé ni envoyé : MAIORIS ne dispose pas ici d'une capacité d'analyse automatique des documents. Le fichier choisi est seulement contrôlé (format et taille) puis référencé dans votre registre, dans cet onglet. Les constats que vous consignez sont les vôtres.",
      limitsLine: "Formats : PDF, PNG, JPG, JPEG, WEBP · 10 Mo maximum par fichier · 25 supports au maximum · liens publics http ou https uniquement.",
      cat: "Catégorie", kind: "Type de support", titleF: "Titre ou description du support", sourceF: "Source", srcFile: "Fichier (référencé, non lu)", srcLink: "Lien public", fileF: "Fichier", linkF: "Adresse du lien", noteF: "Remarque (facultatif)",
      add: "Ajouter au registre", remove: "Retirer", registry: "Registre des supports", empty: "Aucun support référencé pour l'instant.", ofMax: "sur",
      needSupport: "Référencez au moins un support pour continuer.", fixErrors: "Une ou plusieurs informations sont à corriger.", required: "Cette information est nécessaire.", invalid: "Valeur non reconnue.",
      errs: { empty: "Choisissez un fichier ou saisissez un lien.", format: "Format non accepté. Formats : PDF, PNG, JPG, JPEG, WEBP.", mime: "Le type du fichier ne correspond pas à son extension.", size: "Fichier trop volumineux (10 Mo maximum).", max: "Nombre maximal de supports atteint (25).",
              kind: "Choisissez une catégorie et un type de support.", title: "Donnez un titre ou une description au support.", link_empty: "Saisissez l'adresse du lien.", link_invalid: "Adresse de lien non valide.", link_protocol: "Seuls les liens http et https sont acceptés.", link_private: "Le lien doit être public : adresses locales ou privées refusées." },
      statusQ: "Statut", doc: "Support observé", docNone: "Choisir un support", loc: "Page ou section", fact: "Fait observé", factH: "Décrivez ce que vous voyez, sans l'interpréter.", interp: "Interprétation (facultatif)", hypo: "Hypothèse à vérifier (facultatif)",
      evNeeded: "Pour un constat observé, citez un support et décrivez le fait observé.",
      dimNote: "Pour chaque critère, indiquez ce que vous observez réellement sur les supports référencés. Un critère sans support observable se déclare « Non observable ».",
      distinctNote: "Les constats de cette dimension portent sur des éléments distinctifs observables. Ils ne prouvent pas que les audiences reconnaissent la marque : cela exige une mesure auprès d'elles.",
      reportT: "Brand Review Report", lead: "Une revue guidée, fondée uniquement sur les constats que vous avez consignés.", flag: "Revue guidée déclarative, aucun fichier analysé",
      A: "A. Brand overview", B: "B. Consistency findings", C: "C. Evidence register", D: "D. Brand strengths", E: "E. Inconsistencies", F: "F. Strategic risks", G: "G. Priority actions", H: "H. Limitations",
      idxLabel: "Indice de cohérence observée", band: { high: "Cohérence élevée sur les supports examinés", partial: "Cohérence partielle sur les supports examinés", low: "Cohérence faible sur les supports examinés" },
      cover: "{o} critère(s) observé(s) avec preuve sur {a} applicable(s), {s} support(s) distinct(s)", notScored: "Aucun indice : dimension insuffisamment documentée",
      reasons: { few_observed: "moins de trois critères observés avec preuve", few_supports: "moins de deux supports distincts cités", low_share: "moins de la moitié des critères applicables observés", not_applicable: "aucun critère applicable", no_competitor: "aucune référence concurrentielle citée à l'appui" },
      scope: "Périmètre : {n} support(s) référencé(s) ({cats}).", scopeNone: "Périmètre : aucun support référencé.", brandLine: "Marque : {name}, secteur « {sector} », marché : {market}.", audLine: "Public cible principal : {a}.", posLine: "Positionnement déclaré : {p}", compLine: "Concurrents cités : {c}.", chanLine: "Canaux principaux : {c}.",
      none: "Aucun élément à signaler.", noStrength: "Aucun constat conforme avec preuve pour l'instant.", noIncon: "Aucun écart documenté dans les constats saisis. Cela ne démontre pas l'absence d'écarts : seuls les supports examinés sont couverts.",
      supportIn: "support", locIn: "localisation", certaintyLow: "Niveau de certitude : faible (écart relevé sur un seul support, à vérifier)", certaintyMid: "Niveau de certitude : modéré (écart relevé sur plusieurs supports)", underdoc: "dimension insuffisamment documentée",
      riskPre: "Risque potentiel", noRisk: "Aucun risque stratégique ne peut être établi à partir des constats saisis.", noActions: "Aucun écart documenté : étendez la revue à davantage de supports avant de conclure.",
      hypoT: "Hypothèses à vérifier", reading: "Lecture du rapport : les faits observés sont distingués des interprétations et des hypothèses. Seuls les faits sont assortis d'un support.",
      limFiles: "Aucun fichier n'a été lu ni analysé automatiquement : les constats sont ceux de la personne qui a rempli la revue.", limSupports: "Catégories de supports non fournies : {c}.", limNotScored: "Dimensions non scorées : {d}.",
      limUnobs: "Critères déclarés non observables : {n}.", limSingle: "Un seul support est référencé : il ne permet pas de conclure sur l'ensemble de la marque.", limRecog: "L'analyse de supports ne prouve pas que les audiences reconnaissent réellement la marque : les éléments distinctifs observés ne remplacent pas une mesure de reconnaissance.",
      limNoGlobal: "Aucun score global n'est produit : chaque dimension n'est notée que si elle est suffisamment documentée.", limVerify: "Seule une analyse indépendante des documents, des pratiques et des audiences peut confirmer ces constats.",
      colCrit: "Critère", colStatus: "Statut", colSupport: "Support", colLoc: "Localisation", colFact: "Fait observé", colInterp: "Interprétation", colHypo: "Hypothèse à vérifier",
      print: "Imprimer le rapport", copy: "Copier le rapport", copied: "Rapport copié.", copyFail: "Copie impossible : sélectionnez le texte manuellement.", restart: "Recommencer", dimLabel: "Dimension"
    },
    en: {
      step: "Step", of: "of", done: "complete", back: "Back", next: "Continue", seeReport: "Generate the Brand Review Report", choose: "Choose", optional: "optional",
      profileT: "Brand Profile", profileI: "Seven details about the brand under review. They frame the review and appear in the report.",
      supportsT: "Materials reviewed", supportsI: "List the materials you will base your findings on: files (PDF, PNG, JPG, JPEG, WEBP) or public links.",
      guided: "Guided assessment mode", guidedP: "No file is read, analysed or sent: MAIORIS has no automatic document analysis capability here. The file you choose is only checked (format and size) and then listed in your register, in this tab. The findings you record are your own.",
      limitsLine: "Formats: PDF, PNG, JPG, JPEG, WEBP · 10 MB maximum per file · 25 materials at most · public http or https links only.",
      cat: "Category", kind: "Type of material", titleF: "Title or description of the material", sourceF: "Source", srcFile: "File (listed, not read)", srcLink: "Public link", fileF: "File", linkF: "Link address", noteF: "Note (optional)",
      add: "Add to the register", remove: "Remove", registry: "Register of materials", empty: "No material listed yet.", ofMax: "of",
      needSupport: "List at least one material to continue.", fixErrors: "One or more details need correcting.", required: "This information is needed.", invalid: "Unrecognised value.",
      errs: { empty: "Choose a file or enter a link.", format: "Format not accepted. Formats: PDF, PNG, JPG, JPEG, WEBP.", mime: "The file type does not match its extension.", size: "File too large (10 MB maximum).", max: "Maximum number of materials reached (25).",
              kind: "Choose a category and a type of material.", title: "Give the material a title or description.", link_empty: "Enter the link address.", link_invalid: "Invalid link address.", link_protocol: "Only http and https links are accepted.", link_private: "The link must be public: local or private addresses are refused." },
      statusQ: "Status", doc: "Material observed", docNone: "Choose a material", loc: "Page or section", fact: "Observed fact", factH: "Describe what you see, without interpreting it.", interp: "Interpretation (optional)", hypo: "Hypothesis to verify (optional)",
      evNeeded: "For an observed finding, cite a material and describe the observed fact.",
      dimNote: "For each criterion, say what you actually observe on the materials listed. A criterion with no observable material is declared “Not observable”.",
      distinctNote: "Findings in this dimension concern observable distinctive elements. They do not prove that audiences recognise the brand: that requires measurement among them.",
      reportT: "Brand Review Report", lead: "A guided review, based only on the findings you recorded.", flag: "Declarative guided review, no file analysed",
      A: "A. Brand overview", B: "B. Consistency findings", C: "C. Evidence register", D: "D. Brand strengths", E: "E. Inconsistencies", F: "F. Strategic risks", G: "G. Priority actions", H: "H. Limitations",
      idxLabel: "Observed consistency index", band: { high: "High consistency across the materials reviewed", partial: "Partial consistency across the materials reviewed", low: "Low consistency across the materials reviewed" },
      cover: "{o} criterion(s) observed with evidence out of {a} applicable, {s} distinct material(s)", notScored: "No index: dimension insufficiently documented",
      reasons: { few_observed: "fewer than three criteria observed with evidence", few_supports: "fewer than two distinct materials cited", low_share: "fewer than half of the applicable criteria observed", not_applicable: "no applicable criterion", no_competitor: "no competitive reference cited in support" },
      scope: "Scope: {n} material(s) listed ({cats}).", scopeNone: "Scope: no material listed.", brandLine: "Brand: {name}, sector “{sector}”, market: {market}.", audLine: "Main target audience: {a}.", posLine: "Declared positioning: {p}", compLine: "Competitors named: {c}.", chanLine: "Main channels: {c}.",
      none: "Nothing to report.", noStrength: "No compliant finding with evidence yet.", noIncon: "No documented gap in the findings entered. This does not show that there are none: only the materials reviewed are covered.",
      supportIn: "material", locIn: "location", certaintyLow: "Level of certainty: low (gap seen on a single material, to be verified)", certaintyMid: "Level of certainty: moderate (gap seen on several materials)", underdoc: "dimension insufficiently documented",
      riskPre: "Potential risk", noRisk: "No strategic risk can be established from the findings entered.", noActions: "No documented gap: extend the review to more materials before concluding.",
      hypoT: "Hypotheses to verify", reading: "Reading the report: observed facts are kept separate from interpretations and hypotheses. Only facts are backed by a material.",
      limFiles: "No file was read or analysed automatically: the findings are those of the person who completed the review.", limSupports: "Categories of materials not provided: {c}.", limNotScored: "Dimensions not scored: {d}.",
      limUnobs: "Criteria declared not observable: {n}.", limSingle: "Only one material is listed: it does not allow conclusions about the brand as a whole.", limRecog: "Analysing materials does not prove that audiences actually recognise the brand: the distinctive elements observed do not replace a recognition measurement.",
      limNoGlobal: "No overall score is produced: each dimension is scored only if it is sufficiently documented.", limVerify: "Only an independent analysis of documents, practices and audiences can confirm these findings.",
      colCrit: "Criterion", colStatus: "Status", colSupport: "Material", colLoc: "Location", colFact: "Observed fact", colInterp: "Interpretation", colHypo: "Hypothesis to verify",
      print: "Print the report", copy: "Copy the report", copied: "Report copied.", copyFail: "Copy not possible: select the text manually.", restart: "Start over", dimLabel: "Dimension"
    }
  };
  function fill(s, m) { return s.replace(/\{(\w+)\}/g, function (_, k) { return m[k] === undefined ? "" : m[k]; }); }
  function lbl(list, id, lang) { var x = list.filter(function (o) { return o.id === id; })[0]; return x ? x.l[lang] : ""; }
  function joinL(a, lang) { return a.join(lang === "en" ? ", " : ", "); }
  function stName(id, lang) { return D.STATUS.filter(function (s) { return s.id === id; })[0].name[lang]; }
  function supLabel(s) { return s ? s.id + " · " + s.title : ""; }

  function build(state, lang) {
    var t = T[lang], p = state.profile || {}, sup = state.supports || [], rev = state.reviews || {}, comp = C.compute(rev, sup), reg = C.register(rev, sup), rep = { lang: lang, t: t, comp: comp };
    var sectorL = lbl(D.OPT.sector, p.sector, lang);
    // A
    rep.A = [fill(t.brandLine, { name: p.name || "", sector: (sectorL || "").toLowerCase(), market: p.market || "" }), fill(t.audLine, { a: p.audience || "" }), fill(t.posLine, { p: p.positioning || "" })];
    if (p.competitors) rep.A.push(fill(t.compLine, { c: String(p.competitors).replace(/\s*\n\s*/g, ", ") }));
    if (p.channels && p.channels.length) rep.A.push(fill(t.chanLine, { c: joinL(p.channels.map(function (c) { return lbl(D.PROFILE[6].opts, c, lang); }), lang) }));
    var cats = D.CATS.filter(function (c) { return comp.perCat[c.id]; }).map(function (c) { return c.name[lang] + " : " + comp.perCat[c.id]; });
    rep.A.push(sup.length ? fill(t.scope, { n: sup.length, cats: joinL(cats, lang) }) : t.scopeNone);
    // B
    rep.B = comp.dims.map(function (d) {
      var dm = D.DIMS.filter(function (x) { return x.id === d.id; })[0];
      var crit = dm.c.map(function (c) { var e = rev[c.id]; return { label: c.l[lang], status: e && e.status ? stName(e.status, lang) : "", valid: e ? C.criterion(e, sup).state !== "incomplete" : false }; });
      return { id: d.id, name: dm.name[lang], desc: dm.d[lang], scored: d.scored, index: d.index === null ? null : Math.round(d.index), band: d.band ? t.band[d.band] : null,
               coverage: fill(t.cover, { o: d.observed, a: d.applicable, s: d.distinctSupports }), reasons: d.reasons.map(function (r) { return t.reasons[r]; }), criteria: crit, note: dm.needsCompetitor ? t.distinctNote : "" };
    });
    // C
    rep.C = reg.map(function (r) { var c = D.CRITERIA[r.id], dm = D.DIMS.filter(function (x) { return x.id === r.dim; })[0];
      return { dim: dm.name[lang], criterion: c.l[lang], status: stName(r.status, lang), statusId: r.status, support: r.support ? supLabel(r.support) + (r.support.source === "link" ? " (" + r.support.url + ")" : " (" + r.support.fileName + ")") : "", loc: r.loc, fact: r.fact, interp: r.interp, hypo: r.hypo, valid: r.valid }; });
    var validRows = reg.filter(function (r) { return r.valid && r.support; });
    // D
    rep.D = validRows.filter(function (r) { return r.status === "conform"; }).map(function (r) { return D.CRITERIA[r.id].l[lang] + " : " + r.fact + " (" + supLabel(r.support) + (r.loc ? ", " + r.loc : "") + ")"; });
    // E
    var incons = validRows.filter(function (r) { return r.status === "partial" || r.status === "non"; });
    rep.E = incons.map(function (r) { return D.CRITERIA[r.id].l[lang] + " [" + stName(r.status, lang) + "] : " + r.fact + " (" + supLabel(r.support) + (r.loc ? ", " + r.loc : "") + ")"; });
    // F : jamais de certitude élevée (revue guidée déclarative)
    rep.F = []; D.DIMS.forEach(function (dm, i) {
      var rows = incons.filter(function (r) { return r.dim === dm.id; }); if (!rows.length) return;
      var ids = {}; rows.forEach(function (r) { ids[r.support.id] = 1; }); var multi = Object.keys(ids).length >= 2 && comp.dims[i].scored;
      rep.F.push(t.riskPre + " (" + dm.name[lang] + ") : " + dm.risk[lang] + ". " + (multi ? t.certaintyMid : t.certaintyLow) + (comp.dims[i].scored ? "" : " ; " + t.underdoc) + ".");
    });
    // G
    var order = D.DIMS.map(function (d) { return d.id; });
    var sorted = incons.slice().sort(function (a, b) {
      var wa = a.status === "non" ? 0 : 1, wb = b.status === "non" ? 0 : 1; if (wa !== wb) return wa - wb;
      var sa = comp.dims[order.indexOf(a.dim)].scored ? 0 : 1, sb = comp.dims[order.indexOf(b.dim)].scored ? 0 : 1; if (sa !== sb) return sa - sb;
      return D.ORDER.indexOf(a.id) - D.ORDER.indexOf(b.id); });
    rep.G = sorted.slice(0, 5).map(function (r) { var dm = D.DIMS.filter(function (x) { return x.id === r.dim; })[0]; return dm.stem[lang] + " : " + D.CRITERIA[r.id].l[lang].replace(/^./, function (c) { return c.toLowerCase(); }) + " (" + dm.name[lang] + ")."; });
    // hypothèses
    rep.H0 = reg.filter(function (r) { return r.hypo; }).map(function (r) { return D.CRITERIA[r.id].l[lang] + " : " + r.hypo; });
    // H : limites
    var unobs = reg.filter(function (r) { return r.status === "unobservable"; }).length, notScored = comp.dims.filter(function (d) { return !d.scored; }).map(function (d) { return D.DIMS.filter(function (x) { return x.id === d.id; })[0].name[lang]; });
    rep.H = [t.limFiles];
    if (comp.emptyCats.length) rep.H.push(fill(t.limSupports, { c: joinL(comp.emptyCats.map(function (id) { return D.CATS.filter(function (c) { return c.id === id; })[0].name[lang]; }), lang) }));
    if (notScored.length) rep.H.push(fill(t.limNotScored, { d: joinL(notScored, lang) }));
    if (unobs) rep.H.push(fill(t.limUnobs, { n: unobs }));
    if (comp.singleSupport) rep.H.push(t.limSingle);
    rep.H.push(t.limRecog, t.limNoGlobal, t.limVerify);
    rep.summary = { scored: comp.scoredCount, total: D.DIMS.length, supports: sup.length };
    return rep;
  }

  /** Version texte du rapport (copie, envoi à MAIORIS). Aucun fichier n'est inclus. */
  function toText(rep) {
    var t = rep.t, L = [t.reportT.toUpperCase(), t.reading, ""];
    function sec(title, arr) { L.push(title); (arr.length ? arr : [t.none]).forEach(function (x) { L.push("- " + x); }); L.push(""); }
    sec(t.A, rep.A);
    L.push(t.B); rep.B.forEach(function (d) { L.push("- " + d.name + " : " + (d.scored ? t.idxLabel + " " + d.index + "/100 (" + d.band + ")" : t.notScored + " (" + d.reasons.join(" ; ") + ")") + " · " + d.coverage); }); L.push("");
    L.push(t.C); rep.C.forEach(function (r) { L.push("- [" + r.status + "] " + r.dim + " / " + r.criterion + (r.support ? " | " + r.support : "") + (r.loc ? " | " + r.loc : "") + (r.fact ? " | " + t.colFact + " : " + r.fact : "") + (r.interp ? " | " + t.colInterp + " : " + r.interp : "") + (r.hypo ? " | " + t.colHypo + " : " + r.hypo : "")); }); L.push("");
    sec(t.D, rep.D); sec(t.E, rep.E); sec(t.F, rep.F); sec(t.G, rep.G); if (rep.H0.length) sec(t.hypoT, rep.H0); sec(t.H, rep.H);
    return L.join("\n");
  }
  return { T: T, build: build, toText: toText, fill: fill, lbl: lbl };
});
