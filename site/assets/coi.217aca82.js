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

;
/* MAIORIS Creative Operations Intelligence™ : moteur de calcul et validations.
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

;
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

;
/* MAIORIS Creative Operations Intelligence™ : interface. Les réponses restent en mémoire de la page, rien n'est stocké ni envoyé
   sans action explicite de l'utilisateur (envoi facultatif avec consentement). */
(function () {
  "use strict";
  var D = window.COIData, C = window.COICalc, R = window.COIReport;
  var root = document.getElementById("coi"); if (!root) return;
  var lang = root.getAttribute("data-lang") === "en" ? "en" : "fr", t = R.T[lang];
  var answers = {}, stepIdx = 0, mode = "form", startedAt = Date.now(), started = false, idemKey = null;
  D.Q.weeks && (answers.weeks = D.Q.weeks.init);
  var Core = window.MaiorisCore;
  if (Core && Core.enabled()) { var kn = Core.known(["sector", "size"]); if (kn.sector) answers.sector = kn.sector; if (kn.size) answers.size = kn.size; }
  var el = { head: root.querySelector("[data-coi-head]"), body: root.querySelector("[data-coi-body]"), nav: root.querySelector("[data-coi-nav]"), result: document.getElementById("coi-result") };

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function track(name, props) { try { if (window.plausible) window.plausible(name, { props: props || {} }); } catch (e) {} }

  function renderHead() {
    var pct = C.progress(answers, lang), s = D.STEPS[stepIdx];
    var label = mode === "form" ? t.step + " " + (stepIdx + 1) + " " + t.of + " " + D.STEPS.length + " · " + s.t[lang] : t.recapTitle;
    el.head.innerHTML = "";
    el.head.appendChild(h("div", { class: "coi-prog-row" }, [h("p", { class: "coi-prog-l", text: label }), h("p", { class: "coi-prog-p", text: pct + " % " + t.done })]));
    el.head.appendChild(h("div", { class: "coi-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": label }, [h("span", { style: "width:" + pct + "%" })]));
    var ol = h("ol", { class: "coi-dots", "aria-hidden": "true" });
    D.STEPS.forEach(function (_, i) { ol.appendChild(h("li", { class: i < stepIdx || mode !== "form" ? "on" : i === stepIdx ? "cur" : "" })); });
    el.head.appendChild(ol);
  }

  function errText(code) { return t.errors[code] || t.errors.invalid; }

  function field(q, errs, warns) {
    var id = "q-" + q.id, fs = h("fieldset", { class: "coi-q", id: id + "-box" });
    var lg = h("legend", null, [h("span", { class: "coi-n", text: String(q.n).padStart(2, "0") }), q.l[lang], q.req ? "" : h("em", { text: " (" + t.optional + ")" })]);
    fs.appendChild(lg);
    var desc = [];
    if (q.d) { fs.appendChild(h("p", { class: "coi-hint", id: id + "-d", text: q.d[lang] })); desc.push(id + "-d"); }
    var errId = id + "-e", msg = h("p", { class: "coi-err", id: errId, role: "alert" });
    if (errs[q.id]) msg.textContent = errText(errs[q.id]);
    var warnP = h("p", { class: "coi-warn", id: id + "-w" });
    if (warns[q.id]) warnP.textContent = t.warns[warns[q.id]];

    if (q.type === "money" || q.type === "number") {
      var inp = h("input", { id: id, type: "text", inputmode: q.int ? "numeric" : "decimal", autocomplete: "off", placeholder: q.ph ? q.ph[lang] : false, value: answers[q.id] || "",
        "aria-describedby": desc.concat([errId, id + "-w"]).join(" "), "aria-invalid": errs[q.id] ? "true" : false, "aria-required": q.req ? "true" : false });
      inp.addEventListener("input", function () { answers[q.id] = inp.value; softUpdate(q, inp, msg, warnP); });
      inp.addEventListener("blur", function () { if (q.type === "money") { var n = C.parseNumber(inp.value, lang); if (n !== null && !isNaN(n)) { inp.value = C.formatNumber(n, lang); answers[q.id] = inp.value; } } });
      fs.appendChild(h("div", { class: "coi-in" }, [inp, h("span", { text: q.type === "money" ? "FCFA" : q.unit ? q.unit[lang] : "" })]));
    } else if (q.type === "single") {
      var grp = h("div", { class: "coi-opts", role: "radiogroup", "aria-describedby": desc.concat([errId]).join(" ") });
      q.opts.forEach(function (o, i) {
        var oid = id + "-" + o.id, inp2 = h("input", { type: "radio", name: id, id: oid, value: o.id, checked: answers[q.id] === o.id });
        inp2.addEventListener("change", function () { answers[q.id] = o.id; msg.textContent = ""; renderHead(); });
        grp.appendChild(h("label", { class: "coi-opt", for: oid }, [inp2, h("span", { text: o.l[lang] })]));
      });
      fs.appendChild(grp);
    } else if (q.type === "multi") {
      var cur = answers[q.id] || [], grp2 = h("div", { class: "coi-opts", role: "group", "aria-describedby": desc.concat([errId]).join(" ") }), mainBox = h("div", { class: "coi-main", id: id + "-main" });
      function drawMain() {
        mainBox.innerHTML = "";
        var sel = answers[q.id] || [];
        if (!q.main || sel.length < 2) { if (sel.length < 2) answers[q.id + "Main"] = ""; return; }
        if (sel.indexOf(answers[q.id + "Main"]) < 0) answers[q.id + "Main"] = "";
        var g = h("fieldset", { class: "coi-mainset" }, [h("legend", { text: t.mainPick })]);
        sel.forEach(function (sid) {
          var mid = id + "-m-" + sid, r = h("input", { type: "radio", name: id + "-main", id: mid, value: sid, checked: answers[q.id + "Main"] === sid });
          r.addEventListener("change", function () { answers[q.id + "Main"] = sid; msg.textContent = ""; });
          g.appendChild(h("label", { class: "coi-opt sm", for: mid }, [r, h("span", { text: R.label(q.id, sid, lang) })]));
        });
        mainBox.appendChild(g);
      }
      q.opts.forEach(function (o) {
        var oid = id + "-" + o.id, cb = h("input", { type: "checkbox", id: oid, value: o.id, checked: cur.indexOf(o.id) >= 0 });
        cb.addEventListener("change", function () {
          var sel = (answers[q.id] || []).slice(), ix = sel.indexOf(o.id);
          if (cb.checked) {
            if (q.exclusive && q.exclusive.indexOf(o.id) >= 0) sel = [o.id];
            else { if (q.exclusive) sel = sel.filter(function (x) { return q.exclusive.indexOf(x) < 0; }); if (ix < 0) sel.push(o.id); }
            if (q.max && sel.length > q.max) { cb.checked = false; sel = sel.filter(function (x) { return x !== o.id; }); msg.textContent = t.maxReached; refreshChecks(); return; }
          } else if (ix >= 0) sel.splice(ix, 1);
          answers[q.id] = sel; msg.textContent = ""; refreshChecks(); drawMain(); renderHead();
        });
        grp2.appendChild(h("label", { class: "coi-opt", for: oid }, [cb, h("span", { text: o.l[lang] })]));
      });
      function refreshChecks() { var sel = answers[q.id] || []; q.opts.forEach(function (o) { var b = document.getElementById(id + "-" + o.id); if (b) b.checked = sel.indexOf(o.id) >= 0; }); }
      fs.appendChild(grp2); fs.appendChild(mainBox); drawMain();
    }
    fs.appendChild(warnP); fs.appendChild(msg);
    return fs;
  }

  function softUpdate(q, inp, msg, warnP) {
    var r = C.checkNumber(q.id, inp.value, lang);
    if (r.state === "error" && r.error !== "required") { msg.textContent = errText(r.error); inp.setAttribute("aria-invalid", "true"); }
    else { msg.textContent = ""; inp.removeAttribute("aria-invalid"); }
    warnP.textContent = r.warn ? t.warns[r.warn] : ""; renderHead();
  }

  function renderStep(errs, warns) {
    errs = errs || {}; warns = warns || {};
    var s = D.STEPS[stepIdx];
    el.body.innerHTML = "";
    var hd = h("h2", { class: "coi-step-t", tabindex: "-1", text: s.t[lang] });
    el.body.appendChild(hd); el.body.appendChild(h("p", { class: "coi-step-i", text: s.i[lang] }));
    var sum = h("p", { class: "coi-sum-err", id: "coi-sum-err", role: "alert" });
    if (Object.keys(errs).length) sum.textContent = t.fixErrors;
    el.body.appendChild(sum);
    s.q.forEach(function (qid) { el.body.appendChild(field(D.Q[qid], errs, warns)); });
    renderNav(); renderHead();
    return hd;
  }

  function renderNav() {
    el.nav.innerHTML = "";
    var back = h("button", { type: "button", class: "btn btn-ghost", text: t.back, disabled: mode === "form" && stepIdx === 0 });
    back.addEventListener("click", function () { if (mode === "recap") { mode = "form"; stepIdx = D.STEPS.length - 1; go(); } else if (stepIdx > 0) { stepIdx--; go(); } });
    var next = h("button", { type: "button", class: "btn", text: mode === "recap" ? t.compute : stepIdx === D.STEPS.length - 1 ? t.recapBtn : t.next });
    next.addEventListener("click", function () { if (mode === "recap") finish(); else advance(); });
    el.nav.appendChild(back); el.nav.appendChild(next);
  }

  function advance() {
    var v = C.validateStep(stepIdx, answers, lang);
    if (Object.keys(v.errors).length) {
      var hd = renderStep(v.errors, v.warnings), first = D.STEPS[stepIdx].q.filter(function (id) { return v.errors[id]; })[0], box = document.getElementById("q-" + first + "-box");
      var f = box && box.querySelector("input"); (f || hd).focus(); if (box) box.scrollIntoView({ block: "center" }); return;
    }
    if (stepIdx === 0 && Core && Core.enabled()) Core.setProfile({ sector: answers.sector, size: answers.size });
    track("coi_step", { step: String(stepIdx + 1) });
    if (stepIdx < D.STEPS.length - 1) { stepIdx++; go(); } else { mode = "recap"; renderRecap(); }
  }

  function go() {
    var hd = renderStep(); window.scrollTo({ top: root.getBoundingClientRect().top + window.pageYOffset - 90, behavior: "auto" }); hd.focus({ preventScroll: true });
    if (!started) { started = true; track("coi_start"); }
  }

  function valueText(q) {
    var v = answers[q.id];
    if (q.type === "single") return R.label(q.id, v, lang) || t.notAnswered;
    if (q.type === "multi") { var arr = R.labels(q.id, v, lang); if (!arr.length) return t.notAnswered; if (q.main && arr.length > 1 && answers[q.id + "Main"]) arr = arr.map(function (x) { return x === R.label(q.id, answers[q.id + "Main"], lang) ? x + " (" + (lang === "en" ? "main" : "principal") + ")" : x; }); return arr.join(", "); }
    var n = C.parseNumber(v, lang); if (n === null || isNaN(n)) return t.notAnswered;
    return q.type === "money" ? C.formatMoney(n, lang) : C.formatNumber(n, lang) + (q.unit ? " " + q.unit[lang] : "");
  }

  function renderRecap() {
    renderHead(); el.body.innerHTML = "";
    var hd = h("h2", { class: "coi-step-t", tabindex: "-1", text: t.recapTitle }); el.body.appendChild(hd); el.body.appendChild(h("p", { class: "coi-step-i", text: t.recapIntro }));
    D.STEPS.forEach(function (s, i) {
      var sec = h("section", { class: "coi-rc" }), top = h("div", { class: "coi-rc-h" }, [h("h3", { text: s.t[lang] })]);
      var b = h("button", { type: "button", class: "link", text: t.edit }); b.setAttribute("aria-label", t.edit + " : " + s.t[lang]);
      b.addEventListener("click", function () { mode = "form"; stepIdx = i; go(); }); top.appendChild(b); sec.appendChild(top);
      var dl = h("dl"); s.q.forEach(function (qid) { var q = D.Q[qid]; dl.appendChild(h("div", null, [h("dt", { text: q.l[lang] }), h("dd", { text: valueText(q) })])); }); sec.appendChild(dl); el.body.appendChild(sec);
    });
    renderNav(); hd.focus({ preventScroll: true }); root.scrollIntoView();
  }

  function finish() {
    var rep = R.build(answers, lang);
    if (Object.keys(rep.errors).length) { mode = "form"; stepIdx = 0; go(); return; }
    track("coi_result"); renderResult(rep);
    if (Core && Core.enabled()) { var tot = rep.indicators.filter(function (i) { return i.id === "total"; })[0]; Core.record("coi", { version: D.VERSION, headline: tot && tot.ok ? tot.mid + " " + (lang === "fr" ? "par an (valeur centrale)" : "per year (central value)") : (lang === "fr" ? "Estimation partielle" : "Partial estimate"), level: rep.profile.confidence.level }); var cp = document.getElementById("core-panel"); if (cp) cp.dispatchEvent(new Event("core:refresh")); }
  }

  function renderResult(rep) {
    var box = el.result; box.innerHTML = ""; box.hidden = false; root.hidden = true;
    var title = h("h2", { class: "coi-r-t", tabindex: "-1", text: t.resultTitle });
    box.appendChild(h("p", { class: "coi-flag", text: t.flag })); box.appendChild(title); box.appendChild(h("p", { class: "coi-r-lead", text: t.resultLead }));
    var grid = h("div", { class: "coi-ind" });
    rep.indicators.forEach(function (i) {
      var card = h("article", { class: "coi-card" + (i.id === "total" ? " total" : "") + (i.ok ? "" : " na") }, [h("h3", { text: i.label })]);
      if (i.ok) {
        card.appendChild(h("p", { class: "coi-big", text: i.mid + (i.kind === "hours" ? "" : "") }));
        card.appendChild(h("p", { class: "coi-unit", text: t.central + " · " + i.unit }));
        card.appendChild(h("p", { class: "coi-range", text: t.between + " " + i.lo + " " + t.and + " " + i.hi }));
      }
      if (i.note) card.appendChild(h("p", { class: "coi-note", text: i.note }));
      grid.appendChild(card);
    });
    box.appendChild(grid);
    var pf = h("section", { class: "coi-prof" }, [h("h3", { text: t.profileTitle })]), dl = h("dl");
    rep.profileRows.forEach(function (r) { var dd = h("dd", null, [r.v]); if (r.why) dd.appendChild(h("small", { text: r.why })); dl.appendChild(h("div", null, [h("dt", { text: r.k }), dd])); });
    pf.appendChild(dl); box.appendChild(pf);
    var sy = h("section", { class: "coi-syn" }, [h("h3", { text: t.synthTitle })]);
    [["declared", t.gDeclared], ["estimated", t.gEstimated], ["verify", t.gVerify]].forEach(function (g) {
      var arr = rep.synthesis[g[0]]; if (!arr.length) return;
      var ul = h("ul"); arr.forEach(function (s) { ul.appendChild(h("li", { text: s })); }); sy.appendChild(h("h4", { text: g[1] })); sy.appendChild(ul);
    });
    box.appendChild(sy);
    var cta = document.getElementById("coi-cta"); if (cta) { cta.hidden = false; box.appendChild(cta); }
    var again = h("button", { type: "button", class: "link", text: t.restart });
    again.addEventListener("click", function () { box.hidden = true; root.hidden = false; var pv2 = document.getElementById("coi-priv"); if (pv2) root.parentNode.insertBefore(pv2, root); var c = document.getElementById("coi-cta"); if (c) c.hidden = true; mode = "form"; stepIdx = 0; go(); });
    box.appendChild(h("p", { class: "coi-again" }, [again]));
    var pv = document.getElementById("coi-priv"); if (pv) box.appendChild(pv);
    window.COILast = rep; box.dataset.ready = "1"; idemKey = (window.MaiorisCore || { newKey: function () { return String(Date.now()); } }).newKey();
    window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 90 }); title.focus({ preventScroll: true });
    wireSend(rep);
  }

  /* Envoi facultatif : uniquement après action explicite et consentement coché. */
  function wireSend(rep) {
    var form = document.getElementById("coi-send"); if (!form || form.dataset.wired) return; form.dataset.wired = "1";
    var status = document.getElementById("coi-send-status"), btn = form.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); status.textContent = "";
      var d = new FormData(form), email = String(d.get("email") || "").trim(), name = String(d.get("name") || "").trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = form.dataset.invalid; return; }
      if (!form.querySelector("[name=consent]").checked) { status.textContent = form.dataset.noconsent; return; }
      var last = window.COILast || rep; btn.disabled = true; status.textContent = form.dataset.sending;
      var ind = {}; last.indicators.forEach(function (i) { ind[i.id] = i.ok ? { lo: i.lo, mid: i.mid, hi: i.hi, lo_n: i.lo_n, mid_n: i.mid_n, hi_n: i.hi_n } : null; });
      var tot = last.indicators.filter(function (i) { return i.id === "total"; })[0];
      var body = { tool: "coi", version: D.VERSION, lang: lang, name: name, email: email, company: String(d.get("company") || "").trim(), consent: true, website: String(d.get("website") || ""), elapsed: Date.now() - startedAt,
                   answers: answers, indicators: ind, confidence: last.profile.confidence.level, consent_text_id: form.getAttribute("data-consent") || "", idempotency_key: idemKey,
                   profile: (Core && Core.enabled() && Core.remote()) || undefined, context: { sector: answers.sector, size: answers.size },
                   summary: { headline: tot && tot.ok ? tot.mid : "", completeness: tot && tot.ok ? "complete" : "partial", level: last.profile.confidence.level } };
      fetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) { if (Core && Core.enabled() && x.j && x.j.resume_token) { Core.setRemote(x.j.profile_id, x.j.resume_token); var cp2 = document.getElementById("core-panel"); if (cp2) cp2.dispatchEvent(new Event("core:refresh")); } status.textContent = form.dataset.sent; form.querySelectorAll("input,button").forEach(function (n) { n.disabled = true; }); track("coi_send"); } else { btn.disabled = false; status.textContent = form.dataset.fail; } })
        .catch(function () { btn.disabled = false; status.textContent = form.dataset.fail; });
    });
  }

  go(); root.setAttribute("data-ready", "");
})();
