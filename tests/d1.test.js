const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { createD1, migrated, MIGRATIONS } = require("./helpers/d1.js");
const seed = require("../tools/export_d1_seed.js");
const COI = require("../src/coi/data.js"), MAT = require("../src/mat/data.js"), BR = require("../src/brand/data.js");

const FN = (p) => import(path.resolve(__dirname, "../site/functions", p));
const ENV = { RESEND_API_KEY: "k", CONTACT_TO: "team@example.com", CONTACT_FROM: "MAIORIS <site@example.com>" };
const SQL = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort().map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8")).join("\n");
const rows = (d, sql, ...p) => d._db.prepare(sql).all(...p);
const one = (d, sql, ...p) => d._db.prepare(sql).get(...p);

/* ---------- migrations ---------- */
test("migrations : appliquées deux fois sans erreur (idempotentes)", () => {
  const d = migrated(); for (const f of fs.readdirSync(MIGRATIONS).sort()) d._db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  assert.deepEqual(d._db.prepare("PRAGMA foreign_key_check").all(), []);
});
test("migrations : strictement additives (aucun DROP, DELETE, TRUNCATE ni ALTER destructif)", () => {
  /* seule exception : renommer un outil (0005, retrait du symbole), jamais d'autre UPDATE */
  const sql = SQL.replace(/--.*$/gm, "").replace(/ON DELETE CASCADE/gi, "").replace(/UPDATE tools SET name = '[^']*' WHERE id = '(coi|maturity|brand)' AND name LIKE '%[^']*';/g, "");
  assert.ok(!/\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(sql), "instruction destructive");
  assert.ok(!/ALTER\s+TABLE[^;]*\b(DROP|RENAME)\b/i.test(sql));
  assert.ok(!/CREATE\s+TABLE\s+(?!IF NOT EXISTS)/i.test(sql) && !/CREATE\s+INDEX\s+(?!IF NOT EXISTS)/i.test(sql), "création non conditionnelle");
  assert.ok(!/INSERT\s+(?!OR IGNORE)/i.test(sql), "insertion non conditionnelle");
});
test("migrations : tables du noyau et tables éditoriales attendues", () => {
  const t = rows(migrated(), "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by 1").map((r) => r.name);
  assert.deepEqual(t, ["article_related", "article_revisions", "article_sources", "article_translations", "articles", "audit_events", "consent_texts", "consents", "contacts", "documents", "evaluation_documents", "evaluation_metrics", "evaluations", "media", "profiles", "questionnaire_versions", "reports", "retention_policies", "tools"]);
});
test("données de référence : à jour avec les sources, cinq outils, versions et empreintes", () => {
  assert.equal(fs.readFileSync(path.join(MIGRATIONS, "0002_reference_data.sql"), "utf8"), seed.build(), "relancez node tools/export_d1_seed.js");
  const d = migrated();
  assert.equal(rows(d, "select * from tools").length, 5); assert.equal(rows(d, "select * from questionnaire_versions").length, 5);
  for (const r of rows(d, "select * from questionnaire_versions")) { assert.equal(r.content_hash, seed.sha(r.definition_json)); assert.ok(r.scoring_method && r.validity_notes); JSON.parse(r.definition_json); }
});
test("versions des questionnaires : celles des outils sont enregistrées", () => {
  const d = migrated(), v = (id) => one(d, "select version from questionnaire_versions where tool_id = ?", id).version;
  assert.equal(v("coi"), COI.VERSION); assert.equal(v("maturity"), MAT.VERSION); assert.equal(v("brand"), BR.VERSION);
});
test("consentements : le libellé enregistré est exactement celui de la page, et annonce la conservation de 12 mois", () => {
  const d = migrated(), slugs = { coi: "creative-operations-intelligence", maturity: "creative-maturity-assessment", brand: "brand-consistency-review" };
  for (const tool of Object.keys(slugs)) for (const lang of ["fr", "en"]) {
    const html = fs.readFileSync(path.join(__dirname, "../site", lang, slugs[tool] + ".html"), "utf8");
    const id = `tx-${tool}-${lang}-v1`; assert.ok(html.includes(`data-consent="${id}"`), "attribut data-consent " + id);
    const t = one(d, "select * from consent_texts where id = ?", id); assert.equal(t.body, seed.consentText(tool, lang)); assert.equal(t.body_hash, seed.sha(t.body));
    assert.match(t.body, lang === "fr" ? /12 mois/ : /12 months/);
  }
  assert.equal(one(d, "select days from retention_policies where kind = 'evaluation'").days, 365);
});

