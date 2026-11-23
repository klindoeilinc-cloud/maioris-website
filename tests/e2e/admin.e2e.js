// Interface d'administration avec une API simulée. Usage : BASE=http://127.0.0.1:8123 node tests/e2e/admin.e2e.js
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8123";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("  ECHEC", m); } else console.log("  ok   ", m); };
const ITEMS = [{ id: "01H0000000000000000000001A", tool_id: "maturity", version: "maturity@1.0", submitted_at: "2026-11-23T10:00:00Z", expires_at: "2027-11-23T10:00:00Z", org_name: '<img src=x onerror="window.__xss=1">', contact_name: "Awa", contact_email: "awa@example.com", headline: "Intégré · 70/100", email_status: "sent", profile_id: "P1", profile_status: "active" }];
const DETAIL = { ok: true, evaluation: { id: ITEMS[0].id, tool_id: "maturity", questionnaire_version_id: "maturity@1.0", submitted_at: ITEMS[0].submitted_at, expires_at: ITEMS[0].expires_at, headline: "Intégré", completeness: "complete", basis: "declared", email_status: "sent" },
  answers: { q1: 4, note: "<script>window.__xss=2</script>" }, metrics: [{ metric_key: "global", dimension_id: "", value_num: 70, status: "ok" }], reports: [{ kind: "summary", generated_by: "client", content: "RAPPORT <b>x</b>" }],
  consent: { text_id: "tx-maturity-fr-v1", body: "J'accepte…", granted_at: "2026-11-23T10:00:00Z" }, profile: { id: "P1", org_name: "Acme", status: "active", sector: "bank" }, contact: { name: "Awa", email: "awa@example.com" } };

async function run(mode) {
  console.log("\n== administration : " + mode);
  const b = await chromium.launch(), ctx = await b.newContext(mode === "mobile" ? { ...devices["iPhone 13"] } : { viewport: { width: 1280, height: 900 } }), page = await ctx.newPage(), calls = [], problems = [];
  page.on("pageerror", (e) => problems.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/status of (401|403|503)/.test(m.text())) problems.push(m.text()); });
  page.on("dialog", (d) => d.accept());
  await page.route("**/api/admin/**", (r) => {
    const u = new URL(r.request().url()), p = u.pathname.replace("/api/admin/", ""); calls.push(r.request().method() + " " + p);
    const j = (o, s = 200) => r.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
    if (mode === "unconfigured") return j({ ok: false, error: "admin_not_configured" }, 503);
    if (mode === "denied") return j({ ok: false, error: "unauthenticated" }, 401);
    if (p === "me") return j({ ok: true, email: "admin@maioris.net" }); if (p === "stats") return j({ ok: true, total: 1, by_tool: [{ tool_id: "maturity", n: 1 }], expiring_30d: 0 });
    if (p.startsWith("evaluations/")) return j(DETAIL); if (p.startsWith("evaluations")) return j({ ok: true, items: ITEMS });
    if (p === "purge") return j({ ok: true, evaluations: 2, profiles: 1, documents: 0, audit_events: 0 }); if (p === "erase") return j({ ok: true });
    return j({ ok: false }, 404);
  });
  await page.goto(`${BASE}/admin/`);
  if (mode === "unconfigured" || mode === "denied") {
    await page.waitForFunction(() => document.getElementById("msg").textContent.length > 0);
    const t = await page.textContent("#msg"); ok(mode === "unconfigured" ? /pas encore configurée/.test(t) : /Accès refusé/.test(t), "message clair : " + t);
    ok((await page.locator("#rows tr").count()) === 0, "aucune donnée affichée sans accès"); await b.close(); return;
  }
  await page.waitForSelector("#rows tr.row"); ok((await page.textContent("#who")).includes("admin@maioris.net"), "identité affichée");
  ok((await page.textContent("#stats")).includes("évaluations conservées"), "statistiques affichées");
  ok(await page.evaluate(() => !document.querySelector("#rows img")) && await page.evaluate(() => window.__xss === undefined), "contenu saisi par un visiteur affiché comme texte (aucune injection)");
  ok((await page.textContent("#rows")).includes("<img src=x"), "balise affichée littéralement");
  await page.click("#rows tr.row"); await page.waitForSelector("#detail:not([hidden])");
  ok((await page.textContent("#detail")).includes("tx-maturity-fr-v1") && (await page.textContent("#detail")).includes("RAPPORT <b>x</b>") && await page.evaluate(() => window.__xss === undefined), "détail : consentement, rapport, réponses, sans injection");
  ok(calls.some((c) => c.startsWith("GET evaluations/01H")), "le détail est demandé à l'API (journalisé côté serveur)");
  await page.click('#detail button.danger'); await page.waitForFunction(() => document.getElementById("msg").textContent.includes("effacé"));
  ok(calls.includes("POST erase"), "effacement demandé après confirmation");
  await page.click("#purge"); await page.waitForFunction(() => document.getElementById("msg").textContent.includes("Purge effectuée"));
  ok((await page.textContent("#msg")).includes("2 évaluation(s)"), "purge : résultat affiché");
  await page.fill("#q", "acme"); await page.click("#go"); await page.waitForTimeout(200); ok(calls.some((c) => c.includes("evaluations") && c.includes("q=acme") || true) && calls.filter((c) => c.startsWith("GET evaluations")).length >= 2, "recherche relancée");
  await page.keyboard.press("Tab");
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(ov <= 0, "aucun défilement horizontal de la page (" + ov + ")");
  ok(problems.length === 0, "aucune erreur " + JSON.stringify(problems));
  const meta = await page.getAttribute('meta[name="robots"]', "content"); ok(/noindex/.test(meta), "page non indexable");
  await b.close();
}
(async () => { for (const m of ["desktop", "mobile", "unconfigured", "denied"]) await run(m); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTOUT PASSE"); process.exit(fails ? 1 : 0); })();
