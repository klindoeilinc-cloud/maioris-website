const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SITE = path.join(__dirname, "../site");
const rd = (p) => fs.readFileSync(path.join(SITE, p), "utf8");
const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const CLAAS = { en: "en/advisory/claas.html", fr: "fr/accompagnement/claas.html" }, MCPS = { en: "en/intelligence-system.html", fr: "fr/systeme-intelligence.html" };

test("leadership fractionné : section économique, comparaison de trois modèles sur sept critères, aucune promesse d'économie", () => {
  for (const l of ["en", "fr"]) {
    const t = rd(CLAAS[l]), b = t.match(/<section class="sec" id="business-case"[\s\S]*?<\/section>/)[0];
    assert.equal((b.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g) || []).length, 7, l + " : sept critères");
    assert.equal((b.match(/<thead>[\s\S]*<\/thead>/)[0].match(/<th scope="col">/g) || []).length, 4, l + " : colonne des critères et trois modèles");
    assert.ok(/id="fcl-sim"/.test(b) && /data-lang="/.test(b));
    const body = text(b);
    assert.ok(!/garanti|guarantee[d]? (saving|return)|économies? garantie|always cheaper|toujours moins cher|moins cher que/i.test(body.replace(/(n'est|is) (systématiquement|systematically)[^.]*\./gi, "").replace(/ne présente aucune[^.]*\./gi, "").replace(/does not present[^.]*\./gi, "").replace(/guarantees no saving/gi, "")), l + " : promesse d'économie");
    assert.ok(/systématiquement moins chère|systematically cheaper|Aucun modèle n'est systématiquement moins cher|No model is systematically cheaper/.test(body), l + " : mention de non-supériorité de coût");
    assert.ok(b.includes('href="../contact.html#claas"') && /Discuss Fractional Leadership|Parler de leadership fractionné/.test(b), l + " : appel à l'action");
    assert.ok(/tools\.[0-9a-f]{8}\.css/.test(t) && /fcl\.[0-9a-f]{8}\.js/.test(t), l + " : ressources du comparateur");
  }
});
test("méthode MCPS : six étapes, cinq rubriques chacune, définition, fondements", () => {
  const labels = { en: ["Purpose", "Strategic question", "Type of intervention", "Expected output", "Observable evidence"], fr: ["Finalité", "Question stratégique", "Type d'intervention", "Résultat attendu", "Preuve observable"] };
  for (const l of ["en", "fr"]) {
    const t = rd(MCPS[l]);
    assert.equal((t.match(/class="vp-stage"/g) || []).length, 6, l);
    for (const lab of labels[l]) assert.equal((t.match(new RegExp(`<b>${lab.replace(/'/g, "(?:'|&#x27;)")}</b>`, "g")) || []).length, 6, l + " : " + lab);
    assert.ok(/strategic operating system designed to transform creative intelligence into structured decisions, operational coherence and measurable creative performance|système d'exploitation stratégique conçu pour transformer l'intelligence créative en décisions structurées, en cohérence opérationnelle et en performance créative mesurable/.test(text(t).replace(/&#x27;/g, "'")), l + " : définition");
    for (const f of ["Theory of Constraints", "Six Sigma", "Systems Thinking"]) assert.ok(t.includes(f), f);
  }
});
test("preuves : six exemples marqués illustratifs, distingués des résultats clients", () => {
  for (const l of ["en", "fr"]) {
    const t = rd(MCPS[l]), s = t.match(/<section class="sec alt" id="mcps-evidence"[\s\S]*?<\/section>/)[0];
    assert.equal((s.match(/class="vp-ex"/g) || []).length, 6, l);
    assert.equal((s.match(/class="vp-tag"/g) || []).length, 6, l + " : étiquette sur chaque exemple");
    assert.ok(/Illustrative example, not a client result|Exemple illustratif, pas un résultat client/.test(s));
    assert.ok(!/\d+\s?%/.test(text(s)), l + " : aucun pourcentage dans les exemples");
  }
});
test("cas documentés : SOCIAM et TCL, impact rapporté tel que documenté, aucun déploiement MCPS revendiqué", () => {
  for (const l of ["en", "fr"]) {
    const t = rd(MCPS[l]), s = t.match(/<section class="sec" id="mcps-cases"[\s\S]*?<\/section>/)[0], body = text(s);
    assert.ok(body.includes("SOCIAM") && body.includes("TCL West Africa 2026"));
    for (const fig of ["260+", "1 845 000", "45 000+"]) assert.ok(body.includes(fig), fig);
    assert.ok(/not independently audited|non audités de façon indépendante/.test(body), l + " : réserve sur les chiffres");
    assert.ok(/No quantified impact is published|Aucun impact chiffré n'est publié/.test(body), l + " : SOCIAM sans chiffre inventé");
    assert.ok(/not presented as full MCPS deployments|pas présentés comme des déploiements complets de MCPS/.test(body));
    assert.ok(s.includes("sociam.html") && s.includes("cas-tcl-west-africa-2026-nasco-maioris.pdf"));
    const pdf = s.match(/href="([^"]*cas-tcl[^"]*\.pdf)"/)[1]; assert.ok(fs.existsSync(path.join(SITE, path.normalize(path.join(path.dirname(MCPS[l]), pdf)))), "PDF présent");
  }
});
test("conversion et liens : appels à l'action de la méthode et liens vers les sept offres", () => {
  for (const l of ["en", "fr"]) {
    const t = rd(MCPS[l]), s = t.match(/<section class="sec alt" id="mcps-services"[\s\S]*?<\/section>/)[0];
    assert.ok(/Explore a Strategic Engagement|Explorer un engagement stratégique/.test(s) && /Request a Creative Audit|Demander un Creative Audit/.test(s));
    assert.ok(s.includes("contact.html#advice") && s.includes("contact.html#audit"));
    assert.equal((s.match(/<li><a href=/g) || []).length, 7);
  }
});
