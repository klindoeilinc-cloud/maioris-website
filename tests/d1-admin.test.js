const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path"), crypto = require("node:crypto");
const { migrated } = require("./helpers/d1.js");
const FN = (p) => import(path.resolve(__dirname, "../site/functions", p));
const ENV = { RESEND_API_KEY: "k", CONTACT_TO: "team@example.com", CONTACT_FROM: "MAIORIS <site@example.com>" };
const one = (d, sql, ...p) => d._db.prepare(sql).get(...p), rows = (d, sql, ...p) => d._db.prepare(sql).all(...p);
const BODY = (over = {}) => ({ tool: "maturity", version: "1.0", lang: "fr", name: "Awa", email: "awa@example.com", company: "Acme", consent: true, consent_text_id: "tx-maturity-fr-v1", idempotency_key: "k-" + crypto.randomUUID(),
  elapsed: 60000, answers: { q1: 4 }, indicators: { global: 70, strategy: 80 }, report: "RAPPORT", summary: { headline: "Intégré", score: 70, level: "4" }, context: { sector: "bank" }, ...over });

/* ---------- Cloudflare Access simulé : vraie signature RS256 ---------- */
const TEAM = "maioris.cloudflareaccess.com", AUD = "aud-123";
let KEYS;
const b64u = (b) => Buffer.from(b).toString("base64url");
async function keys() {
  if (KEYS) return KEYS;
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  return (KEYS = { priv: kp.privateKey, jwk });
}
async function token(over = {}, { kid = "k1", alg = "RS256", badSig = false } = {}) {
  const k = await keys(), now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg, kid })), p = b64u(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], email: "Admin@Maioris.net", exp: now + 600, nbf: now - 10, ...over }));
  const sig = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", k.priv, new TextEncoder().encode(h + "." + p)));
  if (badSig) sig[0] ^= 0xff;
  return `${h}.${p}.${b64u(sig)}`;
}
async function setup() {
  const k = await keys(); (await FN("_lib/access.js")).resetAccessCache();
  global.fetch = async (u, o) => { if (String(u).includes("/cdn-cgi/access/certs")) return new Response(JSON.stringify({ keys: [k.jwk] }), { status: 200 }); return new Response("{}", { status: 200 }); };
}
async function admin(env, pathname, { method = "GET", jwt, body, headers = {} } = {}) {
  const { onRequest } = await FN("api/admin/[[path]].js");
  const h = { ...(jwt === undefined ? {} : { "Cf-Access-Jwt-Assertion": jwt }), ...headers };
  const r = await onRequest({ request: new Request("https://maioris.net" + pathname, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env });
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, headers: r.headers, json: ct.includes("json") ? await r.json() : null, text: ct.includes("json") ? null : await r.text() };
}
async function submit(env, body) { const { onRequestPost } = await FN("api/diagnostic.js"); const r = await onRequestPost({ request: new Request("https://maioris.net/api/diagnostic", { method: "POST", headers: { Origin: "https://maioris.net" }, body: JSON.stringify(body) }), env }); return r.json(); }
const AENV = (d, extra = {}) => ({ ...ENV, MAIORIS_DB: d, ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ...extra });

