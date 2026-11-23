/* Interface d'administration : lit l'API /api/admin (protégée par Cloudflare Access). Aucune donnée n'est insérée comme HTML : tout passe par textContent. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = { coi: "Creative Operations", maturity: "Maturity", brand: "Brand Review", brief: "Brief", diag: "Contrainte" };
  function el(tag, attrs, text) { var n = document.createElement(tag); for (var k in attrs || {}) n.setAttribute(k, attrs[k]); if (text !== undefined && text !== null) n.textContent = text; return n; }
  function say(t, bad) { var m = $("msg"); m.textContent = t || ""; m.className = "msg" + (bad ? " err" : ""); }
  function api(path, opt) {
    return fetch("/api/admin/" + path, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, opt || {})).then(function (r) {
      if (r.status === 401 || r.status === 403 || r.status === 503) { var e = new Error("access"); e.status = r.status; throw e; }
      return r;
    });
  }
  function fail(e) {
    if (e && e.status === 503) say("L'administration n'est pas encore configurée (Cloudflare Access, base de données).", true);
    else if (e && (e.status === 401 || e.status === 403)) say("Accès refusé. Connectez-vous avec une adresse autorisée.", true);
    else say("Une erreur est survenue. Réessayez.", true);
  }
  function date(s) { return s ? s.slice(0, 16).replace("T", " ") : ""; }

  function loadStats() {
    return api("stats").then(function (r) { return r.json(); }).then(function (j) {
      var box = $("stats"); box.textContent = "";
      function stat(v, l) { var d = el("div", { "class": "stat" }); d.appendChild(el("b", {}, String(v))); d.appendChild(el("span", {}, l)); box.appendChild(d); }
      stat(j.total, "évaluations conservées"); j.by_tool.forEach(function (t) { stat(t.n, NAMES[t.tool_id] || t.tool_id); }); stat(j.expiring_30d, "expirent sous 30 jours");
    });
  }
  function loadList() {
    var p = new URLSearchParams(); if ($("tool").value) p.set("tool", $("tool").value); if ($("q").value.trim()) p.set("q", $("q").value.trim());
    return api("evaluations?" + p.toString()).then(function (r) { return r.json(); }).then(function (j) {
      var tb = $("rows"); tb.textContent = "";
      if (!j.items.length) { var tr0 = el("tr"); var td0 = el("td", { colspan: "7" }, "Aucune évaluation."); tr0.appendChild(td0); tb.appendChild(tr0); return; }
      j.items.forEach(function (it) {
        var tr = el("tr", { "class": "row" + (it.deleted_at ? " deleted" : ""), tabindex: "0" });
        [date(it.submitted_at), NAMES[it.tool_id] || it.tool_id, it.org_name || "", [it.contact_name, it.contact_email].filter(Boolean).join(" · "), it.headline || "", it.email_status || "", date(it.expires_at)].forEach(function (v) { tr.appendChild(el("td", {}, v)); });
        function open() { showDetail(it.id); }
        tr.addEventListener("click", open); tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
        tb.appendChild(tr);
      });
    });
  }
  function showDetail(id) {
    say("");
    api("evaluations/" + id).then(function (r) { return r.json(); }).then(function (j) {
      var d = $("detail"); d.textContent = ""; d.hidden = false;
      d.appendChild(el("h2", {}, (NAMES[j.evaluation.tool_id] || j.evaluation.tool_id) + " · " + j.evaluation.questionnaire_version_id));
      var dl = el("dl"); function row(k, v) { dl.appendChild(el("dt", {}, k)); dl.appendChild(el("dd", {}, v === null || v === undefined || v === "" ? "—" : String(v))); }
      row("Reçue le", date(j.evaluation.submitted_at)); row("Expire le", date(j.evaluation.expires_at)); row("Résultat", j.evaluation.headline); row("Complétude", j.evaluation.completeness); row("Base des données", j.evaluation.basis);
      row("E-mail à l'équipe", j.evaluation.email_status); row("Organisation", j.profile && j.profile.org_name); row("Secteur · taille · marché", j.profile && [j.profile.sector, j.profile.size, j.profile.market].filter(Boolean).join(" · "));
      row("Contact", j.contact && [j.contact.name, j.contact.email].filter(Boolean).join(" · "));
      row("Consentement", j.consent && j.consent.text_id + " le " + date(j.consent.granted_at)); d.appendChild(dl);
      if (j.consent) { d.appendChild(el("h3", {}, "Libellé consenti")); d.appendChild(el("pre", {}, j.consent.body)); }
      d.appendChild(el("h3", {}, "Indicateurs")); d.appendChild(el("pre", {}, j.metrics.map(function (m) { return [m.metric_key, m.dimension_id, m.status === "ok" ? [m.value_num, m.lo_num, m.hi_num].filter(function (x) { return x !== null; }).join(" / ") : "non calculé", m.unit || ""].join(" · "); }).join("\n") || "—"));
      d.appendChild(el("h3", {}, "Réponses")); d.appendChild(el("pre", {}, j.answers ? JSON.stringify(j.answers, null, 2) : "—"));
      j.reports.forEach(function (r) { d.appendChild(el("h3", {}, "Rapport (" + r.kind + ", " + r.generated_by + ")")); d.appendChild(el("pre", {}, r.content || "— effacé —")); });
      if (j.profile && j.profile.status === "active") {
        var b = el("button", { type: "button", "class": "danger" }, "Effacer ce profil et toutes ses évaluations");
        b.addEventListener("click", function () { if (!confirm("Effacer définitivement le contenu de ce profil ? Cette action est journalisée et irréversible.")) return; api("erase", { method: "POST", body: JSON.stringify({ profile_id: j.profile.id }) }).then(function () { say("Profil effacé."); d.hidden = true; return Promise.all([loadStats(), loadList()]); }).catch(fail); });
        d.appendChild(b);
      }
      d.scrollIntoView({ block: "nearest" });
    }).catch(fail);
  }
  $("go").addEventListener("click", function () { loadList().catch(fail); });
  $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") loadList().catch(fail); });
  $("csv").addEventListener("click", function () { window.location.href = "/api/admin/export?format=csv" + ($("tool").value ? "&tool=" + encodeURIComponent($("tool").value) : ""); });
  $("purge").addEventListener("click", function () {
    if (!confirm("Purger toutes les données dont la durée de conservation est dépassée ? Cette action est journalisée et irréversible.")) return;
    api("purge", { method: "POST" }).then(function (r) { return r.json(); }).then(function (j) { say("Purge effectuée : " + j.evaluations + " évaluation(s), " + j.profiles + " profil(s), " + j.documents + " document(s)."); return Promise.all([loadStats(), loadList()]); }).catch(fail);
  });
  api("me").then(function (r) { return r.json(); }).then(function (j) { $("who").textContent = "Connecté : " + j.email; return Promise.all([loadStats(), loadList()]); }).catch(function (e) { $("who").textContent = "Accès non établi"; fail(e); });
})();
