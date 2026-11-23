/* MAIORIS Creative Operations Intelligence™ : interface. Les réponses restent en mémoire de la page, rien n'est stocké ni envoyé
   sans action explicite de l'utilisateur (envoi facultatif avec consentement). */
(function () {
  "use strict";
  var D = window.COIData, C = window.COICalc, R = window.COIReport;
  var root = document.getElementById("coi"); if (!root) return;
  var lang = root.getAttribute("data-lang") === "en" ? "en" : "fr", t = R.T[lang];
  var answers = {}, stepIdx = 0, mode = "form", startedAt = Date.now(), started = false;
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
    if (Core && Core.enabled()) { var tot = rep.indicators.filter(function (i) { return i.id === "total"; })[0]; Core.record("coi", { version: "1.0", headline: tot && tot.ok ? tot.mid + " " + (lang === "fr" ? "par an (valeur centrale)" : "per year (central value)") : (lang === "fr" ? "Estimation partielle" : "Partial estimate"), level: rep.profile.confidence.level }); var cp = document.getElementById("core-panel"); if (cp) cp.dispatchEvent(new Event("core:refresh")); }
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
    window.COILast = rep; box.dataset.ready = "1";
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
      var ind = {}; last.indicators.forEach(function (i) { ind[i.id] = i.ok ? { lo: i.lo, mid: i.mid, hi: i.hi } : null; });
      var body = { lang: lang, name: name, email: email, company: String(d.get("company") || "").trim(), consent: true, website: String(d.get("website") || ""), elapsed: Date.now() - startedAt,
                   answers: answers, indicators: ind, confidence: last.profile.confidence.level };
      fetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) { status.textContent = form.dataset.sent; form.querySelectorAll("input,button").forEach(function (n) { n.disabled = true; }); track("coi_send"); } else { btn.disabled = false; status.textContent = form.dataset.fail; } })
        .catch(function () { btn.disabled = false; status.textContent = form.dataset.fail; });
    });
  }

  go(); root.setAttribute("data-ready", "");
})();
