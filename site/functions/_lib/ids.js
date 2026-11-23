/* Identifiants ULID : triables par date, générés côté serveur uniquement. */
const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function ulid(ms = Date.now()) {
  let t = "", n = ms;
  for (let i = 0; i < 10; i++) { t = ALPHA[n % 32] + t; n = Math.floor(n / 32); }
  const r = crypto.getRandomValues(new Uint8Array(16)); let s = "";
  for (let i = 0; i < 16; i++) s += ALPHA[r[i] & 31];
  return t + s;
}
