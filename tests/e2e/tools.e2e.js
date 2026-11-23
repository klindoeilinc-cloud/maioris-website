// Test de bout en bout : Creative Maturity Assessment, Brand Consistency Review, synchronisation entre outils, trois outils existants.
// Prérequis : serveur local appliquant le CSP de _headers. Usage : BASE=http://127.0.0.1:8123 node tests/e2e/tools.e2e.js
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8123";
const nb = (s) => s.replace(/[  ]/g, " ");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };
const PROFILES = { desktop: { viewport: { width: 1280, height: 900 } }, tablette: { ...devices["iPad (gen 7)"] }, mobile: { ...devices["iPhone 13"] } };

async function newPage(browser, profile, posts, problems) {
  const ctx = await browser.newContext(PROFILES[profile]), page = await ctx.newPage();
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  page.on("request", (r) => { if (r.method() === "POST") posts.push(JSON.parse(r.postData() || "{}")); });
  await page.route("**/plausible.io/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  return { ctx, page };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/* ------------------------------------------------------------------ MATURITY */
async function maturity(browser, lang, profile, scenario) {
  console.log(`\n== maturity ${lang} ${profile} ${scenario}`);
  const posts = [], problems = [], { ctx, page } = await newPage(browser, profile, posts, problems);
  const T = lang === "fr" ? { start: "Commencer l'évaluation", next: "Continuer", see: "Voir mon profil de maturité" } : { start: "Start the assessment", next: "Continue", see: "See my maturity profile" };
  await page.goto(`${BASE}/${lang}/creative-maturity-assessment`); await page.waitForSelector("#mat[data-ready]");
  ok((await page.textContent("[data-head]")).match(/1 \S+ 7/) !== null, "indicateur d'étape (1 sur 7)");
  await page.click(`button:has-text("${T.start}")`);
  // erreurs : continuer sans répondre
  await page.click(`button:has-text("${T.next}")`);
  ok(await page.locator(".coi-err:not(:empty)").count() === 4, "erreur sur les 4 questions sans réponse");
  ok((await page.evaluate(() => document.activeElement.type)) === "radio", "focus sur la première question en erreur");
  // clavier : flèche droite change le niveau dans le groupe
  await page.focus("#mat-q1-1"); await page.check("#mat-q1-1", { force: true }); await page.keyboard.press("ArrowRight");
  ok(await page.isChecked("#mat-q1-2"), "navigation clavier : flèche droite choisit le niveau suivant");
  const vals = scenario === "complete" ? [4, 3, 5, 2, 4, 3] : [4, "na", "na", 2, 4, 3];
  const ids = []; for (let d = 0; d < 6; d++) for (let k = 1; k <= 4; k++) ids.push("q" + (d * 4 + k));
  for (let d = 0; d < 6; d++) {
    for (let k = 0; k < 4; k++) {
      const id = ids[d * 4 + k]; let v = vals[d];
      if (scenario === "partial" && d === 1) v = k < 2 ? 3 : "na";           // dimension 2 : seulement 2 réponses valides
      if (scenario === "partial" && d === 2) v = "na";                       // dimension 3 : aucune réponse valide
      await page.check(`#mat-${id}-${v}`, { force: true });
    }
    if (d < 5) await page.click(`button:has-text("${T.next}")`); else await page.click(`button:has-text("${T.see}")`);
  }
  await page.waitForSelector("#mat-result[data-ready]");
  const res = nb(await page.textContent("#mat-result"));
  ok(await page.locator(".mat-radar").count() === 1 && await page.locator(".mat-table tbody tr").count() === 6, "radar et tableau des six dimensions");
  ok((await page.getAttribute(".mat-radar", "aria-label")).includes("Creative Strategy"), "radar accessible (aria-label avec les valeurs)");
  if (scenario === "complete") {
    // scores : 80, 60, 100, 40, 80, 60 -> global 70 -> niveau 4 Intégré
    ok(/70 \/ 100/.test(res), "score global 70 / 100");
    ok(/maturité 4|Maturity level 4/.test(res), "niveau de maturité 4");
    ok(lang === "fr" ? res.includes("Intégré") : res.includes("Integrated"), "libellé du niveau");
    ok(res.includes(lang === "fr" ? "Votre organisation présente un niveau de maturité intégré" : "Your organisation shows a integrated maturity level") || res.includes(lang === "fr" ? "niveau de maturité intégré" : "integrated maturity level"), "synthèse conforme au modèle");
    ok((await page.locator(".mat-prio li").count()) === 3, "trois priorités");
  } else {
    ok(res.includes(lang === "fr" ? "Diagnostic partiel" : "Partial diagnostic"), "diagnostic partiel annoncé");
    ok(!/\d+ \/ 100\s*Niveau|Niveau \d ·|Level \d ·/.test(res.split(lang === "fr" ? "Les six dimensions" : "The six dimensions")[0]), "aucun niveau global produit");
    ok(res.includes(lang === "fr" ? "Non évaluée" : "Not assessed"), "dimension sans réponse valide non évaluée (jamais zéro)");
    ok(res.includes(lang === "fr" ? "(indicatif)" : "(indicative)"), "dimension à couverture insuffisante marquée indicative");
  }
  ok(res.includes(lang === "fr" ? "et non d'une certification indépendante" : "not an independent certification"), "limites : pas une certification");
  const cta = nb(await page.textContent("#mat-cta"));
  ok(cta.includes("750 000 FCFA") && !/250[\s,]000/.test(cta + res), "prix officiel 750 000 FCFA, jamais 250 000");
  ok(await page.locator("#mat-cta a.btn").getAttribute("href") === (lang === "fr" ? "accompagnement/creative-audit.html" : "advisory/creative-audit.html"), "lien Creative Audit");
  ok(posts.length === 0, "aucun envoi avant action explicite");
  await page.fill("#mat-send [name=name]", "Test"); await page.fill("#mat-send [name=email]", "t@example.com"); await page.click("#mat-send button[type=submit]");
  ok((await page.textContent("#mat-send-status")).length > 0 && posts.length === 0, "envoi refusé sans consentement");
  if (scenario === "complete") {
    await page.waitForTimeout(15500); await page.check("#mat-send [name=consent]"); await page.click("#mat-send button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#mat-send button").disabled);
    ok(posts.length === 1 && posts[0].tool === "maturity" && posts[0].consent === true && posts[0].answers.q1 !== undefined && /MATURIT|MATURITY/i.test(posts[0].report), "envoi consenti : un POST outil maturity avec rapport");
  }
  ok((await overflow(page)) <= 0, "aucun défilement horizontal");
  ok(problems.length === 0, "aucune erreur console ni violation CSP " + JSON.stringify(problems));
  await ctx.close();
}

/* ------------------------------------------------------------------ BRAND */
async function brand(browser, lang, profile) {
  console.log(`\n== brand ${lang} ${profile}`);
  const posts = [], problems = [], { ctx, page } = await newPage(browser, profile, posts, problems);
  const T = lang === "fr" ? { next: "Continuer", add: "Ajouter au registre", gen: "Générer le Brand Review Report" } : { next: "Continue", add: "Add to the register", gen: "Generate the Brand Review Report" };
  await page.goto(`${BASE}/${lang}/brand-consistency-review`); await page.waitForSelector("#brand[data-ready]");
  // profil : erreurs puis saisie
  await page.click(`button:has-text("${T.next}")`);
  ok(await page.locator(".coi-err:not(:empty)").count() >= 5, "profil : champs obligatoires signalés");
  await page.fill("#br-p-name", "Marque X"); await page.selectOption("#br-p-sector", "bank"); await page.fill("#br-p-market", "Côte d'Ivoire"); await page.fill("#br-p-audience", "Jeunes actifs");
  await page.fill("#br-p-positioning", "La banque proche de vous"); await page.fill("#br-p-competitors", "Concurrent A, Concurrent B"); await page.check("#br-p-channels-site", { force: true }); await page.check("#br-p-channels-social", { force: true });
  await page.click(`button:has-text("${T.next}")`);
  // supports : aucun -> bloqué
  ok((await page.textContent("[data-body]")).includes(lang === "fr" ? "Aucun fichier n'est lu" : "No file is read"), "mode guidé annoncé (aucun fichier lu)");
  await page.click(`button:has-text("${T.next}")`);
  ok((await page.textContent("#br-add-e")).length > 0, "au moins un support exigé pour continuer");
  // fichiers : format refusé, taille refusée, fichier valide accepté
  await page.setInputFiles("#br-file", { name: "visuel.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  ok((await page.textContent("#br-add-e")).length > 0, "format GIF refusé"); 
  await page.setInputFiles("#br-file", { name: "gros.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024, 1) });
  ok((await page.textContent("#br-add-e")).length > 0, "fichier de plus de 10 Mo refusé");
  await page.fill("#br-title", "Logo principal"); await page.setInputFiles("#br-file", { name: "logo.png", mimeType: "image/png", buffer: Buffer.from("PNG") });
  await page.click(`button:has-text("${T.add}")`);
  ok(await page.locator(".br-list li").count() === 1, "fichier PNG valide référencé");
  // liens : privé refusé, public accepté
  await page.check("#br-src-link", { force: true }); await page.fill("#br-title", "Intranet"); await page.fill("#br-link", "http://localhost:3000/x"); await page.click(`button:has-text("${T.add}")`);
  ok(await page.locator(".br-list li").count() === 1 && (await page.textContent("#br-add-e")).length > 0, "lien local refusé");
  await page.fill("#br-title", "Campagne radio"); await page.selectOption("#br-cat", "B"); await page.selectOption("#br-kind", "campaign"); await page.fill("#br-link", "https://exemple.com/campagne"); await page.click(`button:has-text("${T.add}")`);
  await page.fill("#br-title", "Identité concurrent"); await page.selectOption("#br-cat", "D"); await page.selectOption("#br-kind", "identity"); await page.fill("#br-link", "https://concurrent.com"); await page.click(`button:has-text("${T.add}")`);
  ok(await page.locator(".br-list li").count() === 3, "trois supports dans le registre (A, B, D)");
  ok(posts.length === 0, "aucun envoi : le fichier n'est ni lu ni transmis");
  await page.click(`button:has-text("${T.next}")`);
  // dimension 1 : constat observé sans preuve -> erreur
  await page.click(`button:has-text("${T.next}")`);
  ok(await page.locator(".br-crit .coi-err:not(:empty)").count() === 6, "dimension : statut exigé sur chaque critère");
  await page.check("#br-c-visual-colors-conform", { force: true }); await page.click(`button:has-text("${T.next}")`);
  ok((await page.textContent("#br-c-visual-colors-e")).length > 0, "constat observé sans support ni fait refusé");
  const st = ["conform", "partial", "non", "conform", "conform", "unobservable"], keys = ["colors", "type", "logo", "graphics", "rules", "variations"];
  for (let i = 0; i < 6; i++) {
    await page.check(`#br-c-visual-${keys[i]}-${st[i]}`, { force: true });
    if (st[i] !== "unobservable") { await page.selectOption(`#br-c-visual-${keys[i]}-doc`, i % 2 ? "S2" : "S1"); await page.fill(`#br-c-visual-${keys[i]}-loc`, "p." + (i + 1)); await page.fill(`#br-c-visual-${keys[i]}-fact`, "Constat factuel décrit numéro " + (i + 1)); }
  }
  await page.fill("#br-c-visual-logo-interp", "Palette non fixée"); await page.fill("#br-c-visual-logo-hypo", "Guidelines absentes ?");
  await page.click(`button:has-text("${T.next}")`);
  // dimensions 2 à 6 : non observables
  const dimKeys = { verbal: ["tone", "vocab", "messages", "promise", "voices", "continuity"], positioning: ["match", "value", "commercial", "discourse"], distinct: ["codes", "territories", "diff", "conventions", "elements"], cross: ["websocial", "adsales", "instpromo", "formats", "territory"], governance: ["rules", "access", "adapt", "external", "standards", "validation"] };
  const names = Object.keys(dimKeys);
  for (let d = 0; d < names.length; d++) {
    for (const k of dimKeys[names[d]]) await page.check(`#br-c-${names[d]}-${k}-unobservable`, { force: true });
    await page.click(`button:has-text("${d === names.length - 1 ? T.gen : T.next}")`);
  }
  await page.waitForSelector("#brand-result[data-ready]");
  const res = nb(await page.textContent("#brand-result"));
  for (const s of ["A. Brand overview", "B. Consistency findings", "C. Evidence register", "D. Brand strengths", "E. Inconsistencies", "F. Strategic risks", "G. Priority actions", "H. Limitations"]) ok(res.includes(s), "section " + s);
  ok(res.includes("70 / 100"), "indice de cohérence 70 / 100 sur Visual Identity (dimension documentée)");
  ok((res.match(lang === "fr" ? /Aucun indice : dimension insuffisamment documentée/g : /No index: dimension insufficiently documented/g) || []).length === 5, "cinq dimensions sans indice (insuffisamment documentées)");
  ok(!/score global|overall score/i.test(res.replace(/Aucun score global[^.]*\./i, "").replace(/No overall score[^.]*\./i, "")), "aucun score global");
  ok(res.includes("Palette non fixée") && res.includes("Guidelines absentes"), "interprétation et hypothèse distinguées du fait");
  ok(res.includes(lang === "fr" ? "Aucun fichier n'a été lu ni analysé" : "No file was read or analysed"), "limites : aucun fichier analysé");
  ok(/Niveau de certitude|Level of certainty/.test(res) && !/élevé|high \(/i.test(res.split("F. Strategic risks")[1].split("G. Priority")[0]), "risque avec niveau de certitude non élevé");
  ok(await page.locator(".br-scroll").count() === 1, "registre des preuves en tableau défilant");
  ok(nb(await page.textContent("#brand-cta")).includes("750 000 FCFA") && !/250[\s,]000/.test(res), "prix officiel 750 000 FCFA");
  ok(posts.length === 0, "aucun envoi avant action explicite");
  await page.waitForTimeout(15500); await page.fill("#brand-send [name=name]", "Test"); await page.fill("#brand-send [name=email]", "t@example.com"); await page.check("#brand-send [name=consent]"); await page.click("#brand-send button[type=submit]");
  await page.waitForFunction(() => document.querySelector("#brand-send button").disabled);
  const body = posts[0] || {};
  ok(posts.length === 1 && body.tool === "brand" && /BRAND REVIEW REPORT/i.test(body.report || "") && !JSON.stringify(body).includes("data:") && !("file" in body), "envoi consenti : rapport texte seulement, aucun fichier");
  ok((await overflow(page)) <= 0, "aucun défilement horizontal");
  ok(problems.length === 0, "aucune erreur console ni violation CSP " + JSON.stringify(problems));
  await ctx.close();
}

/* ------------------------------------------------------------------ SYNCHRONISATION */
async function sync(browser) {
  console.log("\n== synchronisation entre outils");
  const posts = [], problems = [], { ctx, page } = await newPage(browser, "desktop", posts, problems);
  await page.goto(`${BASE}/fr/creative-maturity-assessment`); await page.waitForSelector("#mat[data-ready]");
  ok(await page.evaluate(() => sessionStorage.getItem("maioris.core.v1")) === null, "conservation désactivée par défaut : rien dans le stockage");
  await page.check("#core-keep", { force: true });
  ok(await page.evaluate(() => !!sessionStorage.getItem("maioris.core.v1")), "conservation activée sur demande");
  await page.fill("#mat-c-org", "Acme Côte d'Ivoire"); await page.selectOption("#mat-c-sector", "telco"); await page.selectOption("#mat-c-size", "100_249"); await page.fill("#mat-c-market", "Afrique de l'Ouest");
  await page.click('button:has-text("Commencer l\'évaluation")');
  const prof = await page.evaluate(() => JSON.parse(sessionStorage.getItem("maioris.core.v1")).profile);
  ok(prof.org === "Acme Côte d'Ivoire" && prof.sector === "telco" && prof.size === "100_249" && prof.sources.org === "declared" && /^p_/.test(prof.id), "profil commun écrit avec identifiant et source « declared »");
  // terminer le Maturity
  const ids = []; for (let i = 1; i <= 24; i++) ids.push("q" + i);
  for (let d = 0; d < 6; d++) { for (let k = 0; k < 4; k++) await page.check(`#mat-${ids[d * 4 + k]}-3`, { force: true }); await page.click(`button.btn:has-text("${d < 5 ? "Continuer" : "Voir mon profil de maturité"}")`); }
  await page.waitForSelector("#mat-result[data-ready]");
  let hist = await page.evaluate(() => JSON.parse(sessionStorage.getItem("maioris.core.v1")).history);
  ok(hist.length === 1 && hist[0].tool === "maturity" && hist[0].version === "1.0" && hist[0].basis === "declared", "résultat enregistré avec version et base");
  // les autres outils reprennent le profil sans le redemander
  await page.goto(`${BASE}/fr/creative-operations-intelligence`); await page.waitForSelector("#coi[data-ready]");
  ok(await page.isChecked("#q-sector-telco") && await page.isChecked("#q-size-100_249"), "Creative Operations Intelligence reprend secteur et taille");
  await page.goto(`${BASE}/fr/brand-consistency-review`); await page.waitForSelector("#brand[data-ready]");
  ok(await page.inputValue("#br-p-sector") === "telco" && await page.inputValue("#br-p-market") === "Afrique de l'Ouest", "Brand Review reprend secteur et marché");
  // panneau consolidé
  const panel = nb(await page.textContent("#core-panel"));
  ok(panel.includes("Creative Maturity Assessment") && /Réalisé le/.test(panel), "panneau consolidé : résultat du Maturity visible");
  ok(panel.includes("Pas encore réalisé"), "panneau consolidé : outils non réalisés signalés");
  // nouvelle évaluation : historique conservé
  await page.goto(`${BASE}/fr/creative-maturity-assessment`); await page.waitForSelector("#mat[data-ready]");
  ok(await page.inputValue("#mat-c-org") === "Acme Côte d'Ivoire", "Maturity reprend l'organisation (pas de double saisie)");
  await page.click('button:has-text("Commencer l\'évaluation")');
  for (let d = 0; d < 6; d++) { for (let k = 0; k < 4; k++) await page.check(`#mat-${ids[d * 4 + k]}-5`, { force: true }); await page.click(`button.btn:has-text("${d < 5 ? "Continuer" : "Voir mon profil de maturité"}")`); }
  await page.waitForSelector("#mat-result[data-ready]");
  hist = await page.evaluate(() => JSON.parse(sessionStorage.getItem("maioris.core.v1")).history);
  ok(hist.length === 2 && hist[0].score !== hist[1].score, "historique conservé : deux évaluations distinctes");
  // effacement
  await page.goto(`${BASE}/fr/creative-maturity-assessment`); await page.waitForSelector("#core-panel button.link");
  await page.click("#core-panel button.link");
  ok(await page.evaluate(() => sessionStorage.getItem("maioris.core.v1")) === null, "effacement complet sur demande");
  ok(posts.length === 0, "rien n'est envoyé par la synchronisation");
  ok(problems.length === 0, "aucune erreur console " + JSON.stringify(problems));
  await ctx.close();
  // isolation : un autre contexte de navigation ne voit rien
  const c2 = await browser.newContext(), p2 = await c2.newPage(); await p2.goto(`${BASE}/fr/creative-maturity-assessment`); await p2.waitForSelector("#mat[data-ready]");
  ok(await p2.evaluate(() => sessionStorage.getItem("maioris.core.v1")) === null && (await p2.inputValue("#mat-c-org")) === "", "isolation : un autre navigateur ne reçoit aucune donnée"); await c2.close();
}

/* ------------------------------------------------------------------ OUTILS EXISTANTS */
async function existing(browser, lang) {
  console.log(`\n== outils existants ${lang}`);
  const posts = [], problems = [], { ctx, page } = await newPage(browser, "desktop", posts, problems);
  await page.goto(`${BASE}/${lang}/${lang === "fr" ? "evaluer-votre-brief" : "brief-check"}`); await page.waitForSelector("#bf");
  for (let i = 0; i < 5; i++) await page.check(`input[name="q${i}"][value="2"]`, { force: true });
  await page.click("#bf button[type=submit]"); await page.waitForSelector("#bf-res:not([hidden])");
  ok((await page.textContent("#bf-n")) === "10", "brief : score 10 / 10");
  await page.goto(`${BASE}/${lang}/${lang === "fr" ? "autodiagnostic" : "self-assessment"}`); await page.waitForSelector(".dg-opt");
  for (let i = 0; i < 7; i++) { await page.click('.dg-opt[data-v="3"]'); await page.waitForTimeout(420); }
  await page.waitForSelector(".dg-res");
  ok(await page.locator(".dg-rt").count() === 1, "autodiagnostic : résultat affiché");
  await page.goto(`${BASE}/${lang}/creative-operations-intelligence`); await page.waitForSelector("#coi[data-ready]");
  ok(await page.locator("#q-sector-bank").count() === 1, "Creative Operations Intelligence : questionnaire chargé");
  ok(problems.length === 0, "aucune erreur console " + JSON.stringify(problems));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();
  for (const lang of ["fr", "en"]) { await maturity(b, lang, "desktop", "complete"); }
  await maturity(b, "fr", "desktop", "partial");
  await maturity(b, "fr", "tablette", "complete"); await maturity(b, "fr", "mobile", "complete");
  for (const lang of ["fr", "en"]) await brand(b, lang, "desktop");
  await brand(b, "fr", "tablette"); await brand(b, "fr", "mobile");
  await sync(b); await existing(b, "fr"); await existing(b, "en");
  await b.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0);
})();
