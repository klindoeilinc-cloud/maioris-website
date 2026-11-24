const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SITE = path.join(__dirname, "../site");
const O = JSON.parse(fs.readFileSync(path.join(__dirname, "../tools/offers.json"), "utf8"));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["admin", "editorial-shell", "assets", "functions"].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
const PAGES = [...walk(path.join(SITE, "fr")), ...walk(path.join(SITE, "en"))];
const PARTNER = (f) => /\/(partners|partenaires)\.html$/.test(f);
const norm = (h) => h.replace(/&nbsp;| | /g, " ");
const fmt = (n) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ");

test("source centrale : Creative Audit marques 750 000 FCFA en 7 à 10 jours ouvrés", () => {
  assert.equal(O.brands.creative_audit.price, 750000);
  assert.deepEqual([O.brands.creative_audit.duration.min, O.brands.creative_audit.duration.max], [7, 10]);
});
test("aucun 800 000 ni durée « 5 à 7 » hors de la branche Partners", () => {
  for (const f of PAGES.filter((f) => !PARTNER(f))) {
    const t = norm(fs.readFileSync(f, "utf8"));
    assert.ok(!/800 000 FCFA|800,000 FCFA/.test(t), "800 000 trouvé dans " + path.relative(SITE, f));
    assert.ok(!/\b5 (à|to) 7 (jours|working)/.test(t), "durée obsolète dans " + path.relative(SITE, f));
  }
});
test("pages de l'audit et des outils : 750 000 FCFA et 7 à 10 jours dans le texte, la description et le JSON-LD", () => {
  for (const f of ["en/advisory/creative-audit.html", "fr/accompagnement/creative-audit.html", "en/creative-operations-intelligence.html", "fr/creative-operations-intelligence.html", "en/creative-maturity-assessment.html", "fr/creative-maturity-assessment.html", "en/brand-consistency-review.html", "fr/brand-consistency-review.html"]) {
    const t = norm(fs.readFileSync(path.join(SITE, f), "utf8"));
    assert.ok(t.includes("750 000 FCFA"), "prix absent : " + f);
    assert.ok(/7 (à|to) 10 (jours ouvrés|working days)/.test(t), "durée absente : " + f);
  }
  for (const f of ["en/advisory/creative-audit.html", "fr/accompagnement/creative-audit.html"]) {
    const t = norm(fs.readFileSync(path.join(SITE, f), "utf8"));
    assert.ok(/name="description"[^>]*>/.test(t) && /7 (à|to) 10/.test(t.match(/<meta content="[^"]*" name="description"/)[0]), "description : " + f);
  }
});
test("niveaux d'accompagnement : même prix d'audit que la page de l'offre", () => {
  for (const f of ["en/advisory/levels.html", "fr/accompagnement/niveaux-d-accompagnement.html"]) assert.ok(norm(fs.readFileSync(path.join(SITE, f), "utf8")).includes("750 000 FCFA"));
});
test("Partners : prix et durées conformes à la source centrale, audit agence distinct de l'audit marques", () => {
  for (const f of PAGES.filter(PARTNER)) {
    const t = norm(fs.readFileSync(f, "utf8"));
    for (const n of [O.partners.audit.price, O.partners.cos.price, O.partners.ai.price, O.partners.fractional.price_per_month, O.bundle.price, O.bundle.separate]) assert.ok(t.includes(fmt(n)) || t.includes(n.toLocaleString("en-US")), f + " : " + n);
    assert.ok(/10 (à|to) 15/.test(t) && /4 (à|to) 6/.test(t) && /3 (à|to) 5/.test(t));
    assert.ok(t.includes("750 000 FCFA") || t.includes("750,000 FCFA"), "comparaison avec l'audit marques");
    assert.ok(/(Agency Creative Audit)/.test(t) && /Creative Audit/.test(t));
  }
});
test("aucun symbole ™, aucun prix interdit sur le site public", () => {
  for (const f of PAGES) { const t = norm(fs.readFileSync(f, "utf8")); assert.ok(!/™|&trade;/.test(t), "™ dans " + f); for (const bad of O.forbidden) assert.ok(!t.includes(bad), bad + " dans " + f); }
});
test("chaque offre Partners a problème, public, périmètre, livrables, durée, prix, exclusions et appel à l'action", () => {
  for (const f of PAGES.filter(PARTNER)) {
    const h = fs.readFileSync(f, "utf8");
    const offers = h.split('class="pt-offer"').slice(1);
    assert.equal(offers.length, 4);
    for (const o of offers) {
      for (const c of ['class="pt-facts"', "pt-del", "pt-price", "pt-meta", "data-offer=", "pt-out"]) assert.ok(o.includes(c), f + " : " + c);
      assert.equal((o.match(/<dt>/g) || []).length, 3, "problème, public, exclusions");
    }
    assert.ok(h.includes('id="compare"') && h.includes('id="boundaries"'));
  }
});
