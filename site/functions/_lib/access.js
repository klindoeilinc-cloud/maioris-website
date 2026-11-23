/* Contrôle d'accès de l'administration : vérifie le jeton signé que Cloudflare Access ajoute à chaque requête.
   Variables : ACCESS_TEAM_DOMAIN (ex. maioris.cloudflareaccess.com), ACCESS_AUD (identifiant de l'application Access),
   ADMIN_EMAILS (facultatif, liste séparée par des virgules : restreint en plus à ces adresses).
   Sans configuration, l'administration est fermée (503). Elle n'est jamais ouverte par défaut. */
let jwksCache = { at: 0, keys: [] };
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const parse = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

async function getKey(kid, team, fetchFn, nowMs) {
  const fresh = nowMs - jwksCache.at < 3600000;
  let jwk = fresh && jwksCache.keys.find((k) => k.kid === kid);
  if (!jwk) {
    const r = await fetchFn(`https://${team}/cdn-cgi/access/certs`);
    if (!r.ok) throw new Error("jwks");
    jwksCache = { at: nowMs, keys: (await r.json()).keys || [] };
    jwk = jwksCache.keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new Error("kid");
  return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}
export function resetAccessCache() { jwksCache = { at: 0, keys: [] }; }

export async function requireAdmin(request, env, deps = {}) {
  const fetchFn = deps.fetch || fetch, nowMs = deps.now ? deps.now() : Date.now();
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return { ok: false, status: 503, error: "admin_not_configured" };
  const cookie = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(request.headers.get("Cookie") || "");
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || (cookie && cookie[1]);
  if (!token) return { ok: false, status: 401, error: "unauthenticated" };
  try {
    const [h, p, sig] = token.split(".");
    if (!h || !p || !sig) throw new Error("format");
    const header = parse(h), claims = parse(p);
    if (header.alg !== "RS256" || !header.kid) throw new Error("alg");
    const key = await getKey(header.kid, env.ACCESS_TEAM_DOMAIN, fetchFn, nowMs);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(sig), new TextEncoder().encode(h + "." + p));
    if (!valid) throw new Error("signature");
    const nowS = Math.floor(nowMs / 1000);
    if (claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw new Error("iss");
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(env.ACCESS_AUD)) throw new Error("aud");
    if (typeof claims.exp !== "number" || claims.exp <= nowS) throw new Error("exp");
    if (typeof claims.nbf === "number" && claims.nbf > nowS + 30) throw new Error("nbf");
    const email = String(claims.email || "").toLowerCase();
    if (!email) throw new Error("email");
    if (env.ADMIN_EMAILS) {
      const allow = env.ADMIN_EMAILS.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
      if (!allow.includes(email)) return { ok: false, status: 403, error: "forbidden" };
    }
    return { ok: true, email };
  } catch { return { ok: false, status: 401, error: "unauthenticated" }; }
}
