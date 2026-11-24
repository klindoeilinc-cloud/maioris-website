const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SITE = path.join(__dirname, "../site");
const rd = (p) => fs.readFileSync(path.join(SITE, p), "utf8");
const JOURNEY = { en: "en/how-engagement-works.html", fr: "fr/comment-se-deroule-une-mission.html" };

test("page « How engagement works » : cinq étapes dans l'ordre, quatre rubriques chacune, FR et EN", () => {
  const names = { en: ["Initial Contact", "Strategic Discovery", "Strategic Recommendation", "Proposal and Agreement", "Engagement and Activation"], fr: ["Premier contact", "Découverte stratégique", "Recommandation stratégique", "Proposition et accord", "Engagement et activation"] };
  const labels = { en: ["What happens", "What you can expect", "What we need from you", "What happens next"], fr: ["Ce qui se passe", "Ce que vous pouvez attendre", "Ce dont nous avons besoin", "Et ensuite"] };
  for (const l of ["en", "fr"]) {
    const t = rd(JOURNEY[l]);
    assert.equal((t.match(/class="pj-stage"/g) || []).length, 5, l);
    let last = -1; for (const n of names[l]) { const i = t.indexOf(`<h3>${n}</h3>`); assert.ok(i > last, l + " : " + n); last = i; }
    for (const lab of labels[l]) assert.equal((t.match(new RegExp(`<h4>${lab}</h4>`, "g")) || []).length, 5, l + " : " + lab);
    assert.equal((t.match(/<h1[ >]/g) || []).length, 1);
    assert.match(t, /hreflang="en"/); assert.match(t, /hreflang="fr"/);
  }
});
test("page du parcours : aucun prix, délai de réponse ni engagement chiffré inventé", () => {
  for (const l of ["en", "fr"]) {
    const body = rd(JOURNEY[l]).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(!/FCFA|\d+\s?(h|heures|hours|jours|days)\b/i.test(body.replace(/trentaine de minutes|thirty minutes/g, "")), l + " : chiffre ou prix détecté");
  }
});
test("chaque offre a un bouton principal adapté, un accès au contact et un lien vers le parcours", () => {
  const cases = [
    ["en/advisory/mcps-diagnostic.html", "Request an MCPS Diagnostic", "../contact.html#diagnostic", "../how-engagement-works.html"],
    ["en/advisory/brand-intelligence.html", "Discuss Brand Intelligence", "../contact.html#brand", "../how-engagement-works.html"],
    ["en/advisory/growth-architecture.html", "Discuss Growth Architecture", "../contact.html#growth", "../how-engagement-works.html"],
    ["en/advisory/creative-operating-system.html", "Discuss a Creative Operating System", "../contact.html#cos", "../how-engagement-works.html"],
    ["en/advisory/transformation-90.html", "Discuss Transformation 90", "../contact.html#t90", "../how-engagement-works.html"],
    ["en/advisory/claas.html", "Explore Creative Leadership as a Service", "../contact.html#claas", "../how-engagement-works.html"],
    ["en/advisory/creative-audit.html", "Request a Creative Audit", "../contact.html#audit", "../how-engagement-works.html"],
    ["fr/accompagnement/diagnostic-mcps.html", "Demander un MCPS Diagnostic", "../contact.html#diagnostic", "../comment-se-deroule-une-mission.html"],
    ["fr/accompagnement/brand-intelligence.html", "Parler de Brand Intelligence", "../contact.html#brand", "../comment-se-deroule-une-mission.html"],
    ["fr/accompagnement/growth-architecture.html", "Parler de Growth Architecture", "../contact.html#growth", "../comment-se-deroule-une-mission.html"],
    ["fr/accompagnement/creative-operating-system.html", "Parler d'un Creative Operating System", "../contact.html#cos", "../comment-se-deroule-une-mission.html"],
    ["fr/accompagnement/transformation-90.html", "Parler de Transformation 90", "../contact.html#t90", "../comment-se-deroule-une-mission.html"],
    ["fr/accompagnement/claas.html", "Explorer Creative Leadership as a Service", "../contact.html#claas", "../comment-se-deroule-une-mission.html"],
    ["fr/accompagnement/creative-audit.html", "Demander un Creative Audit", "../contact.html#audit", "../comment-se-deroule-une-mission.html"],
  ];
  for (const [f, label, dest, journey] of cases) {
    const t = rd(f);
    assert.ok(new RegExp(`<a [^>]*href="${dest.replace(/[.#]/g, "\\$&")}"[^>]*>${label.replace(/'/g, "(?:'|&#x27;|&#39;)")}</a>`).test(t), f + " : bouton principal " + label);
    assert.ok(t.includes(`href="${journey}"`), f + " : lien vers le parcours");
  }
});
test("niveaux d'accompagnement : Creative Direction et Campaign Architect ont situation, intervention, résultat, livrables et prochaine étape", () => {
  for (const f of ["en/advisory/levels.html", "fr/accompagnement/niveaux-d-accompagnement.html"]) {
    const t = rd(f);
    assert.equal((t.match(/<dl class="lv-ex">/g) || []).length, 2);
    assert.equal((t.match(/<dt>(Situation|Intervention|Outcome|Résultat|Deliverables|Livrables)<\/dt>/g) || []).length, 8, f);
    assert.ok(t.includes("contact.html#advice") && t.includes("contact.html#audit"));
    assert.ok(/750 000 FCFA/.test(t.replace(/&nbsp;|\u00a0|\u202f/g, " ")), "prix du Creative Audit inchangé");
  }
});
test("contact : option Creative Audit et lien vers le parcours ; pied de page et sitemap", () => {
  for (const [f, j] of [["en/contact.html", "how-engagement-works.html"], ["fr/contact.html", "comment-se-deroule-une-mission.html"]]) { const t = rd(f); assert.ok(t.includes('name="support" type="radio" value="audit"')); assert.ok(t.includes(`href="${j}"`)); }
  assert.ok(rd("en/faq.html").includes('href="how-engagement-works.html"') && rd("fr/faq.html").includes('href="comment-se-deroule-une-mission.html"'));
  const sm = rd("sitemap.xml"); assert.ok(sm.includes("/en/how-engagement-works<") && sm.includes("/fr/comment-se-deroule-une-mission<"));
  assert.ok(rd("en/partners.html").includes('href="how-engagement-works.html"') && rd("fr/marques-et-groupes.html").includes('href="comment-se-deroule-une-mission.html"'));
});