/* ---------- persistance ---------- */
const BODY = (over = {}) => ({ tool: "maturity", version: "1.0", lang: "fr", name: "Awa", email: "awa@example.com", company: "Acme", consent: true, consent_text_id: "tx-maturity-fr-v1", idempotency_key: "k-" + crypto.randomUUID(),
  website: "", elapsed: 60000, confidence: "complete", answers: { q1: 4, q2: "na", ctxSector: "bank", challenges: ["a", "b"] }, indicators: { global: 70, level: 4, strategy: 80, governance: null },
  report: "RAPPORT TEST", summary: { headline: "Intégré · 70/100", score: 70, level: "4", completeness: "complete" }, context: { sector: "bank", size: "100_249", market: "CI" }, ...over });
const REQ = (b, h = {}) => new Request("https://maioris.net/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://maioris.net", ...h }, body: JSON.stringify(b) });
function mockFetch(status = 200) { const calls = []; global.fetch = async (u, o) => { calls.push({ u, body: JSON.parse(o.body) }); return new Response("{}", { status }); }; return calls; }
async function submit(env, body, h) { const { onRequestPost } = await FN("api/diagnostic.js"); const r = await onRequestPost({ request: REQ(body, h), env }); return { status: r.status, json: await r.json() }; }

test("persistance : profil, contact, consentement, évaluation, indicateurs et rapport écrits ; jeton jamais stocké", async () => {
  const d = migrated(), calls = mockFetch(), r = await submit({ ...ENV, MAIORIS_DB: d }, BODY());
  assert.equal(r.status, 200); assert.equal(r.json.persisted, true); assert.ok(r.json.evaluation_id && r.json.profile_id && r.json.resume_token);
  const p = one(d, "select * from profiles"), ev = one(d, "select * from evaluations"), c = one(d, "select * from consents");
  assert.equal(p.org_name, "Acme"); assert.equal(p.sector, "bank"); assert.equal(p.size, "100_249"); assert.equal(p.status, "active");
  assert.notEqual(p.resume_token_hash, r.json.resume_token); assert.equal(p.resume_token_hash, crypto.createHash("sha256").update(r.json.resume_token).digest("hex"));
  assert.ok(!JSON.stringify(rows(d, "select * from profiles")).includes(r.json.resume_token));
  assert.equal(one(d, "select email from contacts").email, "awa@example.com");
  assert.equal(ev.tool_id, "maturity"); assert.equal(ev.questionnaire_version_id, "maturity@1.0"); assert.equal(ev.consent_id, c.id); assert.equal(c.consent_text_id, "tx-maturity-fr-v1"); assert.equal(ev.basis, "declared"); assert.equal(ev.score, 70);
  assert.deepEqual(JSON.parse(ev.answers_json).challenges, ["a", "b"]); assert.equal(one(d, "select content from reports").content, "RAPPORT TEST");
  const days = (new Date(ev.expires_at) - new Date(ev.submitted_at)) / 86400000; assert.equal(Math.round(days), 365);
  assert.equal(ev.email_status, "sent"); assert.equal(calls.length, 2);
});
test("indicateurs : un indicateur non calculé reste non calculé, jamais zéro", async () => {
  const d = migrated(); mockFetch(); await submit({ ...ENV, MAIORIS_DB: d }, BODY());
  const g = one(d, "select * from evaluation_metrics where dimension_id = 'governance'"); assert.equal(g.status, "not_computed"); assert.equal(g.value_num, null);
  assert.equal(one(d, "select value_num from evaluation_metrics where metric_key = 'global'").value_num, 70);
  assert.equal(one(d, "select value_num from evaluation_metrics where dimension_id = 'strategy'").value_num, 80);
});
test("indicateurs de Creative Operations Intelligence : valeurs numériques, pas des chaînes formatées", async () => {
  const d = migrated(); mockFetch();
  await submit({ ...ENV, MAIORIS_DB: d }, BODY({ tool: "coi", consent_text_id: "tx-coi-fr-v1", indicators: { external: { lo: "26 000 000 FCFA", mid: "38 000 000 FCFA", hi: "x", lo_n: 26e6, mid_n: 38e6, hi_n: 50e6 }, internal: null, hours: { lo_n: 250, mid_n: 365, hi_n: 480 } } }));
  const e = one(d, "select * from evaluation_metrics where metric_key = 'external'"); assert.equal(e.lo_num, 26e6); assert.equal(e.value_num, 38e6); assert.equal(e.hi_num, 50e6); assert.equal(e.unit, "FCFA");
  assert.equal(one(d, "select unit from evaluation_metrics where metric_key = 'hours'").unit, "hours"); assert.equal(one(d, "select status from evaluation_metrics where metric_key = 'internal'").status, "not_computed");
});
test("idempotence : un double envoi ne crée qu'une évaluation et n'envoie pas d'autre e-mail", async () => {
  const d = migrated(), calls = mockFetch(), b = BODY({ idempotency_key: "same-key" }), env = { ...ENV, MAIORIS_DB: d };
  const a = await submit(env, b), c = await submit(env, b);
  assert.equal(c.json.duplicate, true); assert.equal(c.json.evaluation_id, a.json.evaluation_id); assert.equal(rows(d, "select * from evaluations").length, 1); assert.equal(calls.length, 2);
});
test("rattachement : avec le bon jeton, la nouvelle évaluation rejoint le profil sans dupliquer le contact", async () => {
  const d = migrated(); mockFetch(); const env = { ...ENV, MAIORIS_DB: d };
  const a = await submit(env, BODY()); const b = await submit(env, BODY({ tool: "brand", consent_text_id: "tx-brand-fr-v1", profile: { id: a.json.profile_id, token: a.json.resume_token } }));
  assert.equal(b.json.profile_id, a.json.profile_id); assert.equal(b.json.resume_token, undefined, "jeton émis une seule fois");
  assert.equal(rows(d, "select * from profiles").length, 1); assert.equal(rows(d, "select * from contacts").length, 1); assert.equal(rows(d, "select * from evaluations where profile_id = ?", a.json.profile_id).length, 2);
});
test("isolation : un mauvais jeton, ou la seule adresse e-mail, ne rattache jamais à un profil existant", async () => {
  const d = migrated(); mockFetch(); const env = { ...ENV, MAIORIS_DB: d }; const a = await submit(env, BODY());
  const bad = await submit(env, BODY({ profile: { id: a.json.profile_id, token: "mauvais" } })); const same = await submit(env, BODY());
  assert.notEqual(bad.json.profile_id, a.json.profile_id); assert.notEqual(same.json.profile_id, a.json.profile_id); assert.equal(rows(d, "select * from profiles").length, 3);
});
test("consentement et version contrôlés : libellé inconnu, d'un autre outil ou d'une autre langue, version inconnue", async () => {
  const d = migrated(), env = { ...ENV, MAIORIS_DB: d }; mockFetch();
  for (const over of [{ consent_text_id: "inconnu" }, { consent_text_id: "tx-brand-fr-v1" }, { consent_text_id: "tx-maturity-en-v1" }, { version: "9.9" }, { consent_text_id: "" }]) {
    const r = await submit(env, BODY(over)); assert.equal(r.json.persisted, false, JSON.stringify(over)); assert.equal(r.status, 200);
  }
  assert.equal(rows(d, "select * from evaluations").length, 0); assert.equal(rows(d, "select * from profiles").length, 0);
});
test("e-mail en échec : l'évaluation est conservée et marquée ; sans base, c'est une erreur 502 comme avant", async () => {
  const d = migrated(); mockFetch(500);
  const r = await submit({ ...ENV, MAIORIS_DB: d }, BODY()); assert.equal(r.status, 200); assert.equal(r.json.emailed, false); assert.equal(one(d, "select email_status from evaluations").email_status, "failed");
  assert.equal((await submit(ENV, BODY())).status, 502);
});
test("sans binding (prévisualisation) : l'e-mail part, rien n'est conservé", async () => {
  const calls = mockFetch(); const r = await submit(ENV, BODY()); assert.equal(r.status, 200); assert.equal(r.json.persisted, false); assert.equal(calls.length, 2);
});
test("erreur de base : l'e-mail part quand même", async () => {
  const calls = mockFetch(), broken = { prepare() { throw new Error("D1 indisponible"); } };
  const r = await submit({ ...ENV, MAIORIS_DB: broken }, BODY()); assert.equal(r.status, 200); assert.equal(r.json.persisted, false); assert.equal(calls.length, 2);
});
test("e-mail non configuré mais base présente : l'évaluation est conservée, e-mail ignoré", async () => {
  const d = migrated(); mockFetch(); const r = await submit({ MAIORIS_DB: d }, BODY());
  assert.equal(r.status, 200); assert.equal(r.json.emailed, false); assert.equal(one(d, "select email_status from evaluations").email_status, "skipped");
  assert.equal((await submit({}, BODY())).status, 500);
});

