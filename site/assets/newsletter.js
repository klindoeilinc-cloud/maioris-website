/* lettre MAIORIS Insights : envoi du formulaire d'inscription (sans dépendance) */
(function () {
  var form = document.querySelector(".nl-form");
  if (!form) return;
  var status = form.querySelector(".nl-status"), btn = form.querySelector("button[type=submit]");
  var email = form.querySelector("input[name=email]"), consent = form.querySelector("input[name=consent]");
  function say(msg, kind) { status.textContent = msg; status.className = "nl-status" + (kind ? " " + kind : ""); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    email.removeAttribute("aria-invalid"); consent.removeAttribute("aria-invalid");
    var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    if (!okMail || !consent.checked) {
      if (!okMail) email.setAttribute("aria-invalid", "true");
      if (!consent.checked) consent.setAttribute("aria-invalid", "true");
      say(form.dataset.need, "err"); (!okMail ? email : consent).focus(); return;
    }
    btn.disabled = true; say(form.dataset.sending, "");
    fetch("/api/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value.trim(), consent: true, lang: form.dataset.lang, website: form.querySelector("input[name=website]").value })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, status: r.status }; }); })
      .then(function (res) {
        if (res.ok) { say(form.dataset.ok, "ok"); form.reset(); }
        else { say(res.status === 429 ? form.dataset.rate : form.dataset.err, "err"); btn.disabled = false; }
      })
      .catch(function () { say(form.dataset.err, "err"); btn.disabled = false; });
  });
})();
