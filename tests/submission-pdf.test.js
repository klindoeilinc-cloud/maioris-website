const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const imp = (p) => import(path.resolve(__dirname, "../site/functions/" + p));
const env = { RESEND_API_KEY: "k", CONTACT_TO: "team@example.com", CONTACT_FROM: "MAIORIS <site@example.com>", RESEND_AUDIENCE_ID: "aud" };
const post = (url, body) => new Request("https://maioris.net" + url, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://maioris.net" }, body: JSON.stringify(body) });
const calls = () => { const c = []; global.fetch = async (u, o) => { c.push({ u: String(u), body: JSON.parse(o.body) }); return new Response("{}", { status: 200 }); }; return c; };
const pdfText = (b64) => {
  const f = path.join(os.tmpdir(), "t-" + Math.random().toString(36).slice(2) + ".pdf"); fs.writeFileSync(f, Buffer.from(b64, "base64"));
  const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }); fs.unlinkSync(f); if (r.error || r.status) throw new Error("pdftotext : " + (r.error || r.stderr));
  return r.error ? null : r.stdout;
};
const hasPdftotext = !spawnSync("pdftotext", ["-v"]).error;

test("pdf : fichier PDF valide, accents, plusieurs pages, texte hostile inoffensif", async () => {
  const { buildPdf, toBase64 } = await imp("_lib/pdf.js");
  const long = "Direction créative à Abidjan, Dakar et Accra. ".repeat(200);
  const bytes = buildPdf({ lang: "fr", kicker: "Test", title: "Société Générale (Éditions) \\ ) ( <script>", blocks: [{ h: "A", rows: [["Libellé", long], ["Vide", ""]] }, { h: "B", text: long }] });
  const head = Buffer.from(bytes.subarray(0, 8)).toString("latin1"), tail = Buffer.from(bytes.subarray(-8)).toString("latin1");
  assert.match(head, /^%PDF-1\.4/); assert.match(tail, /%%EOF/);
  const pages = (Buffer.from(bytes).toString("latin1").match(/\/Type \/Page /g) || []).length;
  assert.ok(pages >= 3, "plusieurs pages : " + pages);
  if (hasPdftotext) {
    const t = pdfText(toBase64(bytes));
    assert.match(t, /Société Générale/); assert.match(t, /Non renseigné/); assert.match(t, /Page 1 sur/); assert.match(t, /MAIORIS/);
  }
});

test("contact : le PDF joint reprend tous les champs saisis", async () => {
  const { onRequestPost } = await imp("api/contact.js"), c = calls();
  const body = { organisation: "Orange CI", role: "Directrice", sector: "Télécom", country: "Côte d'Ivoire", challenges: "Cohérence, délais", context: "Nous préparons un lancement national et cherchons un cadre de direction créative.", support: "Audit", budget: "10 à 25 M", name: "Aïcha Koné", email: "aicha@example.com", phone: "+225 01 02 03", lang: "fr", consent: true, website: "" };
  const r = await onRequestPost({ request: post("/api/contact", body), env });
  assert.equal(r.status, 200);
  const att = c[0].body.attachments; assert.equal(att.length, 1); assert.match(att[0].filename, /^demande-orange-ci-\d{4}-\d{2}-\d{2}\.pdf$/);
  if (hasPdftotext) { const t = pdfText(att[0].content).replace(/\s+/g, " "); for (const v of ["Orange CI", "Directrice", "Télécom", "Cohérence, délais", "lancement national", "Audit", "10 à 25 M", "Aïcha Koné", "aicha@example.com", "+225 01 02 03"]) assert.ok(t.includes(v), "manque : " + v); }
  assert.equal(c[1].body.attachments, undefined, "l'accusé au visiteur n'a pas de pièce jointe");
});

test("diagnostic : le PDF joint contient réponses, indicateurs et rapport", async () => {
  const { onRequestPost } = await imp("api/diagnostic.js"), c = calls();
  const body = { lang: "fr", tool: "maturity", name: "Awa", email: "awa@example.com", company: "Société X", consent: true, website: "", elapsed: 60000, confidence: "low", answers: { budget: "100 000 000", challenges: ["diff", "lead"] }, indicators: { external: { lo: "1", mid: "2", hi: "3" }, total: null }, report: "Synthèse\n\nPremier point du rapport.\nSecond point." };
  const r = await onRequestPost({ request: post("/api/diagnostic", body), env });
  assert.equal(r.status, 200);
  const att = c[0].body.attachments; assert.equal(att.length, 1); assert.match(att[0].filename, /^evaluation-/);
  if (hasPdftotext) { const t = pdfText(att[0].content).replace(/\s+/g, " "); for (const v of ["Société X", "Awa", "awa@example.com", "100 000 000", "diff, lead", "non calculé", "Premier point du rapport", "RAPPORT TRANSMIS"]) assert.ok(t.includes(v), "manque : " + v); }
});

