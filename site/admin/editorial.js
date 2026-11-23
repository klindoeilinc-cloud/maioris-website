/* Back-office éditorial. Aucune donnée n'est insérée comme HTML : tout passe par textContent ou .value. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var META = null, CUR = null, LANG = "fr", DIRTY = false;
  function el(tag, attrs, text) { var n = document.createElement(tag); for (var k in attrs || {}) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); } if (text !== undefined && text !== null) n.textContent = text; return n; }
  function say(t, kind) { var m = $("msg"); m.textContent = t || ""; m.className = "msg" + (kind ? " " + kind : ""); }
  function api(path, opt) {
    opt = opt || {}; var o = { method: opt.method || "GET", credentials: "same-origin", headers: { "Content-Type": "application/json" } }; if (opt.body) o.body = JSON.stringify(opt.body);
    return fetch("/api/admin/editorial/" + path, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; if (r.status === 401 || r.status === 403 || r.status === 503) { var e = new Error("access"); e.status = r.status; throw e; } return j; }); });
  }
  function accessError(e) { say(e && e.status === 503 ? "L'administration n'est pas encore configurée (Cloudflare Access, base de données)." : e && (e.status === 401 || e.status === 403) ? "Accès refusé. Connectez-vous avec une adresse autorisée." : "Une erreur est survenue. Réessayez.", "err"); }
  var catName = function (id) { var c = META.categories.filter(function (x) { return x.id === id; })[0]; return c ? c.name.fr : id; }, fmtName = function (id) { var f = META.formats.filter(function (x) { return x.id === id; })[0]; return f ? f.name.fr : id; };
  var STATUS_FR = { draft: "Draft", review: "In Review", approved: "Approved", published: "Published", archived: "Archived" };
  function fillSelect(sel, items, valueKey, labelFn, withEmpty) { if (!withEmpty) sel.textContent = ""; items.forEach(function (it) { var o = el("option", { value: it[valueKey] }, labelFn(it)); sel.appendChild(o); }); }
  function date(s) { return s ? String(s).slice(0, 16).replace("T", " ") : ""; }

  /* ---------- liste ---------- */
  function loadList() {
    var p = new URLSearchParams(); if ($("f-status").value) p.set("status", $("f-status").value); if ($("f-cat").value) p.set("category", $("f-cat").value); if ($("f-q").value.trim()) p.set("q", $("f-q").value.trim());
    return api("articles?" + p.toString()).then(function (j) {
      var tb = $("rows"); tb.textContent = ""; if (!j.items || !j.items.length) { var tr0 = el("tr"); tr0.appendChild(el("td", { colspan: "8" }, "Aucune publication.")); tb.appendChild(tr0); return; }
      j.items.forEach(function (it) {
        var tr = el("tr", { "class": "r", tabindex: "0" }); var st = el("span", { "class": "st st-" + it.status }, STATUS_FR[it.status] || it.status);
        var cells = [it.title || "(sans titre)", catName(it.category_id), fmtName(it.format_id), null, it.quality_total === null || it.quality_total === undefined ? "—" : it.quality_total + "/100", it.has_en ? "Oui" : "", date(it.published_at), date(it.updated_at)];
        cells.forEach(function (c, i) { var td = el("td"); if (i === 3) td.appendChild(st); else td.textContent = c; if (i === 0 && it.is_demo) { td.appendChild(el("span", { "class": "hint" }, " (exemple fictif)")); } tr.appendChild(td); });
        var open = function () { location.hash = "#" + it.id; }; tr.addEventListener("click", open); tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }); tb.appendChild(tr);
      });
    });
  }

  /* ---------- éditeur ---------- */
  function words(s) { return String(s || "").trim().split(/\s+/).filter(Boolean).length; }
  function field(label, node, id) { var d = el("div"); var l = el("label", { "for": id }, label); d.appendChild(l); d.appendChild(node); return d; }
  function input(id, value, attrs) { var i = el("input", Object.assign({ id: id, type: "text" }, attrs || {})); i.value = value || ""; i.addEventListener("input", function () { DIRTY = true; }); return i; }
  function tx(id, value, rows) { var t = el("textarea", { id: id, rows: String(rows || 3) }); t.value = value || ""; t.addEventListener("input", function () { DIRTY = true; }); return t; }
  function trOf(lang) { return CUR.translations.filter(function (t) { return t.lang === lang; })[0] || { lang: lang, ready: 0, slug: "", title: "", subtitle: "", summary: "", body_md: "", meta_title: "", meta_description: "", takeaways: [] }; }

  function renderEditor() {
    var box = $("editor"); box.textContent = ""; box.hidden = false; $("list").hidden = true; var a = CUR.article;
    var top = el("div", { "class": "panel" }); top.appendChild(el("h2", null, "Statut")); var row = el("div", { "class": "row" });
    row.appendChild(el("span", { "class": "st st-" + a.status }, STATUS_FR[a.status] || a.status));
    if (a.published_at) row.appendChild(el("span", { "class": "hint" }, "Mise en ligne : " + date(a.published_at) + (new Date(a.published_at) > new Date() ? " (programmée)" : "")));
    if (a.is_demo) row.appendChild(el("span", { "class": "hint" }, "Exemple éditorial fictif"));
    top.appendChild(row);
    var acts = el("div", { "class": "tools" }); var LABEL = { review: "Envoyer en relecture", approved: "Approuver", published: "Publier", draft: a.status === "published" ? "Dépublier (brouillon)" : "Remettre en brouillon", archived: "Archiver" };
    (META.transitions[a.status] || []).forEach(function (to) { var b = el("button", { type: "button", "class": to === "archived" ? "ghost" : "" }, LABEL[to] || to); b.addEventListener("click", function () { doTransition(to); }); acts.appendChild(b); });
    top.appendChild(acts);
    if ((META.transitions[a.status] || []).indexOf("published") >= 0) { var pa = el("div", { "class": "row" }); var dt = el("input", { id: "publish-at", type: "datetime-local" }); pa.appendChild(field("Programmer la mise en ligne (facultatif, heure locale)", dt, "publish-at")); top.appendChild(pa); }
    if (a.status === "draft" && !a.first_published_at) { var del = el("button", { type: "button", "class": "danger" }, "Supprimer ce brouillon"); del.addEventListener("click", function () { if (!confirm("Supprimer définitivement ce brouillon ?")) return; api("articles/" + a.id + "/delete", { method: "POST" }).then(function (j) { if (j.ok) { DIRTY = false; location.hash = ""; say("Brouillon supprimé.", "ok"); } else say(j.message || "Suppression impossible.", "err"); }); }); top.appendChild(del); }
    box.appendChild(top);
    var errs = el("div", { id: "errs", "class": "errs", hidden: "hidden", role: "alert" }); box.appendChild(errs);

    var meta = el("div", { "class": "panel" }); meta.appendChild(el("h2", null, "Publication")); var g = el("div", { "class": "grid3" });
    var cat = el("select", { id: "e-cat" }); fillSelect(cat, META.categories, "id", function (c) { return c.n + " · " + c.name.fr; }); cat.value = a.category_id;
    var fmt = el("select", { id: "e-fmt" }); fillSelect(fmt, META.formats, "id", function (f) { return f.name.fr + " (" + f.min + " à " + f.max + " min)"; }); fmt.value = a.format_id;
    var tool = el("select", { id: "e-tool" }); tool.appendChild(el("option", { value: "" }, "Aucun outil suggéré")); META.tools.forEach(function (t) { tool.appendChild(el("option", { value: t.id }, t.name.fr)); }); tool.value = a.tool_suggestion || "";
    [cat, fmt, tool].forEach(function (s) { s.addEventListener("change", function () { DIRTY = true; }); });
    g.appendChild(field("Rubrique", cat, "e-cat")); g.appendChild(field("Format", fmt, "e-fmt")); g.appendChild(field("Outil suggéré en fin d'article (un seul, seulement s'il répond au sujet)", tool, "e-tool"));
    g.appendChild(field("Signature éditoriale", input("e-author", a.author, { maxlength: "120" }), "e-author")); g.appendChild(field("Image principale (chemin /assets/... ou https)", input("e-img", a.hero_image, { maxlength: "300" }), "e-img")); g.appendChild(field("Texte alternatif de l'image", input("e-alt", a.hero_alt, { maxlength: "300" }), "e-alt"));
    meta.appendChild(g);
    var mrow = el("div", { "class": "row" }); var pickHero = el("button", { type: "button", "class": "ghost", style: "flex:0 0 auto" }, "Choisir ou téléverser l'image principale"); var thumb = el("img", { id: "e-thumb", alt: "", style: "max-height:80px;display:none;border:1px solid var(--ink)" });
    function showThumb() { var v = ($("e-img").value || "").trim(); thumb.style.display = /^\/media\//.test(v) ? "block" : "none"; if (/^\/media\//.test(v)) thumb.src = v; }
    pickHero.addEventListener("click", function () { openMedia(function (m) { $("e-img").value = m.url; if (!$("e-alt").value.trim()) $("e-alt").value = m.alt || ""; DIRTY = true; showThumb(); }); }); mrow.appendChild(pickHero); mrow.appendChild(thumb); meta.appendChild(mrow); setTimeout(showThumb, 0);
    var ck = el("div", { "class": "row" });
    [["e-feat", "À la une", a.featured], ["e-sel", "Strategic Selection (dirigeants)", a.selection]].forEach(function (c) { var l = el("label", { "class": "chk" }); var i = el("input", { type: "checkbox", id: c[0] }); i.checked = !!c[2]; i.addEventListener("change", function () { DIRTY = true; }); l.appendChild(i); l.appendChild(document.createTextNode(c[1])); ck.appendChild(l); });
    meta.appendChild(ck); box.appendChild(meta);

    // versions linguistiques
    var tabsPanel = el("div", { "class": "panel" }); tabsPanel.appendChild(el("h2", null, "Contenu"));
    var tabs = el("div", { "class": "tabs", role: "tablist" }); var body = el("div", { id: "lang-body" });
    ["fr", "en"].forEach(function (l) { var b = el("button", { type: "button", role: "tab", "aria-selected": String(LANG === l), id: "tab-" + l }, l === "fr" ? "Français (obligatoire)" : "English"); b.addEventListener("click", function () { collect(); LANG = l; renderEditor(); }); tabs.appendChild(b); });
    tabsPanel.appendChild(tabs); tabsPanel.appendChild(body); box.appendChild(tabsPanel); renderLang(body);

    // sources
    var sp = el("div", { "class": "panel" }); sp.appendChild(el("h2", null, "Sources et références")); sp.appendChild(el("p", { "class": "hint" }, "Chaque chiffre doit citer une source : [^1], [^2] dans le texte renvoient à cette liste. Les adresses doivent être consultables (https)."));
    var list = el("div", { id: "sources" }); CUR.sources.forEach(function (s) { list.appendChild(srcRow(s)); }); sp.appendChild(list);
    var add = el("button", { type: "button", "class": "ghost" }, "Ajouter une source"); add.addEventListener("click", function () { list.appendChild(srcRow({ kind: "primary" })); renumber(); DIRTY = true; }); sp.appendChild(add); box.appendChild(sp); renumber();

    // articles associés
    var rp = el("div", { "class": "panel" }); rp.appendChild(el("h2", null, "Articles associés")); var rs = el("select", { id: "e-rel", multiple: "multiple", size: "6" }); rp.appendChild(field("Jusqu'à 3 publications à proposer à la suite (maintenir Ctrl ou Cmd pour en choisir plusieurs)", rs, "e-rel")); box.appendChild(rp);
    api("articles").then(function (j) { (j.items || []).filter(function (x) { return x.id !== a.id; }).forEach(function (x) { var o = el("option", { value: x.id }, (x.title || "(sans titre)") + " · " + STATUS_FR[x.status]); if (CUR.related.indexOf(x.id) >= 0) o.selected = true; rs.appendChild(o); }); });
    rs.addEventListener("change", function () { DIRTY = true; });

    // grille qualité
    var qp = el("div", { "class": "panel" }); qp.appendChild(el("h2", null, "Grille de qualité éditoriale (interne, jamais publique)")); var qg = el("div", { "class": "grid3" }); var q = a.quality || {};
    META.quality.forEach(function (c) { var i = el("input", { id: "q-" + c.id, type: "number", min: "0", max: String(c.max), step: "1" }); if (q[c.id] !== undefined && q[c.id] !== null) i.value = q[c.id]; i.addEventListener("input", function () { DIRTY = true; updTotal(); }); qg.appendChild(field(c.name.fr + " (sur " + c.max + ")", i, "q-" + c.id)); });
    qp.appendChild(qg); qp.appendChild(el("p", { "class": "score", id: "q-total", "aria-live": "polite" })); qp.appendChild(el("p", { "class": "hint" }, "Seuil de publication : " + META.threshold + " sur 100. En dessous, la mise en ligne est refusée.")); box.appendChild(qp); updTotal();

    // révisions
    if (CUR.revisions.length) { var rv = el("div", { "class": "panel" }); rv.appendChild(el("h2", null, "Dernières versions enregistrées")); var ul = el("ul"); CUR.revisions.slice(0, 8).forEach(function (r) { ul.appendChild(el("li", null, date(r.saved_at) + " · " + r.lang.toUpperCase() + " · " + r.saved_by)); }); rv.appendChild(ul); box.appendChild(rv); }

    // barre d'actions
    var bar = el("div", { "class": "stk" }); var save = el("button", { type: "button", id: "save" }, "Enregistrer"); save.addEventListener("click", function () { save_(); });
    var prev = el("button", { type: "button", "class": "ghost" }, "Prévisualiser (nouvel onglet)"); prev.addEventListener("click", function () { save_(true); });
    var back = el("button", { type: "button", "class": "ghost" }, "Retour à la liste"); back.addEventListener("click", function () { if (DIRTY && !confirm("Des modifications ne sont pas enregistrées. Quitter ?")) return; DIRTY = false; location.hash = ""; });
    bar.appendChild(save); bar.appendChild(prev); bar.appendChild(back); box.appendChild(bar);
  }
  function renderLang(body) {
    body.textContent = ""; var t = trOf(LANG), p = el("div", { "class": "panel", style: "margin-top:-1px" });
    if (LANG === "en") { var l = el("label", { "class": "chk" }); var i = el("input", { type: "checkbox", id: "l-ready" }); i.checked = !!t.ready; i.addEventListener("change", function () { DIRTY = true; }); l.appendChild(i); l.appendChild(document.createTextNode("Version anglaise prête à être publiée (elle n'est visible qu'une fois prête)")); p.appendChild(l); }
    var g = el("div", { "class": "grid2" });
    g.appendChild(field("Adresse (slug)" + (CUR.article.first_published_at ? " : figée après publication" : ""), input("l-slug", t.slug, { maxlength: "80", placeholder: "lettres-minuscules-et-tirets" }), "l-slug")); g.appendChild(field("Titre", input("l-title", t.title, { maxlength: "200" }), "l-title"));
    g.appendChild(field("Sous-titre stratégique", input("l-sub", t.subtitle, { maxlength: "300" }), "l-sub")); g.appendChild(field("Meta title (facultatif, 70 caractères au plus)", input("l-mt", t.meta_title, { maxlength: "120" }), "l-mt"));
    p.appendChild(g); p.appendChild(field("Résumé stratégique (80 à 400 caractères)", tx("l-sum", t.summary, 3), "l-sum")); p.appendChild(field("Meta description (70 à 170 caractères)", tx("l-md", t.meta_description, 2), "l-md"));
    var bl = el("label", { "for": "l-body" }, "Texte (Markdown restreint : ## titres, listes, > citation, **gras**, [lien](https://…), [^1] source)"); p.appendChild(bl);
    var bar = el("div", { "class": "tools" }); var body_ = tx("l-body", t.body_md, 22); body_.style.minHeight = "420px"; body_.style.fontFamily = "ui-monospace,Menlo,monospace";
    [["## Titre", "\n## Titre de section\n\n"], ["Verified facts", "\n:::facts Verified facts\nFaits établis, avec leur source. [^1]\n:::\n"], ["MAIORIS Analysis", "\n:::analysis MAIORIS Analysis\nInterprétation stratégique de MAIORIS.\n:::\n"], ["Strategic hypotheses", "\n:::hypotheses Strategic hypotheses\nHypothèse explicitement présentée comme telle.\n:::\n"], ["Open questions", "\n:::questions Open questions\n- Question qui reste à vérifier\n:::\n"], ["Note analytique", "\n:::insight Note analytique\nEncadré analytique.\n:::\n"], ["Citation [^n]", "[^1]"], ["Image", null]].forEach(function (b) {
      var btn = el("button", { type: "button", "class": "ghost" }, b[0]); if (b[1] === null) { btn.addEventListener("click", function () { openMedia(function (m) { var at = body_.selectionStart || body_.value.length, md = "\n![" + (m.alt || "").replace(/[\[\]]/g, "") + "](" + m.url + ")\n"; body_.value = body_.value.slice(0, at) + md + body_.value.slice(at); DIRTY = true; count(); body_.focus(); }); }); bar.appendChild(btn); return; }
      btn.addEventListener("click", function () { var s = body_.selectionStart || body_.value.length; body_.value = body_.value.slice(0, s) + b[1] + body_.value.slice(s); body_.focus(); DIRTY = true; count(); }); bar.appendChild(btn); });
    p.appendChild(bar); p.appendChild(body_); var cnt = el("p", { "class": "hint", id: "l-count", "aria-live": "polite" }); p.appendChild(cnt); function count() { var w = words(body_.value); cnt.textContent = w + " mots · " + Math.max(1, Math.ceil(w / 220)) + " min de lecture"; } body_.addEventListener("input", count); count();
    p.appendChild(field("Key Takeaways (une idée par ligne, huit au plus)", tx("l-take", (t.takeaways || []).join("\n"), 4), "l-take")); body.appendChild(p);
  }
  function srcRow(s) {
    var d = el("div", { "class": "src" }); d.appendChild(el("b", { "class": "n" }, ""));
    var i1 = input("", s.label, { placeholder: "Titre de la source", "aria-label": "Titre de la source", "data-k": "label" }), i2 = input("", s.url, { placeholder: "https://…", "aria-label": "Adresse de la source", "data-k": "url" });
    var kind = el("select", { "aria-label": "Type de source", "data-k": "kind" }); [["primary", "Primaire"], ["secondary", "Secondaire"], ["data", "Données"], ["illustrative", "Illustrative (exemple fictif)"]].forEach(function (k) { kind.appendChild(el("option", { value: k[0] }, k[1])); }); kind.value = s.kind || "primary"; kind.addEventListener("change", function () { DIRTY = true; });
    d.appendChild(i1); d.appendChild(i2); d.appendChild(kind);
    var f = el("div", { "class": "full row" }); [["Éditeur ou organisme", s.publisher, "publisher"], ["Consulté le (AAAA-MM-JJ)", s.accessed_on, "accessed_on"], ["Note", s.note, "note"]].forEach(function (x) { var i = input("", x[1], { "aria-label": x[0], placeholder: x[0], "data-k": x[2] }); f.appendChild(i); }); d.appendChild(f);
    var rm = el("button", { type: "button", "class": "ghost" }, "Retirer"); rm.addEventListener("click", function () { d.parentNode.removeChild(d); renumber(); DIRTY = true; }); f.appendChild(rm); return d;
  }
  function renumber() { Array.prototype.forEach.call(document.querySelectorAll("#sources .src .n"), function (n, i) { n.textContent = "[" + (i + 1) + "]"; }); }
  function updTotal() { var t = 0, ok = true; META.quality.forEach(function (c) { var v = $("q-" + c.id).value; if (v === "" || isNaN(+v) || +v < 0 || +v > c.max) ok = false; else t += +v; }); var n = $("q-total"); n.textContent = ok ? t + " / 100 : " + (t >= META.threshold ? "seuil atteint" : "sous le seuil de " + META.threshold) : "Grille incomplète ou hors bornes"; }

  function collect() {
    if (!CUR) return null; var a = CUR.article, quality = {}, qok = true;
    META.quality.forEach(function (c) { var v = $("q-" + c.id).value; if (v === "") qok = false; else quality[c.id] = +v; });
    var t = { lang: LANG, slug: $("l-slug").value.trim(), title: $("l-title").value, subtitle: $("l-sub").value, summary: $("l-sum").value, body_md: $("l-body").value, meta_title: $("l-mt").value, meta_description: $("l-md").value, takeaways: $("l-take").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean) };
    if (LANG === "en") t.ready = $("l-ready").checked; if (LANG === "fr") t.ready = true;
    var others = CUR.translations.filter(function (x) { return x.lang !== LANG; }).map(function (x) { return { lang: x.lang, ready: !!x.ready, slug: x.slug || "", title: x.title, subtitle: x.subtitle, summary: x.summary, body_md: x.body_md, meta_title: x.meta_title, meta_description: x.meta_description, takeaways: x.takeaways || [] }; });
    var sources = Array.prototype.map.call(document.querySelectorAll("#sources .src"), function (d) { var o = {}; Array.prototype.forEach.call(d.querySelectorAll("[data-k]"), function (i) { o[i.getAttribute("data-k")] = i.value; }); return o; });
    var rel = Array.prototype.filter.call($("e-rel").options, function (o) { return o.selected; }).map(function (o) { return o.value; });
    var doc = { category_id: $("e-cat").value, format_id: $("e-fmt").value, tool_suggestion: $("e-tool").value || null, author: $("e-author").value, hero_image: $("e-img").value, hero_alt: $("e-alt").value, featured: $("e-feat").checked, selection: $("e-sel").checked,
      translations: others.concat([t]), sources: sources, related: rel.slice(0, 3) };
    if (qok) doc.quality = quality; else doc.quality = null; CUR._doc = doc;
    // mémorise localement la version courante pour le changement d'onglet
    var i = CUR.translations.findIndex(function (x) { return x.lang === LANG; }); var merged = Object.assign({}, trOf(LANG), t); if (i >= 0) CUR.translations[i] = merged; else CUR.translations.push(merged);
    return doc;
  }
  function showErrors(j) {
    var box = $("errs"); box.textContent = ""; if (!j || (!j.details && !j.message)) { box.hidden = true; return; }
    box.hidden = false; box.appendChild(el("strong", null, j.message || "Corrections nécessaires")); if (Array.isArray(j.details)) { var ul = el("ul"); j.details.forEach(function (d) { ul.appendChild(el("li", null, d.message || d.code)); }); box.appendChild(ul); } box.scrollIntoView({ block: "center" });
  }
  function save_(thenPreview) {
    var doc = collect(); say("Enregistrement…");
    return api("articles/" + CUR.article.id, { method: "PUT", body: doc }).then(function (j) {
      if (j.ok) { CUR = { article: j.article, translations: j.translations, sources: j.sources, related: j.related, revisions: j.revisions }; DIRTY = false; say("Enregistré.", "ok"); renderEditor(); if (thenPreview) window.open("/api/admin/editorial/articles/" + CUR.article.id + "/preview?lang=" + LANG, "_blank", "noopener"); }
      else { say(j.message || "Enregistrement refusé.", "err"); showErrors(j); }
    }).catch(accessError);
  }
  function doTransition(to) {
    var go = function () { var at = $("publish-at") && $("publish-at").value ? new Date($("publish-at").value).toISOString() : undefined; return api("articles/" + CUR.article.id + "/transition", { method: "POST", body: { to: to, publish_at: to === "published" ? at : undefined } }).then(function (j) {
      if (j.ok) { CUR = { article: j.article, translations: j.translations, sources: j.sources, related: j.related, revisions: j.revisions }; say("Statut mis à jour : " + (STATUS_FR[to] || to) + ".", "ok"); renderEditor(); } else { say(j.message || "Changement refusé.", "err"); showErrors(j); }
    }).catch(accessError); };
    if (to === "published" && !confirm("Publier ? Le contenu deviendra public à la date indiquée, ou immédiatement.")) return;
    if (to === "archived" && !confirm("Archiver cette publication ? Elle ne sera plus visible.")) return;
    if (DIRTY) return save_().then(function () { if (!DIRTY) return go(); }); return go();
  }
  function open(id) {
    say(""); return api("articles/" + id).then(function (j) { if (!j.ok) { say("Publication introuvable.", "err"); location.hash = ""; return; } CUR = { article: j.article, translations: j.translations, sources: j.sources, related: j.related, revisions: j.revisions }; DIRTY = false; LANG = "fr"; renderEditor(); }).catch(accessError);
  }

  /* ---------- bibliothèque d'images ---------- */
  var PICK = null;
  function mmsg(t, kind) { var m = $("md-msg"); m.textContent = t || ""; m.className = "msg" + (kind ? " " + kind : ""); }
  function mediaCard(it) {
    var c = el("div", { "class": "mi" }); var img = el("img", { src: "/media/" + it.id, alt: it.alt || "", loading: "lazy", width: String(it.width), height: String(it.height) }); c.appendChild(img);
    var b = el("div", { "class": "mb" }); b.appendChild(el("strong", null, it.original_name || it.id)); b.appendChild(el("span", null, it.width + " × " + it.height + " · " + Math.round(it.size_bytes / 1024) + " Ko"));
    var alt = el("span", null, it.alt || ""); b.appendChild(alt); if (it.used) b.appendChild(el("span", { "class": "used" }, "Utilisée"));
    var a = el("div", { "class": "ma" });
    var pick = el("button", { type: "button" }, "Choisir"); pick.addEventListener("click", function () { var cb = PICK; $("media-dlg").close(); if (cb) cb({ id: it.id, url: "/media/" + it.id, alt: it.alt }); });
    var ed = el("button", { type: "button", "class": "ghost" }, "Texte alt"); ed.addEventListener("click", function () { var v = prompt("Texte alternatif de l'image :", it.alt || ""); if (v === null) return; api("media/" + it.id, { method: "PUT", body: { alt: v } }).then(function (j) { if (j.ok) { mmsg("Texte alternatif enregistré.", "ok"); loadMedia(); } else mmsg(j.message || "Refusé.", "err"); }).catch(accessError); });
    var del = el("button", { type: "button", "class": "danger" }, "Supprimer"); del.disabled = !!it.used; if (it.used) del.title = "Retirez d'abord l'image des publications qui l'utilisent";
    del.addEventListener("click", function () { if (!confirm("Supprimer définitivement cette image ?")) return; api("media/" + it.id + "/delete", { method: "POST" }).then(function (j) { if (j.ok) { mmsg("Image supprimée.", "ok"); loadMedia(); } else mmsg(j.message || "Suppression refusée.", "err"); }).catch(accessError); });
    a.appendChild(pick); a.appendChild(ed); a.appendChild(del); b.appendChild(a); c.appendChild(b); return c;
  }
  function loadMedia() {
    return api("media").then(function (j) {
      var g = $("md-grid"); g.textContent = ""; $("md-go").disabled = j.storage === false;
      if (j.storage === false) { mmsg("Le stockage d'images n'est pas encore configuré : le bucket R2 MAIORIS_MEDIA doit être lié au projet (voir le README).", "err"); return; }
      if (!j.items || !j.items.length) { g.appendChild(el("p", { "class": "hint" }, "Aucune image pour l'instant.")); return; }
      j.items.forEach(function (it) { g.appendChild(mediaCard(it)); });
    }).catch(accessError);
  }
  function openMedia(cb) { PICK = cb || null; mmsg(""); $("media-dlg").showModal(); loadMedia(); $("md-file").focus(); }
  $("md-close").addEventListener("click", function () { $("media-dlg").close(); });
  $("md-form").addEventListener("submit", function (e) {
    e.preventDefault(); var f = $("md-file").files[0], alt = $("md-alt").value.trim();
    if (!f) { mmsg("Choisissez une image.", "err"); return; } if (f.size > 5 * 1024 * 1024) { mmsg("Image trop lourde : 5 Mo au maximum.", "err"); return; } if (alt.length < 3) { mmsg("Décrivez l'image (texte alternatif obligatoire).", "err"); $("md-alt").focus(); return; }
    var fd = new FormData(); fd.append("file", f); fd.append("alt", alt); $("md-go").disabled = true; mmsg("Téléversement…");
    fetch("/api/admin/editorial/media", { method: "POST", credentials: "same-origin", body: fd }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._s = r.status; return j; }); }).then(function (j) {
      $("md-go").disabled = false; if (j.ok) { mmsg(j.media.duplicate ? "Cette image existe déjà dans la bibliothèque." : "Image téléversée.", "ok"); $("md-file").value = ""; $("md-alt").value = ""; loadMedia(); } else if (j._s === 401 || j._s === 403 || j._s === 503 && j.error === "admin_not_configured") mmsg("Accès refusé.", "err"); else mmsg(j.message || "Téléversement refusé.", "err");
    }).catch(function () { $("md-go").disabled = false; mmsg("Une erreur est survenue. Réessayez.", "err"); });
  });
  function route() { var id = location.hash.replace("#", ""); if (id) open(id); else { $("editor").hidden = true; $("list").hidden = false; CUR = null; loadList().catch(accessError); } }

  $("f-go").addEventListener("click", function () { loadList().catch(accessError); }); $("f-q").addEventListener("keydown", function (e) { if (e.key === "Enter") loadList().catch(accessError); });
  $("n-go").addEventListener("click", function () { api("articles", { method: "POST", body: { category_id: $("n-cat").value, format_id: $("n-fmt").value } }).then(function (j) { if (j.ok) location.hash = "#" + j.id; else say(j.message || "Création impossible.", "err"); }).catch(accessError); });
  window.addEventListener("hashchange", route); window.addEventListener("beforeunload", function (e) { if (DIRTY) { e.preventDefault(); e.returnValue = ""; } });
  fetch("/api/admin/me", { credentials: "same-origin" }).then(function (r) { if (!r.ok) { var e = new Error("access"); e.status = r.status; throw e; } return r.json(); }).then(function (j) { $("who").textContent = j.email; return api("meta"); }).then(function (m) {
    META = m; fillSelect($("f-status"), META.statuses.map(function (s) { return { id: s }; }), "id", function (s) { return STATUS_FR[s.id]; }, true); fillSelect($("f-cat"), META.categories, "id", function (c) { return c.name.fr; }, true);
    fillSelect($("n-cat"), META.categories, "id", function (c) { return c.n + " · " + c.name.fr; }); fillSelect($("n-fmt"), META.formats, "id", function (f) { return f.name.fr; }); route();
  }).catch(function (e) { $("who").textContent = "Accès non établi"; accessError(e); });
})();
