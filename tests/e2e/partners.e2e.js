// Test de bout en bout de la page MAIORIS Partners avec les vraies fonctions (API /api/partners) et le CSP réel.
// Usage : node tests/e2e/partners.e2e.js   (AXE=chemin/axe.min.js pour l'accessibilité)
const { chromium, devices } = require("playwright");
const fs = require("fs");
const { start } = require("../helpers/pages-dev.js");
const AXE = process.env.AXE ? fs.readFileSync(process.env.AXE, "utf8") : null;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };
const PROFILES = { desktop: { viewport: { width: 1440, height: 900 } }, laptop: { viewport: { width: 1180, height: 760 } }, tablette: { ...devices["iPad (gen 7)"] }, mobile: { ...devices["iPhone 13"] } };
const PAGES = { en: "/en/partners", fr: "/fr/partenaires" };
const T = { en: { next: "Continue", send: "Send my request", done: "Request received", cta: "Request an Agency Audit" }, fr: { next: "Continuer", send: "Envoyer ma demande", done: "Demande reçue", cta: "Demander un Agency Audit" } };

async function run(b, s, lang, profile) {
  console.log(`\n== ${lang} ${profile}`);
  const ctx = await b.newContext({ ...PROFILES[profile], reducedMotion: "reduce" }), page = await ctx.newPage(), problems = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of (422|502)/.test(m.text())) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  await page.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await page.goto(s.base + PAGES[lang]); await page.waitForSelector("h1");
  ok(await page.locator("h1").count() === 1, "un seul H1");
  ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, "aucun défilement horizontal");
  ok(await page.evaluate(() => document.fonts.check("700 20px Poppins")), "Poppins Bold chargée");
  ok(await page.locator(".pt-offer").count() === 4, "quatre offres");
  ok(await page.locator(".pt-path").count() === 3, "trois parcours");
  ok(await page.locator(".pt-model").count() === 3, "trois modèles");
  if (profile === "mobile") { await page.click(".burger"); } ok(await page.locator('#nav a[href$="' + (lang === "en" ? "partners.html" : "partenaires.html") + '"]').count() >= 1, "lien Partners dans la navigation");
  if (AXE) { await page.addScriptTag({ content: AXE }); const r = await page.evaluate(() => axe.run({ runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] })); ok(r.violations.length === 0, "axe : " + r.violations.map((v) => v.id + "(" + v.nodes.length + ")").join(", ")); }
  if (profile === "mobile") await page.click(".burger");

  // le bouton d'une offre pré-sélectionne l'offre dans le formulaire
  await page.click(`a[data-offer=audit]`); await page.waitForTimeout(150);
  ok(await page.locator('input[name=offer][value=audit]').isChecked(), "offre pré-sélectionnée par le bouton");
  // validation : continuer à vide
  await page.click(`button:has-text("${T[lang].next}")`);
  ok(await page.locator(".err:not([hidden])").count() === 1, "erreur affichée si champs vides");
  await page.fill("#agency", "Studio Lumen"); await page.fill("#agency_site", "studio-lumen.com");
  await page.selectOption("#country", "ci"); await page.selectOption("#team", "6-10"); await page.selectOption("#role", "founder");
  await page.click(`button:has-text("${T[lang].next}")`);
  await page.check('input[name=need][value=structure]', { force: true });
  ok(await page.locator('input[name=offer][value=audit]').isChecked(), "offre conservée à l'étape 2");
  await page.click(`button:has-text("${T[lang].next}")`);
  await page.fill("#context", "court"); await page.click(`button:has-text("${T[lang].next}")`);
  ok(await page.locator("#context").getAttribute("aria-invalid") === "true", "description trop courte refusée");
  await page.fill("#context", "Nos briefs circulent sans cadre commun et chaque projet est repris plusieurs fois avant validation.");
  await page.click(`button:has-text("${T[lang].next}")`);
  await page.fill("#firstname", "Aïcha"); await page.fill("#lastname", "Koné"); await page.fill("#email", "aicha@studio-lumen.com");

  // 1) échec serveur : le formulaire ne doit jamais prétendre avoir envoyé
  await page.route("**/api/partners", (r) => r.fulfill({ status: 502, contentType: "application/json", body: '{"ok":false,"error":"send"}' }), { times: 1 });
  await page.check('input[name=consent]', { force: true });
  await page.click(`button:has-text("${T[lang].send}")`); await page.waitForTimeout(400);
  ok(await page.locator(".err:not([hidden])").count() === 1 && await page.locator("#done").isHidden(), "échec : message d'erreur, pas de confirmation");
  ok(s.mails.length === 0, "échec : aucun e-mail réel");
  // 2) envoi réel
  await page.click(`button:has-text("${T[lang].send}")`); await page.waitForSelector("#done:not([hidden])");
  ok((await page.textContent("#done")).includes(T[lang].done), "confirmation affichée");
  ok(s.mails.length === 2, "deux e-mails : équipe puis accusé");
  const team = s.mails[0];
  ok(team.to[0] === "team@example.com" && team.reply_to === "aicha@studio-lumen.com", "e-mail à l'équipe, réponse au visiteur");
  ok(/MAIORIS PARTNERS\] Studio Lumen \| Agency Creative Audit/.test(team.subject), "objet : " + team.subject);
  ok(team.attachments && team.attachments.length === 1 && Buffer.from(team.attachments[0].content, "base64").subarray(0, 5).toString() === "%PDF-", "PDF joint");
  ok(/Structurer les opérations/.test(team.text) && /6 à 10/.test(team.text) && /Côte d'Ivoire/.test(team.text), "toutes les réponses sont transmises");
  ok(s.mails[1].to[0] === "aicha@studio-lumen.com", "accusé au visiteur");
  s.mails.length = 0;
  ok(problems.length === 0, "aucune erreur console : " + problems.join(" | ").slice(0, 200));
  await ctx.close();
}

(async () => {
  const s = await start({ mail: true }); const b = await chromium.launch();
  try { for (const lang of ["en", "fr"]) for (const p of lang === "en" ? Object.keys(PROFILES) : ["desktop", "mobile"]) await run(b, s, lang, p); }
  finally { await b.close(); await s.close(); }
  console.log(fails ? `\n${fails} ECHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
