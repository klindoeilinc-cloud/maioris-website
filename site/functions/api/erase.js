/**
 * MAIORIS.NET : effacement, à la demande du visiteur, des données qu'il a transmises (Cloudflare Pages Function).
 * POST /api/erase  { profile_id, token }  →  efface contact, évaluations, rapports et documents du profil, puis le profil lui-même.
 * Le jeton de reprise (reçu à l'envoi) est la seule preuve acceptée : sans lui, rien n'est effacé ni confirmé.
 */
import { json, clean, sha256Hex } from "../_lib/util.js";
import { eraseProfile } from "../_lib/erase.js";

const ALLOWED_ORIGINS = ["https://maioris.net", "https://www.maioris.net"];

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith(".pages.dev")) return json({ ok: false, error: "origin" }, 403);
  if (!env.MAIORIS_DB) return json({ ok: false, error: "unavailable" }, 503);
  let data;
  try { data = JSON.parse((await request.text()).slice(0, 2000)); } catch { return json({ ok: false, error: "format" }, 400); }
  const id = clean(data.profile_id, 40), token = clean(data.token, 100);
  if (!id || !token) return json({ ok: false, error: "invalid" }, 400);
  if (env.RATE_KV) {
    const key = "rl:erase:" + (request.headers.get("CF-Connecting-IP") || "unknown");
    const n = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (n >= 10) return json({ ok: false, error: "rate" }, 429);
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }
  const p = await env.MAIORIS_DB.prepare("SELECT id, resume_token_hash FROM profiles WHERE id = ? AND status = 'active'").bind(id).first();
  if (!p || !p.resume_token_hash || p.resume_token_hash !== await sha256Hex(token)) return json({ ok: false, error: "invalid" }, 403);
  await eraseProfile(env.MAIORIS_DB, p.id, "visitor");
  return json({ ok: true });
}
