/* rendez-vous : le calendrier Cal.com ne se charge qu'à la demande du visiteur (sans dépendance) */
(function () {
  var btn = document.getElementById("bk-open"), box = document.getElementById("bk-frame");
  if (!btn || !box) return;
  function open() {
    if (box.querySelector("iframe")) return;
    var f = document.createElement("iframe");
    f.src = btn.dataset.src; f.title = btn.dataset.title; f.loading = "lazy";
    f.setAttribute("allow", "payment"); f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    box.appendChild(f); box.hidden = false;
    btn.setAttribute("aria-expanded", "true"); btn.hidden = true;
    if (window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    f.focus();
  }
  btn.addEventListener("click", open);
  // le lien « Réserver » du bandeau de contact mène ici et déplie directement le calendrier
  if (location.hash === "#reserver") setTimeout(open, 0);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#reserver"]');
    if (a) setTimeout(open, 0);
  });
})();
