const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SITE = path.join(__dirname, "../site");
const PDF = "assets/docs/cas-tcl-west-africa-2026-nasco-maioris.pdf";

test("le PDF du cas est publié et valide, avec ses cinq pages en images", () => {
  const b = fs.readFileSync(path.join(SITE, PDF));
  assert.equal(b.subarray(0, 5).toString("latin1"), "%PDF-");
  for (let i = 1; i <= 5; i++) assert.ok(fs.statSync(path.join(SITE, `assets/docs/tcl/p-${i}.webp`)).size > 10000, "page " + i);
});
test("accueils : « Voir l'expérience » remplace « Toutes les références », avec lien de secours vers le PDF et visionneuse", () => {
  for (const [f, label, close] of [["fr/index.html", "Voir l'expérience →", "Fermer"], ["en/index.html", "See the experience →", "Close"], ["index.html", "Voir l'expérience →", "Fermer"]]) {
    const t = fs.readFileSync(path.join(SITE, f), "utf8");
    assert.ok(!/Toutes les références|All references/.test(t), f + " : ancien libellé");
    const a = t.match(/<a [^>]*data-pdfv=""[^>]*>([^<]*)<\/a>/);
    assert.ok(a && a[1] === label, f + " : lien");
    assert.ok(a[0].includes(PDF), f + " : lien de secours vers le PDF");
    const dlg = t.match(/<dialog aria-labelledby="pdfv-t" class="pdfv" id="pdfv">[\s\S]*?<\/dialog>/);
    assert.ok(dlg, f + " : visionneuse");
    assert.equal((dlg[0].match(/<img /g) || []).length, 5);
    assert.ok(dlg[0].includes(close) && dlg[0].includes(`download=""`));
    for (const m of dlg[0].matchAll(/<img alt="([^"]+)"/g)) assert.ok(m[1].length > 30, "alt descriptif");
  }
});
