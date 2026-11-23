/* MAIORIS Brand Consistency Review : règles d'évaluation guidée. Fonctions pures, sans DOM.

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
