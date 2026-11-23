/* MAIORIS Creative Maturity Assessment™ : interface. Les réponses restent en mémoire de la page ; l'envoi à MAIORIS est facultatif et soumis au consentement. */
(function () {
  "use strict";
  var D = window.MATData, C = window.MATCalc, R = window.MATReport, Core = window.MaiorisCore, OPT = window.MaiorisOptions;
  var root = document.getElementById("mat"); if (!root) return;
  var lang = root.getAttribute("data-lang") === "en" ? "en" : "fr", t = R.T[lang];
  var answers = {}, ctx = { org: "", sector: "", size: "", market: "" }, step = 0, started = false, startedAt = Date.now(), fromCore = {};
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
    window.MATLast = { rep: rep, text: reportText(rep) }; box.dataset.ready = "1";
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
                   answers: Object.assign({}, answers, { ctxSector: ctx.sector, ctxSize: ctx.size, ctxMarket: ctx.market }), indicators: ind, report: last.text, confidence: rep.res.complete ? "complete" : "partial" };
      fetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) { status.textContent = form.dataset.sent; form.querySelectorAll("input,button").forEach(function (n) { n.disabled = true; }); track("mat_send"); } else { btn.disabled = false; status.textContent = form.dataset.fail; } })
        .catch(function () { btn.disabled = false; status.textContent = form.dataset.fail; });
    });
  }
  go(); root.setAttribute("data-ready", "");
})();
