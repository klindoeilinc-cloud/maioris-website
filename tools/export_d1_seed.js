#!/usr/bin/env node
/* Génère d1/migrations/0002_reference_data.sql : données de référence (outils, versions de questionnaires avec empreinte, libellés de consentement, durées de conservation).
   Migration ADDITIVE : INSERT OR IGNORE uniquement. Une nouvelle version de questionnaire ou de libellé ajoute une ligne, elle n'en modifie jamais une existante.
   Usage : node tools/export_d1_seed.js          (écrit le fichier)
           node tools/export_d1_seed.js --check  (échoue si le fichier n'est pas à jour) */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const COI = require(path.join(ROOT, "src/coi/data.js")), MAT = require(path.join(ROOT, "src/mat/data.js")), BR = require(path.join(ROOT, "src/brand/data.js"));
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const q = (s) => (s === null || s === undefined ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'");
const PUBLISHED = "2026-11-23T00:00:00Z";

function stable(v) { // JSON stable : même contenu, même empreinte
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
  return JSON.stringify(v);
}
function textOf(html) { return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").replace(/\s+([.,])/g, "$1").trim(); }

function briefDefinition() {
  const html = read("site/fr/evaluer-votre-brief.html");
  const cfg = JSON.parse(/<script id="bf-cfg" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);
  const prompts = [...html.matchAll(/<p class="bf-p">(.*?)<\/p>/gs)].map((m) => textOf(m[1]));
  return { scale: { "2": "Oui, clairement", "1": "En partie", "0": "Pas encore" }, prompts, labels: cfg.labels, bands: cfg.bands };
}
function diagDefinition() {
  const html = read("site/fr/autodiagnostic.html");
  const d = JSON.parse(/<script id="diag-data" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);
  d.ch = d.ch.map((c) => { const { icon, ...rest } = c; return rest; });
  return d;
}
const DEFINITIONS = {
  brief: { name: "Évaluez votre brief", kind: "questionnaire", method: "brief-sum-v1", def: briefDefinition(), notes: "Cinq questions, score sur 10. Oriente une première réflexion, ne remplace pas un audit." },
  diag: { name: "Où est votre contrainte ?", kind: "questionnaire", method: "diag-max-v1", def: diagDefinition(), notes: "Sept affirmations, contrainte principale la plus marquée. Orientation, pas un diagnostic." },
  coi: { name: "Creative Operations Intelligence™", kind: "questionnaire", method: "coi-compute-v1", def: { steps: COI.STEPS, questions: COI.Q }, notes: "Estimation indicative à partir de fourchettes déclarées ; jamais une économie garantie." },
  maturity: { name: "Creative Maturity Assessment™", kind: "questionnaire", method: "mat-score-v1", def: { scale: MAT.SCALE, levels: MAT.LEVELS, dims: MAT.DIMS, questions: MAT.Q, minValid: MAT.MIN_VALID }, notes: "Instrument propriétaire d'autoévaluation, pas une certification indépendante." },
  brand: { name: "Brand Consistency Review™", kind: "guided_review", method: "brand-evidence-v1", def: { limits: BR.LIMITS, status: BR.STATUS, cats: BR.CATS, dims: BR.DIMS, rules: BR.RULES, profile: BR.PROFILE.map((f) => ({ id: f.id, req: f.req, type: f.type, l: f.l })) }, notes: "Revue guidée : aucun fichier lu ni analysé automatiquement ; constats déclarés par l'utilisateur." },
};
const VERSIONS = { brief: "1.0", diag: "1.0", coi: COI.VERSION || "1.0", maturity: MAT.VERSION, brand: BR.VERSION };

function consentText(tool, lang) {
  const slug = { coi: "creative-operations-intelligence", maturity: "creative-maturity-assessment", brand: "brand-consistency-review" }[tool];
  const html = read(`site/${lang}/${slug}.html`);
  const m = /<label class="coi-consent">.*?<span>(.*?)<\/span>/s.exec(html);
  return textOf(m[1]);
}

function build() {
  const L = ["-- MAIORIS INTELLIGENCE CORE : données de référence. GÉNÉRÉ par tools/export_d1_seed.js : ne pas modifier à la main.", "-- Migration additive : INSERT OR IGNORE uniquement.", ""];
  Object.keys(DEFINITIONS).forEach((id) => L.push(`INSERT OR IGNORE INTO tools (id, name, kind) VALUES (${q(id)}, ${q(DEFINITIONS[id].name)}, ${q(DEFINITIONS[id].kind)});`));
  L.push("");
  [["evaluation", 365], ["report", 365], ["document", 365], ["audit", 730]].forEach(([k, d]) => L.push(`INSERT OR IGNORE INTO retention_policies (kind, days, updated_at) VALUES (${q(k)}, ${d}, ${q(PUBLISHED)});`));
  L.push("");
  Object.keys(DEFINITIONS).forEach((id) => {
    const d = DEFINITIONS[id], json = stable(d.def), v = VERSIONS[id];
    L.push(`INSERT OR IGNORE INTO questionnaire_versions (id, tool_id, version, content_hash, scoring_method, definition_json, validity_notes, published_at) VALUES (${q(id + "@" + v)}, ${q(id)}, ${q(v)}, ${q(sha(json))}, ${q(d.method)}, ${q(json)}, ${q(d.notes)}, ${q(PUBLISHED)});`);
  });
  L.push("");
  ["coi", "maturity", "brand"].forEach((tool) => ["fr", "en"].forEach((lang) => {
    const body = consentText(tool, lang);
    L.push(`INSERT OR IGNORE INTO consent_texts (id, tool_id, purpose, lang, body, body_hash, published_at) VALUES (${q(`tx-${tool}-${lang}-v1`)}, ${q(tool)}, 'transmission', ${q(lang)}, ${q(body)}, ${q(sha(body))}, ${q(PUBLISHED)});`);
  }));
  return L.join("\n") + "\n";
}
module.exports = { build, stable, sha, DEFINITIONS, VERSIONS, consentText };
if (require.main === module) {
  const file = path.join(ROOT, "d1/migrations/0002_reference_data.sql"), out = build();
  if (process.argv.includes("--check")) { if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== out) { console.error("0002_reference_data.sql n'est pas à jour : lancez node tools/export_d1_seed.js"); process.exit(1); } console.log("0002_reference_data.sql à jour"); }
  else { fs.writeFileSync(file, out); console.log("écrit", path.relative(ROOT, file), out.length, "octets"); }
}
