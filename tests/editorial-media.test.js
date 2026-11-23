const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { start } = require("./helpers/pages-dev.js");
const ST = () => import(path.resolve(__dirname, "../site/functions/_lib/editorial/store.js"));
const MD = () => import(path.resolve(__dirname, "../site/functions/_lib/editorial/media.js"));
const FX = (n) => fs.readFileSync(path.join(__dirname, "fixtures/media", n));
const has = (buf, t) => Buffer.from(buf).includes(Buffer.from(t));
const words = (n) => Array.from({ length: n }, (_, i) => "mot" + (i % 50)).join(" ");
const Q = { sources: 18, depth: 18, analysis: 18, business: 13, originality: 13, writing: 9 };
const SRC = [{ label: "Rapport annuel", url: "https://exemple.org/rapport", publisher: "Organisme", kind: "primary" }, { label: "Étude de marché", url: "https://exemple.org/etude", publisher: "Cabinet", kind: "secondary" }];
const BODY = (extra = "") => `## Contexte\n\n${words(420)} [^1]\n\n:::facts\nUn fait établi. [^2]\n\n${words(320)}\n:::\n\n:::analysis\n${words(320)}\n:::\n\n:::hypotheses\nUne hypothèse.\n:::\n\n:::questions\n- Question ouverte ?\n:::\n\n## Limites\n\n${words(300)}\n\n## Enseignements\n\nTexte final.${extra}`;
const TR = (slug, extra = "") => ({ lang: "fr", ready: 1, slug, title: "Un cas stratégique suffisamment solide", subtitle: "Ce que révèle ce repositionnement", summary: "Une analyse structurée d'un repositionnement, de ses décisions, de ses limites et de ses enseignements pour les dirigeants de marque.", meta_description: "Une analyse structurée d'un repositionnement de marque : décisions, limites et enseignements stratégiques pour les dirigeants.", body_md: BODY(extra), takeaways: ["Un enseignement"] });

