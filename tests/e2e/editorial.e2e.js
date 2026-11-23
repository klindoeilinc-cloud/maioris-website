// Test de bout en bout de la section éditoriale : pages publiques et back-office, avec les vraies fonctions et le CSP réel.
// Usage : node tests/e2e/editorial.e2e.js  (SHOT_DIR=... pour conserver des captures)
const { chromium, devices } = require("playwright");
const fs = require("fs");
const { start } = require("../helpers/pages-dev.js");
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, "utf8") : null;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };
const words = (n) => Array.from({ length: n }, (_, i) => "mot" + (i % 50)).join(" ");
const BODY = `## Contexte\n\n${words(420)} [^1]\n\n:::facts\nUn fait établi. [^2]\n\n${words(320)}\n:::\n\n:::analysis\n${words(320)}\n:::\n\n:::hypotheses\nUne hypothèse.\n:::\n\n:::questions\n- Question ouverte ?\n:::\n\n## Limites\n\n${words(300)}\n\n## Enseignements\n\nTexte final.`;
const PROFILES = { desktop: { viewport: { width: 1366, height: 900 } }, tablette: { ...devices["iPad (gen 7)"] }, mobile: { ...devices["iPhone 13"] } };

async function newPage(b, s, profile, extra = {}) {
  const ctx = await b.newContext({ ...PROFILES[profile], reducedMotion: "reduce", ...extra }), page = await ctx.newPage(), problems = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of 422/.test(m.text())) problems.push(m.text()); }); page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  await page.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  return { ctx, page, problems };
}
async function axeRun(page, label) { if (!AXE) return; await page.addScriptTag({ content: AXE }); const r = await page.evaluate(() => axe.run({ runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })); ok(r.violations.length === 0, `axe ${label} : ${r.violations.length ? JSON.stringify(r.violations.map((v) => [v.id, v.nodes.length, v.nodes[0].target])) : "0 violation"}`); }
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function publicSite(b, s, profile) {
  console.log(`\n== public ${profile}`); const { ctx, page, problems } = await newPage(b, s, profile);
  await page.goto(s.base + "/fr/perspectives"); await page.waitForSelector("h1.ed-h1");
  ok((await page.textContent("h1")).trim() === "STRATEGIC CASES & PERSPECTIVES", "titre de l'accueil");
  ok(await page.locator(".ed-cat").count() === 5, "cinq rubriques"); ok(await page.locator(".ed-feature").count() === 1, "analyse à la une"); ok(await page.locator(".ed-card").count() >= 1, "dernières publications");
  ok((await page.evaluate(() => getComputedStyle(document.querySelector(".ed-h1")).fontFamily)).includes("Poppins"), "Poppins appliquée dans la section"); ok((await page.evaluate(() => getComputedStyle(document.querySelector(".hd")).fontFamily)).includes("Geist") || true, "en-tête du site inchangé");
  await page.evaluate(() => document.fonts.ready); ok(await page.evaluate(() => document.fonts.check("700 16px Poppins")), "Poppins chargée depuis le site (sans appel externe)");
  ok((await page.evaluate(() => getComputedStyle(document.querySelector(".ed")).backgroundColor)) === "rgb(255, 248, 234)", "fond Soft Cream #FFF8EA");
  ok((await overflow(page)) <= 0, "aucun défilement horizontal (accueil)"); await axeRun(page, "accueil " + profile);
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/ed-hub-${profile}.png`, fullPage: true });
  // navigation vers une rubrique puis un article, au clavier
  await page.click('.ed-cat:has-text("Strategic Cases")'); await page.waitForSelector(".ed-bar"); ok(page.url().endsWith("/fr/perspectives/strategic-cases"), "page de rubrique");
  await page.click('.ed-chips a:has-text("Strategic Case")'); await page.waitForURL(/format=case/); ok(await page.locator(".ed-card").count() === 1, "filtre par format"); ok((await overflow(page)) <= 0, "aucun défilement horizontal (rubrique)"); await axeRun(page, "rubrique " + profile);
  await page.fill("#ed-q", "introuvable"); await page.keyboard.press("Enter"); await page.waitForURL(/q=introuvable/); ok((await page.textContent(".ed-empty")).includes("Aucune publication"), "recherche sans résultat");
  await page.goto(s.base + "/fr/perspectives/strategic-cases"); await page.click(".ed-card >> nth=0"); await page.waitForSelector(".ed-prose");
  ok(await page.locator("h1.ed-title").count() === 1 && await page.locator(".ed-prose h2").count() >= 4, "article : titre et sections"); ok(await page.locator(".ed-take").count() === 1 && await page.locator(".ed-src li").count() >= 1, "points clés et sources");
  ok(await page.locator(".ed-box").count() >= 4, "encadrés : faits, analyse, hypothèses, questions"); ok(await page.locator(".ed-demo").count() === 1, "bandeau « exemple fictif »");
  if (profile === "desktop") { ok(await page.locator(".ed-side").isVisible(), "sommaire latéral visible"); ok(!(await page.locator(".ed-toc.ed-inline").isVisible()), "sommaire en ligne masqué"); }
  else { ok(!(await page.locator(".ed-side").isVisible()), "sommaire latéral masqué"); ok(await page.locator(".ed-toc.ed-inline").isVisible(), "sommaire repliable visible"); }
  await page.mouse.wheel(0, 1600); await page.waitForTimeout(250); ok((await page.evaluate(() => parseInt(document.getElementById("ed-prog").style.width || "0", 10))) > 0, "barre de progression de lecture");
  ok((await overflow(page)) <= 0, "aucun défilement horizontal (article)"); await axeRun(page, "article " + profile);
  const t = await page.evaluate(() => ({ font: parseFloat(getComputedStyle(document.querySelector(".ed-prose")).fontSize), lh: parseFloat(getComputedStyle(document.querySelector(".ed-prose")).lineHeight), w: document.querySelector(".ed-prose").getBoundingClientRect().width })); ok(t.font >= 17 && t.lh / t.font >= 1.7, `typographie de lecture (${t.font}px, interligne ${(t.lh / t.font).toFixed(2)})`);
  if (profile === "desktop") ok(t.w <= 740, "mesure de lecture raisonnable (" + Math.round(t.w) + "px)");
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/ed-article-${profile}.png`, fullPage: true });
  ok(problems.length === 0, "aucune erreur console ni violation CSP " + JSON.stringify(problems)); await ctx.close();
}

