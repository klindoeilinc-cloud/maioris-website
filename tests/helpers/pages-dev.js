/* Banc d'essai : fait tourner les vraies Pages Functions (route publique, plan du site, administration) avec la base D1 simulée,
   et sert les fichiers statiques de site/ comme le ferait Cloudflare Pages (env.ASSETS). Utilisé par les tests de rendu et de bout en bout. */
const http = require("node:http"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { migrated, MIGRATIONS } = require("./d1.js");
const SITE = path.resolve(__dirname, "../../site"), FN = (p) => import(path.join(SITE, "functions", p));
const CSP = (/Content-Security-Policy: (.*)/.exec(fs.readFileSync(path.join(SITE, "_headers"), "utf8")) || [])[1];
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".json": "application/json" };

/* Simulation de R2 : même interface que le binding (put, get, delete) */
function createR2() {
  const m = new Map();
  return { _m: m,
    put: async (key, body, opts) => { const buf = Buffer.from(body instanceof ArrayBuffer ? new Uint8Array(body) : body); m.set(key, { buf, opts: opts || {} }); return { key }; },
    get: async (key) => { const o = m.get(key); if (!o) return null; return { body: new Blob([o.buf]).stream(), size: o.buf.length, httpMetadata: o.opts.httpMetadata, customMetadata: o.opts.customMetadata }; },
    delete: async (key) => { m.delete(key); } };
}
function staticFetch(url) {
  let p = decodeURIComponent(new URL(url).pathname); if (p.endsWith("/")) p += "index.html";
  const cands = [path.join(SITE, p), path.join(SITE, p + ".html")];
  for (const f of cands) if (f.startsWith(SITE) && fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" } });
  return new Response("not found", { status: 404 });
}
async function start({ port = 0, demo = true, access = true, media = true, publicSection = true } = {}) {
  const db = migrated(); if (demo) db._db.exec(fs.readFileSync(path.join(__dirname, "../../d1/demo/editorial_demo.sql"), "utf8"));
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "dev", alg: "RS256", use: "sig" }, TEAM = "dev.cloudflareaccess.com", AUD = "dev-aud";
  const b64 = (b) => Buffer.from(b).toString("base64url");
  async function token(email = "admin@maioris.net") { const h = b64(JSON.stringify({ alg: "RS256", kid: "dev" })), now = Math.floor(Date.now() / 1000), p = b64(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], email, exp: now + 3600, nbf: now - 5 })); return `${h}.${p}.${b64(Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(h + "." + p))))}`; }
  (await FN("_lib/access.js")).resetAccessCache(); // chaque banc d'essai a sa propre paire de clés
  const realFetch = global.fetch; global.fetch = async (u, o) => (String(u).includes("/cdn-cgi/access/certs") ? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }) : realFetch(u, o));
  const r2 = createR2(); const env = { ...(publicSection ? { EDITORIAL_PUBLIC: "1" } : {}), MAIORIS_DB: db, ...(media ? { MAIORIS_MEDIA: r2 } : {}), ASSETS: { fetch: async (u) => staticFetch(u instanceof Request ? u.url : String(u)) }, ...(access ? { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD } : {}) };
  const mediaFn = await FN("media/[id].js"), admin = await FN("api/admin/[[path]].js"), pub = await FN("[lang]/perspectives/[[path]].js"), sm = await FN("sitemap-perspectives.xml.js");
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://" + req.headers.host); const chunks = []; for await (const c of req) chunks.push(c); const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
      let r; const m = /^\/(fr|en)\/perspectives(?:\/(.*))?$/.exec(url.pathname);
      if (m && req.method === "GET") r = await pub.onRequestGet({ request, env, params: { lang: m[1], path: (m[2] || "").split("/").filter(Boolean) }, next: () => staticFetch(url.href) });
      else if (/^\/media\/[^/]+$/.test(url.pathname) && ["GET", "HEAD"].includes(req.method)) r = await (req.method === "HEAD" ? mediaFn.onRequestHead : mediaFn.onRequestGet)({ request, env, params: { id: url.pathname.split("/")[2] } });
      else if (url.pathname === "/sitemap-perspectives.xml") r = await sm.onRequestGet({ request, env });
      else if (url.pathname.startsWith("/api/admin/")) r = await admin.onRequest({ request, env });
      else r = staticFetch(url.href);
      const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; }); if (CSP && !headers["content-security-policy"] && !/^\/(api|media)\//.test(url.pathname) && !url.pathname.match(/^\/(fr|en)\/perspectives/)) headers["content-security-policy"] = CSP.trim(); /* fichiers statiques seulement : comme _headers sur Cloudflare */ res.writeHead(r.status, headers); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { console.error("pages-dev", e); res.writeHead(500); res.end(String(e && e.stack)); }
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return { server, db, env, r2, port: server.address().port, base: `http://127.0.0.1:${server.address().port}`, token, close: () => new Promise((r) => { global.fetch = realFetch; server.close(r); }) };
}
module.exports = { start };
if (require.main === module) start({ port: +process.env.PORT || 8130 }).then((s) => console.log("pages-dev", s.base));
