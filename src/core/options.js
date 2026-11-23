/* MAIORIS INTELLIGENCE CORE : listes d'options communes aux outils (secteur, taille). Une seule définition. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MaiorisOptions = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function o(id, fr, en) { return { id: id, l: { fr: fr, en: en } }; }
  return {
    sector: [o("bank", "Banque, finance et assurance", "Banking, finance and insurance"), o("telco", "Télécommunications et technologies", "Telecommunications and technology"),
      o("retail", "Grande distribution et commerce", "Retail and distribution"), o("fmcg", "Agroalimentaire et FMCG", "Food and FMCG"),
      o("auto", "Automobile et mobilité", "Automotive and mobility"), o("realestate", "Immobilier et construction", "Real estate and construction"),
      o("energy", "Énergie, pétrole et mines", "Energy, oil and mining"), o("health", "Santé et industrie pharmaceutique", "Health and pharmaceuticals"),
      o("transport", "Transport et logistique", "Transport and logistics"), o("public", "Institutions et secteur public", "Institutions and public sector"),
      o("media", "Médias, culture et divertissement", "Media, culture and entertainment"), o("other", "Autre", "Other")],
    size: [o("lt20", "Moins de 20 collaborateurs", "Fewer than 20 employees"), o("20_49", "20 à 49 collaborateurs", "20 to 49 employees"), o("50_99", "50 à 99 collaborateurs", "50 to 99 employees"),
      o("100_249", "100 à 249 collaborateurs", "100 to 249 employees"), o("250_499", "250 à 499 collaborateurs", "250 to 499 employees"), o("500_999", "500 à 999 collaborateurs", "500 to 999 employees"),
      o("1000p", "1 000 collaborateurs et plus", "1,000 employees or more")]
  };
});