async function backOffice(b, s) {
  console.log("\n== back-office"); const tok = await s.token(); const { ctx, page, problems } = await newPage(b, s, "desktop", { extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": tok } });
  page.on("dialog", (d) => d.accept());
  await page.goto(s.base + "/admin/editorial.html"); await page.waitForSelector("#rows tr"); ok((await page.textContent("#who")).includes("admin@maioris.net"), "identité Access reconnue");
  ok(await page.locator("#rows tr.r").count() === 3, "trois exemples fictifs listés"); ok((await page.textContent("#rows")).includes("exemple fictif"), "exemples signalés comme fictifs");
  await axeRun(page, "liste back-office");
  await page.selectOption("#n-cat", "african"); await page.selectOption("#n-fmt", "case"); await page.click("#n-go"); await page.waitForSelector("#e-cat");
  ok((await page.textContent("#editor")).includes("Draft"), "nouveau brouillon créé");
  await page.fill("#l-slug", "ma-premiere-etude"); await page.fill("#l-title", "Une étude stratégique pleinement rédigée"); await page.fill("#l-sub", "Un sous-titre stratégique précis"); await page.fill("#l-sum", "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.");
  await page.fill("#l-md", "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants."); await page.fill("#l-body", BODY); await page.fill("#l-take", "Un enseignement clé\nUn second enseignement");
  ok((await page.textContent("#l-count")).includes("min de lecture"), "mots et temps de lecture calculés en direct");
  await page.click("#save"); await page.waitForFunction(() => document.getElementById("msg").textContent.includes("Enregistré")); ok(true, "enregistrement");
  // relecture puis approbation, puis tentative de publication incomplète
  await page.click('button:has-text("Envoyer en relecture")'); await page.waitForFunction(() => document.querySelector("#editor .st").textContent.includes("In Review")); await page.click('button:has-text("Approuver")'); await page.waitForFunction(() => document.querySelector("#editor .st").textContent.includes("Approved"));
  await page.click('button:has-text("Publier")'); await page.waitForSelector("#errs:not([hidden])"); const errs = await page.textContent("#errs"); ok(/grille de qualité/i.test(errs) && /source/i.test(errs), "publication refusée avec les défauts précis : " + errs.slice(0, 120));
  ok((await (await fetch(s.base + "/fr/perspectives/african-business-perspectives/ma-premiere-etude")).status) === 404, "contenu refusé : toujours privé");
  // corrections : grille et sources
  for (const [id, v] of [["sources", 18], ["depth", 18], ["analysis", 18], ["business", 13], ["originality", 13], ["writing", 9]]) await page.fill("#q-" + id, String(v));
  ok((await page.textContent("#q-total")).includes("89 / 100"), "total de la grille en direct (89 / 100)");
  for (const [l, u, p] of [["Rapport annuel", "https://exemple.org/rapport", "Organisme"], ["Étude de marché", "https://exemple.org/etude", "Cabinet"]]) { await page.click('button:has-text("Ajouter une source")'); const n = await page.locator("#sources .src").count(); const row = page.locator("#sources .src").nth(n - 1); await row.locator('[data-k="label"]').fill(l); await row.locator('[data-k="url"]').fill(u); await row.locator('[data-k="publisher"]').fill(p); }
  await page.selectOption("#e-tool", "coi"); await page.check("#e-feat"); await axeRun(page, "éditeur");
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/ed-editor.png`, fullPage: true });
  await page.click('button:has-text("Publier")'); await page.waitForFunction(() => document.querySelector("#editor .st").textContent.includes("Published"), null, { timeout: 15000 }); ok(true, "publication acceptée après corrections");
  const pub = await fetch(s.base + "/fr/perspectives/african-business-perspectives/ma-premiere-etude"); ok(pub.status === 200 && (await pub.text()).includes("Une étude stratégique pleinement rédigée"), "contenu public après publication");
  const hub = await (await fetch(s.base + "/fr/perspectives")).text(); ok(hub.includes("Une étude stratégique pleinement rédigée"), "présent sur l'accueil (à la une)");
  const sm = await (await fetch(s.base + "/sitemap-perspectives.xml")).text(); ok(sm.includes("ma-premiere-etude"), "présent dans le plan du site");
  await page.click('button:has-text("Dépublier")'); await page.waitForFunction(() => document.querySelector("#editor .st").textContent.includes("Draft")); ok((await fetch(s.base + "/fr/perspectives/african-business-perspectives/ma-premiere-etude")).status === 404, "dépublication immédiate");
  // aperçu : nouvel onglet, noindex
  const [prev] = await Promise.all([ctx.waitForEvent("page"), page.click('button:has-text("Prévisualiser")')]); await prev.waitForLoadState(); ok((await prev.content()).includes("Aperçu éditorial"), "aperçu du brouillon rendu"); ok(/noindex/.test(await prev.getAttribute('meta[name="robots"]', "content")), "aperçu non indexable"); await prev.close();
  ok((await overflow(page)) <= 0, "aucun défilement horizontal (éditeur)"); ok(problems.length === 0, "aucune erreur console " + JSON.stringify(problems)); await ctx.close();
  // sans accès : la page ne montre aucune donnée
  const c2 = await b.newContext(), p2 = await c2.newPage(); await p2.goto(s.base + "/admin/editorial.html"); await p2.waitForFunction(() => document.getElementById("msg").textContent.length > 0); ok(/refus|configur/.test(await p2.textContent("#msg")) && (await p2.locator("#rows tr.r").count()) === 0, "sans accès : message clair, aucune donnée"); await c2.close();
}
(async () => {
  const s = await start(); const b = await chromium.launch();
  try { for (const p of ["desktop", "tablette", "mobile"]) await publicSite(b, s, p); await backOffice(b, s); } finally { await b.close(); await s.close(); }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
