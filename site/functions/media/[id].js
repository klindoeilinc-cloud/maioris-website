/**
 * MAIORIS.NET : lecture publique des images éditoriales (Cloudflare Pages Function).
 * GET /media/<id>  →  sert l'image du bucket R2 privé (binding MAIORIS_MEDIA). Seul un identifiant du registre (table media) est lisible :
 * jamais de chemin libre, jamais d'URL publique du bucket. Les identifiants sont aléatoires et non devinables.
 */
import { ID_RE } from "../_lib/editorial/media.js";

const SEC = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "cross-origin" };
const nf = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store", ...SEC } });

async function serve({ request, env, params }, head) {
  const id = String(params.id || "").replace(/\.(jpe?g|png|webp)$/i, "");
  if (!ID_RE.test(id) || !env.MAIORIS_DB || !env.MAIORIS_MEDIA) return nf();
  let row; try { row = await env.MAIORIS_DB.prepare("SELECT r2_key, mime, sha256, size_bytes FROM media WHERE id = ? AND deleted_at IS NULL").bind(id).first(); } catch { return nf(); }
  if (!row) return nf();
  const etag = `"${row.sha256}"`, base = { ...SEC, ETag: etag, "Cache-Control": "public, max-age=31536000, immutable", "Content-Type": row.mime, "Content-Disposition": "inline" };
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers: { ...SEC, ETag: etag, "Cache-Control": base["Cache-Control"] } });
  if (head) return new Response(null, { status: 200, headers: { ...base, "Content-Length": String(row.size_bytes) } });
  const obj = await env.MAIORIS_MEDIA.get(row.r2_key); if (!obj) return nf();
  return new Response(obj.body, { status: 200, headers: { ...base, "Content-Length": String(row.size_bytes) } });
}
export const onRequestGet = (ctx) => serve(ctx, false);
export const onRequestHead = (ctx) => serve(ctx, true);
