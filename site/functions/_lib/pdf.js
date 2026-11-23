/**
 * Générateur de PDF sans dépendance (Cloudflare Workers) : A4, polices Helvetica standard (aucune police à embarquer),
 * logo MAIORIS tracé en vectoriel, couleurs de la marque. Sert à joindre aux e-mails reçus par l'équipe un document
 * structuré de tout ce qu'un visiteur a renseigné.
 *
 * buildPdf({ lang, kicker, title, subtitle, ref, date, blocks }) → Uint8Array
 *   blocks : [{ h: "Titre de section", rows: [[libellé, valeur], ...] } | { h, text: "paragraphes…" } | { note: "texte" }]
 */
const BLUE = [0.141, 0.227, 1], NAVY = [0.043, 0.082, 0.314], GREY = [0.341, 0.329, 0.306], LINE = [0.86, 0.87, 0.93], PALE = [0.94, 0.95, 1];
const W = 595.28, H = 841.89, MX = 54, TOP = 86, BOTTOM = 62;

/* largeurs Helvetica (AFM, unités de 1/1000) pour 32..126 ; Helvetica-Bold juste après */
const HV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

/* Unicode → octet WinAnsi (cp1252) */
const CP = { "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f };
const BASE = { "À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","ÿ":"y","Œ":"O","œ":"o" };

function normalize(s) {
  return String(s ?? "").replace(/ | | /g, " ").replace(/[‐‑−]/g, "-").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
}
function code(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c < 127) return c;
  if (c >= 0xa0 && c <= 0xff) return c;
  return CP[ch] || 63;
}
function width(str, size, bold) {
  const T = bold ? HB : HV; let w = 0;
  for (const ch of str) {
    const c = code(ch);
    let u = c;
    if (c >= 127) { const b = BASE[ch]; u = b ? b.charCodeAt(0) : 63; if (c === 0x95) u = 0; }
    w += u >= 32 && u <= 126 ? T[u - 32] : c === 0x95 ? 350 : c === 0xa0 ? 278 : 556;
  }
  return (w * size) / 1000;
}
const hex = (str) => { let o = "<"; for (const ch of str) o += code(ch).toString(16).padStart(2, "0"); return o + ">"; };
const n2 = (x) => (Math.round(x * 100) / 100).toString();

/** Découpe en lignes d'au plus maxW points ; coupe les mots trop longs. */
function wrap(text, size, bold, maxW) {
  const out = [];
  for (const para of normalize(text).split(/\n/)) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (let word of para.split(/ +/)) {
      if (!word) continue;
      while (width(word, size, bold) > maxW) {
        let cut = word.length;
        while (cut > 1 && width(word.slice(0, cut), size, bold) > maxW) cut--;
        if (line) { out.push(line); line = ""; }
        out.push(word.slice(0, cut)); word = word.slice(cut);
      }
      const t = line ? line + " " + word : word;
      if (width(t, size, bold) <= maxW) line = t; else { out.push(line); line = word; }
    }
    if (line) out.push(line);
  }
  return out;
}

const LABELS = {
  fr: { page: "Page", of: "sur", conf: "Document confidentiel, destiné à l'équipe MAIORIS · maioris.net", ref: "Référence", received: "Reçu le", none: "Non renseigné" },
  en: { page: "Page", of: "of", conf: "Confidential document for the MAIORIS team · maioris.net", ref: "Reference", received: "Received on", none: "Not provided" },
};