/* ---------- effacement à la demande du visiteur ---------- */
async function erase(env, body) { const { onRequestPost } = await FN("api/erase.js"); const r = await onRequestPost({ request: new Request("https://maioris.net/api/erase", { method: "POST", headers: { Origin: "https://maioris.net" }, body: JSON.stringify(body) }), env }); return { status: r.status, json: await r.json() }; }
test("effacement : avec le jeton, contenu supprimé, trace minimale conservée, journal écrit", async () => {
  const d = migrated(); mockFetch(); const env = { ...ENV, MAIORIS_DB: d }, a = await submit(env, BODY());
  const r = await erase(env, { profile_id: a.json.profile_id, token: a.json.resume_token }); assert.equal(r.status, 200);
  const ev = one(d, "select * from evaluations"); assert.equal(ev.answers_json, null); assert.equal(ev.headline, null); assert.ok(ev.deleted_at); assert.ok(ev.id);
  assert.equal(rows(d, "select * from evaluation_metrics").length, 0); assert.equal(one(d, "select content from reports").content, null);
  const c = one(d, "select * from contacts"); assert.equal(c.email, null); assert.equal(c.name, null); assert.ok(c.erased_at);
  const p = one(d, "select * from profiles"); assert.equal(p.status, "erased"); assert.equal(p.org_name, null); assert.equal(p.resume_token_hash, null);
  assert.ok(one(d, "select * from audit_events where action = 'profile.erased'"));
});
test("effacement : un mauvais jeton ne supprime rien et un autre profil n'est jamais touché", async () => {
  const d = migrated(); mockFetch(); const env = { ...ENV, MAIORIS_DB: d }, a = await submit(env, BODY({ email: "a@example.com" })), b = await submit(env, BODY({ email: "b@example.com" }));
  assert.equal((await erase(env, { profile_id: a.json.profile_id, token: b.json.resume_token })).status, 403);
  assert.equal(one(d, "select status from profiles where id = ?", a.json.profile_id).status, "active");
  await erase(env, { profile_id: a.json.profile_id, token: a.json.resume_token });
  assert.equal(one(d, "select status from profiles where id = ?", b.json.profile_id).status, "active");
  assert.equal(one(d, "select email from contacts where profile_id = ?", b.json.profile_id).email, "b@example.com"); assert.ok(one(d, "select answers_json from evaluations where profile_id = ?", b.json.profile_id).answers_json);
  assert.equal((await erase(env, {})).status, 400); assert.equal((await erase({}, { profile_id: "x", token: "y" })).status, 503);
});
test("aucune route publique de lecture : seules des méthodes POST existent", async () => {
  for (const f of ["api/diagnostic.js", "api/erase.js"]) { const m = await FN(f); assert.equal(m.onRequestGet, undefined); assert.equal(m.onRequest, undefined); assert.equal(typeof m.onRequestPost, "function"); }
});

test("immuabilité : aucun code n'écrit dans consents, consent_texts ou questionnaire_versions hors insertion (retrait du consentement et retrait d'une version exceptés)", () => {
  const dir = path.join(__dirname, "../site/functions"), files = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : files.push(path.join(d, f.name)); })(dir);
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    assert.ok(!/UPDATE\s+(consent_texts|questionnaire_versions)\b/i.test(src), f);
    assert.ok(!/DELETE\s+FROM\s+(consents|consent_texts|questionnaire_versions|evaluations|profiles|contacts)\b/i.test(src), "suppression de ligne : " + f);
    assert.ok(!/UPDATE\s+consents\b(?![^;`"]*withdrawn_at)/i.test(src), f);
  }
});
