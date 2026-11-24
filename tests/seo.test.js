const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SITE = path.join(__dirname, "../site");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["admin", "editorial-shell", "assets", "functions"].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
const PAGES = [...walk(path.join(SITE, "fr")), ...walk(path.join(SITE, "en")), path.join(SITE, "index.html")];
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const get = (t, re) => { const m = t.match(re); return m ? dec(m[1]) : ""; };
const O = JSON.parse(fs.readFileSync(path.join(__dirname, "../tools/offers.json"), "utf8"));

test("chaque page : titre de 60 caractères au plus, description de 70 à 160, un seul H1, canonique présente", () => {
  for (const f of PAGES) {
    const t = fs.readFileSync(f, "utf8"), rel = path.relative(SITE, f);
    const title = get(t, /<title>([\s\S]*?)<\/title>/).trim(), desc = get(t, /<meta content="([^"]*)" name="description"/);
    assert.ok(title.length >= 20 && title.length <= 60, `${rel} : titre ${title.length} caractères : ${title}`);
    assert.ok(desc.length >= 70 && desc.length <= 160, `${rel} : description ${desc.length} caractères`);
    assert.equal((t.match(/<h1[ >]/g) || []).length, 1, rel + " : H1");
    assert.ok(/rel="canonical"/.test(t), rel + " : canonique");
  }
});
test("titres : uniques au sein d'une même langue", () => {
  const seen = {};
  for (const f of PAGES) { const t = fs.readFileSync(f, "utf8"), lang = get(t, /<html lang="(\w+)"/), title = get(t, /<title>([\s\S]*?)<\/title>/).trim(); if (path.relative(SITE, f) === "index.html") continue; (seen[lang + "|" + title] = seen[lang + "|" + title] || []).push(path.relative(SITE, f)); }
  const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
  assert.deepEqual(dup, []);
});
test("accueils : titre de marque et données structurées Organization et WebSite", () => {
  for (const f of ["en/index.html", "fr/index.html"]) {
    const t = fs.readFileSync(path.join(SITE, f), "utf8");
    assert.equal(get(t, /<title>([\s\S]*?)<\/title>/).trim(), "MAIORIS | Creative Intelligence & Performance");
    const ld = [...t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).flat();
    const org = ld.find((x) => x["@type"] === "Organization"), web = ld.find((x) => x["@type"] === "WebSite");
    assert.ok(org && web);
    assert.equal(org.url, "https://maioris.net"); assert.equal(org.legalName, "MAIORIS Group"); assert.equal(org.email, "hello@maioris.net");
    assert.ok(!("sameAs" in org), "aucun profil social inventé");
    assert.equal(web["@id"], "https://maioris.net/#website");
  }
});
test("données structurées : JSON valide partout, aucun type FAQ ou avis, prix du Creative Audit conforme à la source", () => {
  for (const f of PAGES) {
    const t = fs.readFileSync(f, "utf8");
    for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { const j = JSON.parse(m[1]); const types = JSON.stringify(j); assert.ok(!/"FAQPage"|"Review"|"AggregateRating"/.test(types), "type non pris en charge dans " + f); }
  }
  for (const f of ["en/advisory/creative-audit.html", "fr/accompagnement/creative-audit.html"]) {
    const t = fs.readFileSync(path.join(SITE, f), "utf8");
    const svc = [...t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).flat().find((x) => x["@type"] === "Service");
    assert.equal(svc.offers.price, String(O.brands.creative_audit.price)); assert.equal(svc.offers.priceCurrency, "XOF");
  }
});
test("hreflang : chaque page FR et EN renvoie vers sa jumelle, et la jumelle renvoie vers elle", () => {
  const byUrl = {};
  for (const f of PAGES) { const t = fs.readFileSync(f, "utf8"); const can = get(t, /<link href="([^"]*)" rel="canonical"/); byUrl[can] = t; }
  for (const [can, t] of Object.entries(byUrl)) {
    const en = get(t, /<link href="([^"]*)" hreflang="en"/), fr = get(t, /<link href="([^"]*)" hreflang="fr"/);
    assert.ok(en && fr, "hreflang manquant : " + can);
    for (const other of [en, fr]) { const o = byUrl[other]; assert.ok(o, "page jumelle introuvable : " + other); assert.equal(get(o, /<link href="([^"]*)" hreflang="en"/), en); assert.equal(get(o, /<link href="([^"]*)" hreflang="fr"/), fr); }
  }
});
test("robots.txt et sitemap : adresses publiques présentes, administration exclue", () => {
  const r = fs.readFileSync(path.join(SITE, "robots.txt"), "utf8"), s = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
  assert.match(r, /Disallow: \/admin\//); assert.match(r, /Sitemap: https:\/\/maioris\.net\/sitemap\.xml/);
  for (const u of ["/en/partners", "/fr/partenaires", "/en/brands-groups", "/fr/marques-et-groupes", "/en/advisory/creative-audit", "/fr/accompagnement/creative-audit"]) assert.ok(s.includes("https://maioris.net" + u + "<"), u);
  assert.ok(!/\/admin/.test(s));
});