test("administration fermée sans configuration (503) et sans jeton (401)", async () => {
  await setup(); const d = migrated();
  assert.equal((await admin({ MAIORIS_DB: d }, "/api/admin/me", { jwt: await token() })).status, 503);
  assert.equal((await admin(AENV(d), "/api/admin/me")).status, 401);
  assert.equal((await admin(AENV(d), "/api/admin/me", { jwt: "pas.un.jwt" })).status, 401);
});
test("jeton refusé : mauvaise signature, expiré, mauvais public, mauvais émetteur, algorithme faible, clé inconnue", async () => {
  await setup(); const d = migrated(), env = AENV(d), now = Math.floor(Date.now() / 1000);
  for (const jwt of [await token({}, { badSig: true }), await token({ exp: now - 5 }), await token({ aud: ["autre"] }), await token({ iss: "https://evil.example" }), await token({}, { alg: "none" }), await token({}, { kid: "inconnue" }), await token({ email: "" })])
    assert.equal((await admin(env, "/api/admin/me", { jwt })).status, 401);
});
test("jeton valide : identité reconnue ; liste blanche ADMIN_EMAILS respectée", async () => {
  await setup(); const d = migrated(), jwt = await token();
  const ok = await admin(AENV(d), "/api/admin/me", { jwt }); assert.equal(ok.status, 200); assert.equal(ok.json.email, "admin@maioris.net");
  assert.equal((await admin(AENV(d, { ADMIN_EMAILS: "autre@maioris.net" }), "/api/admin/me", { jwt })).status, 403);
  assert.equal((await admin(AENV(d, { ADMIN_EMAILS: "autre@maioris.net, ADMIN@maioris.net" }), "/api/admin/me", { jwt })).status, 200);
  assert.equal(ok.headers.get("cache-control"), "no-store"); assert.equal(ok.headers.get("x-robots-tag"), "noindex");
});
test("administration : liste, filtres, détail journalisé, statistiques", async () => {
  await setup(); const d = migrated(), env = AENV(d), jwt = await token();
  const a = await submit(env, BODY({ company: "Acme" })); await submit(env, BODY({ tool: "brand", consent_text_id: "tx-brand-fr-v1", company: "Zeta", email: "z@example.com", name: "Zed" }));
  const l = await admin(env, "/api/admin/evaluations", { jwt }); assert.equal(l.json.items.length, 2);
  assert.equal((await admin(env, "/api/admin/evaluations?tool=brand", { jwt })).json.items.length, 1);
  assert.equal((await admin(env, "/api/admin/evaluations?q=zeta", { jwt })).json.items[0].org_name, "Zeta");
  assert.equal((await admin(env, "/api/admin/evaluations?q=%25", { jwt })).json.items.length, 2, "les jokers sont neutralisés");
  const det = await admin(env, "/api/admin/evaluations/" + a.evaluation_id, { jwt });
  assert.equal(det.json.contact.email, "awa@example.com"); assert.equal(det.json.reports[0].content, "RAPPORT"); assert.equal(det.json.consent.text_id, "tx-maturity-fr-v1"); assert.equal(det.json.answers.q1, 4); assert.ok(det.json.metrics.length >= 2);
  const log = one(d, "select * from audit_events where action = 'evaluation.viewed'"); assert.equal(log.actor, "admin@maioris.net"); assert.equal(log.object_id, a.evaluation_id);
  const st = await admin(env, "/api/admin/stats", { jwt }); assert.equal(st.json.total, 2); assert.equal((await admin(env, "/api/admin/evaluations/inexistante0000", { jwt })).status, 404);
});
test("export CSV : journalisé, formules de tableur neutralisées", async () => {
  await setup(); const d = migrated(), env = AENV(d), jwt = await token(); await submit(env, BODY({ company: "=HYPERLINK(\"http://evil\")", name: "+cmd" }));
  const r = await admin(env, "/api/admin/export?format=csv", { jwt }); assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /text\/csv/);
  assert.ok(r.text.includes("\"'=HYPERLINK(") && !/(^|,)"=HYPERLINK/.test(r.text) && r.text.includes("\"'+cmd\""));
  assert.equal(one(d, "select action from audit_events where action = 'export'").action, "export");
  assert.equal((await admin(env, "/api/admin/export?format=json", { jwt })).json.items.length, 1);
});
test("administration : effacement et purge journalisés, origine contrôlée sur les écritures", async () => {
  await setup(); const d = migrated(), env = AENV(d), jwt = await token(); const a = await submit(env, BODY());
  assert.equal((await admin(env, "/api/admin/erase", { method: "POST", jwt, body: { profile_id: a.profile_id }, headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal(one(d, "select status from profiles").status, "active");
  const e = await admin(env, "/api/admin/erase", { method: "POST", jwt, body: { profile_id: a.profile_id }, headers: { Origin: "https://maioris.net" } });
  assert.equal(e.status, 200); assert.equal(one(d, "select status from profiles").status, "erased"); assert.equal(one(d, "select actor from audit_events where action = 'profile.erased'").actor, "admin@maioris.net");
  assert.equal((await admin(env, "/api/admin/erase", { method: "POST", jwt, body: {} })).status, 400); assert.equal((await admin(env, "/api/admin/erase", { method: "POST", jwt, body: { profile_id: "nope" } })).status, 404);
  const p = await admin(env, "/api/admin/purge", { method: "POST", jwt }); assert.equal(p.status, 200); assert.ok(one(d, "select * from audit_events where action = 'purge.run'"));
  assert.equal((await admin(env, "/api/admin/inconnue", { jwt })).status, 404);
});
test("administration sans base : 503", async () => {
  await setup(); assert.equal((await admin({ ...ENV, ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD }, "/api/admin/me", { jwt: await token() })).status, 503);
});

/* ---------- purge ---------- */
test("purge : seules les données expirées sont effacées, idempotente, documents et journal compris", async () => {
  const d = migrated(), env = { ...ENV, MAIORIS_DB: d }; global.fetch = async () => new Response("{}", { status: 200 });
  const old = await submit(env, BODY({ email: "old@example.com" })), keep = await submit(env, BODY({ email: "keep@example.com" })), mixed = await submit(env, BODY({ email: "mix@example.com" }));
  await submit(env, BODY({ tool: "brand", consent_text_id: "tx-brand-fr-v1", profile: { id: mixed.profile_id, token: mixed.resume_token } }));
  const past = new Date(Date.now() - 86400000).toISOString();
  d._db.prepare("UPDATE evaluations SET expires_at = ? WHERE id = ?").run(past, old.evaluation_id); d._db.prepare("UPDATE evaluations SET expires_at = ? WHERE id = ?").run(past, mixed.evaluation_id);
  d._db.prepare("INSERT INTO documents (id, profile_id, r2_key, status, uploaded_at, expires_at) VALUES ('D1', ?, 'k1', 'stored', ?, ?)").run(old.profile_id, past, past);
  d._db.prepare("INSERT INTO audit_events (id, at, actor, action) VALUES ('OLD', '2020-01-01T00:00:00Z', 'x', 'x')").run();
  const { purgeExpired } = await FN("_lib/purge.js"); const r1 = await purgeExpired(d, "system");
  assert.equal(r1.evaluations, 2); assert.equal(r1.profiles, 1); assert.equal(r1.documents, 1); assert.deepEqual(r1.r2_keys, ["k1"]); assert.equal(r1.audit_events, 1);
  assert.equal(one(d, "select answers_json from evaluations where id = ?", old.evaluation_id).answers_json, null);
  assert.ok(one(d, "select answers_json from evaluations where id = ?", keep.evaluation_id).answers_json);
  assert.equal(one(d, "select status from profiles where id = ?", old.profile_id).status, "erased"); assert.equal(one(d, "select email from contacts where profile_id = ?", old.profile_id).email, null);
  assert.equal(one(d, "select status from profiles where id = ?", mixed.profile_id).status, "active", "profil conservé tant qu'une évaluation reste valable");
  assert.equal(one(d, "select email from contacts where profile_id = ?", mixed.profile_id).email, "mix@example.com");
  assert.equal(rows(d, "select * from evaluation_metrics where evaluation_id = ?", old.evaluation_id).length, 0); assert.equal(one(d, "select content from reports where evaluation_id = ?", old.evaluation_id).content, null);
  assert.equal(one(d, "select status from documents").status, "deleted");
  const r2 = await purgeExpired(d, "system"); assert.equal(r2.evaluations, 0); assert.equal(r2.profiles, 0); assert.equal(r2.documents, 0);
  assert.equal(rows(d, "select * from audit_events where action = 'purge.run'").length, 2);
});

test("Worker planifié : appelle la purge sur la base liée", async () => {
  const d = migrated(); global.fetch = async () => new Response("{}", { status: 200 });
  const old = await submit({ ...ENV, MAIORIS_DB: d }, BODY()); d._db.prepare("UPDATE evaluations SET expires_at = '2020-01-01T00:00:00Z' WHERE id = ?").run(old.evaluation_id);
  const w = (await import(path.resolve(__dirname, "../workers/purge/index.js"))).default; let pending;
  await w.scheduled({}, { MAIORIS_DB: d }, { waitUntil: (p) => { pending = p; } }); await pending;
  assert.equal(one(d, "select answers_json from evaluations").answers_json, null); assert.equal(one(d, "select actor from audit_events where action = 'purge.run'").actor, "system:cron");
});
