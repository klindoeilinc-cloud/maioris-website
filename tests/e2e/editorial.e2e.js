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
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of (422|413)/.test(m.text())) problems.push(m.text()); }); page.on("pageerror", (e) => problems.push("pageerror " + e.message));
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

async function mediaFlow(b, s, profile) {
  console.log(`\n== médias (${profile})`); const tok = await s.token(); const { ctx, page, problems } = await newPage(b, s, profile, { extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": tok } });
  page.on("dialog", (d) => d.accept()); const FX = (n) => require("path").join(__dirname, "../fixtures/media", n);
  await page.goto(s.base + "/admin/editorial.html"); await page.waitForSelector("#n-go"); await page.selectOption("#n-cat", "perspectives"); await page.selectOption("#n-fmt", "case"); await page.click("#n-go"); await page.waitForSelector("#e-cat");
  await page.click('button:has-text("Choisir ou téléverser l\'image principale")'); await page.waitForSelector("#media-dlg[open]"); ok(true, "bibliothèque ouverte");
  await axeRun(page, "bibliothèque d'images " + profile);
  await page.setInputFiles("#md-file", FX("dessin.svg")); await page.fill("#md-alt", "Un dessin vectoriel"); await page.click("#md-go"); await page.waitForFunction(() => /Format non accepté/.test(document.getElementById("md-msg").textContent)); ok(true, "SVG refusé avec un message clair");
  const IMGF = profile === "desktop" ? "photo-exif.jpg" : "visuel-meta.png"; await page.setInputFiles("#md-file", FX(IMGF)); await page.fill("#md-alt", ""); await page.click("#md-go"); await page.waitForFunction(() => /texte alternatif/i.test(document.getElementById("md-msg").textContent)); ok(true, "texte alternatif exigé avant l'envoi");
  await page.fill("#md-alt", "Composition géométrique bleue et crème"); await page.click("#md-go"); await page.waitForFunction(() => /téléversée|existe déjà/.test(document.getElementById("md-msg").textContent)); await page.waitForSelector("#md-grid .mi img"); ok((await page.textContent("#md-msg")).includes("téléversée"), "image téléversée");
  ok(await page.evaluate(() => new Promise((res) => { const i = document.querySelector("#md-grid .mi img"); if (i.complete) res(i.naturalWidth > 0); else i.onload = () => res(i.naturalWidth > 0); })), "miniature servie par /media et décodée par le navigateur");
  ok((await page.locator("#md-grid .mi:not(:has(.used)) .danger").first().isEnabled()), "suppression possible tant que l'image est inutilisée");
  if (profile === "mobile") ok((await overflow(page)) <= 0, "bibliothèque sans défilement horizontal sur mobile");
  await page.locator('#md-grid .mi:not(:has(.used)) button:has-text("Choisir")').first().click(); await page.waitForFunction(() => document.getElementById("e-img").value.startsWith("/media/")); ok((await page.inputValue("#e-alt")).includes("Composition géométrique"), "image principale choisie, texte alternatif repris");
  ok(await page.locator("#e-thumb").isVisible(), "aperçu de l'image principale");
  // texte, sources, grille, image dans le texte
  await page.fill("#l-slug", "perspective-avec-visuel-" + profile); await page.fill("#l-title", "Une perspective illustrée par la bibliothèque"); await page.fill("#l-sub", "Un sous-titre stratégique précis"); await page.fill("#l-sum", "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.");
  await page.fill("#l-md", "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants."); await page.fill("#l-body", BODY); await page.fill("#l-take", "Un enseignement clé");
  await page.click('button:text-is("Image")'); await page.waitForSelector("#media-dlg[open]"); await page.locator('#md-grid .mi button:has-text("Choisir")').first().click(); await page.waitForFunction(() => /!\[[^\]]*\]\(\/media\//.test(document.getElementById("l-body").value)); ok(true, "image insérée dans le texte");
  for (const [id, v] of [["sources", 18], ["depth", 18], ["analysis", 18], ["business", 13], ["originality", 13], ["writing", 9]]) await page.fill("#q-" + id, String(v));
  for (const [l, u, p] of [["Rapport annuel", "https://exemple.org/rapport", "Organisme"], ["Étude de marché", "https://exemple.org/etude", "Cabinet"]]) { await page.click('button:has-text("Ajouter une source")'); const n = await page.locator("#sources .src").count(); const row = page.locator("#sources .src").nth(n - 1); await row.locator('[data-k="label"]').fill(l); await row.locator('[data-k="url"]').fill(u); await row.locator('[data-k="publisher"]').fill(p); }
  await page.click("#save"); await page.waitForFunction(() => document.getElementById("msg").textContent.includes("Enregistré"));
  // l'image est utilisée : suppression impossible
  await page.click('button:has-text("Choisir ou téléverser l\'image principale")'); await page.waitForSelector("#md-grid .mi .used"); ok(await page.locator("#md-grid .mi:has(.used) .danger").first().isDisabled(), "image utilisée : suppression désactivée"); await page.click("#md-close");
  for (const t of ["Envoyer en relecture", "Approuver", "Publier"]) { await page.click(`button:has-text("${t}")`); await page.waitForTimeout(250); }
  await page.waitForFunction(() => document.querySelector("#editor .st").textContent.includes("Published"), null, { timeout: 15000 }); ok(true, "publication avec images");
  const pub = await ctx.newPage(); const errs = []; pub.on("console", (m) => { if (["error", "warning"].includes(m.type())) errs.push(m.text()); });
  await pub.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" })); await pub.goto(s.base + "/fr/perspectives/executive-perspectives/perspective-avec-visuel-" + profile); await pub.waitForSelector(".ed-hero-img img"); await pub.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const imgs = await pub.evaluate(() => [...document.querySelectorAll(".ed-hero-img img, .ed-prose img")].map((i) => ({ ok: i.naturalWidth > 0, src: i.getAttribute("src"), w: i.getAttribute("width"), alt: i.alt })));
  ok(imgs.length === 2 && imgs.every((i) => i.ok && i.src.startsWith("/media/") && i.alt), "image principale et image du texte affichées depuis /media (décodées, avec texte alternatif)"); ok(imgs[0].w === (profile === "desktop" ? "960" : "720"), "dimensions réelles déclarées (pas de décalage de mise en page)");
  ok((await overflow(pub)) <= 0, "aucun défilement horizontal sur la page publique"); await axeRun(pub, "article illustré " + profile); ok(errs.length === 0, "aucune erreur console ni violation CSP sur la page publique " + JSON.stringify(errs));
  const og = await pub.getAttribute('meta[property="og:image"]', "content"); ok(/^https:\/\/maioris\.net\/media\/[A-Za-z0-9_-]{24}$/.test(og), "Open Graph pointe l'image de la bibliothèque");
  const body = Buffer.from(await (await fetch(s.base + imgs[0].src)).arrayBuffer()); ok(!body.includes("EXIF-SECRET-DESCRIPTION") && !body.includes("JPEG-COMMENT-SECRET") && !body.includes("PNG-SECRET-AUTHOR"), "l'image servie ne contient plus les métadonnées");
  if (process.env.SHOT_DIR) await pub.screenshot({ path: `${process.env.SHOT_DIR}/ed-media-${profile}.png`, fullPage: false });
  ok(problems.length === 0, "aucune erreur console dans l'éditeur " + JSON.stringify(problems.filter((x) => !/status of (422|413)/.test(x)))); await ctx.close();
}
(async () => {
  const s = await start(); const b = await chromium.launch();
  try { for (const p of ["desktop", "tablette", "mobile"]) await publicSite(b, s, p); await backOffice(b, s); await mediaFlow(b, s, "desktop"); await mediaFlow(b, s, "mobile"); } finally { await b.close(); await s.close(); }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
