/* MAIORIS INTELLIGENCE CORE™ : listes d'options communes aux outils (secteur, taille). Une seule définition. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MaiorisOptions = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function o(id, fr, en) { return { id: id, l: { fr: fr, en: en } }; }
  return {
    sector: [o("bank", "Banque, finance et assurance", "Banking, finance and insurance"), o("telco", "Télécommunications et technologies", "Telecommunications and technology"),
      o("retail", "Grande distribution et commerce", "Retail and distribution"), o("fmcg", "Agroalimentaire et FMCG", "Food and FMCG"),
      o("auto", "Automobile et mobilité", "Automotive and mobility"), o("realestate", "Immobilier et construction", "Real estate and construction"),
      o("energy", "Énergie, pétrole et mines", "Energy, oil and mining"), o("health", "Santé et industrie pharmaceutique", "Health and pharmaceuticals"),
      o("transport", "Transport et logistique", "Transport and logistics"), o("public", "Institutions et secteur public", "Institutions and public sector"),
      o("media", "Médias, culture et divertissement", "Media, culture and entertainment"), o("other", "Autre", "Other")],
    size: [o("lt20", "Moins de 20 collaborateurs", "Fewer than 20 employees"), o("20_49", "20 à 49 collaborateurs", "20 to 49 employees"), o("50_99", "50 à 99 collaborateurs", "50 to 99 employees"),
      o("100_249", "100 à 249 collaborateurs", "100 to 249 employees"), o("250_499", "250 à 499 collaborateurs", "250 to 499 employees"), o("500_999", "500 à 999 collaborateurs", "500 to 999 employees"),
      o("1000p", "1 000 collaborateurs et plus", "1,000 employees or more")]
  };
});

;
/* MAIORIS INTELLIGENCE CORE™ : profil organisationnel commun, historique et consolidation des résultats.

   Principes
   - Désactivé par défaut. Rien n'est conservé sans action explicite du visiteur (case à cocher du panneau).
   - Conservation dans l'onglet uniquement (sessionStorage) : effacée à la fermeture, jamais envoyée automatiquement.
     Ce n'est pas un stockage sécurisé : il ne faut pas y mettre de donnée sensible. Seuls des champs de contexte et des résumés de résultats sont conservés.
   - Chaque outil garde sa méthodologie, ses réponses et sa version : le noyau ne conserve que des résumés (titre, score, niveau, date, version, base).
   - Aucun outil ne dépend du noyau pour fonctionner. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./options.js"));
  else root.MaiorisCore = factory(root.MaiorisOptions);
})(typeof self !== "undefined" ? self : this, function (OPT) {
  "use strict";
  var G = typeof self !== "undefined" ? self : (typeof globalThis !== "undefined" ? globalThis : {});
  var KEY = "maioris.core.v1", FIELDS = ["org", "sector", "size", "market", "contactName", "contactEmail"], MAXLEN = 200, MAXHIST = 100;
  var TOOLS = ["brief", "diag", "coi", "maturity", "brand"];
  var META = {
    fr: { brief: ["Évaluez votre brief", "evaluer-votre-brief.html"], diag: ["Où est votre contrainte ?", "autodiagnostic.html"], coi: ["Creative Operations Intelligence™", "creative-operations-intelligence.html"],
          maturity: ["Creative Maturity Assessment™", "creative-maturity-assessment.html"], brand: ["Brand Consistency Review™", "brand-consistency-review.html"] },
    en: { brief: ["Assess your brief", "brief-check.html"], diag: ["Where is your constraint?", "self-assessment.html"], coi: ["Creative Operations Intelligence™", "creative-operations-intelligence.html"],
          maturity: ["Creative Maturity Assessment™", "creative-maturity-assessment.html"], brand: ["Brand Consistency Review™", "brand-consistency-review.html"] }
  };
  var T = {
    fr: { title: "Vos résultats dans cet onglet", keep: "Conserver mon profil et mes résultats dans cet onglet pour les relier entre les outils",
          note: "Facultatif. Les données restent dans cet onglet, ne sont jamais envoyées automatiquement et disparaissent à sa fermeture. Ce n'est pas un stockage sécurisé : ne saisissez pas d'information sensible.",
          none: "Pas encore réalisé", on: "Réalisé le", clear: "Effacer mon profil et mes résultats", off: "Activez la conservation pour consolider vos résultats ici.", cleared: "Profil et résultats effacés.",
          profile: "Profil commun", basis: "Données autodéclarées", count: "résultat(s) dans cet onglet",
          remoteT: "Données transmises à MAIORIS", remoteP: "Vous avez transmis un résultat. Il est conservé 12 mois. Effacer votre profil local ne supprime pas ce que MAIORIS a reçu : utilisez le bouton ci-dessous, ou écrivez à hello@maioris.net.", erase: "Effacer mes données transmises à MAIORIS", erasing: "Effacement en cours…", erased: "Vos données transmises ont été effacées.", eraseFail: "L'effacement n'a pas abouti. Écrivez-nous à hello@maioris.net." },
    en: { title: "Your results in this tab", keep: "Keep my profile and results in this tab to link the tools together",
          note: "Optional. The data stays in this tab, is never sent automatically and disappears when it is closed. This is not secure storage: do not enter sensitive information.",
          none: "Not done yet", on: "Done on", clear: "Clear my profile and results", off: "Turn on keeping to consolidate your results here.", cleared: "Profile and results cleared.",
          profile: "Shared profile", basis: "Self declared data", count: "result(s) in this tab",
          remoteT: "Data sent to MAIORIS", remoteP: "You have sent a result. It is kept for 12 months. Clearing your local profile does not delete what MAIORIS received: use the button below, or write to hello@maioris.net.", erase: "Delete my data sent to MAIORIS", erasing: "Deleting…", erased: "Your data sent to MAIORIS has been deleted.", eraseFail: "Deletion did not complete. Write to us at hello@maioris.net." }
  };

  function create(deps) {
    deps = deps || {};
    var now = deps.now || function () { return new Date().toISOString(); };
    var rnd = deps.random || function () {
      var a = new Uint8Array(8); (G.crypto || {}).getRandomValues ? G.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); });
      return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    };
    function store() { if (deps.storage) return deps.storage; try { return G.sessionStorage || null; } catch (e) { return null; } }
    function load() { var s = store(); if (!s) return null; try { var r = JSON.parse(s.getItem(KEY)); return r && r.v === 1 && r.optin ? r : null; } catch (e) { return null; } }
    function save(st) { var s = store(); if (!s) return false; try { s.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } }
    function clean(v) { return String(v === null || v === undefined ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAXLEN); }
    function validField(k, v) {
      if (!v) return false;
      if (k === "sector") return OPT.sector.some(function (o) { return o.id === v; });
      if (k === "size") return OPT.size.some(function (o) { return o.id === v; });
      if (k === "contactEmail") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      return true;
    }
    var api = {
      enabled: function () { return !!load(); },
      enable: function () {
        if (load()) return true;
        return save({ v: 1, optin: true, consent: { storage: true, at: now() }, profile: { id: "p_" + rnd(), createdAt: now(), updatedAt: now(), sources: {} }, history: [] });
      },
      disable: function () { var s = store(); if (s) try { s.removeItem(KEY); } catch (e) {} },
      profile: function () { var st = load(); return st ? JSON.parse(JSON.stringify(st.profile)) : null; },
      /** Fusionne seulement des valeurs valides et non vides : une valeur existante n'est jamais effacée par une valeur vide. */
      setProfile: function (partial, basis) {
        var st = load(); if (!st) return false; var ch = false;
        FIELDS.forEach(function (k) {
          if (partial && partial[k] !== undefined) { var v = clean(partial[k]); if (validField(k, v) && st.profile[k] !== v) { st.profile[k] = v; st.profile.sources[k] = basis || "declared"; ch = true; } }
        });
        if (ch) { st.profile.updatedAt = now(); save(st); }
        return ch;
      },
      /** Valeurs déjà connues, pour ne pas redemander la même information. */
      known: function (keys) { var p = api.profile(), out = {}; if (!p) return out; (keys || FIELDS).forEach(function (k) { if (p[k]) out[k] = p[k]; }); return out; },
      /** Ajoute un résumé de résultat à l'historique (jamais écrasé). entry : {version, headline, score, level, detail} */
      record: function (tool, entry) {
        var st = load(); if (!st || TOOLS.indexOf(tool) < 0) return false;
        entry = entry || {};
        st.history.push({ tool: tool, at: now(), version: clean(entry.version) || "1", basis: "declared", headline: clean(entry.headline), score: typeof entry.score === "number" ? entry.score : null, level: clean(entry.level), detail: clean(entry.detail) });
        if (st.history.length > MAXHIST) st.history = st.history.slice(-MAXHIST);
        return save(st);
      },
      /** Référence du profil conservé par MAIORIS après un envoi consenti : identifiant et jeton de reprise (le jeton n'est jamais stocké côté serveur). */
      remote: function () { var st = load(); return st && st.remote ? { id: st.remote.id, token: st.remote.token } : null; },
      setRemote: function (id, token) {
        var st = load(); id = clean(id); token = clean(token);
        if (!st || !id || !token || id.length > 40 || token.length > 100) return false;
        st.remote = { id: id, token: token }; return save(st);
      },
      clearRemote: function () { var st = load(); if (!st || !st.remote) return false; delete st.remote; return save(st); },
      /** Clé d'idempotence : une par résultat, réutilisée en cas de nouvel essai d'envoi. */
      newKey: function () { return (G.crypto && G.crypto.randomUUID) ? G.crypto.randomUUID() : "k" + rnd() + rnd(); },
      history: function () { var st = load(); return st ? st.history.slice() : []; },
      latest: function (tool) { var h = api.history().filter(function (e) { return e.tool === tool; }); return h.length ? h[h.length - 1] : null; },
      /** Résultats consolidés : un élément par outil, null si l'outil n'a pas été réalisé. */
      consolidated: function () { var o = {}; TOOLS.forEach(function (t) { o[t] = api.latest(t); }); return o; },
      clear: function () { api.disable(); }
    };
    return api;
  }

  /* ---- Panneau « Vos résultats dans cet onglet » (monté sur #core-panel s'il existe) ---- */
  function mount(core, lang) {
    var host = typeof document !== "undefined" && document.getElementById("core-panel"); if (!host) return;
    var t = T[lang] || T.fr, meta = META[lang] || META.fr;
    function h(tag, attrs, kids) { var n = document.createElement(tag); for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else if (attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]); } (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return n; }
    function draw(msg) {
      host.innerHTML = "";
      var on = core.enabled(), cb = h("input", { type: "checkbox", id: "core-keep" }); cb.checked = on;
      cb.addEventListener("change", function () { if (cb.checked) core.enable(); else core.disable(); draw(cb.checked ? "" : t.cleared); });
      host.appendChild(h("h3", { text: t.title }));
      host.appendChild(h("label", { class: "core-keep", for: "core-keep" }, [cb, h("span", { text: t.keep })]));
      host.appendChild(h("p", { class: "core-note", text: t.note }));
      if (on) {
        var cons = core.consolidated(), ul = h("ul", { class: "core-list" });
        TOOLS.forEach(function (k) {
          var e = cons[k], li = h("li", { class: e ? "done" : "" });
          var a = h("a", { href: meta[k][1], text: meta[k][0] });
          var d = e ? t.on + " " + new Date(e.at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR") + (e.headline ? " : " + e.headline : "") : t.none;
          li.appendChild(a); li.appendChild(h("span", { text: d })); ul.appendChild(li);
        });
        host.appendChild(ul);
        host.appendChild(h("p", { class: "core-note", text: t.basis }));
        var rem = core.remote();
        if (rem) {
          var eb = h("button", { type: "button", class: "btn btn-sm btn-ghost", text: t.erase });
          eb.addEventListener("click", function () {
            eb.disabled = true; var msgEl = host.querySelector(".core-msg"); if (msgEl) msgEl.textContent = t.erasing;
            fetch("/api/erase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: rem.id, token: rem.token }) })
              .then(function (r) { if (r.ok) { core.clearRemote(); draw(t.erased); } else { eb.disabled = false; draw(t.eraseFail); } })
              .catch(function () { eb.disabled = false; draw(t.eraseFail); });
          });
          host.appendChild(h("h4", { class: "core-rh", text: t.remoteT })); host.appendChild(h("p", { class: "core-note", text: t.remoteP })); host.appendChild(eb);
        }
        var b = h("button", { type: "button", class: "link", text: t.clear }); b.addEventListener("click", function () { core.clear(); draw(t.cleared); }); host.appendChild(b);
      } else host.appendChild(h("p", { class: "core-note", text: t.off }));
      host.appendChild(h("p", { class: "core-msg", role: "status", text: msg || "" }));
    }
    draw();
    host.addEventListener("core:refresh", function () { draw(); });
  }

  var instance = create({});
  if (typeof document !== "undefined") {
    var go = function () { mount(instance, (document.documentElement.getAttribute("lang") || "fr").slice(0, 2)); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  instance.create = create; instance.TOOLS = TOOLS; instance.FIELDS = FIELDS; instance.META = META;
  return instance;
});

;
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

;
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

;
/* MAIORIS Creative Maturity Assessment™ : textes et rapport. Les interprétations reposent exclusivement sur les réponses données. */
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

;
/* MAIORIS Creative Maturity Assessment™ : interface. Les réponses restent en mémoire de la page ; l'envoi à MAIORIS est facultatif et soumis au consentement. */
(function () {
  "use strict";
  var D = window.MATData, C = window.MATCalc, R = window.MATReport, Core = window.MaiorisCore, OPT = window.MaiorisOptions;
  var root = document.getElementById("mat"); if (!root) return;
  var lang = root.getAttribute("data-lang") === "en" ? "en" : "fr", t = R.T[lang];
  var answers = {}, ctx = { org: "", sector: "", size: "", market: "" }, step = 0, started = false, startedAt = Date.now(), fromCore = {}, idemKey = null;
  var el = { head: root.querySelector("[data-head]"), body: root.querySelector("[data-body]"), nav: root.querySelector("[data-nav]"), result: document.getElementById("mat-result") };
  var TOTAL = D.DIMS.length + 1; // contexte + six dimensions

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function track(n, p) { try { if (window.plausible) window.plausible(n, { props: p || {} }); } catch (e) {} }
  function answeredCount() { return D.ORDER.filter(function (id) { return C.isAnswered(answers[id]); }).length; }

  if (Core && Core.enabled()) { fromCore = Core.known(["org", "sector", "size", "market"]); ["org", "sector", "size", "market"].forEach(function (k) { if (fromCore[k]) ctx[k] = fromCore[k]; }); }

  function renderHead() {
    var pct = Math.round(answeredCount() / D.COUNT * 100), label = step === 0 ? t.ctxTitle : t.step + " " + (step + 1) + " " + t.of + " " + TOTAL + " · " + D.DIMS[step - 1].name[lang];
    el.head.innerHTML = "";
    el.head.appendChild(h("div", { class: "coi-prog-row" }, [h("p", { class: "coi-prog-l", text: step === 0 ? t.step + " 1 " + t.of + " " + TOTAL + " · " + t.ctxTitle : label }), h("p", { class: "coi-prog-p", text: pct + " % " + t.done })]));
    el.head.appendChild(h("div", { class: "coi-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": label }, [h("span", { style: "width:" + pct + "%" })]));
    var ol = h("ol", { class: "coi-dots", "aria-hidden": "true" }); for (var i = 0; i < TOTAL; i++) ol.appendChild(h("li", { class: i < step ? "on" : i === step ? "cur" : "" })); el.head.appendChild(ol);
  }

  function selectField(id, label, list, value) {
    var s = h("select", { id: id, name: id }); s.appendChild(h("option", { value: "", text: t.choose }));
    list.forEach(function (o) { var op = h("option", { value: o.id, text: o.l[lang] }); if (o.id === value) op.selected = true; s.appendChild(op); });
    s.addEventListener("change", function () { ctx[id.replace("mat-c-", "")] = s.value; });
    return h("div", { class: "mat-f" }, [h("label", { for: id, text: label }), s]);
  }
  function renderContext() {
    el.body.innerHTML = "";
    var hd = h("h2", { class: "coi-step-t", tabindex: "-1", text: t.ctxTitle }); el.body.appendChild(hd); el.body.appendChild(h("p", { class: "coi-step-i", text: t.ctxIntro }));
    var org = h("input", { id: "mat-c-org", type: "text", autocomplete: "organization", value: ctx.org, maxlength: "200" }); org.addEventListener("input", function () { ctx.org = org.value; });
    var mk = h("input", { id: "mat-c-market", type: "text", value: ctx.market, maxlength: "200" }); mk.addEventListener("input", function () { ctx.market = mk.value; });
    var g = h("div", { class: "mat-ctx" }, [h("div", { class: "mat-f" }, [h("label", { for: "mat-c-org", text: t.fOrg }), org]), selectField("mat-c-sector", t.fSector, OPT.sector, ctx.sector), selectField("mat-c-size", t.fSize, OPT.size, ctx.size), h("div", { class: "mat-f" }, [h("label", { for: "mat-c-market", text: t.fMarket }), mk])]);
    el.body.appendChild(g);
    if (Object.keys(fromCore).length) el.body.appendChild(h("p", { class: "coi-hint", text: t.prefilled }));
    renderNav(); renderHead(); return hd;
  }

  function question(q, errs) {
    var id = "mat-" + q.id, fs = h("fieldset", { class: "coi-q", id: id + "-box" });
    fs.appendChild(h("legend", null, [h("span", { class: "coi-n", text: String(q.n).padStart(2, "0") }), q.t[lang]]));
    var grp = h("div", { class: "mat-scale", role: "radiogroup", "aria-describedby": id + "-e" }), cur = answers[q.id];
    D.SCALE.forEach(function (s) {
      var oid = id + "-" + s.v, inp = h("input", { type: "radio", name: id, id: oid, value: String(s.v), checked: cur === s.v });
      inp.addEventListener("change", function () { answers[q.id] = s.v; msg.textContent = ""; renderHead(); });
      grp.appendChild(h("label", { class: "coi-opt mat-lv", for: oid }, [inp, h("span", null, [h("b", { text: s.v + " · " + s.name[lang] }), h("small", { text: s.d[lang] })])]));
    });
    var nid = id + "-na", nai = h("input", { type: "radio", name: id, id: nid, value: "na", checked: cur === "na" });
    nai.addEventListener("change", function () { answers[q.id] = "na"; msg.textContent = ""; renderHead(); });
    grp.appendChild(h("label", { class: "coi-opt mat-lv na", for: nid }, [nai, h("span", null, [h("b", { text: D.NA.name[lang] })])]));
    var msg = h("p", { class: "coi-err", id: id + "-e", role: "alert", text: errs && errs[q.id] ? t.required : "" });
    fs.appendChild(grp); fs.appendChild(msg); return fs;
  }
  function renderDim(errs) {
    var dm = D.DIMS[step - 1]; el.body.innerHTML = "";
    var hd = h("h2", { class: "coi-step-t", tabindex: "-1", text: dm.name[lang] }); el.body.appendChild(hd);
    el.body.appendChild(h("p", { class: "coi-step-i", text: dm.d[lang] + " " + t.scaleHelp }));
    var sum = h("p", { class: "coi-sum-err", role: "alert", text: errs && Object.keys(errs).length ? t.fixErrors : "" }); el.body.appendChild(sum);
    dm.q.forEach(function (id) { el.body.appendChild(question(D.Q[id], errs)); });
    renderNav(); renderHead(); return hd;
  }
  function renderStep(errs) { return step === 0 ? renderContext() : renderDim(errs); }

  function renderNav() {
    el.nav.innerHTML = "";
    var back = h("button", { type: "button", class: "btn btn-ghost", text: t.back, disabled: step === 0 }); back.addEventListener("click", function () { step--; go(); });
    var next = h("button", { type: "button", class: "btn", text: step === 0 ? t.start : step === TOTAL - 1 ? t.seeProfile : t.next }); next.addEventListener("click", advance);
    el.nav.appendChild(back); el.nav.appendChild(next);
  }
  function advance() {
    if (step === 0) {
      if (Core && Core.enabled()) Core.setProfile({ org: ctx.org, sector: ctx.sector, size: ctx.size, market: ctx.market });
      step = 1; return go();
    }
    var miss = C.missingInDim(step - 1, answers);
    if (miss.length) {
      var errs = {}; miss.forEach(function (id) { errs[id] = 1; }); var hd = renderStep(errs), box = document.getElementById("mat-" + miss[0] + "-box");
      var f = box && box.querySelector("input"); (f || hd).focus(); if (box) box.scrollIntoView({ block: "center" }); return;
    }
    track("mat_step", { step: String(step) });
    if (step < TOTAL - 1) { step++; go(); } else finish();
  }
  function go() {
    var hd = renderStep(); window.scrollTo({ top: root.getBoundingClientRect().top + window.pageYOffset - 90 }); hd.focus({ preventScroll: true });
    if (!started && step > 0) { started = true; track("mat_start"); }
  }

  /* ---- Radar : six axes, 0 à 100. Les dimensions non évaluées n'ont pas de point (jamais ramenées à zéro). ---- */
  var SHORT = { strategy: "Strategy", governance: "Governance", leadership: "Leadership", operating: "Operating", performance: "Performance", technology: "Technology" };
  function radar(rep) {
    var NS = "http://www.w3.org/2000/svg", W = 520, H = 380, cx = W / 2, cy = H / 2, r = 120, n = rep.rows.length;
    function pt(i, v, k) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * (k || r) * v / 100, cy + Math.sin(a) * (k || r) * v / 100]; }
    function mk(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); return e; }
    var svg = mk("svg", { viewBox: "0 0 " + W + " " + H, class: "mat-radar", role: "img", "aria-label": t.radarLabel + " : " + rep.rows.map(function (x) { return x.name + " " + (x.score === null ? t.noScore : x.score); }).join(", ") });
    [20, 40, 60, 80, 100].forEach(function (v) { svg.appendChild(mk("polygon", { class: "ring", points: rep.rows.map(function (_, i) { return pt(i, v).join(","); }).join(" ") })); });
    rep.rows.forEach(function (x, i) { var p = pt(i, 100), l = pt(i, 100, r + 16); svg.appendChild(mk("line", { class: "axis", x1: cx, y1: cy, x2: p[0], y2: p[1] }));
      var tx = mk("text", { class: "lab", x: l[0], y: l[1] + 4, "text-anchor": l[0] < cx - 8 ? "end" : l[0] > cx + 8 ? "start" : "middle" }); tx.textContent = SHORT[x.id] || x.name; svg.appendChild(tx); });
    var pts = rep.rows.map(function (x, i) { return x.score === null ? null : pt(i, x.score); });
    var all = pts.every(function (p) { return p; });
    if (all) svg.appendChild(mk("polygon", { class: "shape", points: pts.map(function (p) { return p.join(","); }).join(" ") }));
    else { var line = pts.filter(Boolean); if (line.length > 1) svg.appendChild(mk("polygon", { class: "shape part", points: line.map(function (p) { return p.join(","); }).join(" ") })); }
    pts.forEach(function (p) { if (p) svg.appendChild(mk("circle", { class: "dot", cx: p[0], cy: p[1], r: 4 })); });
    return svg;
  }

  function reportText(rep) {
    var L = [t.title.toUpperCase(), "", rep.synthesis, ""];
    rep.rows.forEach(function (x) { L.push(x.name + " : " + (x.score === null ? t.noScore : x.score + "/100 (" + x.levelName + ")") + " · " + x.valid + "/" + x.total + " " + t.validAns); });
    L.push("", t.prioT + " :"); rep.priorities.forEach(function (p, i) { L.push((i + 1) + ". " + p.dim + " : " + p.text); });
    return L.join("\n");
  }

  function finish() {
    var rep = R.build(answers, lang), box = el.result; box.innerHTML = ""; box.hidden = false; root.hidden = true;
    var title = h("h2", { class: "coi-r-t", tabindex: "-1", text: t.title }); box.appendChild(h("p", { class: "coi-flag", text: t.flag })); box.appendChild(title); box.appendChild(h("p", { class: "coi-r-lead", text: t.lead }));
    var gl = h("div", { class: "mat-global" });
    if (rep.global !== null) { gl.appendChild(h("div", { class: "coi-card total" }, [h("h3", { text: t.global }), h("p", { class: "coi-big", text: rep.global + " / 100" }), h("p", { class: "coi-unit", text: t.level + " " + rep.level.n + " · " + rep.level.name }), h("p", { class: "coi-note", text: rep.level.d })])); }
    else gl.appendChild(h("div", { class: "coi-card na" }, [h("h3", { text: t.partialT }), h("p", { class: "coi-note", text: t.partialP })]));
    box.appendChild(gl);
    box.appendChild(h("p", { class: "mat-synth", text: rep.synthesis }));

    var viz = h("section", { class: "mat-viz" }, [h("h3", { text: t.dimsTitle })]), wrap = h("div", { class: "mat-viz-in" }); wrap.appendChild(radar(rep));
    var tbl = h("table", { class: "mat-table" }, [h("caption", { class: "sr", text: t.tableCaption })]), thead = h("thead", null, [h("tr", null, [h("th", { scope: "col", text: t.dim }), h("th", { scope: "col", text: t.score }), h("th", { scope: "col", text: t.level })])]); tbl.appendChild(thead);
    var tb = h("tbody"); rep.rows.forEach(function (x) { tb.appendChild(h("tr", null, [h("th", { scope: "row" }, [x.name, h("small", { text: x.valid + " " + t.outOf + " " + x.total + " " + t.validAns })]), h("td", { text: x.score === null ? t.noScore : x.score + (x.status === "indicative" ? " (" + t.indicative.toLowerCase() + ")" : "") }), h("td", { text: x.levelName || "" })])); }); tbl.appendChild(tb);
    wrap.appendChild(tbl); viz.appendChild(wrap); box.appendChild(viz);

    function listSec(title, items) { var s = h("section", { class: "coi-syn" }, [h("h3", { text: title })]), ul = h("ul"); items.forEach(function (x) { ul.appendChild(h("li", { text: x })); }); s.appendChild(ul); return s; }
    var st = rep.strengthDims.length ? rep.strengthDims.map(function (d) { return d.name + " (" + d.score + " / 100)"; }) : [t.noStrengths].concat(rep.strengthItems.slice(0, 3).map(function (x) { return x.dim + " : " + x.text + " (" + x.a.toLowerCase() + ")"; }));
    box.appendChild(listSec(t.strengthsT, st));
    box.appendChild(listSec(t.attentionT, rep.attention.length ? rep.attention.map(function (a) { return a.name + " (" + a.score + " / 100" + (a.indicative ? ", " + t.indicative.toLowerCase() : "") + ")"; }) : [t.noAttention]));
    var pr = h("section", { class: "coi-syn" }, [h("h3", { text: t.prioT })]), ol = h("ol", { class: "mat-prio" });
    rep.priorities.forEach(function (p) { ol.appendChild(h("li", null, [h("b", { text: p.dim }), h("span", { text: p.text + " " + t.current + " : " + p.current.toLowerCase() + "." + (p.indicative ? " (" + t.indicative.toLowerCase() + ")" : "") })])); }); pr.appendChild(ol); box.appendChild(pr);
    var ip = h("section", { class: "coi-syn" }, [h("h3", { text: t.interpT })]); rep.interp.forEach(function (x) { ip.appendChild(h("h4", { text: x.name })); ip.appendChild(h("p", { class: "mat-ip", text: x.text })); }); box.appendChild(ip);
    box.appendChild(listSec(t.limitsT, t.limits));

    var cta = document.getElementById("mat-cta"); if (cta) { cta.hidden = false; box.appendChild(cta); }
    var again = h("button", { type: "button", class: "link", text: t.restart });
    again.addEventListener("click", function () { box.hidden = true; root.hidden = false; var c = document.getElementById("mat-cta"); if (c) c.hidden = true; step = 0; go(); });
    box.appendChild(h("p", { class: "coi-again" }, [again]));
    var pv = document.getElementById("mat-priv"); if (pv) box.appendChild(pv);
    window.MATLast = { rep: rep, text: reportText(rep) }; box.dataset.ready = "1"; idemKey = Core ? Core.newKey() : String(Date.now());
    if (Core && Core.enabled()) { Core.record("maturity", { version: D.VERSION, headline: rep.global !== null ? rep.level.name + " · " + rep.global + "/100" : t.partialT, score: rep.global, level: rep.level ? String(rep.level.n) : "" }); var cp = document.getElementById("core-panel"); if (cp) cp.dispatchEvent(new Event("core:refresh")); }
    track("mat_result", { complete: rep.res.complete ? "1" : "0" });
    window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 90 }); title.focus({ preventScroll: true });
    wireSend();
  }

  function wireSend() {
    var form = document.getElementById("mat-send"); if (!form || form.dataset.wired) return; form.dataset.wired = "1";
    var status = document.getElementById("mat-send-status"), btn = form.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); status.textContent = "";
      var d = new FormData(form), email = String(d.get("email") || "").trim(), name = String(d.get("name") || "").trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = form.dataset.invalid; return; }
      if (!form.querySelector("[name=consent]").checked) { status.textContent = form.dataset.noconsent; return; }
      var last = window.MATLast, rep = last.rep; btn.disabled = true; status.textContent = form.dataset.sending;
      var ind = { global: rep.global, level: rep.level ? rep.level.n : null }; rep.rows.forEach(function (x) { ind[x.id] = x.score; });
      var body = { tool: "maturity", version: D.VERSION, lang: lang, name: name, email: email, company: String(d.get("company") || "").trim() || ctx.org, consent: true, website: String(d.get("website") || ""), elapsed: Date.now() - startedAt,
                   answers: Object.assign({}, answers, { ctxSector: ctx.sector, ctxSize: ctx.size, ctxMarket: ctx.market }), indicators: ind, report: last.text, confidence: rep.res.complete ? "complete" : "partial",
                   consent_text_id: form.getAttribute("data-consent") || "", idempotency_key: idemKey, profile: (Core && Core.enabled() && Core.remote()) || undefined, context: { sector: ctx.sector, size: ctx.size, market: ctx.market },
                   summary: { headline: rep.global !== null ? rep.level.name + " · " + rep.global + "/100" : t.partialT, score: rep.global, level: rep.level ? String(rep.level.n) : "", completeness: rep.res.complete ? "complete" : "partial" } };
      fetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) { if (Core && Core.enabled() && x.j && x.j.resume_token) { Core.setRemote(x.j.profile_id, x.j.resume_token); var cp2 = document.getElementById("core-panel"); if (cp2) cp2.dispatchEvent(new Event("core:refresh")); } status.textContent = form.dataset.sent; form.querySelectorAll("input,button").forEach(function (n) { n.disabled = true; }); track("mat_send"); } else { btn.disabled = false; status.textContent = form.dataset.fail; } })
        .catch(function () { btn.disabled = false; status.textContent = form.dataset.fail; });
    });
  }
  go(); root.setAttribute("data-ready", "");
})();
