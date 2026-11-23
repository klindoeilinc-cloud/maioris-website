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

;
/* MAIORIS Brand Consistency Review™ : règles d'évaluation guidée. Fonctions pures, sans DOM.

   Aucun fichier n'est lu ni analysé : validateFile() ne contrôle que le nom, la taille et le type déclaré.
   Un constat « observé » (conforme, partiellement conforme, non conforme) n'est retenu que s'il cite un support du registre ET décrit un fait observé.
   Indice de cohérence observée d'une dimension = moyenne des constats observés (conforme 1, partiel 0,5, non conforme 0) x 100.
   Il n'est produit que si la dimension est suffisamment documentée : au moins 3 critères observés, au moins 2 supports distincts, au moins la moitié des critères applicables observés ;
   pour Creative Distinctiveness, au moins un constat doit s'appuyer sur une référence concurrentielle. Aucun score global n'est calculé. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./data.js"));
  else root.BRCalc = factory(root.BRData);
})(typeof self !== "undefined" ? self : this, function (D) {
  "use strict";
  var STAT = {}; D.STATUS.forEach(function (s) { STAT[s.id] = s; });

  function ext(name) { var m = /\.([A-Za-z0-9]+)$/.exec(String(name || "")); return m ? m[1].toLowerCase() : ""; }

  /** Contrôle d'un fichier choisi : {ok, error} avec error parmi empty, format, size, mime. Rien n'est lu. */
  function validateFile(f) {
    if (!f || !f.name) return { ok: false, error: "empty" };
    var e = ext(f.name);
    if (D.LIMITS.formats.indexOf(e) < 0) return { ok: false, error: "format" };
    if (f.type && D.LIMITS.mime.indexOf(f.type) < 0) return { ok: false, error: "mime" };
    if (!(f.size > 0)) return { ok: false, error: "empty" };
    if (f.size > D.LIMITS.maxFileBytes) return { ok: false, error: "size" };
    return { ok: true, ext: e };
  }

  /** Lien public : http ou https, sans identifiants, hors adresses locales ou privées. */
  function validateLink(raw) {
    var s = String(raw || "").trim(), u;
    if (!s) return { ok: false, error: "empty" };
    try { u = new URL(s); } catch (e) { return { ok: false, error: "invalid" }; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "protocol" };
    if (u.username || u.password) return { ok: false, error: "invalid" };
    var h = u.hostname.toLowerCase();
    if (!h.includes(".") && !/^\[/.test(h) || h === "localhost" || /\.local$|\.internal$/.test(h)) return { ok: false, error: "private" };
    if (/^\[/.test(h) || /^(10\.|127\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return { ok: false, error: "private" };
    return { ok: true, url: u.href };
  }

  /** Ajoute un support au registre après validation. Retourne {ok, supports, error, support}. */
  function addSupport(list, s) {
    list = list || [];
    if (list.length >= D.LIMITS.maxSupports) return { ok: false, error: "max", supports: list };
    var cat = D.CATS.filter(function (c) { return c.id === s.cat; })[0];
    if (!cat || !cat.kinds.some(function (k) { return k[0] === s.kind; })) return { ok: false, error: "kind", supports: list };
    var title = String(s.title || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120);
    if (!title) return { ok: false, error: "title", supports: list };
    var rec = { id: "S" + (list.reduce(function (m, x) { return Math.max(m, +x.id.slice(1)); }, 0) + 1), cat: s.cat, kind: s.kind, title: title, note: String(s.note || "").trim().slice(0, 300) };
    if (s.source === "link") { var l = validateLink(s.url); if (!l.ok) return { ok: false, error: "link_" + l.error, supports: list }; rec.source = "link"; rec.url = l.url; }
    else { var f = validateFile(s.file); if (!f.ok) return { ok: false, error: "file_" + f.error, supports: list }; rec.source = "file"; rec.fileName = String(s.file.name).slice(0, 160); rec.size = s.file.size; rec.ext = f.ext; }
    return { ok: true, support: rec, supports: list.concat([rec]) };
  }
  function removeSupport(list, id, reviews) {
    var next = (list || []).filter(function (x) { return x.id !== id; });
    var rev = {}; Object.keys(reviews || {}).forEach(function (k) { var r = reviews[k]; rev[k] = r && r.doc === id ? Object.assign({}, r, { doc: "" }) : r; });
    return { supports: next, reviews: rev };
  }

  function validateProfile(p) {
    var errs = {}; p = p || {};
    D.PROFILE.forEach(function (f) {
      var v = p[f.id];
      if (f.req && (f.type === "multi" ? !(Array.isArray(v) && v.length) : !String(v || "").trim())) errs[f.id] = "required";
      else if (f.type === "select" && v && !f.opts.some(function (o) { return o.id === v; })) errs[f.id] = "invalid";
    });
    return errs;
  }

  /** État d'un critère : unanswered | incomplete | observed | not_observed | na, avec erreurs de preuve éventuelles. */
  function criterion(entry, supports) {
    if (!entry || !STAT[entry.status]) return { state: "unanswered", errors: { status: "required" } };
    var st = STAT[entry.status];
    if (!st.observed) return { state: entry.status === "na" ? "na" : "not_observed", errors: {} };
    var errs = {};
    if (!entry.doc || !(supports || []).some(function (s) { return s.id === entry.doc; })) errs.doc = "required";
    if (String(entry.fact || "").trim().length < D.LIMITS.minFact) errs.fact = "required";
    return Object.keys(errs).length ? { state: "incomplete", errors: errs } : { state: "observed", errors: {}, w: st.w };
  }

  function dimension(dim, reviews, supports) {
    var obs = [], na = 0, notObs = 0, un = 0, inc = 0, docs = {}, comp = false;
    dim.c.forEach(function (c) {
      var r = criterion((reviews || {})[c.id], supports);
      if (r.state === "observed") { obs.push({ id: c.id, status: reviews[c.id].status, w: r.w }); docs[reviews[c.id].doc] = 1; var sp = supports.filter(function (s) { return s.id === reviews[c.id].doc; })[0]; if (sp && sp.cat === "D") comp = true; }
      else if (r.state === "na") na++; else if (r.state === "not_observed") notObs++; else if (r.state === "incomplete") inc++; else un++;
    });
    var applicable = dim.c.length - na, distinct = Object.keys(docs).length, reasons = [];
    if (obs.length < D.RULES.minObserved) reasons.push("few_observed");
    if (distinct < D.RULES.minDistinctSupports) reasons.push("few_supports");
    if (applicable > 0 && obs.length / applicable < D.RULES.minShareOfApplicable) reasons.push("low_share");
    if (applicable === 0) reasons.push("not_applicable");
    if (dim.needsCompetitor && !comp) reasons.push("no_competitor");
    var scored = reasons.length === 0, index = scored ? obs.reduce(function (a, x) { return a + x.w; }, 0) / obs.length * 100 : null;
    return { id: dim.id, total: dim.c.length, applicable: applicable, observed: obs.length, notObservable: notObs, na: na, incomplete: inc, unanswered: un, distinctSupports: distinct, hasCompetitor: comp,
             scored: scored, index: index, band: index === null ? null : index >= 80 ? "high" : index >= 50 ? "partial" : "low", reasons: reasons, observedList: obs };
  }

  function compute(reviews, supports) {
    supports = supports || [];
    var dims = D.DIMS.map(function (d) { return dimension(d, reviews || {}, supports); });
    var perCat = {}; D.CATS.forEach(function (c) { perCat[c.id] = supports.filter(function (s) { return s.cat === c.id; }).length; });
    return { dims: dims, scoredCount: dims.filter(function (d) { return d.scored; }).length, perCat: perCat, emptyCats: D.CATS.filter(function (c) { return !perCat[c.id]; }).map(function (c) { return c.id; }),
             singleSupport: supports.length === 1, supportCount: supports.length };
  }

  /** Erreurs d'une étape de dimension : chaque critère doit avoir un statut ; un constat observé exige support et fait. */
  function validateDim(dimIdx, reviews, supports) {
    var errs = {}; D.DIMS[dimIdx].c.forEach(function (c) { var r = criterion((reviews || {})[c.id], supports); if (r.state === "unanswered" || r.state === "incomplete") errs[c.id] = r.errors; });
    return errs;
  }

  /** Registre des preuves : un constat par ligne, avec distinction entre fait observé, interprétation et hypothèse à vérifier. */
  function register(reviews, supports) {
    var rows = [];
    D.ORDER.forEach(function (id) {
      var e = (reviews || {})[id]; if (!e || !STAT[e.status]) return;
      var c = D.CRITERIA[id], r = criterion(e, supports), sp = (supports || []).filter(function (s) { return s.id === e.doc; })[0];
      rows.push({ id: id, dim: c.dim, status: e.status, valid: r.state === "observed" || !STAT[e.status].observed,
                  support: STAT[e.status].observed && sp ? sp : null, loc: String(e.loc || "").trim().slice(0, 160), fact: String(e.fact || "").trim().slice(0, D.LIMITS.maxText),
                  interp: String(e.interp || "").trim().slice(0, D.LIMITS.maxText), hypo: String(e.hypo || "").trim().slice(0, D.LIMITS.maxText) });
    });
    return rows;
  }

  return { validateFile: validateFile, validateLink: validateLink, addSupport: addSupport, removeSupport: removeSupport, validateProfile: validateProfile, criterion: criterion, dimension: dimension, compute: compute, validateDim: validateDim, register: register };
});

;
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

;
/* MAIORIS Brand Consistency Review™ : interface de revue guidée. Aucun fichier n'est lu, analysé ni envoyé : seuls le nom, la taille et le type sont contrôlés. */
(function () {
  "use strict";
  var D = window.BRData, C = window.BRCalc, R = window.BRReport, Core = window.MaiorisCore;
  var root = document.getElementById("brand"); if (!root) return;
  var lang = root.getAttribute("data-lang") === "en" ? "en" : "fr", t = R.T[lang];
  var state = { profile: { channels: [] }, supports: [], reviews: {} }, step = 0, started = false, startedAt = Date.now(), fromCore = false, idemKey = null;
  var TOTAL = 2 + D.DIMS.length;
  var el = { head: root.querySelector("[data-head]"), body: root.querySelector("[data-body]"), nav: root.querySelector("[data-nav]"), result: document.getElementById("brand-result") };

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function track(n, p) { try { if (window.plausible) window.plausible(n, { props: p || {} }); } catch (e) {} }
  function stepOk(i) {
    if (i === 0) return Object.keys(C.validateProfile(state.profile)).length === 0;
    if (i === 1) return state.supports.length > 0;
    return Object.keys(C.validateDim(i - 2, state.reviews, state.supports)).length === 0;
  }
  function pct() { var n = 0; for (var i = 0; i < TOTAL; i++) if (stepOk(i)) n++; return Math.round(n / TOTAL * 100); }
  function stepTitle(i) { return i === 0 ? t.profileT : i === 1 ? t.supportsT : D.DIMS[i - 2].name[lang]; }

  if (Core && Core.enabled()) { var kn = Core.known(["sector", "market"]); if (kn.sector) { state.profile.sector = kn.sector; fromCore = true; } if (kn.market) { state.profile.market = kn.market; fromCore = true; } }

  function renderHead() {
    var p = pct(), label = t.step + " " + (step + 1) + " " + t.of + " " + TOTAL + " · " + stepTitle(step);
    el.head.innerHTML = "";
    el.head.appendChild(h("div", { class: "coi-prog-row" }, [h("p", { class: "coi-prog-l", text: label }), h("p", { class: "coi-prog-p", text: p + " % " + t.done })]));
    el.head.appendChild(h("div", { class: "coi-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p), "aria-label": label }, [h("span", { style: "width:" + p + "%" })]));
    var ol = h("ol", { class: "coi-dots", "aria-hidden": "true" }); for (var i = 0; i < TOTAL; i++) ol.appendChild(h("li", { class: i < step ? "on" : i === step ? "cur" : "" })); el.head.appendChild(ol);
  }
  function titleBlock(title, intro) { el.body.innerHTML = ""; var hd = h("h2", { class: "coi-step-t", tabindex: "-1", text: title }); el.body.appendChild(hd); el.body.appendChild(h("p", { class: "coi-step-i", text: intro })); return hd; }

  /* ---- Étape 1 : profil ---- */
  function renderProfile(errs) {
    errs = errs || {}; var hd = titleBlock(t.profileT, t.profileI);
    el.body.appendChild(h("p", { class: "coi-sum-err", role: "alert", id: "br-sum", text: Object.keys(errs).length ? t.fixErrors : "" }));
    var grid = h("div", { class: "br-grid" });
    D.PROFILE.forEach(function (f, n) {
      var id = "br-p-" + f.id, box = h("div", { class: "mat-f" + (f.type === "textarea" || f.type === "multi" ? " wide" : "") }), lab = (n + 1) + ". " + f.l[lang] + (f.req ? "" : " (" + t.optional + ")"), input;
      var err = h("p", { class: "coi-err", id: id + "-e", role: "alert", text: errs[f.id] ? (errs[f.id] === "invalid" ? t.invalid : t.required) : "" });
      if (f.type === "multi") {
        var fs = h("fieldset", { class: "coi-q", id: id }), g = h("div", { class: "coi-opts" }); fs.appendChild(h("legend", null, [lab]));
        f.opts.forEach(function (o) { var cb = h("input", { type: "checkbox", id: id + "-" + o.id, value: o.id, checked: (state.profile.channels || []).indexOf(o.id) >= 0 });
          cb.addEventListener("change", function () { var a = (state.profile.channels || []).slice(), i = a.indexOf(o.id); if (cb.checked && i < 0) a.push(o.id); if (!cb.checked && i >= 0) a.splice(i, 1); state.profile.channels = a; err.textContent = ""; renderHead(); });
          g.appendChild(h("label", { class: "coi-opt sm", for: id + "-" + o.id }, [cb, h("span", { text: o.l[lang] })])); });
        fs.appendChild(g); fs.appendChild(err); box.appendChild(fs); grid.appendChild(box); return;
      }
      box.appendChild(h("label", { for: id, text: lab }));
      if (f.d) box.appendChild(h("p", { class: "coi-hint", id: id + "-d", text: f.d[lang] }));
      if (f.type === "select") { input = h("select", { id: id }); input.appendChild(h("option", { value: "", text: t.choose })); f.opts.forEach(function (o) { var op = h("option", { value: o.id, text: o.l[lang] }); if (state.profile[f.id] === o.id) op.selected = true; input.appendChild(op); }); }
      else if (f.type === "textarea") input = h("textarea", { id: id, rows: "3", maxlength: "600" }, [state.profile[f.id] || ""]);
      else input = h("input", { id: id, type: "text", maxlength: "200", value: state.profile[f.id] || "" });
      input.setAttribute("aria-describedby", (f.d ? id + "-d " : "") + id + "-e"); if (errs[f.id]) input.setAttribute("aria-invalid", "true"); if (f.req) input.setAttribute("aria-required", "true");
      var ev = f.type === "select" ? "change" : "input"; input.addEventListener(ev, function () { state.profile[f.id] = input.value; err.textContent = ""; input.removeAttribute("aria-invalid"); renderHead(); });
      box.appendChild(input); box.appendChild(err); grid.appendChild(box);
    });
    el.body.appendChild(grid);
    if (fromCore) el.body.appendChild(h("p", { class: "coi-hint", text: lang === "fr" ? "Secteur et marché repris de votre profil commun." : "Sector and market taken from your shared profile." }));
    renderNav(); renderHead(); return hd;
  }

  /* ---- Étape 2 : registre des supports (aucun fichier lu) ---- */
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + " Mo" : Math.max(1, Math.round(b / 1024)) + " Ko"; }
  function renderSupports(msg) {
    var hd = titleBlock(t.supportsT, t.supportsI);
    el.body.appendChild(h("div", { class: "br-guided", role: "note" }, [h("h3", { text: t.guided }), h("p", { text: t.guidedP }), h("p", { class: "coi-hint", text: t.limitsLine })]));
    var form = h("form", { class: "br-add", novalidate: true, "aria-label": t.add }), status = h("p", { class: "coi-err", role: "alert", id: "br-add-e", text: msg || "" });
    var cat = h("select", { id: "br-cat" }); D.CATS.forEach(function (c) { cat.appendChild(h("option", { value: c.id, text: c.id + ". " + c.name[lang] })); });
    var kind = h("select", { id: "br-kind" });
    function fillKinds() { kind.innerHTML = ""; D.CATS.filter(function (c) { return c.id === cat.value; })[0].kinds.forEach(function (k) { kind.appendChild(h("option", { value: k[0], text: lang === "fr" ? k[1] : k[2] })); }); }
    cat.addEventListener("change", fillKinds); fillKinds();
    var title = h("input", { id: "br-title", type: "text", maxlength: "120" }), note = h("input", { id: "br-note", type: "text", maxlength: "300" });
    var srcFile = h("input", { type: "radio", name: "br-src", id: "br-src-file", value: "file", checked: true }), srcLink = h("input", { type: "radio", name: "br-src", id: "br-src-link", value: "link" });
    var file = h("input", { id: "br-file", type: "file", accept: ".pdf,.png,.jpg,.jpeg,.webp" }), link = h("input", { id: "br-link", type: "url", inputmode: "url", placeholder: "https://" });
    var fileBox = h("div", { class: "mat-f" }, [h("label", { for: "br-file", text: t.fileF }), file]), linkBox = h("div", { class: "mat-f", hidden: true }, [h("label", { for: "br-link", text: t.linkF }), link]);
    function toggle() { var isFile = srcFile.checked; fileBox.hidden = !isFile; linkBox.hidden = isFile; status.textContent = ""; }
    srcFile.addEventListener("change", toggle); srcLink.addEventListener("change", toggle);
    file.addEventListener("change", function () { var f = file.files && file.files[0]; if (!f) return; var v = C.validateFile({ name: f.name, size: f.size, type: f.type }); status.textContent = v.ok ? "" : t.errs[v.error]; if (!v.ok) file.value = ""; });
    form.appendChild(h("div", { class: "br-add-grid" }, [
      h("div", { class: "mat-f" }, [h("label", { for: "br-cat", text: t.cat }), cat]), h("div", { class: "mat-f" }, [h("label", { for: "br-kind", text: t.kind }), kind]),
      h("div", { class: "mat-f wide" }, [h("label", { for: "br-title", text: t.titleF }), title]),
      h("fieldset", { class: "br-src wide" }, [h("legend", { text: t.sourceF }), h("label", { class: "coi-opt sm", for: "br-src-file" }, [srcFile, h("span", { text: t.srcFile })]), h("label", { class: "coi-opt sm", for: "br-src-link" }, [srcLink, h("span", { text: t.srcLink })])]),
      fileBox, linkBox, h("div", { class: "mat-f wide" }, [h("label", { for: "br-note", text: t.noteF }), note])]));
    var add = h("button", { type: "submit", class: "btn btn-sm", text: t.add }); form.appendChild(add); form.appendChild(status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var isFile = srcFile.checked, f = file.files && file.files[0];
      var res = C.addSupport(state.supports, { cat: cat.value, kind: kind.value, title: title.value, note: note.value, source: isFile ? "file" : "link", file: f ? { name: f.name, size: f.size, type: f.type } : null, url: link.value });
      if (!res.ok) { status.textContent = t.errs[res.error] || t.errs[res.error.replace(/^(file|link)_/, isFile ? "" : "link_")] || t.invalid; return; }
      state.supports = res.supports; title.value = ""; note.value = ""; link.value = ""; file.value = ""; status.textContent = ""; drawList(); renderHead(); title.focus();
    });
    el.body.appendChild(form);
    var listBox = h("section", { class: "br-reg", "aria-live": "polite" }); el.body.appendChild(listBox);
    function drawList() {
      listBox.innerHTML = ""; listBox.appendChild(h("h3", { text: t.registry + " (" + state.supports.length + " " + t.ofMax + " " + D.LIMITS.maxSupports + ")" }));
      if (!state.supports.length) { listBox.appendChild(h("p", { class: "coi-hint", text: t.empty })); return; }
      var ul = h("ul", { class: "br-list" });
      state.supports.forEach(function (s) {
        var c = D.CATS.filter(function (x) { return x.id === s.cat; })[0], kn = c.kinds.filter(function (k) { return k[0] === s.kind; })[0];
        var rm = h("button", { type: "button", class: "link", text: t.remove }); rm.setAttribute("aria-label", t.remove + " : " + s.title);
        rm.addEventListener("click", function () { var r = C.removeSupport(state.supports, s.id, state.reviews); state.supports = r.supports; state.reviews = r.reviews; drawList(); renderHead(); });
        ul.appendChild(h("li", null, [h("b", { text: s.id + " · " + s.title }), h("span", { text: c.id + ". " + c.name[lang] + " · " + (lang === "fr" ? kn[1] : kn[2]) + " · " + (s.source === "link" ? s.url : s.fileName + " (" + fmtSize(s.size) + ")") }), rm]));
      });
      listBox.appendChild(ul);
    }
    drawList(); renderNav(); renderHead(); return hd;
  }

  /* ---- Étapes 3 à 8 : dimensions ---- */
  function criterionBox(c, errs) {
    var rv = state.reviews[c.id] || (state.reviews[c.id] = {}), id = "br-c-" + c.id.replace(".", "-"), fs = h("fieldset", { class: "coi-q br-crit", id: id });
    fs.appendChild(h("legend", null, [c.l[lang]]));
    var grp = h("div", { class: "br-status", role: "radiogroup" }), detail = h("div", { class: "br-detail", hidden: true }), msg = h("p", { class: "coi-err", id: id + "-e", role: "alert", text: errs[c.id] ? (errs[c.id].status ? t.required : t.evNeeded) : "" });
    D.STATUS.forEach(function (s) {
      var oid = id + "-" + s.id, r = h("input", { type: "radio", name: id, id: oid, value: s.id, checked: rv.status === s.id });
      r.addEventListener("change", function () { rv.status = s.id; detail.hidden = !s.observed; msg.textContent = ""; renderHead(); });
      grp.appendChild(h("label", { class: "coi-opt sm br-st br-st-" + s.id, for: oid }, [r, h("span", { text: s.name[lang] })]));
    });
    var sel = h("select", { id: id + "-doc" }); sel.appendChild(h("option", { value: "", text: t.docNone }));
    state.supports.forEach(function (s) { var op = h("option", { value: s.id, text: s.id + " · " + s.title }); if (rv.doc === s.id) op.selected = true; sel.appendChild(op); });
    sel.addEventListener("change", function () { rv.doc = sel.value; msg.textContent = ""; });
    function ta(key, label, rows, hint) { var i = h("textarea", { id: id + "-" + key, rows: String(rows), maxlength: String(D.LIMITS.maxText) }, [rv[key] || ""]); i.addEventListener("input", function () { rv[key] = i.value; msg.textContent = ""; }); return h("div", { class: "mat-f wide" }, [h("label", { for: id + "-" + key, text: label }), hint ? h("p", { class: "coi-hint", text: hint }) : null, i]); }
    var loc = h("input", { id: id + "-loc", type: "text", maxlength: "160", value: rv.loc || "" }); loc.addEventListener("input", function () { rv.loc = loc.value; });
    detail.appendChild(h("div", { class: "br-add-grid" }, [h("div", { class: "mat-f" }, [h("label", { for: id + "-doc", text: t.doc }), sel]), h("div", { class: "mat-f" }, [h("label", { for: id + "-loc", text: t.loc + " (" + t.optional + ")" }), loc]),
      ta("fact", t.fact, 3, t.factH), ta("interp", t.interp, 2), ta("hypo", t.hypo, 2)]));
    var cur = D.STATUS.filter(function (s) { return s.id === rv.status; })[0]; detail.hidden = !(cur && cur.observed);
    fs.appendChild(grp); fs.appendChild(detail); fs.appendChild(msg); return fs;
  }
  function renderDim(errs) {
    errs = errs || {}; var dm = D.DIMS[step - 2], hd = titleBlock(dm.name[lang], dm.d[lang] + " " + t.dimNote);
    if (dm.needsCompetitor) el.body.appendChild(h("p", { class: "br-note", text: t.distinctNote }));
    el.body.appendChild(h("p", { class: "coi-sum-err", role: "alert", text: Object.keys(errs).length ? t.fixErrors : "" }));
    dm.c.forEach(function (c) { el.body.appendChild(criterionBox(c, errs)); });
    renderNav(); renderHead(); return hd;
  }
  function renderStep(errs) { return step === 0 ? renderProfile(errs) : step === 1 ? renderSupports() : renderDim(errs); }

  function renderNav() {
    el.nav.innerHTML = "";
    var back = h("button", { type: "button", class: "btn btn-ghost", text: t.back, disabled: step === 0 }); back.addEventListener("click", function () { step--; go(); });
    var next = h("button", { type: "button", class: "btn", text: step === TOTAL - 1 ? t.seeReport : t.next }); next.addEventListener("click", advance);
    el.nav.appendChild(back); el.nav.appendChild(next);
  }
  function advance() {
    if (step === 0) {
      var e0 = C.validateProfile(state.profile);
      if (Object.keys(e0).length) { var hd0 = renderProfile(e0), first = D.PROFILE.filter(function (f) { return e0[f.id]; })[0], f0 = document.getElementById("br-p-" + first.id); (f0 && (f0.matches("input,select,textarea") ? f0 : f0.querySelector("input")) || hd0).focus(); return; }
      if (Core && Core.enabled()) Core.setProfile({ sector: state.profile.sector, market: state.profile.market });
    } else if (step === 1) {
      if (!state.supports.length) { renderSupports(t.needSupport); var s1 = document.getElementById("br-add-e"); if (s1) s1.focus && s1.scrollIntoView({ block: "center" }); return; }
    } else {
      var errs = C.validateDim(step - 2, state.reviews, state.supports);
      if (Object.keys(errs).length) { var hd = renderDim(errs), fid = D.DIMS[step - 2].c.filter(function (c) { return errs[c.id]; })[0].id.replace(".", "-"), box = document.getElementById("br-c-" + fid); var f = box && box.querySelector("input,select,textarea"); (f || hd).focus(); if (box) box.scrollIntoView({ block: "center" }); return; }
    }
    track("br_step", { step: String(step + 1) });
    if (step < TOTAL - 1) { step++; go(); } else finish();
  }
  function go() { var hd = renderStep(); window.scrollTo({ top: root.getBoundingClientRect().top + window.pageYOffset - 90 }); hd.focus({ preventScroll: true }); if (!started && step > 0) { started = true; track("br_start"); } }

  /* ---- Rapport ---- */
  function secList(title, arr, empty) { var s = h("section", { class: "coi-syn" }, [h("h3", { text: title })]), ul = h("ul"); (arr.length ? arr : [empty || t.none]).forEach(function (x) { ul.appendChild(h("li", { text: x })); }); s.appendChild(ul); return s; }
  function finish() {
    var rep = R.build(state, lang), box = el.result; box.innerHTML = ""; box.hidden = false; root.hidden = true;
    var title = h("h2", { class: "coi-r-t", tabindex: "-1", text: t.reportT }); box.appendChild(h("p", { class: "coi-flag", text: t.flag })); box.appendChild(title); box.appendChild(h("p", { class: "coi-r-lead", text: t.lead })); box.appendChild(h("p", { class: "br-note", text: t.reading }));
    box.appendChild(secList(t.A, rep.A));
    var b = h("section", { class: "coi-syn" }, [h("h3", { text: t.B })]);
    rep.B.forEach(function (d) {
      var card = h("article", { class: "br-dim" + (d.scored ? "" : " na") }, [h("h4", { text: d.name })]);
      card.appendChild(h("p", { class: "br-idx" }, d.scored ? [h("b", { text: t.idxLabel + " : " + d.index + " / 100" }), " · " + d.band] : [h("b", { text: t.notScored }), " (" + d.reasons.join(" ; ") + ")"]));
      card.appendChild(h("p", { class: "coi-hint", text: d.coverage })); if (d.note) card.appendChild(h("p", { class: "coi-hint", text: d.note }));
      var ul = h("ul", { class: "br-crit-list" }); d.criteria.forEach(function (c) { ul.appendChild(h("li", { text: c.label + " : " + (c.status || "—") })); }); card.appendChild(ul); b.appendChild(card);
    });
    box.appendChild(b);
    var c = h("section", { class: "coi-syn" }, [h("h3", { text: t.C })]);
    if (!rep.C.length) c.appendChild(h("p", { text: t.none })); else {
      var tbl = h("table", { class: "mat-table br-table" }, [h("thead", null, [h("tr", null, [t.colCrit, t.colStatus, t.colSupport, t.colLoc, t.colFact, t.colInterp, t.colHypo].map(function (x) { return h("th", { scope: "col", text: x }); }))])]);
      var tb = h("tbody"); rep.C.forEach(function (r) { tb.appendChild(h("tr", null, [h("th", { scope: "row" }, [r.criterion, h("small", { text: r.dim })]), h("td", { text: r.status }), h("td", { text: r.support || "—" }), h("td", { text: r.loc || "—" }), h("td", { text: r.fact || "—" }), h("td", { text: r.interp || "—" }), h("td", { text: r.hypo || "—" })])); });
      tbl.appendChild(tb); c.appendChild(h("div", { class: "br-scroll", tabindex: "0", role: "region", "aria-label": t.C }, [tbl]));
    }
    box.appendChild(c);
    box.appendChild(secList(t.D, rep.D, t.noStrength)); box.appendChild(secList(t.E, rep.E, t.noIncon)); box.appendChild(secList(t.F, rep.F, t.noRisk)); box.appendChild(secList(t.G, rep.G, t.noActions));
    if (rep.H0.length) box.appendChild(secList(t.hypoT, rep.H0)); box.appendChild(secList(t.H, rep.H));
    var tools = h("p", { class: "br-tools" }), pr = h("button", { type: "button", class: "btn btn-sm btn-ghost", text: t.print }), cp = h("button", { type: "button", class: "btn btn-sm btn-ghost", text: t.copy }), st = h("span", { class: "core-msg", role: "status" });
    pr.addEventListener("click", function () { window.print(); });
    cp.addEventListener("click", function () { var txt = R.toText(rep); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { st.textContent = t.copied; }, function () { st.textContent = t.copyFail; }); else st.textContent = t.copyFail; });
    tools.appendChild(pr); tools.appendChild(cp); tools.appendChild(st); box.appendChild(tools);
    var cta = document.getElementById("brand-cta"); if (cta) { cta.hidden = false; box.appendChild(cta); }
    var again = h("button", { type: "button", class: "link", text: t.restart });
    again.addEventListener("click", function () { box.hidden = true; root.hidden = false; var cc = document.getElementById("brand-cta"); if (cc) cc.hidden = true; step = 0; go(); });
    box.appendChild(h("p", { class: "coi-again" }, [again])); var pv = document.getElementById("brand-priv"); if (pv) box.appendChild(pv);
    window.BRLast = { rep: rep, text: R.toText(rep) }; box.dataset.ready = "1"; idemKey = Core ? Core.newKey() : String(Date.now());
    if (Core && Core.enabled()) { Core.record("brand", { version: D.VERSION, headline: rep.summary.scored + "/" + rep.summary.total + (lang === "fr" ? " dimensions documentées" : " dimensions documented"), detail: rep.summary.supports + " supports" }); var cpn = document.getElementById("core-panel"); if (cpn) cpn.dispatchEvent(new Event("core:refresh")); }
    track("br_report", { scored: String(rep.summary.scored) });
    window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 90 }); title.focus({ preventScroll: true }); wireSend();
  }

  function wireSend() {
    var form = document.getElementById("brand-send"); if (!form || form.dataset.wired) return; form.dataset.wired = "1";
    var status = document.getElementById("brand-send-status"), btn = form.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); status.textContent = "";
      var d = new FormData(form), email = String(d.get("email") || "").trim(), name = String(d.get("name") || "").trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = form.dataset.invalid; return; }
      if (!form.querySelector("[name=consent]").checked) { status.textContent = form.dataset.noconsent; return; }
      var last = window.BRLast, rep = last.rep; btn.disabled = true; status.textContent = form.dataset.sending;
      var ind = {}; rep.B.forEach(function (x) { ind[x.id] = x.index; });
      var body = { tool: "brand", version: D.VERSION, lang: lang, name: name, email: email, company: String(d.get("company") || "").trim() || state.profile.name || "", consent: true, website: String(d.get("website") || ""), elapsed: Date.now() - startedAt,
                   answers: { brand: state.profile.name || "", sector: state.profile.sector || "", market: state.profile.market || "", supports: state.supports.length }, indicators: ind, report: last.text, confidence: rep.summary.scored + "/" + rep.summary.total,
                   consent_text_id: form.getAttribute("data-consent") || "", idempotency_key: idemKey, profile: (Core && Core.enabled() && Core.remote()) || undefined, context: { sector: state.profile.sector, market: state.profile.market },
                   summary: { headline: rep.summary.scored + "/" + rep.summary.total + (lang === "fr" ? " dimensions documentées" : " dimensions documented"), completeness: rep.summary.scored === rep.summary.total ? "complete" : "partial" } };
      fetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) { if (Core && Core.enabled() && x.j && x.j.resume_token) { Core.setRemote(x.j.profile_id, x.j.resume_token); var cp2 = document.getElementById("core-panel"); if (cp2) cp2.dispatchEvent(new Event("core:refresh")); } status.textContent = form.dataset.sent; form.querySelectorAll("input,button").forEach(function (n) { n.disabled = true; }); track("br_send"); } else { btn.disabled = false; status.textContent = form.dataset.fail; } })
        .catch(function () { btn.disabled = false; status.textContent = form.dataset.fail; });
    });
  }
  go(); root.setAttribute("data-ready", "");
})();