export function buildPdf({ lang = "fr", kicker = "", title = "", subtitle = "", ref = "", date = new Date(), blocks = [] }) {
  const L = LABELS[lang === "en" ? "en" : "fr"];
  const pages = []; let ops = [], y = 0;
  const fill = (c) => `${n2(c[0])} ${n2(c[1])} ${n2(c[2])} rg`, stroke = (c) => `${n2(c[0])} ${n2(c[1])} ${n2(c[2])} RG`;
  const text = (s, x, yy, size, bold, color, spacing = 0) => ops.push(`BT ${fill(color)} /${bold ? "F2" : "F1"} ${size} Tf ${n2(spacing)} Tc ${n2(x)} ${n2(H - yy)} Td ${hex(s)} Tj ET`);
  const rect = (x, yy, w, h, c) => ops.push(`${fill(c)} ${n2(x)} ${n2(H - yy - h)} ${n2(w)} ${n2(h)} re f`);
  const hline = (x1, x2, yy, c, lw = 0.6) => ops.push(`${stroke(c)} ${lw} w ${n2(x1)} ${n2(H - yy)} m ${n2(x2)} ${n2(H - yy)} l S`);

  /* logo : quatre formes de la marque (viewBox 385 213 1312 1311), mises à l'échelle puis retournées */
  const logo = (x0, y0, size) => {
    const k = size / 1312, P = (px, py) => `${n2(x0 + (px - 385) * k)} ${n2(H - (y0 + (py - 213) * k))}`;
    const poly = (pts) => pts.map(([px, py], i) => `${P(px, py)} ${i ? "l" : "m"}`).join(" ") + " h f";
    ops.push(fill(BLUE));
    for (const pts of [[[385,213],[670,379],[670,1359],[385,1524]], [[750,424],[1024,581],[995,606],[995,1131],[1024,1156],[750,1313]], [[1332,424],[1059,581],[1087,606],[1087,1131],[1059,1156],[1332,1313]], [[1697,213],[1412,379],[1412,1359],[1697,1524]]]) ops.push(poly(pts));
  };

  const newPage = () => {
    if (ops.length) pages.push(ops.join("\n"));
    ops = []; y = TOP + 22;
    logo(MX, 34, 22);
    text("MAIORIS", MX + 32, 50.5, 11, true, BLUE, 2.6);
    const r = normalize(kicker || "MAIORIS"); text(r, W - MX - width(r, 8.5, false), 49, 8.5, false, GREY);
    hline(MX, W - MX, 68, LINE);
  };
  const room = (h) => { if (y + h > H - BOTTOM) newPage(); };

  newPage();
  /* bandeau de titre sur la première page */
  y = TOP + 14;
  text(normalize(kicker).toUpperCase(), MX, y + 8, 8.5, true, BLUE, 1.6); y += 26;
  for (const ln of wrap(title, 22, true, W - 2 * MX)) { text(ln, MX, y + 18, 22, true, NAVY); y += 27; }
  if (subtitle) for (const ln of wrap(subtitle, 10.5, false, W - 2 * MX)) { text(ln, MX, y + 12, 10.5, false, GREY); y += 15; }
  y += 8;
  const d = date instanceof Date ? date : new Date(date);
  const dateStr = d.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) + " " + d.toISOString().slice(11, 16) + " UTC";
  rect(MX, y, W - 2 * MX, 34, PALE);
  rect(MX, y, 3, 34, BLUE);
  text(L.received.toUpperCase(), MX + 14, y + 13, 7, true, GREY, 1);
  text(dateStr, MX + 14, y + 26, 10, true, NAVY);
  if (ref) { const rx = MX + 230; text(L.ref.toUpperCase(), rx, y + 13, 7, true, GREY, 1); text(normalize(ref), rx, y + 26, 10, true, NAVY); }
  y += 34 + 24;

  const LABW = 150, VX = MX + LABW + 14, VW = W - MX - VX;
  for (const b of blocks) {
    if (b.note) {
      const ls = wrap(b.note, 9, false, W - 2 * MX - 28);
      room(ls.length * 13 + 24);
      rect(MX, y, W - 2 * MX, ls.length * 13 + 16, PALE); rect(MX, y, 3, ls.length * 13 + 16, BLUE);
      ls.forEach((ln, i) => text(ln, MX + 14, y + 17 + i * 13, 9, false, NAVY));
      y += ls.length * 13 + 16 + 20; continue;
    }
    room(60);
    text(normalize(b.h || "").toUpperCase(), MX, y + 10, 9, true, BLUE, 1.4); y += 16;
    hline(MX, W - MX, y, BLUE, 1.2); y += 12;
    if (b.rows) {
      for (const [k, vRaw] of b.rows) {
        const v = normalize(vRaw).trim() || L.none, empty = !normalize(vRaw).trim();
        const kl = wrap(k, 8.5, true, LABW), vl = wrap(v, 10, false, VW);
        const n = Math.max(kl.length, vl.length);
        let i = 0;
        while (i < n) {
          room(18);
          const fit = Math.max(1, Math.min(n - i, Math.floor((H - BOTTOM - y - 8) / 14)));
          for (let j = 0; j < fit; j++) {
            if (kl[i + j] !== undefined) text(kl[i + j], MX, y + 11 + j * 14, 8.5, true, GREY);
            if (vl[i + j] !== undefined) text(vl[i + j], VX, y + 11 + j * 14, 10, false, empty ? GREY : NAVY);
          }
          y += fit * 14; i += fit;
          if (i < n) newPage();
        }
        y += 4; hline(MX, W - MX, y, LINE, 0.4); y += 8;
      }
    } else if (b.text) {
      const ls = wrap(b.text, 10, false, W - 2 * MX);
      for (const ln of ls) { room(16); if (ln) text(ln, MX, y + 11, 10, false, NAVY); y += ln ? 14.5 : 7; }
    }
    y += 16;
  }
  pages.push(ops.join("\n"));

  /* numérotation et pied de page, une fois le nombre de pages connu */
  const total = pages.length;
  const foot = pages.map((c, i) => {
    ops = [];
    hline(MX, W - MX, H - 44, LINE);
    text(L.conf, MX, H - 30, 7.5, false, GREY);
    const pg = `${L.page} ${i + 1} ${L.of} ${total}`; text(pg, W - MX - width(pg, 7.5, false), H - 30, 7.5, false, GREY);
    return c + "\n" + ops.join("\n");
  });

  /* assemblage des objets PDF */
  const objs = []; const add = (s) => { objs.push(s); return objs.length; };
  const catalog = add(""), pagesObj = add(""), f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"), f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const info = add(`<< /Title ${hex(title)} /Author (MAIORIS) /Creator (maioris.net) /Producer (maioris.net) /CreationDate (D:${d.toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z) >>`);
  const kids = [];
  for (const c of foot) {
    const cs = add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cs} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + " 0 R").join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n"; const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  /* tout le contenu est ASCII (les textes sont en hexadécimal) : un octet par caractère */
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

