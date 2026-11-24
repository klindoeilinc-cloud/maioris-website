// Comparateur de scénarios de leadership créatif sur la page Creative Leadership as a Service, avec le CSP réel.
const { chromium, devices } = require("playwright");
const fs = require("fs");
const { start } = require("../helpers/pages-dev.js");
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, "utf8") : null;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };
const PAGES = { en: "/en/advisory/claas.html", fr: "/fr/accompagnement/claas.html" };
(async () => {
  const s = await start({ mail: false }); const b = await chromium.launch();
  for (const [lang, prof] of [["en", "desktop"], ["fr", "desktop"], ["fr", "mobile"]]) {
    console.log(`\n== ${lang} ${prof}`);
    const ctx = await b.newContext(prof === "mobile" ? { ...devices["iPhone 13"], reducedMotion: "reduce" } : { viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" }), page = await ctx.newPage(), problems = [], posts = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); }); page.on("pageerror", (e) => problems.push(String(e)));
    page.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
    await page.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await page.goto(s.base + PAGES[lang]); await page.waitForSelector("#fcl-sim .fcl-form");
    const T = lang === "en" ? { total: "Annualised total", none: "Not priced", cap: "Capacity of a permanent role", hyp: "No efficiency hypothesis applied", err: "Please check" } : { total: "Total annualisé", none: "Non chiffré", cap: "Capacité d'un poste permanent", hyp: "Aucune hypothèse d'efficacité appliquée", err: "Vérifiez les champs" };
    await page.locator("#fcl-sim").scrollIntoViewIfNeeded();
    ok(await page.locator(".fcl-card").count() === 3, "trois scénarios affichés");
    ok((await page.textContent(".fcl-res")).includes(T.none), "sans honoraires saisis : scénario externalisé non chiffré");
    await page.fill("#fcl-in-internal", "60000000"); await page.fill("#fcl-in-recruit", "9000000"); await page.fill("#fcl-in-coord", "12000000"); await page.fill("#fcl-in-rework", "18000000"); await page.fill("#fcl-in-fee", "2000000");
    const txt = (await page.textContent(".fcl-res")).replace(/[  ]/g, " ");
    const nf = (n) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB").replace(/[  ]/g, " ");
    ok(txt.includes(nf(93000000)), "recrutement permanent : 93 000 000 annualisés");
    ok(txt.includes(nf(30000000)), "pilotage réparti : 30 000 000");
    ok(txt.includes(nf(54000000)), "leadership externalisé : 54 000 000");
    ok(txt.includes(T.cap), "capacité d'un poste permanent affichée");
    ok(txt.includes(T.hyp), "aucune hypothèse d'efficacité par défaut");
    await page.fill("#fcl-in-internal", "abc");
    ok((await page.textContent("#fcl-in-internal-e")).includes(T.err) && await page.locator("#fcl-in-internal").getAttribute("aria-invalid") === "true", "saisie invalide signalée");
    await page.fill("#fcl-in-internal", "60000000");
    await page.locator("#fcl-in-reworkCut").fill("20");
    ok(!(await page.textContent(".fcl-res")).includes(T.hyp), "une hypothèse saisie est signalée comme telle");
    await page.fill("#fcl-cur", "EUR"); ok((await page.textContent(".fcl-res")).includes("EUR"), "libellé de devise appliqué");
    await page.click(".fcl-act .link");
    ok(await page.inputValue("#fcl-in-internal") === "" && await page.inputValue("#fcl-in-reworkCut") === "0", "réinitialisation");
    ok(posts.length === 0, "aucune requête POST : rien n'est envoyé");
    ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, "aucun défilement horizontal");
    await page.fill("#fcl-in-internal", "60000000"); await page.fill("#fcl-in-fee", "2000000");
    if (AXE) { await page.addScriptTag({ content: AXE }); const r = await page.evaluate(() => axe.run({ runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })); ok(r.violations.length === 0, "axe : " + r.violations.map((v) => v.id + "(" + v.nodes.length + ")").join(",")); }
    ok(problems.length === 0, "aucune erreur console : " + problems.join(" | ").slice(0, 160));
    if (lang === "en" && prof === "desktop") await (await page.$("#business-case")).screenshot({ path: "/tmp/fcl.png" });
    await ctx.close();
  }
  await b.close(); await s.close();
  console.log(fails ? `\n${fails} ECHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