test("inscription : notification avec PDF à l'équipe, seulement si CONTACT_TO existe", async () => {
  const { onRequestPost } = await imp("api/subscribe.js");
  let c = calls();
  assert.equal((await onRequestPost({ request: post("/api/subscribe", { email: "a@example.com", lang: "fr", consent: true }), env })).status, 200);
  const team = c.find((x) => x.body.to && x.body.to[0] === "team@example.com");
  assert.ok(team && team.body.attachments.length === 1);
  if (hasPdftotext) assert.match(pdfText(team.body.attachments[0].content), /a@example\.com/);
  c = calls();
  const { CONTACT_TO, ...noTo } = env;
  await onRequestPost({ request: post("/api/subscribe", { email: "b@example.com", lang: "fr", consent: true }), env: noTo });
  assert.ok(!c.some((x) => x.body.attachments));
});

test("la génération du PDF ne bloque jamais l'envoi", async () => {
  const { onRequestPost } = await imp("api/contact.js"), c = calls();
  const body = { organisation: "X", role: "", sector: "", country: "", challenges: "", context: "z".repeat(60), support: "Audit", budget: "", name: "N", email: "n@example.com", phone: "", lang: "fr", consent: true, website: "" };
  const r = await onRequestPost({ request: post("/api/contact", body), env });
  assert.equal(r.status, 200); assert.ok(c.length >= 1);
});

test("pdfAttachment : toujours un PDF valide pour des saisies extrêmes ; undefined seulement si tout échoue", async () => {
  const { pdfAttachment } = await imp("_lib/pdf.js");
  const pool = ["é", "œ", "’", "—", "€", "😀", "漢字", "\t", "\r\n", "\u0000", "\\", "(", ")", "<", "%", "a", " ", "x".repeat(300), "\n\n\n"];
  let seed = 7; const rnd = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
  const str = (n) => Array.from({ length: n }, () => pool[rnd(pool.length)]).join("");
  for (let i = 0; i < 25; i++) {
    const blocks = [{ h: str(rnd(30)), rows: Array.from({ length: rnd(40) }, () => [str(rnd(50)), str(rnd(3000))]) }, { h: str(10), text: str(rnd(i % 5 === 0 ? 30000 : 1500)) }, { note: str(rnd(400)) }];
    const a = pdfAttachment({ lang: i % 2 ? "en" : "fr", kicker: str(40), title: str(1 + rnd(150)), subtitle: str(100), ref: str(12), blocks }, "x.pdf");
    assert.ok(a && a.length === 1, "PDF généré " + i);
    const raw = Buffer.from(a[0].content, "base64");
    assert.equal(raw.subarray(0, 5).toString("latin1"), "%PDF-"); assert.match(raw.subarray(-8).toString("latin1"), /%%EOF/);
    if (hasPdftotext) { const t = pdfText(a[0].content); assert.ok(typeof t === "string", "lisible " + i); }
  }
  assert.equal(pdfAttachment({ blocks: [{ h: "A", rows: [null] }] }, "x.pdf"), undefined);
});

test("contact : un contexte de 4000 caractères avec émojis et symboles produit bien un PDF joint", async () => {
  const { onRequestPost } = await imp("api/contact.js"), c = calls();
  const body = { organisation: "Marque 😀 & Co (Abidjan)", role: "", sector: "", country: "", challenges: "€ — “test” ’", context: "Lancement 🚀 en Côte d'Ivoire. ".repeat(130).slice(0, 4000), support: "Audit", budget: "", name: "Zoé", email: "z@example.com", phone: "", lang: "en", consent: true, website: "" };
  assert.equal((await onRequestPost({ request: post("/api/contact", body), env })).status, 200);
  assert.equal(c[0].body.attachments.length, 1); assert.ok(!/PDF non généré/.test(c[0].body.subject));
  if (hasPdftotext) assert.match(pdfText(c[0].body.attachments[0].content), /Lancement/);
});

test("inscription : API /contacts avec segment, repli sur l'ancien appel, aucun faux succès", async () => {
  const { onRequestPost } = await imp("api/subscribe.js");
  const run = async (plan) => { const urls = []; global.fetch = async (u, o) => { urls.push({ u: String(u), b: JSON.parse(o.body) }); return new Response("{}", { status: plan(String(u)) }); }; const r = await onRequestPost({ request: post("/api/subscribe", { email: "c@example.com", lang: "fr", consent: true }), env }); return { r, urls }; };
  let x = await run(() => 200);
  assert.equal(x.r.status, 200); assert.equal(x.urls[0].u, "https://api.resend.com/contacts"); assert.deepEqual(x.urls[0].b.segments, [{ id: "aud" }]);
  assert.ok(!x.urls.some((c) => c.u.includes("/audiences/")), "pas de repli si la nouvelle API accepte");
  x = await run((u) => (u.endsWith("/contacts") && !u.includes("/audiences/") ? 404 : 200));
  assert.equal(x.r.status, 200); assert.ok(x.urls.some((c) => c.u.includes("/audiences/aud/contacts")), "repli utilisé");
  x = await run((u) => (u.includes("/contacts") ? 500 : 200));
  assert.equal(x.r.status, 502); assert.equal((await x.r.json()).ok, false);
  assert.ok(!x.urls.some((c) => c.u.endsWith("/emails")), "pas d'e-mail de bienvenue sans inscription");
});