export function toBase64(bytes) {
  let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return btoa(s);
}

/** Nom de fichier sûr : lettres, chiffres et tirets. */
export const pdfName = (prefix, label) =>
  `${prefix}-${String(label || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "demande"}-${new Date().toISOString().slice(0, 10)}.pdf`;

/**
 * Pièce jointe PDF pour Resend. Essaie la mise en page complète ; en cas d'échec, une version simplifiée (texte seul) ;
 * renvoie undefined seulement si les deux échouent (l'appelant le signale alors dans l'e-mail).
 */
export function pdfAttachment(opts, filename) {
  const attempt = (o) => { const b = buildPdf(o); if (!b || b.length < 400 || String.fromCharCode(...b.subarray(0, 5)) !== "%PDF-") throw new Error("pdf invalide"); return [{ filename, content: toBase64(b) }]; };
  try { return attempt(opts); } catch (e) { console.error("pdf", e && e.message); }
  try {
    const flat = (opts.blocks || []).map((b) => b.note ? b.note : `${b.h || ""}\n` + (b.rows ? b.rows.map(([k, v]) => `${k} : ${v}`).join("\n") : b.text || "")).join("\n\n");
    return attempt({ ...opts, blocks: [{ h: "Contenu", text: flat }] });
  } catch (e) { console.error("pdf secours", e && e.message); }
  return undefined;
}
