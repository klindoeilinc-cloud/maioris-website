/* MAIORIS : comparateur de scénarios de leadership créatif. Fonctions pures, sans DOM.

   Trois scénarios annualisés : recrutement permanent, pilotage réparti entre agences et prestataires, leadership créatif externalisé.
   Le calcul n'utilise que les montants saisis par le visiteur. Aucun tarif MAIORIS n'est présumé : le coût du scénario externalisé
   est le montant mensuel que le visiteur renseigne (par exemple celui d'une proposition) ; vide, ce scénario n'est pas chiffré.
   Les effets d'efficacité sont des hypothèses du visiteur, à zéro par défaut, appliquées de la même façon aux deux scénarios dotés
   d'un leadership senior. Ce n'est ni une prévision ni une garantie d'économie. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FCLCalc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var LIMITS = { years: [1, 10], level: [5, 100], cut: [0, 50], money: 1e13 };
  function num(v) { var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(/[\s  ]/g, "").replace(",", ".")); return isFinite(n) ? n : NaN; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  /** Normalise les saisies : retourne { ok, errors, values }. Un montant vide vaut 0, sauf les honoraires externes (vide = non chiffré). */
  function normalize(inp) {
    inp = inp || {}; var errors = {}, v = {};
    ["internal", "recruit", "coord", "rework"].forEach(function (k) {
      var raw = inp[k]; if (raw === "" || raw == null) { v[k] = 0; return; }
      var n = num(raw); if (!isFinite(n) || n < 0 || n > LIMITS.money) errors[k] = "invalid"; else v[k] = n;
    });
    if (inp.fee === "" || inp.fee == null) v.fee = null; else { var f = num(inp.fee); if (!isFinite(f) || f < 0 || f > LIMITS.money) errors.fee = "invalid"; else v.fee = f; }
    var y = inp.years === "" || inp.years == null ? 3 : num(inp.years); if (!isFinite(y) || y < LIMITS.years[0] || y > LIMITS.years[1]) errors.years = "invalid"; else v.years = y;
    var l = inp.level === "" || inp.level == null ? 50 : num(inp.level); if (!isFinite(l) || l < LIMITS.level[0] || l > LIMITS.level[1]) errors.level = "invalid"; else v.level = l;
    ["reworkCut", "coordCut"].forEach(function (k) { var c = inp[k] === "" || inp[k] == null ? 0 : num(inp[k]); if (!isFinite(c) || c < LIMITS.cut[0] || c > LIMITS.cut[1]) errors[k] = "invalid"; else v[k] = c; });
    return { ok: Object.keys(errors).length === 0, errors: errors, values: v };
  }
  function sum(lines) { return lines.reduce(function (a, l) { return a + l.amount; }, 0); }
  /** Calcule les trois scénarios. Retourne null si les saisies sont invalides. */
  function compute(inp) {
    var n = normalize(inp); if (!n.ok) return { ok: false, errors: n.errors };
    var v = n.values, rc = 1 - v.reworkCut / 100, cc = 1 - v.coordCut / 100;
    var A = [{ id: "internal", amount: v.internal }, { id: "recruit", amount: v.recruit / v.years }, { id: "coord", amount: v.coord * cc }, { id: "rework", amount: v.rework * rc }];
    var B = [{ id: "coord", amount: v.coord }, { id: "rework", amount: v.rework }];
    var C = v.fee === null ? null : [{ id: "fee", amount: v.fee * 12 }, { id: "coord", amount: v.coord * cc }, { id: "rework", amount: v.rework * rc }];
    var totals = { permanent: sum(A), distributed: sum(B), external: C ? sum(C) : null };
    return {
      ok: true, values: v,
      scenarios: { permanent: { lines: A, total: totals.permanent }, distributed: { lines: B, total: totals.distributed }, external: C ? { lines: C, total: totals.external } : null },
      /* différence par rapport au pilotage réparti : valeur signée, jamais présentée comme une économie garantie */
      differences: { permanent: totals.permanent - totals.distributed, external: C ? totals.external - totals.distributed : null },
      /* part du coût d'un poste permanent qui excède le besoin déclaré, si le poste était dédié à ce seul besoin */
      unusedCapacity: v.internal * (1 - v.level / 100),
      hypotheses: { reworkCut: v.reworkCut, coordCut: v.coordCut, applied: v.reworkCut > 0 || v.coordCut > 0 },
    };
  }
  return { compute: compute, normalize: normalize, LIMITS: LIMITS };
});

