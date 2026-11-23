/* Analyse et nettoyage d'images téléversées, sans dépendance : le type est déterminé sur les OCTETS (jamais sur l'extension ni sur l'en-tête déclaré),
   les dimensions sont lues dans le fichier, et les métadonnées (EXIF, GPS, commentaires, IPTC, XMP, textes PNG) sont retirées sans ré-encoder l'image.
   Formats acceptés : JPEG, PNG, WebP. SVG et GIF sont refusés (le SVG peut contenir du script). */
export const LIMITS = { maxBytes: 5 * 1024 * 1024, maxSide: 6000, maxPixels: 30e6 };
export class ImageError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new ImageError(code, message); };
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const le32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const le24 = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const tag = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const concat = (parts) => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

export function sniff(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: "image/png", ext: "png" };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 12 && tag(b, 0) === "RIFF" && tag(b, 8) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

function png(b) {
  const keep = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "bKGD", "hIST", "pHYs", "sPLT", "acTL", "fcTL", "fdAT"]);
  const parts = [b.subarray(0, 8)]; let o = 8, w = 0, h = 0, idat = false, iend = false, first = true;
  while (o + 12 <= b.length) {
    const len = u32(b, o), type = tag(b, o + 4), end = o + 12 + len;
    if (end > b.length || len > 0x7fffffff) fail("corrupt", "Fichier PNG tronqué ou corrompu.");
    if (first) { if (type !== "IHDR" || len !== 13) fail("corrupt", "Fichier PNG invalide."); w = u32(b, o + 8); h = u32(b, o + 12); first = false; }
    if (type === "IDAT") idat = true;
    const critical = type[0] >= "A" && type[0] <= "Z";
    if (keep.has(type)) parts.push(b.subarray(o, end)); else if (critical) fail("unsupported", "Fichier PNG non pris en charge.");
    o = end; if (type === "IEND") { iend = true; break; }
  }
  if (!idat || !iend || o !== b.length) fail("corrupt", "Fichier PNG tronqué ou corrompu.");
  return { width: w, height: h, bytes: concat(parts) };
}

function jpeg(b) {
  const parts = [b.subarray(0, 2)]; let o = 2, w = 0, h = 0, scan = -1;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) fail("corrupt", "Fichier JPEG invalide.");
    let m = b[o + 1]; while (m === 0xff) { o++; m = b[o + 1]; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { parts.push(b.subarray(o, o + 2)); o += 2; continue; }
    if (m === 0xd9) break;
    const len = (b[o + 2] << 8) | b[o + 3], end = o + 2 + len; if (len < 2 || end > b.length) fail("corrupt", "Fichier JPEG tronqué ou corrompu.");
    if ((m === 0xc0 || m === 0xc1 || m === 0xc2) && len >= 8) { h = (b[o + 5] << 8) | b[o + 6]; w = (b[o + 7] << 8) | b[o + 8]; }
    if (m >= 0xc3 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) fail("unsupported", "Variante JPEG non prise en charge.");
    const app = m >= 0xe0 && m <= 0xef, icc = m === 0xe2 && len >= 16 && String.fromCharCode(...b.subarray(o + 4, o + 16)) === "ICC_PROFILE\0";
    const jfif = m === 0xe0 && String.fromCharCode(...b.subarray(o + 4, o + 8)) === "JFIF";
    if (m === 0xfe || (app && !icc && !jfif)) { o = end; continue; }                      // commentaires, EXIF, XMP, IPTC : retirés
    parts.push(b.subarray(o, end)); o = end;
    if (m === 0xda) { scan = o; break; }
  }
  if (scan < 0 || !w || !h) fail("corrupt", "Fichier JPEG invalide.");
  if (b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9) fail("corrupt", "Fichier JPEG tronqué ou corrompu.");
  parts.push(b.subarray(scan)); return { width: w, height: h, bytes: concat(parts) };
}

function webp(b) {
  const riff = le32(b, 4); if (riff + 8 > b.length || riff < 12) fail("corrupt", "Fichier WebP tronqué ou corrompu.");
  const chunks = []; let o = 12, w = 0, h = 0; const stop = riff + 8;
  while (o + 8 <= stop) {
    const type = tag(b, o), len = le32(b, o + 4), end = o + 8 + len + (len & 1); if (end > stop) fail("corrupt", "Fichier WebP tronqué ou corrompu.");
    const data = b.subarray(o + 8, o + 8 + len);
    if (type === "VP8X" && len >= 10) { w = 1 + le24(data, 4); h = 1 + le24(data, 7); }
    else if (type === "VP8 " && len >= 10 && !w) { w = (data[6] | (data[7] << 8)) & 0x3fff; h = (data[8] | (data[9] << 8)) & 0x3fff; }
    else if (type === "VP8L" && len >= 5 && data[0] === 0x2f && !w) { w = 1 + (((data[2] & 0x3f) << 8) | data[1]); h = 1 + (((data[4] & 0x0f) << 10) | (data[3] << 2) | ((data[2] & 0xc0) >> 6)); }
    chunks.push({ type, raw: b.subarray(o, end), data }); o = end;
  }
  if (!w || !h) fail("corrupt", "Fichier WebP invalide.");
  const out = chunks.filter((c) => c.type !== "EXIF" && c.type !== "XMP ").map((c) => {
    if (c.type !== "VP8X") return c.raw;
    const raw = c.raw.slice(); raw[8] &= ~(0x08 | 0x04); return raw;                  // indicateurs EXIF et XMP effacés
  });
  const size = 4 + out.reduce((a, c) => a + c.length, 0), head = new Uint8Array(12); head.set([0x52, 0x49, 0x46, 0x46]); head[4] = size & 255; head[5] = (size >> 8) & 255; head[6] = (size >> 16) & 255; head[7] = (size >> 24) & 255; head.set([0x57, 0x45, 0x42, 0x50], 8);
  return { width: w, height: h, bytes: concat([head, ...out]) };
}

/** Retourne { mime, ext, width, height, bytes (nettoyés) } ou lève une ImageError. */
export function inspect(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!b.length) fail("empty", "Fichier vide.");
  if (b.length > LIMITS.maxBytes) fail("too_large", "Image trop lourde : 5 Mo au maximum.");
  const t = sniff(b); if (!t) fail("format", "Format non accepté. Formats : JPEG, PNG, WebP (le SVG et le GIF sont refusés).");
  const r = t.mime === "image/png" ? png(b) : t.mime === "image/jpeg" ? jpeg(b) : webp(b);
  if (r.width < 1 || r.height < 1) fail("corrupt", "Dimensions invalides.");
  if (r.width > LIMITS.maxSide || r.height > LIMITS.maxSide || r.width * r.height > LIMITS.maxPixels) fail("dimensions", `Dimensions excessives : ${LIMITS.maxSide} px au maximum sur un côté.`);
  return { ...t, width: r.width, height: r.height, bytes: r.bytes };
}
