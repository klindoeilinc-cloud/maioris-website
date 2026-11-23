/* Section éditoriale : progression de lecture et sommaire actif. Aucune dépendance, aucun suivi. */
(function () {
  "use strict";
  var art = document.querySelector(".ed-prose"); if (!art) return;
  var bar = document.getElementById("ed-prog"), links = Array.prototype.slice.call(document.querySelectorAll(".ed-toc a, .ed-side a")), heads = Array.prototype.slice.call(art.querySelectorAll("h2[id], h3[id]"));
  var ticking = false;
  function update() {
    ticking = false;
    var r = art.getBoundingClientRect(), total = r.height - window.innerHeight * 0.5, done = Math.min(Math.max(-r.top + window.innerHeight * 0.2, 0), Math.max(total, 1));
    if (bar) bar.style.width = Math.round(done / Math.max(total, 1) * 100) + "%";
    var cur = null; heads.forEach(function (h) { if (h.getBoundingClientRect().top < 140) cur = h.id; });
    links.forEach(function (a) { if (cur && a.getAttribute("href") === "#" + cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
  update();
})();