async function upload(s, name, { file, alt = "Une image décrite pour l'accessibilité", type, jwt, filename } = {}) {
  const fd = new FormData(); if (file !== null) fd.append("file", new Blob([file === undefined ? FX(name) : file], { type: type || "application/octet-stream" }), filename || name); if (alt !== null) fd.append("alt", alt);
  const tok = jwt === undefined ? await s.token() : jwt;
  const r = await fetch(s.base + "/api/admin/editorial/media", { method: "POST", headers: { ...(tok ? { "Cf-Access-Jwt-Assertion": tok } : {}), Origin: s.base }, body: fd });
  return { status: r.status, json: await r.json() };
}
async function api(s, p, { method = "GET", body, jwt } = {}) { const tok = jwt === undefined ? await s.token() : jwt; const r = await fetch(s.base + "/api/admin/editorial/" + p, { method, headers: { "Content-Type": "application/json", ...(tok ? { "Cf-Access-Jwt-Assertion": tok } : {}), Origin: s.base }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json() }; }

test("téléversement JPEG : image nettoyée dans R2, registre en base, journalisé", async () => {
  const s = await start({ demo: false }); try {
    const r = await upload(s, "photo-exif.jpg", { type: "image/jpeg" }); assert.equal(r.status, 201); const m = r.json.media; assert.match(m.url, /^\/media\/[A-Za-z0-9_-]{24}$/); assert.equal(m.mime, "image/jpeg"); assert.deepEqual([m.width, m.height], [960, 600]);
    const key = `editorial/${m.id}.jpg`, stored = s.r2._m.get(key); assert.ok(stored, "objet dans R2"); assert.equal(stored.opts.httpMetadata.contentType, "image/jpeg");
    for (const secret of ["EXIF-SECRET-DESCRIPTION", "JPEG-COMMENT-SECRET", "Exif"]) assert.ok(!has(stored.buf, secret), "retiré avant stockage : " + secret);
    const row = s.db._db.prepare("select * from media where id = ?").get(m.id); assert.equal(row.size_bytes, stored.buf.length); assert.equal(row.uploaded_by, "admin@maioris.net"); assert.equal(row.original_name, "photo-exif.jpg");
    assert.equal(s.db._db.prepare("select actor from audit_events where action = 'media.uploaded' and object_id = ?").get(m.id).actor, "admin@maioris.net");
  } finally { await s.close(); }
});
test("formats : PNG et WebP acceptés, métadonnées retirées", async () => {
  const s = await start({ demo: false }); try {
    const p = (await upload(s, "visuel-meta.png")).json.media, w = (await upload(s, "visuel-exif.webp")).json.media;
    assert.equal(p.mime, "image/png"); assert.equal(w.mime, "image/webp"); assert.ok(!has(s.r2._m.get(`editorial/${p.id}.png`).buf, "PNG-SECRET-AUTHOR")); assert.ok(!has(s.r2._m.get(`editorial/${w.id}.webp`).buf, "WEBP-SECRET-EXIF"));
  } finally { await s.close(); }
});
test("le type est lu sur les octets : un PNG nommé .jpg et déclaré text/plain est accepté comme PNG", async () => {
  const s = await start({ demo: false }); try { const r = await upload(s, "x", { file: FX("visuel-meta.png"), type: "text/plain", filename: "trompeur.jpg" }); assert.equal(r.status, 201); assert.equal(r.json.media.mime, "image/png"); assert.ok(s.r2._m.has(`editorial/${r.json.media.id}.png`)); }
  finally { await s.close(); }
});
test("refus : faux PNG, SVG, GIF, tronqué, géant, trop lourd, sans texte alternatif, sans fichier", async () => {
  const s = await start({ demo: false }); try {
    for (const [n, code, st] of [["faux.png", "format", 422], ["dessin.svg", "format", 422], ["anim.gif", "format", 422], ["tronque.jpg", "corrupt", 422], ["geant.png", "dimensions", 422]]) { const r = await upload(s, n); assert.equal(r.status, st, n); assert.equal(r.json.error, code, n); }
    const big = Buffer.concat([FX("progressive.jpg").subarray(0, 3), Buffer.alloc(5 * 1024 * 1024 + 10)]); const r1 = await upload(s, "gros.jpg", { file: big }); assert.ok([413, 422].includes(r1.status) && r1.json.error === "too_large");
    assert.equal((await upload(s, "progressive.jpg", { alt: "" })).json.error, "alt"); assert.equal((await upload(s, "progressive.jpg", { alt: "ab" })).json.error, "alt"); assert.equal((await upload(s, "x", { file: null })).json.error, "empty");
    assert.equal(s.r2._m.size, 0, "rien n'est stocké après un refus"); assert.equal(s.db._db.prepare("select count(*) n from media").get().n, 0);
  } finally { await s.close(); }
});
test("accès : téléversement, liste, texte alternatif et suppression exigent Access ; la lecture d'une image publiée reste publique", async () => {
  const s = await start({ demo: false }); try {
    assert.equal((await upload(s, "progressive.jpg", { jwt: null })).status, 401); assert.equal((await api(s, "media", { jwt: null })).status, 401);
    const id = (await upload(s, "progressive.jpg")).json.media.id; assert.equal((await api(s, `media/${id}/delete`, { method: "POST", jwt: null })).status, 401); assert.equal((await api(s, `media/${id}`, { method: "PUT", jwt: null, body: { alt: "xxxx" } })).status, 401);
    assert.equal((await fetch(s.base + "/media/" + id)).status, 200, "lecture publique");
    const tok = await s.token(); const bad = await fetch(s.base + "/api/admin/editorial/media", { method: "POST", headers: { "Cf-Access-Jwt-Assertion": tok, Origin: "https://evil.example" }, body: new FormData() }); assert.equal(bad.status, 403, "origine contrôlée");
  } finally { await s.close(); }
});
test("lecture publique : en-têtes de sécurité et de cache, requêtes conditionnelles, HEAD", async () => {
  const s = await start({ demo: false }); try {
    const m = (await upload(s, "progressive.jpg")).json.media, r = await fetch(s.base + m.url), body = Buffer.from(await r.arrayBuffer());
    assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/jpeg"); assert.match(r.headers.get("cache-control"), /public, max-age=31536000, immutable/); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.match(r.headers.get("content-security-policy"), /default-src 'none'/);
    assert.deepEqual(body, s.r2._m.get(`editorial/${m.id}.jpg`).buf, "octets servis = octets stockés"); assert.match(r.headers.get("etag"), /^"[0-9a-f]{64}"$/);
    assert.equal((await fetch(s.base + m.url, { headers: { "If-None-Match": r.headers.get("etag") } })).status, 304); assert.equal((await fetch(s.base + m.url, { method: "HEAD" })).headers.get("content-length"), String(body.length));
    assert.equal((await fetch(s.base + m.url + ".jpg")).status, 200, "suffixe d'extension toléré");
  } finally { await s.close(); }
});
test("lecture publique : identifiants inconnus, supprimés ou mal formés ne servent rien (aucun chemin libre)", async () => {
  const s = await start({ demo: false }); const { ID_RE } = await MD(); const fn = await import(path.resolve(__dirname, "../site/functions/media/[id].js"));
  try {
    const id = (await upload(s, "progressive.jpg")).json.media.id; assert.equal((await fetch(s.base + "/media/AAAAAAAAAAAAAAAAAAAAAAAA")).status, 404);
    for (const bad of ["../editorial/" + id, "..%2F..%2Fsecret", "editorial/" + id + ".jpg", "a", "x".repeat(60), id + "/../x", "'; DROP TABLE media;--"]) { const r = await fn.onRequestGet({ request: new Request("https://maioris.net/media/x"), env: s.env, params: { id: bad } }); assert.equal(r.status, 404, bad); }
    assert.ok(ID_RE.test(id)); await api(s, `media/${id}/delete`, { method: "POST" }); assert.equal((await fetch(s.base + "/media/" + id)).status, 404, "supprimée"); assert.equal(s.r2._m.size, 0, "objet R2 supprimé");
    const noR2 = await fn.onRequestGet({ request: new Request("https://maioris.net/media/x"), env: { ...s.env, MAIORIS_MEDIA: undefined }, params: { id } }); assert.equal(noR2.status, 404);
  } finally { await s.close(); }
});
test("doublons : le même fichier n'est stocké qu'une fois", async () => {
  const s = await start({ demo: false }); try { const a = (await upload(s, "progressive.jpg")).json.media, b = await upload(s, "progressive.jpg", { alt: "Autre description de la même image" }); assert.equal(b.status, 200); assert.equal(b.json.media.duplicate, true); assert.equal(b.json.media.id, a.id); assert.equal(s.r2._m.size, 1); assert.equal(s.db._db.prepare("select count(*) n from media").get().n, 1); }
  finally { await s.close(); }
});
test("sans bucket R2 lié : téléversement refusé clairement (503), liste signale l'absence de stockage", async () => {
  const s = await start({ demo: false, media: false }); try { const r = await upload(s, "progressive.jpg"); assert.equal(r.status, 503); assert.equal(r.json.error, "no_storage"); assert.equal((await api(s, "media")).json.storage, false); }
  finally { await s.close(); }
});
test("liste, texte alternatif, suppression refusée tant que l'image est utilisée", async () => {
  const s = await start({ demo: false }); const S = await ST(); try {
    const m = (await upload(s, "progressive.jpg")).json.media; let list = (await api(s, "media")).json; assert.equal(list.storage, true); assert.equal(list.items.length, 1); assert.equal(list.items[0].used, 0);
    assert.equal((await api(s, `media/${m.id}`, { method: "PUT", body: { alt: "Nouveau texte alternatif" } })).status, 200); assert.equal((await api(s, `media/${m.id}`, { method: "PUT", body: { alt: "x" } })).json.error, "alt");
    const a = await S.createArticle(s.db, { category_id: "cases", format_id: "case" }, "x"); await S.saveArticle(s.db, a, { hero_image: m.url, hero_alt: "Visuel", translations: [{ lang: "fr", slug: "avec-image", title: "Brouillon" }] }, "x");
    assert.equal((await api(s, "media")).json.items[0].used, 1); const del = await api(s, `media/${m.id}/delete`, { method: "POST" }); assert.equal(del.status, 409); assert.equal(del.json.error, "in_use"); assert.deepEqual(del.json.details, [a]); assert.equal(s.r2._m.size, 1);
    await S.saveArticle(s.db, a, { hero_image: "" }, "x"); assert.equal((await api(s, `media/${m.id}/delete`, { method: "POST" })).status, 200); assert.equal(s.r2._m.size, 0);
    const b = await S.createArticle(s.db, { category_id: "cases", format_id: "case" }, "x"); const m2 = (await upload(s, "plain.webp")).json.media; await S.saveArticle(s.db, b, { translations: [{ lang: "fr", slug: "image-dans-le-texte", body_md: `## A\n\n![Vue](${m2.url})` }] }, "x"); assert.equal((await api(s, `media/${m2.id}/delete`, { method: "POST" })).json.error, "in_use", "image citée dans le texte");
  } finally { await s.close(); }
});
test("articles : une image citée absente de la bibliothèque est refusée (image principale ou texte)", async () => {
  const s = await start({ demo: false }); const S = await ST(); try {
    const a = await S.createArticle(s.db, { category_id: "cases", format_id: "case" }, "x");
    await assert.rejects(S.saveArticle(s.db, a, { hero_image: "/media/AAAAAAAAAAAAAAAAAAAAAAAA", hero_alt: "x" }, "x"), { code: "media_missing" });
    await assert.rejects(S.saveArticle(s.db, a, { translations: [{ lang: "fr", slug: "x-y", body_md: "![a](/media/BBBBBBBBBBBBBBBBBBBBBBBB)" }] }, "x"), { code: "media_missing" });
    const m = (await upload(s, "progressive.jpg")).json.media; await S.saveArticle(s.db, a, { hero_image: m.url, hero_alt: "Un visuel" }, "x"); assert.equal((await S.getArticle(s.db, a)).article.hero_image, m.url);
  } finally { await s.close(); }
});
test("rendu public : image principale avec dimensions, Open Graph absolu, image dans le texte ; identifiant mal formé non rendu", async () => {
  const s = await start({ demo: false }); const S = await ST(); try {
    const m = (await upload(s, "photo-exif.jpg")).json.media, m2 = (await upload(s, "plain.webp")).json.media;
    const id = await S.createArticle(s.db, { category_id: "cases", format_id: "case" }, "a");
    await S.saveArticle(s.db, id, { tool_suggestion: "coi", quality: Q, sources: SRC, hero_image: m.url, hero_alt: "Composition géométrique bleue", translations: [TR("avec-visuel", `\n\n![Détail du visuel](${m2.url})`)] }, "a");
    for (const to of ["review", "approved", "published"]) await S.transition(s.db, id, to, "b");
    s.db._db.prepare("UPDATE article_translations SET body_md = body_md || ? WHERE article_id = ?").run("\n\n![piégée](/media/../../x)", id); // contenu hostile injecté en base : le rendu reste sûr
    const t = await (await fetch(s.base + "/fr/perspectives/strategic-cases/avec-visuel")).text();
    assert.match(t, new RegExp(`<img src="${m.url}" alt="Composition géométrique bleue" decoding="async" width="960" height="600">`)); assert.match(t, new RegExp(`property="og:image" content="https://maioris.net${m.url}"`));
    assert.match(t, new RegExp(`<img src="${m2.url}" alt="Détail du visuel" loading="lazy"`)); assert.ok(!/<img[^>]*\/media\/\.\.|href="[^"]*\/media\/\.\./.test(t), "identifiant piégé : aucune image ni lien générés (le texte reste inerte)");
    assert.ok(!/r2\.dev|r2\.cloudflarestorage/.test(t), "aucune URL publique du bucket"); assert.equal((await fetch(s.base + m.url)).status, 200);
  } finally { await s.close(); }
});
test("échec d'écriture en base : l'objet R2 est retiré (pas d'orphelin)", async () => {
  const s = await start({ demo: false }); const { uploadMedia } = await MD(); const real = s.db;
  try {
    const wrapped = { prepare: (sql) => { if (/INSERT INTO media/.test(sql)) throw new Error("D1 indisponible"); return real.prepare(sql); }, batch: (x) => real.batch(x) };
    await assert.rejects(uploadMedia({ ...s.env, MAIORIS_DB: wrapped }, { bytes: new Uint8Array(FX("progressive.jpg")), name: "a.jpg", alt: "Une image décrite", actor: "x" }), /D1 indisponible/); assert.equal(s.r2._m.size, 0);
  } finally { await s.close(); }
});
test("limite de la bibliothèque : refus au-delà de 1000 images", async () => {
  const s = await start({ demo: false }); try {
    const ins = s.db._db.prepare("INSERT INTO media (id, r2_key, mime, size_bytes, width, height, sha256, alt, uploaded_by, uploaded_at) VALUES (?, ?, 'image/png', 1, 1, 1, ?, 'alt', 'x', '2026-01-01')");
    for (let i = 0; i < 1000; i++) ins.run("fake" + String(i).padStart(20, "0"), "k" + i, "h" + i);
    const r = await upload(s, "progressive.jpg"); assert.equal(r.status, 409); assert.equal(r.json.error, "quota"); assert.equal(s.r2._m.size, 0);
  } finally { await s.close(); }
});
test("migration médias : additive, idempotente, formats contraints", async () => {
  const sql = fs.readFileSync(path.join(__dirname, "../d1/migrations/0004_media.sql"), "utf8"), bare = sql.replace(/--.*$/gm, ""); assert.ok(!/\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(bare));
  const s = await start({ demo: false }); try { s.db._db.exec(sql); assert.throws(() => s.db._db.prepare("INSERT INTO media (id, r2_key, mime, size_bytes, width, height, sha256, alt, uploaded_by, uploaded_at) VALUES ('a','k','image/svg+xml',1,1,1,'h','a','x','t')").run()); } finally { await s.close(); }
});
