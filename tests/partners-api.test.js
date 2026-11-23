const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = () => import(path.resolve(__dirname, "../site/functions/api/partners.js"));
const env = { RESEND_API_KEY: "k", CONTACT_TO: "team@example.com", CONTACT_FROM: "MAIORIS <site@example.com>" };
const good = { firstname: "Aïcha", lastname: "Koné", email: "aicha@studio.com", agency: "Studio Lumen", agency_site: "studio.com", country: "ci", team: "6-10", role: "founder", need: "structure", offer: "audit", context: "Nos briefs circulent sans cadre commun et chaque projet est repris.", consent: "on", lang: "fr", website: "" };
const req = (b, h = {}) => new Request("https://maioris.net/api/partners", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://maioris.net", ...h }, body: typeof b === "string" ? b : JSON.stringify(b) });
const mock = (status = 200) => { const c = []; global.fetch = async (u, o) => { c.push(JSON.parse(o.body)); return new Response("{}", { status }); }; return c; };

test("demande valide : e-mail équipe avec PDF, puis accusé au visiteur", async () => {
  const { onRequestPost } = await load(), c = mock();
  const r = await onRequestPost({ request: req(good), env }); const j = await r.json();
  assert.equal(r.status, 200); assert.ok(j.ok && /^PTN-/.test(j.ref)); assert.equal(c.length, 2);
  assert.deepEqual(c[0].to, ["team@example.com"]); assert.equal(c[0].reply_to, "aicha@studio.com");
  assert.match(c[0].subject, /\[MAIORIS PARTNERS\] Studio Lumen \| Agency Creative Audit/);
  assert.match(c[0].text, /Besoin principal : Structurer/); assert.match(c[0].text, /Taille de l'équipe : 6 à 10/);
  assert.equal(c[0].attachments.length, 1); assert.match(c[0].attachments[0].filename, /^partners-studio-lumen-\d{4}-\d{2}-\d{2}\.pdf$/);
  assert.deepEqual(c[1].to, ["aicha@studio.com"]); assert.match(c[1].text, /cal\.com\/maioris/); assert.equal(c[1].attachments, undefined);
});
test("validation : champs manquants, valeurs hors liste, site invalide, description courte, sans consentement", async () => {
  const { onRequestPost } = await load();
  for (const bad of [{ firstname: "" }, { lastname: "" }, { email: "nope" }, { agency: "" }, { country: "mars" }, { team: "" }, { role: "x" }, { need: "<script>" }, { offer: "gratuit" }, { agency_site: "pas un site" }, { context: "court" }, { consent: false }]) {
    const c = mock(); const r = await onRequestPost({ request: req({ ...good, ...bad }), env });
    assert.equal(r.status, 422, JSON.stringify(bad)); assert.equal(c.length, 0, "aucun envoi : " + JSON.stringify(bad));
  }
  const c = mock(); assert.equal((await onRequestPost({ request: req({ ...good, agency_site: "" }), env })).status, 200);
});
test("champ piège, origine, format, taille", async () => {
  const { onRequestPost } = await load(); let c = mock();
  assert.equal((await onRequestPost({ request: req({ ...good, website: "http://spam" }), env })).status, 200); assert.equal(c.length, 0);
  assert.equal((await onRequestPost({ request: req(good, { Origin: "https://evil.example" }), env })).status, 403);
  assert.equal((await onRequestPost({ request: req("{pas du json"), env })).status, 400);
  assert.equal((await onRequestPost({ request: req(good, { "Content-Length": "50000" }), env })).status, 413);
});
test("honnêteté : échec d'envoi = erreur, jamais de faux succès ; configuration absente = erreur", async () => {
  const { onRequestPost } = await load(); mock(500);
  const r = await onRequestPost({ request: req(good), env }); assert.equal(r.status, 502); assert.equal((await r.json()).ok, false);
  mock(); const { RESEND_API_KEY, ...noKey } = env;
  assert.equal((await onRequestPost({ request: req(good), env: noKey })).status, 500);
});
test("limite par adresse IP (RATE_KV)", async () => {
  const { onRequestPost } = await load(); mock(); const kv = new Map();
  const RATE_KV = { get: async (k) => kv.get(k) || null, put: async (k, v) => { kv.set(k, v); } };
  const codes = []; for (let i = 0; i < 7; i++) codes.push((await onRequestPost({ request: req(good), env: { ...env, RATE_KV } })).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
});
test("injection : le HTML saisi est neutralisé dans l'e-mail", async () => {
  const { onRequestPost } = await load(), c = mock();
  await onRequestPost({ request: req({ ...good, agency: "<img src=x onerror=alert(1)>", context: "<script>alert(1)</script> " + "a".repeat(40) }), env });
  assert.ok(!/<img|<script/.test(c[0].html) && /&lt;img/.test(c[0].html));
});
