/* MAIORIS INTELLIGENCE CORE : profil organisationnel commun, historique et consolidation des résultats.

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
    fr: { brief: ["Évaluez votre brief", "evaluer-votre-brief.html"], diag: ["Où est votre contrainte ?", "autodiagnostic.html"], coi: ["Creative Operations Intelligence", "creative-operations-intelligence.html"],
          maturity: ["Creative Maturity Assessment", "creative-maturity-assessment.html"], brand: ["Brand Consistency Review", "brand-consistency-review.html"] },
    en: { brief: ["Assess your brief", "brief-check.html"], diag: ["Where is your constraint?", "self-assessment.html"], coi: ["Creative Operations Intelligence", "creative-operations-intelligence.html"],
          maturity: ["Creative Maturity Assessment", "creative-maturity-assessment.html"], brand: ["Brand Consistency Review", "brand-consistency-review.html"] }
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
