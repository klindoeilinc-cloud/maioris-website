const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path"), fs = require("node:fs");
const { start } = require("./helpers/pages-dev.js");
const ST = () => import(path.resolve(__dirname, "../site/functions/_lib/editorial/store.js"));
const words = (n) => Array.from({ length: n }, (_, i) => "mot" + (i % 50)).join(" ");
const Q = { sources: 18, depth: 18, analysis: 18, business: 13, originality: 13, writing: 9 };
const SRC = [{ label: "Rapport annuel", url: "https://exemple.org/rapport", publisher: "Organisme", kind: "primary" }, { label: "Étude de marché", url: "https://exemple.org/etude", publisher: "Cabinet", kind: "secondary" }];
const BODY = (extra = "") => `## Contexte\n\n${words(420)} [^1]\n\n:::facts\nUn fait établi. [^2]\n\n${words(320)}\n:::\n\n:::analysis\n${words(320)}\n:::\n\n:::hypotheses\nUne hypothèse.\n:::\n\n:::questions\n- Question ouverte ?\n:::\n\n## Limites\n\n${words(300)}\n\n## Enseignements\n\nTexte final.${extra}`;
const TR = (slug, o = {}) => ({ lang: "fr", ready: 1, slug, title: "Un cas stratégique suffisamment solide", subtitle: "Ce que révèle ce repositionnement", summary: "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.", meta_description: "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants.", body_md: BODY(), takeaways: ["Un enseignement clé"], ...o });
async function real(S, db, slug, over = {}, at) { const id = await S.createArticle(db, { category_id: "cases", format_id: "case" }, "a@maioris.net"); await S.saveArticle(db, id, { tool_suggestion: "coi", quality: Q, sources: SRC, translations: [TR(slug)], ...over }, "a@maioris.net"); for (const to of ["review", "approved"]) await S.transition(db, id, to, "b@maioris.net"); await S.transition(db, id, "published", "b@maioris.net", at ? { publish_at: at } : {}); return id; }
const get = async (s, p) => { const r = await fetch(s.base + p); return { status: r.status, text: await r.text(), h: r.headers }; };

