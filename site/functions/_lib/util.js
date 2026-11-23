/* Utilitaires partagés des fonctions : réponses JSON, nettoyage, empreintes, dates. */
export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra } });
export const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
export const cleanText = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);
export const nowIso = () => new Date().toISOString();
export const addDays = (iso, days) => new Date(new Date(iso).getTime() + days * 86400000).toISOString();
export async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
/** Jeton aléatoire de 256 bits, en base64url. Il n'est jamais stocké : seule son empreinte l'est. */
export function randomToken() {
  const a = crypto.getRandomValues(new Uint8Array(32)); let out = "";
  for (let i = 0; i < a.length; i++) out += B64[a[i] & 63];
  return out;
}
