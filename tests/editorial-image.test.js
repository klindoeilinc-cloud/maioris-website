const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const IMG = () => import(path.resolve(__dirname, "../site/functions/_lib/editorial/image.js"));
const fx = (n) => new Uint8Array(fs.readFileSync(path.join(__dirname, "fixtures/media", n)));
const has = (bytes, text) => Buffer.from(bytes).includes(Buffer.from(text));

test("JPEG : type lu sur les octets, dimensions, EXIF, GPS et commentaire retirés", async () => {
  const { inspect } = await IMG(), src = fx("photo-exif.jpg");
  for (const s of ["EXIF-SECRET-DESCRIPTION", "EXIF-SECRET-ARTIST", "JPEG-COMMENT-SECRET", "Exif"]) assert.ok(has(src, s), "fixture : " + s);
  const r = inspect(src); assert.equal(r.mime, "image/jpeg"); assert.equal(r.ext, "jpg"); assert.deepEqual([r.width, r.height], [960, 600]);
  for (const s of ["EXIF-SECRET-DESCRIPTION", "EXIF-SECRET-ARTIST", "JPEG-COMMENT-SECRET", "Exif"]) assert.ok(!has(r.bytes, s), "retiré : " + s);
  assert.ok(r.bytes.length < src.length); assert.deepEqual([...r.bytes.slice(0, 3)], [0xff, 0xd8, 0xff]); assert.deepEqual([...r.bytes.slice(-2)], [0xff, 0xd9]);
});
test("JPEG progressif accepté tel quel", async () => { const { inspect } = await IMG(), r = inspect(fx("progressive.jpg")); assert.deepEqual([r.width, r.height], [800, 500]); assert.deepEqual([...r.bytes.slice(-2)], [0xff, 0xd9]); });
test("PNG : textes et métadonnées retirés, image intacte (structure et dimensions)", async () => {
  const { inspect } = await IMG(), src = fx("visuel-meta.png"); assert.ok(has(src, "PNG-SECRET-AUTHOR") && has(src, "PNG-SECRET-ITXT"));
  const r = inspect(src); assert.equal(r.mime, "image/png"); assert.deepEqual([r.width, r.height], [720, 450]); assert.ok(!has(r.bytes, "PNG-SECRET-AUTHOR") && !has(r.bytes, "PNG-SECRET-ITXT") && !has(r.bytes, "tEXt") && !has(r.bytes, "iTXt"));
  assert.ok(has(r.bytes, "IDAT") && has(r.bytes, "IEND"));
});
test("WebP : EXIF retiré, indicateurs et taille RIFF corrigés", async () => {
  const { inspect } = await IMG(), src = fx("visuel-exif.webp"); assert.ok(has(src, "WEBP-SECRET-EXIF"));
  const r = inspect(src); assert.equal(r.mime, "image/webp"); assert.deepEqual([r.width, r.height], [900, 560]); assert.ok(!has(r.bytes, "WEBP-SECRET-EXIF") && !has(r.bytes, "EXIF"));
  const size = r.bytes[4] | (r.bytes[5] << 8) | (r.bytes[6] << 16) | (r.bytes[7] << 24); assert.equal(size + 8, r.bytes.length, "taille RIFF cohérente");
  const vp8x = Buffer.from(r.bytes).indexOf("VP8X"); if (vp8x >= 0) assert.equal(r.bytes[vp8x + 8] & 0x0c, 0, "indicateurs EXIF et XMP effacés");
  assert.deepEqual(inspect(fx("plain.webp")).width, 640);
});
test("refus : faux PNG (HTML), SVG, GIF, fichier vide, JPEG tronqué", async () => {
  const { inspect } = await IMG();
  for (const [n, code] of [["faux.png", "format"], ["dessin.svg", "format"], ["anim.gif", "format"], ["tronque.jpg", "corrupt"]]) assert.throws(() => inspect(fx(n)), { code }, n);
  assert.throws(() => inspect(new Uint8Array(0)), { code: "empty" });
});
test("refus : dimensions excessives, poids excessif, PNG tronqué ou à chunk critique inconnu", async () => {
  const { inspect, LIMITS } = await IMG();
  assert.throws(() => inspect(fx("geant.png")), { code: "dimensions" });
  const big = new Uint8Array(LIMITS.maxBytes + 1); big.set(fx("progressive.jpg").slice(0, 3)); assert.throws(() => inspect(big), { code: "too_large" });
  const p = fx("visuel-meta.png"); assert.throws(() => inspect(p.slice(0, p.length - 20)), { code: "corrupt" });
});
test("l'extension et le type déclaré n'ont aucun effet : seuls les octets comptent", async () => {
  const { inspect, sniff } = await IMG(); const png = fx("visuel-meta.png");
  assert.equal(inspect(png).mime, "image/png"); assert.equal(sniff(fx("photo-exif.jpg")).ext, "jpg"); assert.equal(sniff(new TextEncoder().encode("<html>")), null);
  const polyglot = new Uint8Array([...fx("progressive.jpg"), ...new TextEncoder().encode("<script>alert(1)</script>")]); assert.throws(() => inspect(polyglot), { code: "corrupt" }, "données après la fin du JPEG");
});
