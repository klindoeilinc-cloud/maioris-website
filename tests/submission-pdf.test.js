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
  const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }); fs.unlinkSync(f);
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
