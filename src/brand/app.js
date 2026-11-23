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