;
/* MAIORIS : comparateur de scénarios de leadership créatif (interface). Le calcul s'exécute dans le navigateur, rien n'est envoyé ni conservé. */
(function () {
  "use strict";
  var host = document.getElementById("fcl-sim"); if (!host || !window.FCLCalc) return;
  var lang = host.getAttribute("data-lang") === "en" ? "en" : "fr", C = window.FCLCalc;
  var T = {
    fr: {
      note: "Comparaison illustrative construite uniquement à partir de vos chiffres. Elle ne prédit rien, ne garantit aucune économie et ne présume aucun tarif MAIORIS. Rien n'est envoyé ni enregistré.",
      cur: "Devise", curH: "Libellé utilisé dans les résultats",
      f: { internal: ["Coût annuel d'un dirigeant créatif permanent", "Rémunération et charges, sur 12 mois."], recruit: ["Coûts de recrutement et d'intégration", "Montant unique."], years: ["Durée prévue du poste (années)", "Le recrutement est réparti sur cette durée. De 1 à 10."],
        coord: ["Coût annuel de coordination des agences et prestataires", "Temps interne et honoraires de pilotage."], rework: ["Coût annuel estimé des reprises et des retards", "Votre estimation."],
        level: ["Niveau de leadership externe requis", "Part d'un poste à temps plein dont vous avez besoin."], fee: ["Honoraires mensuels du leadership externe", "Saisissez un chiffre issu d'une proposition. Laissez vide si vous ne le connaissez pas : ce scénario n'est alors pas chiffré."],
        reworkCut: ["Hypothèse : baisse du coût des reprises et retards avec un leadership senior", "Zéro par défaut. Votre hypothèse, appliquée aux deux scénarios avec leadership senior. De 0 à 50 %."], coordCut: ["Hypothèse : baisse du coût de coordination avec un leadership senior", "Zéro par défaut. Même principe."] },
      res: "Coût annualisé par scénario", sc: { permanent: "Recrutement permanent", distributed: "Pilotage réparti entre agences et prestataires", external: "Leadership créatif externalisé" },
      lines: { internal: "Dirigeant créatif permanent", recruit: "Recrutement et intégration, annualisés", coord: "Coordination des agences et prestataires", rework: "Reprises et retards", fee: "Honoraires du leadership externe sur 12 mois" },
      total: "Total annualisé", diff: "Écart avec le pilotage réparti", diffNote: "Écart de structure de coût, pas une économie garantie.", none: "Non chiffré : saisissez des honoraires mensuels.",
      cap: "Capacité d'un poste permanent au-delà du besoin déclaré", capNote: "Si le poste était dédié à ce seul besoin, cette part du coût correspondrait à une capacité que vous n'avez pas déclarée comme nécessaire. Elle peut être utilisée à d'autres fins.",
      struct: "Différences de structure", structL: ["Recrutement permanent : engagement durable et structure exécutive permanente, accès à plein temps à un profil senior.", "Pilotage réparti : aucune structure interne supplémentaire, mais une coordination, une gouvernance et une cohérence à assurer par l'organisation.", "Leadership externalisé : pas de structure exécutive permanente, un périmètre et un rythme définis, les budgets d'agences et de production restant séparés."],
      ass: "Hypothèses explicites", assL: function (v, cur) { var a = ["Montants annuels en " + cur + ", saisis par vous. Aucune donnée n'est reprise d'ailleurs.", "Recrutement réparti sur " + v.years + " an(s) ; poste supposé dédié à ce besoin pour la capacité non requise (niveau requis : " + v.level + " % d'un poste).", "Les coûts de coordination et de reprises sont identiques d'un scénario à l'autre, sauf hypothèse de votre part.", "Aucun tarif MAIORIS n'est présumé : les honoraires externes sont ceux que vous saisissez."]; a.push(v.reworkCut || v.coordCut ? "Hypothèses d'efficacité saisies : reprises et retards −" + v.reworkCut + " %, coordination −" + v.coordCut + " %, appliquées aux deux scénarios avec leadership senior. Ce sont vos hypothèses, pas des résultats attendus." : "Aucune hypothèse d'efficacité appliquée."); return a; },
      opp: "Pistes d'efficacité à explorer", oppL: ["Reprises et retards : la clarté des briefs et des validations est un levier fréquent.", "Coordination : unifier la direction des agences et prestataires peut réduire le temps de pilotage interne.", "Gouvernance : des décisions créatives prises par un responsable identifié, selon des critères stables."], oppNote: "Pistes qualitatives, non chiffrées. L'effet réel dépend de votre situation.",
      err: "Vérifiez les champs signalés : nombres positifs, bornes respectées.", reset: "Réinitialiser", pct: " % d'un poste"
    },
    en: {
      note: "Illustrative comparison built only from your own figures. It predicts nothing, guarantees no saving and assumes no MAIORIS fee. Nothing is sent or saved.",
      cur: "Currency", curH: "Label used in the results",
      f: { internal: ["Annual cost of a permanent creative leader", "Compensation and charges over 12 months."], recruit: ["Recruitment and onboarding costs", "One-off amount."], years: ["Expected duration of the role (years)", "Recruitment is spread over this period. From 1 to 10."],
        coord: ["Annual cost of coordinating agencies and vendors", "Internal time and management fees."], rework: ["Estimated annual cost of rework and delay", "Your own estimate."],
        level: ["Required level of external leadership", "Share of a full time role you need."], fee: ["Monthly fee of external leadership", "Enter a figure from a proposal. Leave empty if you do not know it: this scenario is then not priced."],
        reworkCut: ["Hypothesis: reduction of rework and delay cost with senior leadership", "Zero by default. Your hypothesis, applied to both scenarios with senior leadership. From 0 to 50%."], coordCut: ["Hypothesis: reduction of coordination cost with senior leadership", "Zero by default. Same principle."] },
      res: "Annualised cost by scenario", sc: { permanent: "Permanent recruitment", distributed: "Distributed agency and vendor management", external: "Externalised creative leadership" },
      lines: { internal: "Permanent creative leader", recruit: "Recruitment and onboarding, annualised", coord: "Agency and vendor coordination", rework: "Rework and delay", fee: "External leadership fees over 12 months" },
      total: "Annualised total", diff: "Difference from distributed management", diffNote: "A difference in cost structure, not a guaranteed saving.", none: "Not priced: enter a monthly fee.",
      cap: "Capacity of a permanent role beyond the stated need", capNote: "If the role were dedicated to this need only, this share of the cost would correspond to capacity you did not state as required. It may be used for other purposes.",
      struct: "Structural differences", structL: ["Permanent recruitment: a lasting commitment and a permanent executive structure, with full time access to one senior profile.", "Distributed management: no additional internal structure, but coordination, governance and consistency have to be provided by the organisation.", "Externalised leadership: no permanent executive structure, a defined scope and rhythm, with agency and production budgets kept separate."],
      ass: "Explicit assumptions", assL: function (v, cur) { var a = ["Annual amounts in " + cur + ", entered by you. No data is taken from elsewhere.", "Recruitment spread over " + v.years + " year(s); role assumed dedicated to this need for the unneeded capacity (required level: " + v.level + "% of a role).", "Coordination and rework costs are the same in every scenario, unless you state a hypothesis.", "No MAIORIS fee is assumed: external fees are the figure you enter."]; a.push(v.reworkCut || v.coordCut ? "Efficiency hypotheses entered: rework and delay −" + v.reworkCut + "%, coordination −" + v.coordCut + "%, applied to both scenarios with senior leadership. These are your hypotheses, not expected results." : "No efficiency hypothesis applied."); return a; },
      opp: "Efficiency opportunities to explore", oppL: ["Rework and delay: clearer briefs and approvals are a frequent lever.", "Coordination: unifying the direction of agencies and vendors can reduce internal management time.", "Governance: creative decisions taken by an identified owner, on stable criteria."], oppNote: "Qualitative leads, not quantified. The real effect depends on your situation.",
      err: "Please check the highlighted fields: positive numbers, within the limits.", reset: "Reset", pct: "% of a role"
    }
  }[lang];
  var DEF = { internal: "", recruit: "", years: "3", coord: "", rework: "", level: "40", fee: "", reworkCut: "0", coordCut: "0" }, state = {}, cur = "FCFA";
  function h(tag, attrs, kids) { var e = document.createElement(tag); if (attrs) Object.keys(attrs).forEach(function (k) { if (k === "text") e.textContent = attrs[k]; else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }
  var NF = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 0 });
  function money(n) { return NF.format(Math.round(n)) + " " + cur; }
  function field(key, slider, min, max, step) {
    var id = "fcl-in-" + key, hint = id + "-h", f = T.f[key], out = h("output", { for: id, class: "fcl-out" });
    var input = slider ? h("input", { id: id, type: "range", min: min, max: max, step: step, value: DEF[key], "aria-describedby": hint })
                       : h("input", { id: id, type: "text", inputmode: "decimal", autocomplete: "off", value: DEF[key], "aria-describedby": hint + " " + id + "-e" });
    state[key] = DEF[key];
    var sync = function () { state[key] = input.value; if (slider) out.textContent = input.value + (key === "level" ? T.pct : " %"); update(); };
    input.addEventListener("input", sync); if (slider) out.textContent = DEF[key] + (key === "level" ? T.pct : " %");
    return h("div", { class: "fcl-f" + (slider ? " fcl-s" : "") }, [h("label", { for: id, text: f[0] }), slider ? out : null, input, h("p", { class: "fcl-h", id: hint, text: f[1] }), h("p", { class: "fcl-e", id: id + "-e", "aria-live": "polite" })]);
  }
  var form = h("form", { class: "fcl-form", novalidate: "", "aria-label": T.res }), results = h("div", { class: "fcl-res", "aria-live": "polite" });
  var curIn = h("input", { id: "fcl-cur", type: "text", maxlength: "6", value: cur, autocomplete: "off", "aria-describedby": "fcl-cur-h" });
  curIn.addEventListener("input", function () { cur = (curIn.value || "").trim().slice(0, 6) || "FCFA"; update(); });
  form.appendChild(h("div", { class: "fcl-f" }, [h("label", { for: "fcl-cur", text: T.cur }), curIn, h("p", { class: "fcl-h", id: "fcl-cur-h", text: T.curH })]));
  [["internal"], ["recruit"], ["years"], ["coord"], ["rework"], ["fee"]].forEach(function (a) { form.appendChild(field(a[0])); });
  form.appendChild(field("level", true, 5, 100, 5)); form.appendChild(field("reworkCut", true, 0, 50, 5)); form.appendChild(field("coordCut", true, 0, 50, 5));
  var reset = h("button", { type: "button", class: "link", text: T.reset }); reset.addEventListener("click", function () { form.querySelectorAll("input").forEach(function (i) { var k = i.id.replace("fcl-in-", ""); if (DEF[k] !== undefined) { i.value = DEF[k]; i.dispatchEvent(new Event("input")); } }); });
  host.appendChild(h("p", { class: "fcl-note", text: T.note })); host.appendChild(form); form.appendChild(h("div", { class: "fcl-act" }, [reset])); host.appendChild(results);
  function ul(items) { return h("ul", { class: "fcl-ul" }, items.map(function (t) { return h("li", { text: t }); })); }
  function update() {
    var r = C.compute(state);
    Object.keys(DEF).forEach(function (k) { var e = document.getElementById("fcl-in-" + k + "-e"), i = document.getElementById("fcl-in-" + k); if (!e) return; var bad = r.ok === false && r.errors[k]; e.textContent = bad ? T.err : ""; if (bad) i.setAttribute("aria-invalid", "true"); else i.removeAttribute("aria-invalid"); });
    results.textContent = ""; if (!r.ok) return;
    var rows = [["permanent"], ["distributed"], ["external"]].map(function (a) {
      var id = a[0], sc = r.scenarios[id], cell = h("div", { class: "fcl-card" }, [h("h4", { text: T.sc[id] })]);
      if (!sc) { cell.appendChild(h("p", { class: "fcl-none", text: T.none })); return cell; }
      cell.appendChild(h("p", { class: "fcl-total" }, [h("span", { text: T.total }), h("b", { text: money(sc.total) })]));
      cell.appendChild(h("ul", { class: "fcl-lines" }, sc.lines.filter(function (l) { return l.amount > 0 || l.id === "fee"; }).map(function (l) { return h("li", null, [h("span", { text: T.lines[l.id] }), h("b", { text: money(l.amount) })]); })));
      if (id !== "distributed" && r.differences[id] !== null) cell.appendChild(h("p", { class: "fcl-diff" }, [h("span", { text: T.diff + " : " }), h("b", { text: (r.differences[id] > 0 ? "+" : r.differences[id] < 0 ? "−" : "") + money(Math.abs(r.differences[id])) })]));
      return cell;
    });
    results.appendChild(h("h3", { text: T.res })); results.appendChild(h("div", { class: "fcl-grid" }, rows)); results.appendChild(h("p", { class: "fcl-h", text: T.diffNote }));
    if (r.values.internal > 0) results.appendChild(h("p", { class: "fcl-cap" }, [h("b", { text: T.cap + " : " + money(r.unusedCapacity) + "." }), h("span", { text: " " + T.capNote })]));
    results.appendChild(h("h4", { text: T.struct })); results.appendChild(ul(T.structL));
    results.appendChild(h("h4", { text: T.ass })); results.appendChild(ul(T.assL(r.values, cur)));
    results.appendChild(h("h4", { text: T.opp })); results.appendChild(ul(T.oppL)); results.appendChild(h("p", { class: "fcl-h", text: T.oppNote }));
  }
  update();
})();
