const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let mod;
const load = async () => mod || (mod = await import(path.resolve(__dirname, "../site/functions/api/diagnostic.js")));
const env = { RESEND_API_KEY: "k", CONTACT_TO: "team@example.com", CONTACT_FROM: "MAIORIS <site@example.com>" };
const good = { lang: "fr", name: "Awa", email: "awa@example.com", company: "X", consent: true, website: "", elapsed: 60000, confidence: "low",
  answers: { budget: "100 000 000", rework: "26_50", challenges: ["diff", "lead"] }, indicators: { external: { lo: "1", mid: "2", hi: "3" }, total: null } };
const req = (body, headers = {}) => new Request("https://maioris.net/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://maioris.net", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
function mockFetch(status = 200) { const calls = []; global.fetch = async (u, o) => { calls.push({ u, body: JSON.parse(o.body) }); return new Response("{}", { status }); }; return calls; }

test("envoi valide : e-mail à l'équipe puis accusé au visiteur", async () => {
  const { onRequestPost } = await load(), calls = mockFetch();
  const r = await onRequestPost({ request: req(good), env });
  assert.equal(r.status, 200); assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body.to, ["team@example.com"]); assert.equal(calls[0].body.reply_to, "awa@example.com");
  assert.deepEqual(calls[1].body.to, ["awa@example.com"]);
  assert.match(calls[0].body.text, /rework: 26_50/); assert.match(calls[0].body.text, /non calculé/);
});
test("sans consentement : refus 422, aucun envoi", async () => {
  const { onRequestPost } = await load(), calls = mockFetch();
  const r = await onRequestPost({ request: req({ ...good, consent: false }), env });
  assert.equal(r.status, 422); assert.equal(calls.length, 0);
});
test("e-mail invalide : 422", async () => {
  const { onRequestPost } = await load(); mockFetch();
  assert.equal((await onRequestPost({ request: req({ ...good, email: "nope" }), env })).status, 422);
});
test("champ piège rempli : succès silencieux, aucun envoi", async () => {
  const { onRequestPost } = await load(), calls = mockFetch();
  const r = await onRequestPost({ request: req({ ...good, website: "spam" }), env });
  assert.equal(r.status, 200); assert.equal(calls.length, 0);
});
test("envoi trop rapide : refusé", async () => {
  const { onRequestPost } = await load(), calls = mockFetch();
  assert.equal((await onRequestPost({ request: req({ ...good, elapsed: 2000 }), env })).status, 422); assert.equal(calls.length, 0);
});
test("origine étrangère refusée", async () => {
  const { onRequestPost } = await load(); mockFetch();
  assert.equal((await onRequestPost({ request: req(good, { Origin: "https://evil.example" }), env })).status, 403);
});
test("corps trop gros ou invalide", async () => {
  const { onRequestPost } = await load(); mockFetch();
  assert.equal((await onRequestPost({ request: req(good, { "Content-Length": "99999" }), env })).status, 413);
  assert.equal((await onRequestPost({ request: req("{pas du json"), env })).status, 400);
});
test("échec Resend : 502 ; configuration absente : 500", async () => {
  const { onRequestPost } = await load(); mockFetch(500);
  assert.equal((await onRequestPost({ request: req(good), env })).status, 502);
  mockFetch(); assert.equal((await onRequestPost({ request: req(good), env: {} })).status, 500);
});
test("limitation par IP avec RATE_KV", async () => {
  const { onRequestPost } = await load(); mockFetch(); const store = {};
  const kv = { get: async (k) => store[k] || null, put: async (k, v) => { store[k] = v; } };
  let last; for (let i = 0; i < 6; i++) last = await onRequestPost({ request: req(good, { "CF-Connecting-IP": "1.2.3.4" }), env: { ...env, RATE_KV: kv } });
  assert.equal(last.status, 429);
});
test("le HTML de l'e-mail échappe les valeurs saisies", async () => {
  const { onRequestPost } = await load(), calls = mockFetch();
  await onRequestPost({ request: req({ ...good, name: "<script>x</script>" }), env });
  assert.ok(!calls[0].body.html.includes("<script>x"));
});