test("accueil sans publication : état vide honnête, archives existantes reliées, aucune promesse de fréquence", async () => {
  const s = await start({ demo: false }); try {
    const r = await get(s, "/fr/perspectives"); assert.equal(r.status, 200);
    assert.match(r.text, /ne sont pas encore en ligne/); assert.match(r.text, /href="\/fr\/analyses"/); assert.match(r.text, /href="\/fr\/cas-strategiques"/);
    assert.ok(!/Exemple éditorial fictif/.test(r.text), "aucune démo en production"); assert.ok(!/par mois|chaque semaine|hebdomadaire|mensuelle/i.test(r.text.replace(/<head>.*<\/head>/s, "")), "aucune fréquence promise");
  } finally { await s.close(); }
});
test("accueil : signature, positionnement, promesse, point de vue MAIORIS, cinq rubriques, lettre, CTA", async () => {
  const s = await start(); try {
    const r = await get(s, "/fr/perspectives"), t = r.text;
    assert.match(t, /MAIORIS · THINKING BEYOND CREATIVE EXECUTION\./); assert.match(t, /STRATEGIC CASES &amp; PERSPECTIVES/);
    assert.match(t, /Explore the ideas, intelligence and strategic shifts shaping the future of brands and creative leadership\./);
    assert.match(t, /Creative Leadership is not about producing more creative work\. It is about building the conditions, systems and decisions that make creative performance sustainable\./);
    for (const n of ["Strategic Cases", "Executive Perspectives", "Future of Creative", "Brand &amp; Market Intelligence", "African Business Perspectives"]) assert.ok(t.includes(n), n);
    assert.equal((t.match(/class="ed-cat"/g) || []).length, 5); assert.match(t, /<form class="nl-form"/); assert.match(t, /Latest Perspectives/); assert.match(t, /Featured Analysis/); assert.match(t, /Strategic Selection/);
    assert.match(t, /Creative Audit™/); assert.ok(!/250[\s ,.]?000/.test(t));
    assert.equal(r.h.get("x-robots-tag"), null, "l'accueil reste indexable");
  } finally { await s.close(); }
});
test("gabarit du site : liens absolus, aucun marqueur restant, bascule de langue vers la version existante", async () => {
  const s = await start(); try {
    const r = await get(s, "/fr/perspectives/strategic-cases/maison-oree-un-cadre-a-trois-niveaux"), t = r.text;
    assert.ok(!/ED_HEAD|ED_MAIN|__LANGHREF__/.test(t)); assert.match(t, /<a class="lang"[^>]*href="\/en\/perspectives\/strategic-cases\/maison-oree-a-three-level-framework"/);
    for (const href of t.match(/href="[^":#][^"]*"/g)) { const u = href.slice(6, -1); assert.ok(/^(https?:|mailto:|tel:|\/)/.test(u), "lien relatif : " + u); }
    assert.match(t, /\/assets\/site\.[0-9a-f]{8}\.css/); assert.match(t, /\/assets\/editorial\.[0-9a-f]{8}\.css/); assert.match(t, /\/assets\/edjs\.[0-9a-f]{8}\.js/);
    const hub = await get(s, "/fr/perspectives"); assert.match(hub.text, /<a class="lang"[^>]*href="\/en\/perspectives"/);
  } finally { await s.close(); }
});
test("article : structure éditoriale complète, format et temps de lecture, sommaire, points clés, sources, un seul outil", async () => {
  const s = await start(); try {
    const r = await get(s, "/fr/perspectives/strategic-cases/maison-oree-un-cadre-a-trois-niveaux"), t = r.text;
    assert.match(t, /<h1 class="ed-title">Maison Orée/); assert.match(t, /Ce que le scénario établit|Verified facts/); assert.match(t, /class="ed-box ed-facts"/); assert.match(t, /class="ed-box ed-analysis"/); assert.match(t, /class="ed-box ed-hypotheses"/); assert.match(t, /class="ed-box ed-questions"/);
    assert.match(t, /Strategic Case<\/li><li>\d+ min de lecture/); assert.match(t, /<time datetime="2026-11-18T08:00:00Z">18 novembre 2026<\/time>/); assert.match(t, /Key Takeaways/); assert.match(t, /Sources et références/); assert.match(t, /id="src-1"/);
    assert.match(t, /class="ed-toc ed-inline"/); assert.match(t, /class="ed-side"/); assert.ok((t.match(/<h2 id=/g) || []).length >= 4);
    assert.equal((t.match(/class="ed-tool"/g) || []).length, 1); assert.match(t, /Maturity Assessment/); const box = /<aside class="ed-tool".*?<\/aside>/s.exec(t)[0]; for (const other of ["Évaluez votre brief", "Où est votre contrainte", "Brand Consistency Review", "Creative Operations Intelligence"]) assert.ok(!box.includes(other), other);
    assert.match(t, /Le Creative Audit™ est une mission indépendante de diagnostic stratégique, au tarif officiel de 750 000 FCFA\./); assert.ok(!/250[\s ,.]?000/.test(t));
    assert.match(t, /Exemple éditorial fictif\. Ce contenu illustre le format/); assert.equal(r.h.get("x-robots-tag"), "noindex");
  } finally { await s.close(); }
});
test("article : référencement (canonical, hreflang, Open Graph, Article et BreadcrumbList)", async () => {
  const s = await start(); try {
    const t = (await get(s, "/fr/perspectives/strategic-cases/maison-oree-un-cadre-a-trois-niveaux")).text;
    assert.match(t, /<link rel="canonical" href="https:\/\/maioris\.net\/fr\/perspectives\/strategic-cases\/maison-oree-un-cadre-a-trois-niveaux"/);
    assert.match(t, /hreflang="en" href="https:\/\/maioris\.net\/en\/perspectives\/strategic-cases\/maison-oree-a-three-level-framework"/); assert.match(t, /hreflang="x-default"/);
    assert.match(t, /property="og:type" content="article"/); assert.match(t, /name="robots" content="noindex, nofollow"/, "exemple fictif non indexé");
    const ld = [...t.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
    assert.deepEqual(ld.map((x) => x["@type"]).sort(), ["Article", "BreadcrumbList"]); const art = ld.find((x) => x["@type"] === "Article"); assert.equal(art.inLanguage, "fr"); assert.ok(art.headline && art.datePublished && art.publisher.name === "MAIORIS");
    assert.equal(ld.find((x) => x["@type"] === "BreadcrumbList").itemListElement.length, 4);
  } finally { await s.close(); }
});
test("contenu non publié jamais servi : brouillon, relecture, approuvé, programmé, dépublié, archivé", async () => {
  const s = await start({ demo: false }); const S = await ST(); try {
    const id = await S.createArticle(s.db, { category_id: "cases", format_id: "case" }, "a"); await S.saveArticle(s.db, id, { tool_suggestion: "coi", quality: Q, sources: SRC, translations: [TR("secret-editorial")] }, "a");
    const url = "/fr/perspectives/strategic-cases/secret-editorial"; const hidden = async (label) => { const r = await get(s, url); assert.equal(r.status, 404, label); assert.ok(!r.text.includes("Un cas stratégique suffisamment solide"), label); assert.ok(!(await get(s, "/fr/perspectives")).text.includes("secret-editorial"), label); assert.ok(!(await get(s, "/sitemap-perspectives.xml")).text.includes("secret-editorial"), label); };
    await hidden("brouillon"); await S.transition(s.db, id, "review", "b"); await hidden("relecture"); await S.transition(s.db, id, "approved", "b"); await hidden("approuvé");
    await S.transition(s.db, id, "published", "b", { publish_at: new Date(Date.now() + 86400000).toISOString() }); await hidden("programmé");
    s.db._db.prepare("UPDATE articles SET published_at = ? WHERE id = ?").run("2026-01-01T00:00:00.000Z", id); assert.equal((await get(s, url)).status, 200, "publié"); assert.ok((await get(s, "/sitemap-perspectives.xml")).text.includes("secret-editorial"));
    await S.transition(s.db, id, "draft", "b"); await hidden("dépublié"); await S.transition(s.db, id, "archived", "b"); await hidden("archivé");
  } finally { await s.close(); }
});
test("sécurité du contenu : HTML saisi par un rédacteur échappé, titre inclus", async () => {
  const s = await start({ demo: false }); const S = await ST(); try {
    const id = await real(S, s.db, "xss-test"); // contenu hostile injecté directement en base : le rendu doit rester sûr même si la validation était contournée
    s.db._db.prepare("UPDATE article_translations SET title = ?, body_md = ? WHERE article_id = ? AND lang = 'fr'").run("Titre <img src=x onerror=alert(1)> dangereux", BODY('\n\nTexte <script>alert("x")</script> et [lien](javascript:alert(1)).'), id);
    const t = (await get(s, "/fr/perspectives/strategic-cases/xss-test")).text.replace(/<script type="application\/ld\+json">.*?<\/script>/gs, "");
    assert.ok(!/<script>alert|<img src=x|onerror=alert\(1\)>|href="javascript:/i.test(t)); assert.match(t, /&lt;script&gt;alert/);
  } finally { await s.close(); }
});
test("rubrique : filtre par format, recherche, indexation limitée aux pages filtrées, adresses invalides en 404", async () => {
  const s = await start({ demo: false }); const S = await ST(); try {
    await real(S, s.db, "premier-cas"); const b = await S.createArticle(s.db, { category_id: "cases", format_id: "brief" }, "a"); await S.saveArticle(s.db, b, { quality: Q, translations: [TR("un-brief-court", { title: "Un brief court et net pour décideurs", body_md: `## A\n\n${words(600)}` })] }, "a"); for (const to of ["review", "approved", "published"]) await S.transition(s.db, b, to, "b");
    const all = await get(s, "/fr/perspectives/strategic-cases"); assert.equal((all.text.match(/class="ed-card"/g) || []).length, 2); assert.ok(!/name="robots"/.test(all.text));
    const f = await get(s, "/fr/perspectives/strategic-cases?format=brief"); assert.equal((f.text.match(/class="ed-card"/g) || []).length, 1); assert.match(f.text, /name="robots" content="noindex, follow"/); assert.match(f.text, /<link rel="canonical" href="https:\/\/maioris\.net\/fr\/perspectives\/strategic-cases"/);
    assert.equal(((await get(s, "/fr/perspectives/strategic-cases?q=court")).text.match(/class="ed-card"/g) || []).length, 1); assert.match((await get(s, "/fr/perspectives/strategic-cases?q=introuvable")).text, /Aucune publication ne correspond/);
    assert.equal((await get(s, "/fr/perspectives/inconnue")).status, 404); assert.equal((await get(s, "/fr/perspectives/executive-perspectives/premier-cas")).status, 404, "mauvaise rubrique"); assert.equal((await get(s, "/fr/perspectives/strategic-cases/premier-cas/extra")).status, 404);
    assert.equal((await get(s, "/de/perspectives")).status, 404, "langue inconnue : repli statique");
  } finally { await s.close(); }
});
test("plan du site : publications réelles seulement, exemples fictifs exclus, alternatives de langue", async () => {
  const s = await start(); const S = await ST(); try {
    let x = (await get(s, "/sitemap-perspectives.xml")).text; assert.ok(!/maison-oree|nommer-le-probleme|directeur-creatif/.test(x), "démos exclues"); assert.ok(x.includes("https://maioris.net/fr/perspectives</loc>") && x.includes("/en/perspectives/african-business-perspectives</loc>"));
    const id = await real(S, s.db, "cas-reel"); await S.saveArticle(s.db, id, { translations: [TR("real-case", { lang: "en", ready: 1, title: "A solid strategic case study", subtitle: "What this repositioning reveals", summary: TR("x").summary, body_md: BODY() })] }, "a");
    s.db._db.prepare("UPDATE article_translations SET slug = 'real-case' WHERE lang = 'en' AND article_id = ?").run(id);
    x = (await get(s, "/sitemap-perspectives.xml")).text; assert.ok(x.includes("/fr/perspectives/strategic-cases/cas-reel</loc>")); assert.ok(x.includes('hreflang="en" href="https://maioris.net/en/perspectives/strategic-cases/real-case"'));
  } finally { await s.close(); }
});
test("sans base liée (prévisualisation) : l'accueil et les rubriques répondent, aucun article", async () => {
  const s = await start({ demo: false }); try { delete s.env.MAIORIS_DB; assert.equal((await get(s, "/fr/perspectives")).status, 200); assert.equal((await get(s, "/fr/perspectives/strategic-cases")).status, 200); assert.equal((await get(s, "/fr/perspectives/strategic-cases/x")).status, 404); } finally { await s.close(); }
});
test("anglais : accueil et article rendus en anglais", async () => {
  const s = await start(); try {
    const h = (await get(s, "/en/perspectives")).text; assert.match(h, /A strategic intelligence platform/); assert.ok(!/Une plateforme d'intelligence/.test(h));
    const a = (await get(s, "/en/perspectives/strategic-cases/maison-oree-a-three-level-framework")).text; assert.match(a, /min read/); assert.match(a, /Fictional editorial example/); assert.match(a, /official fee of 750 000 FCFA/); assert.match(a, /<html lang="en">/);
  } finally { await s.close(); }
});
test("palette et police de la section : jetons demandés présents, Poppins auto-hébergée, hors identité du reste du site", () => {
  const css = fs.readFileSync(path.join(__dirname, "../src/editorial/editorial.css"), "utf8");
  for (const c of ["#FFF8EA", "#101A3A", "#243BFF", "#FFD84D", "#FF6B5E", "#19B77A"]) assert.ok(css.toUpperCase().includes(c), c);
  for (const w of [400, 500, 600, 700]) { assert.ok(css.includes(`poppins-${w}-latin.woff2`)); assert.ok(fs.existsSync(path.join(__dirname, `../site/assets/fonts/poppins-${w}-latin.woff2`))); }
  assert.ok(!/Poppins/.test(fs.readFileSync(path.join(__dirname, "../site/assets/site.css"), "utf8")), "le reste du site ne change pas");
  assert.ok(!/border-radius:\s*(?:[1-9]\d|[5-9])px/.test(css), "pas de cartes arrondies"); assert.ok(!/gradient/.test(css), "pas de dégradés");
});

test("en-têtes de sécurité des pages dynamiques : CSP identique à _headers, anti-framing, nosniff, HSTS (Cloudflare n'applique pas _headers aux Functions)", async () => {
  const sec = await import(path.resolve(__dirname, "../site/functions/_lib/security.js")), hdr = fs.readFileSync(path.join(__dirname, "../site/_headers"), "utf8");
  assert.equal(sec.CSP, /Content-Security-Policy: (.*)/.exec(hdr)[1].trim(), "politique identique à site/_headers");
  const s = await start(); try {
    for (const p of ["/fr/perspectives", "/fr/perspectives/strategic-cases", "/fr/perspectives/strategic-cases/maison-oree-un-cadre-a-trois-niveaux", "/fr/perspectives/introuvable"]) {
      const r = await fetch(s.base + p); assert.equal(r.headers.get("content-security-policy"), sec.CSP, p); assert.equal(r.headers.get("x-frame-options"), "DENY", p); assert.equal(r.headers.get("x-content-type-options"), "nosniff", p); assert.match(r.headers.get("strict-transport-security"), /max-age=31536000/, p); assert.equal(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin", p);
    }
  } finally { await s.close(); }
});
