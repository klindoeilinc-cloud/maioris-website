// Test de bout en bout de Creative Operations Intelligence. Prérequis : un serveur local qui applique le CSP de _headers.
// Usage : BASE=http://127.0.0.1:8123 node tests/e2e/coi.e2e.js
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8123";
const nb = (s) => s.replace(/[  ]/g, " ");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };

async function pickRadio(page, q, id) { await page.check(`#q-${q}-${id}`, { force: true }); }
async function run(browser, lang, profile) {
  const url = `${BASE}/${lang}/creative-operations-intelligence`, ctx = await browser.newContext(profile ? { ...devices[profile] } : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(), problems = [], posts = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/plausible/i.test(m.text())) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("request", (r) => { if (r.method() === "POST") posts.push(r.postData()); });
  await page.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  console.log(`\n== ${lang} ${profile || "desktop"}`);
  await page.goto(url); await page.waitForSelector("#coi [data-coi-body] h2");
  const T = { fr: { start: "Étape 1 sur 5", next: "Continuer", back: "Précédent", calc: "Calculer mon Creative Operations Snapshot", recap: "Voir le récapitulatif" }, en: { start: "Step 1 of 5", next: "Continue", back: "Back", calc: "Calculate my Creative Operations Snapshot", recap: "Review summary" } }[lang];
  ok((await page.textContent("[data-coi-head]")).includes(T.start), "indicateur d'étape 1 sur 5");
  ok(+(await page.locator('[role=progressbar]').getAttribute("aria-valuenow")) <= 10, "progression initiale faible (semaines préremplies seulement)");
  // validation : continuer sans répondre
  await page.click(`button:has-text("${T.next}")`);
  ok(await page.locator(".coi-err:not(:empty)").count() === 3, "3 erreurs affichées à l'étape 1");
  ok((await page.evaluate(() => document.activeElement && document.activeElement.type)) === "radio", "focus sur le premier champ en erreur");
  await pickRadio(page, "sector", "bank"); await pickRadio(page, "size", "100_249"); await pickRadio(page, "model", "multi");
  await page.click(`button:has-text("${T.next}")`);
  ok((await page.textContent("[data-coi-head]")).includes(lang === "fr" ? "Étape 2 sur 5" : "Step 2 of 5"), "passage à l'étape 2");
  // montant invalide, négatif
  await page.fill("#q-budget", "abc"); await pickRadio(page, "projects", "50_99"); await page.check("#q-types-c360", { force: true }); await pickRadio(page, "rework", "26_50");
  ok((await page.textContent("#q-budget-e")).length > 0, "erreur immédiate sur un montant invalide");
  await page.fill("#q-budget", "-5"); await page.click(`button:has-text("${T.next}")`);
  ok(await page.locator("#q-budget").getAttribute("aria-invalid") === "true", "montant négatif refusé");
  await page.fill("#q-budget", lang === "fr" ? "100 000 000" : "100,000,000"); await page.click(`button:has-text("${T.next}")`);
  // gouvernance
  await pickRadio(page, "levels", "4"); await pickRadio(page, "people", "7_10"); await pickRadio(page, "cycles", "4_5"); await pickRadio(page, "changes", "frequent");
  await page.check("#q-factors-brief", { force: true }); await page.check("#q-factors-stakeholders", { force: true });
  await page.click(`button:has-text("${T.next}")`);
  ok(await page.locator("#q-factors-err, #q-factors-e").first().textContent().then((x) => x.length > 0), "principal facteur exigé quand plusieurs choix");
  await page.check("#q-factors-m-stakeholders", { force: true });
  // retour : réponses conservées
  await page.click(`button:has-text("${T.back}")`); await page.click(`button:has-text("${T.next}")`);
  ok(await page.isChecked("#q-factors-m-stakeholders") && await page.isChecked("#q-levels-4"), "réponses conservées après Précédent");
  await page.click(`button:has-text("${T.next}")`);
  // coûts
  ok(await page.inputValue("#q-weeks") === "48", "semaines par défaut 48");
  await page.fill("#q-hours", "20"); await pickRadio(page, "avoidable", "26_50"); await page.fill("#q-hourly", "5000"); await page.check("#q-extra-overtime", { force: true });
  await page.check("#q-extra-none", { force: true });
  ok(!(await page.isChecked("#q-extra-overtime")), "choix exclusif : « aucun » décoche les autres");
  await page.check("#q-extra-overtime", { force: true }); ok(!(await page.isChecked("#q-extra-none")), "cocher un surcoût décoche « aucun »");
  await page.click(`button:has-text("${T.next}")`);
  // enjeux : maximum 3
  for (const id of ["diff", "consistency", "lead"]) await page.check(`#q-challenges-${id}`, { force: true });
  await page.click("label[for=q-challenges-corrections]");
  ok(!(await page.isChecked("#q-challenges-corrections")), "quatrième enjeu refusé");
  await page.check("#q-challenges-m-lead", { force: true }); await pickRadio(page, "outcome", "costs"); await pickRadio(page, "horizon", "3m");
  await page.click(`button:has-text("${T.recap}")`);
  ok((await page.textContent("[data-coi-body]")).includes("100"), "récapitulatif affiché");
  ok(await page.locator('[role=progressbar]').getAttribute("aria-valuenow") === "100", "progression 100 %");
  await page.click(`button:has-text("${T.calc}")`);
  await page.waitForSelector("#coi-result[data-ready]");
  const res = nb(await page.textContent("#coi-result"));
  const f = (n) => nb(new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB").format(n).replace(/ /g, " "));
  ok(res.includes(f(38000000)), "coût externe central 38 000 000");
  ok(res.includes(f(26000000)) && res.includes(f(50000000)), "fourchette externe 26 à 50 millions");
  ok(res.includes(f(1824000)), "coût interne central 1 824 000");
  ok(res.includes(f(39824000)), "total central 39 824 000 (A + C)");
  ok(res.includes(f(27248000)) && res.includes(f(52400000)), "fourchette du total");
  ok(res.includes(f(365)), "heures évitables centrales 365");
  ok(res.includes(lang === "fr" ? "Cycles de correction : 4 à 5" : "Correction cycles: 4 to 5"), "principal point de gouvernance");
  ok(res.includes(lang === "fr" ? "Multiplication des interlocuteurs" : "Too many stakeholders"), "principal facteur de friction");
  ok(res.includes(lang === "fr" ? "Délais de production trop longs" : "Production lead times too long"), "principal enjeu");
  ok(!/\b250[\s ,]?000\b/.test(res) && !(await page.textContent("#coi-cta")).match(/\b250[\s ,]000\b/), "250 000 jamais affiché");
  const cta = await page.textContent("#coi-cta");
  ok(nb(cta).includes("750 000 FCFA"), "prix officiel 750 000 FCFA");
  ok(await page.locator("#coi-cta a.btn").getAttribute("href") === (lang === "fr" ? "accompagnement/creative-audit.html" : "advisory/creative-audit.html"), "lien Creative Audit");
  ok(posts.length === 0, "aucune requête POST avant action explicite");
  // envoi facultatif
  await page.fill("#coi-send [name=name]", "Test"); await page.fill("#coi-send [name=email]", "test@example.com");
  await page.click("#coi-send button[type=submit]");
  ok((await page.textContent("#coi-send-status")).length > 0 && posts.length === 0, "envoi refusé sans consentement");
  await page.waitForTimeout(16000);
  await page.check("#coi-send [name=consent]"); await page.click("#coi-send button[type=submit]");
  await page.waitForFunction(() => document.getElementById("coi-send-status").textContent.length > 0 && document.querySelector("#coi-send button").disabled);
  ok(posts.length === 1 && JSON.parse(posts[0]).consent === true && JSON.parse(posts[0]).answers.budget, "envoi avec consentement : un seul POST contenant les réponses");
  // pas de dépassement horizontal
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(ov <= 0, "aucun défilement horizontal (" + ov + ")");
  ok(problems.length === 0, "aucune erreur console ni violation CSP " + JSON.stringify(problems));
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/coi-${lang}-${profile || "desk"}.png`.replace(/ /g, "") : undefined, fullPage: true }).catch(() => {});
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  for (const lang of ["fr", "en"]) { await run(b, lang, null); }
  await run(b, "fr", "iPhone 13");
  await b.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
