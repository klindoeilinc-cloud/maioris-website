const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SITE = path.join(__dirname, "../site");
const page = (l) => fs.readFileSync(path.join(SITE, l === "en" ? "en/partners.html" : "fr/partenaires.html"), "utf8");
const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;| /g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

test("page Partners : titre, description, H1 unique, canonique, hreflang, Open Graph, données structurées", () => {
  for (const l of ["en", "fr"]) {
    const h = page(l);
    assert.equal((h.match(/<h1[ >]/g) || []).length, 1);
    assert.match(h, /<title>[^<]{30,}<\/title>/); assert.match(h, /name="description"/);
    assert.ok(h.includes('hreflang="en"') && h.includes('hreflang="fr"') && h.includes('rel="canonical"'));
    assert.ok(h.includes("/assets/og/" + l + "-maioris-partners.png") && fs.existsSync(path.join(SITE, "assets/og/" + l + "-maioris-partners.png")));
    const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).flat();
    const list = ld.find((x) => x["@type"] === "ItemList");
    assert.equal(list.itemListElement.length, 4);
    const prices = list.itemListElement.map((i) => i.item.offers.price);
    assert.deepEqual(prices, ["800000", "2300000", "1000000", "1650000"]);
    assert.ok(list.itemListElement.every((i) => i.item.offers.priceCurrency === "XOF"));
  }
});

test("page Partners : tarifs exacts en FCFA, parcours et économie, aucune autre remise", () => {
  const en = text(page("en")), fr = text(page("fr"));
  for (const [t, f] of [[en, (n) => n.toLocaleString("en-US")], [fr, (n) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ")]]) {
    for (const n of [800000, 2300000, 1000000, 1650000, 3000000, 3100000, 100000]) assert.ok(t.replace(/[  ]/g, " ").includes(f(n).replace(/[  ]/g, " ") + " FCFA"), "montant absent : " + n);
  }
  assert.equal(800000 + 2300000, 3100000); assert.equal(3100000 - 3000000, 100000);
  assert.ok(!/250[ , ]000/.test(en + fr), "tarif interdit");
  assert.ok(!/™|&trade;/.test(page("en") + page("fr")), "pas de ™ sur le site");
});

test("page Partners : trois modèles, périmètre (fait / ne fait pas), mention obligatoire, formulaire branché", () => {
  const en = text(page("en")), fr = text(page("fr"));
  for (const s of ["Agency Advisory", "Strategic Co-consulting", "Direct Corporate Engagement", "Graphic Design Production", "Website Development", "MAIORIS does not replace your creative team. We strengthen the system behind its performance.", "This service is not a daily art direction service, hierarchical management or creative production.", "We don't compete with agencies. We strengthen their strategic capacity."]) assert.ok(en.includes(s), "EN : " + s);
  for (const s of ["Agency Advisory", "Direct Corporate Engagement", "Ce service ne constitue pas une prestation de direction artistique quotidienne, de management hiérarchique ou de production créative.", "Nous ne concurrençons pas les agences."]) assert.ok(fr.includes(s), "FR : " + s);
  for (const l of ["en", "fr"]) {
    const h = page(l);
    assert.match(h, /data-endpoint="\/api\/partners"/);
    for (const n of ["firstname", "lastname", "email", "agency", "agency_site", "country", "team", "role", "need", "offer", "context", "consent"]) assert.ok(new RegExp('name="' + n + '"').test(h), "champ " + n);
    assert.equal((h.match(/data-offer="/g) || []).length, 4);
    for (const k of ["audit", "cos", "fractional", "ai"]) assert.ok(h.includes('data-offer="' + k + '"') && h.includes('name="offer" type="radio" value="' + k + '"'));
  }
});

test("navigation : lien Partners dans l'en-tête de toutes les pages publiques", () => {
  for (const [dir, slug] of [["en", "partners.html"], ["fr", "partenaires.html"]]) {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
    for (const f of walk(path.join(SITE, dir))) {
      const head = fs.readFileSync(f, "utf8").split("</header>")[0];
      assert.ok(head.includes(slug + '">'), path.relative(SITE, f));
    }
  }
});
