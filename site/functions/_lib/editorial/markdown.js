/* Rendu Markdown restreint et sûr. Aucun HTML brut n'est accepté : tout texte est échappé.
   Syntaxe : ## et ### (titres), paragraphes, listes - et 1., > citation, **gras**, *italique*, `code`, [texte](lien http(s) ou /chemin), ![alt](/assets/...),
   citation de source [^n], blocs analytiques :::facts, :::analysis, :::hypotheses, :::questions, :::insight (suivis d'un titre facultatif) fermés par :::. */
export const BLOCKS = { facts: { fr: "Verified facts", en: "Verified facts" }, analysis: { fr: "MAIORIS Analysis", en: "MAIORIS Analysis" },
  hypotheses: { fr: "Strategic hypotheses", en: "Strategic hypotheses" }, questions: { fr: "Open questions", en: "Open questions" }, insight: { fr: "Analytical note", en: "Analytical note" } };

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function slugify(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section"; }

const safeUrl = (u) => { u = String(u).trim(); if (/^https?:\/\/[^\s"'<>]+$/i.test(u) || /^\/(?!\/)[^\s"'<>]*$/.test(u)) return u; return null; };
const safeImg = (u) => { u = String(u).trim(); return /^\/assets\/[^\s"'<>]+$/.test(u) || /^\/media\/[A-Za-z0-9_-]{16,40}$/.test(u) || /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : null; };

function inline(text, ctx) {
  let out = "", i = 0, s = String(text);
  const rest = () => s.slice(i);
  while (i < s.length) {
    let m;
    if ((m = /^`([^`\n]+)`/.exec(rest()))) { out += "<code>" + esc(m[1]) + "</code>"; i += m[0].length; continue; }
    if ((m = /^\[\^(\d{1,2})\]/.exec(rest()))) {
      const n = +m[1]; ctx.citations.add(n);
      if (n >= 1 && n <= ctx.sourceCount) out += `<sup class="ed-cite"><a href="#src-${n}" aria-label="Source ${n}">${n}</a></sup>`; else { ctx.errors.push({ code: "citation_unknown", n }); out += `<sup class="ed-cite ed-bad">[${n}]</sup>`; }
      i += m[0].length; continue;
    }
    if ((m = /^\*\*([^*\n]+)\*\*/.exec(rest()))) { out += "<strong>" + inline(m[1], ctx) + "</strong>"; i += m[0].length; continue; }
    if ((m = /^\*([^*\n]+)\*/.exec(rest()))) { out += "<em>" + inline(m[1], ctx) + "</em>"; i += m[0].length; continue; }
    if ((m = /^!\[([^\]\n]*)\]\(([^)\s]+)\)/.exec(rest()))) {
      const u = safeImg(m[2]); if (u && m[1].trim()) out += `<img src="${esc(u)}" alt="${esc(m[1])}" loading="lazy" decoding="async">`; else { ctx.errors.push({ code: "image_invalid" }); out += esc(m[0]); }
      i += m[0].length; continue;
    }
    if ((m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest()))) {
      const u = safeUrl(m[2]);
      if (u) out += `<a href="${esc(u)}"${u.startsWith("http") ? ' rel="noopener noreferrer"' : ""}>${inline(m[1], ctx)}</a>`; else { ctx.errors.push({ code: "link_invalid" }); out += esc(m[1]); }
      i += m[0].length; continue;
    }
    out += esc(s[i]); i++;
  }
  return out;
}

function renderBlocks(lines, ctx, inBlock) {
  const html = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^:::(facts|analysis|hypotheses|questions|insight)\s*(.*)$/.exec(line.trim()))) {
      if (inBlock) { ctx.errors.push({ code: "block_nested" }); i++; continue; }
      const kind = m[1], title = m[2].trim(); const body = []; i++;
      while (i < lines.length && lines[i].trim() !== ":::") { body.push(lines[i]); i++; }
      if (i >= lines.length) ctx.errors.push({ code: "block_unclosed", kind }); else i++;
      ctx.blocks.add(kind);
      const label = BLOCKS[kind][ctx.lang] || BLOCKS[kind].en;
      html.push(`<aside class="ed-box ed-${kind}" aria-label="${esc(label)}"><p class="ed-box-k">${esc(label)}</p>${title ? `<p class="ed-box-t">${esc(title)}</p>` : ""}${renderBlocks(body, ctx, kind)}</aside>`);
      continue;
    }
    if ((m = /^(#{1,3})\s+(.+)$/.exec(line))) {
      const level = m[1].length === 3 ? 3 : 2, text = m[2].trim(); let id = slugify(text), n = 2; while (ctx.ids.has(id)) id = slugify(text) + "-" + n++;
      ctx.ids.add(id); if (!inBlock) ctx.toc.push({ id, text, level });
      html.push(`<h${level} id="${id}">${inline(text, ctx)}</h${level}>`); i++; continue;
    }
    if (/^---+$/.test(line.trim())) { html.push("<hr>"); i++; continue; }
    if (/^>\s?/.test(line)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; } html.push("<blockquote>" + q.map((x) => `<p>${inline(x, ctx)}</p>`).join("") + "</blockquote>"); continue; }
    if (/^\s*[-*]\s+/.test(line) && !/^\*\*/.test(line)) { const it = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { it.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; } html.push("<ul>" + it.map((x) => `<li>${inline(x, ctx)}</li>`).join("") + "</ul>"); ctx.words += it.join(" ").split(/\s+/).filter(Boolean).length; continue; }
    if (/^\s*\d+\.\s+/.test(line)) { const it = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { it.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; } html.push("<ol>" + it.map((x) => `<li>${inline(x, ctx)}</li>`).join("") + "</ol>"); ctx.words += it.join(" ").split(/\s+/).filter(Boolean).length; continue; }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|:::|---+$|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i])) { p.push(lines[i].trim()); i++; }
    if (!p.length) { p.push(lines[i].trim()); i++; }
    const text = p.join(" "); ctx.words += text.split(/\s+/).filter(Boolean).length;
    ctx.paragraphs.push({ text, block: inBlock || null });
    html.push(`<p>${inline(text, ctx)}</p>`);
  }
  return html.join("");
}

/** Retourne { html, toc, words, citations, blocks, paragraphs, errors }. */
export function renderMarkdown(src, { sourceCount = 0, lang = "fr" } = {}) {
  const ctx = { citations: new Set(), blocks: new Set(), toc: [], ids: new Set(), words: 0, errors: [], paragraphs: [], sourceCount, lang };
  const html = renderBlocks(String(src || "").replace(/\r\n?/g, "\n").split("\n"), ctx, null);
  return { html, toc: ctx.toc, words: ctx.words, citations: [...ctx.citations].sort((a, b) => a - b), blocks: [...ctx.blocks], paragraphs: ctx.paragraphs, errors: ctx.errors };
}
