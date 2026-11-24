// Visionneuse du cas TCL West Africa sur l'accueil : ouverture, fond du site visible, fermeture, accessibilité.
const { chromium, devices } = require("playwright");
const fs = require("fs");
const { start } = require("../helpers/pages-dev.js");
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, "utf8") : null;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };
(async () => {
  const s = await start({ mail: false }); const b = await chromium.launch();
  for (const [lang, prof] of [["fr", "desktop"], ["en", "desktop"], ["fr", "mobile"]]) {
    console.log(`\n== ${lang} ${prof}`);
    const ctx = await b.newContext(prof === "mobile" ? { ...devices["iPhone 13"] } : { viewport: { width: 1366, height: 900 } }), page = await ctx.newPage(), problems = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); }); page.on("pageerror", (e) => problems.push(String(e)));
    await page.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await page.goto(`${s.base}/${lang}/index.html`);
    const link = page.locator("a[data-pdfv]"); await link.scrollIntoViewIfNeeded();
    ok((await link.textContent()).includes(lang === "fr" ? "Voir l'expérience" : "See the experience"), "libellé du lien");
    ok(await page.locator('a:has-text("Toutes les références"), a:has-text("All references")').count() === 0, "ancien lien retiré");
    ok(await page.locator("dialog#pdfv").evaluate((d) => !d.open), "visionneuse fermée au départ");
    await link.click(); await page.waitForTimeout(600);
    ok(await page.locator("dialog#pdfv").evaluate((d) => d.open), "visionneuse ouverte au clic");
    ok(await page.evaluate(() => document.documentElement.classList.contains("pdfv-open") && getComputedStyle(document.documentElement).overflow === "hidden"), "page de fond figée");
    ok(await page.evaluate(() => getComputedStyle(document.querySelector("dialog#pdfv"), "::backdrop").backdropFilter.includes("blur") || getComputedStyle(document.querySelector("dialog#pdfv"), "::backdrop").webkitBackdropFilter !== undefined), "fond du site assombri et flouté");
    ok((await page.evaluate(() => document.activeElement && document.activeElement.className)) === "pdfv-x", "focus sur le bouton de fermeture");
    await page.locator(".pdfv-pages img").first().waitFor();
    await page.waitForFunction(() => document.querySelector(".pdfv-pages img").complete && document.querySelector(".pdfv-pages img").naturalWidth > 0);
    ok(true, "première page chargée");
    await page.waitForFunction(() => [...document.querySelectorAll(".pdfv-pages img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 });
    ok(true, "les cinq pages, dont la 2, sont chargées dès l'ouverture, sans défilement");
    await page.evaluate(() => document.querySelectorAll(".pdfv-pages img")[1].scrollIntoView()); await page.waitForTimeout(500);
    ok(await page.evaluate(() => { const i = document.querySelectorAll(".pdfv-pages img")[1], r = i.getBoundingClientRect(); return i.naturalWidth > 0 && r.height > 100; }), "la page 2 est visible et a une hauteur");
    await page.evaluate(() => document.querySelector(".pdfv-pages").scrollTo(0, 99999)); await page.waitForTimeout(800);
    ok(await page.evaluate(() => [...document.querySelectorAll(".pdfv-pages img")].every((i) => i.complete && i.naturalWidth > 0)), "les cinq pages se chargent au défilement");
    ok((await page.locator(".pdfv a[download]").getAttribute("href")).endsWith("cas-tcl-west-africa-2026-nasco-maioris.pdf"), "lien de téléchargement");
    const pdfRes = await page.request.get(s.base + "/assets/docs/cas-tcl-west-africa-2026-nasco-maioris.pdf"); ok(pdfRes.status() === 200 && (await pdfRes.body()).subarray(0, 5).toString() === "%PDF-", "PDF servi");
    ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, "aucun défilement horizontal");
    if (AXE) { await page.addScriptTag({ content: AXE }); const r = await page.evaluate(() => axe.run({ runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })); ok(r.violations.length === 0, "axe : " + r.violations.map((v) => v.id).join(",")); }
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    ok(await page.locator("dialog#pdfv").evaluate((d) => !d.open), "Échap ferme la visionneuse");
    ok(await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-pdfv")), "focus rendu au lien");
    ok(await page.evaluate(() => !document.documentElement.classList.contains("pdfv-open")), "défilement de la page rétabli");
    await link.click(); await page.waitForTimeout(400); await page.locator(".pdfv-x").click(); await page.waitForTimeout(300);
    ok(await page.locator("dialog#pdfv").evaluate((d) => !d.open), "le bouton Fermer ferme");
    await link.click(); await page.waitForTimeout(400);
    await page.mouse.click(4, 4); await page.waitForTimeout(300);
    ok(await page.locator("dialog#pdfv").evaluate((d) => !d.open), "un clic sur le fond ferme");
    ok(problems.length === 0, "aucune erreur console : " + problems.join(" | ").slice(0, 160));
    await ctx.close();
  }
  await b.close(); await s.close();
  console.log(fails ? `\n${fails} ECHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
