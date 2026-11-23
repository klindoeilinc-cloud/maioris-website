#!/usr/bin/env python3
"""Contrôle qualité du site statique (bibliothèque standard uniquement).

Usage :  python3 tools/qa.py            (depuis la racine du dépôt)
Code de sortie 1 si une erreur est trouvée. Les avertissements ne font pas échouer.
Contrôles : liens internes, ancres, balises uniques (title, description, canonical, h1),
hreflang réciproques, JSON-LD valide, images sans alt, tirets cadratins dans le texte visible,
sitemap, redirections, fichiers référencés.
"""
import glob, json, os, re, sys
from collections import defaultdict
from xml.dom import minidom

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
BASE = "https://maioris.net"
errors, warnings = [], []
PRESELECT = {"diagnostic", "brand", "growth", "cos", "t90", "claas"}
def err(m): errors.append(m)
def warn(m): warnings.append(m)

files = sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True))
rel = lambda f: os.path.relpath(f, SITE).replace(os.sep, "/")
pages = {rel(f): open(f, encoding="utf8").read() for f in files}

def visible(t):
    return re.sub(r"(?s)<(style|script|svg)\b.*?</\1>", "", t)

def route(path):
    """URL publique d'un fichier html (Cloudflare Pages : sans .html, index à la racine du dossier)."""
    p = path[:-5] if path.endswith(".html") else path
    if p == "index": return "/"
    if p.endswith("/index"): return "/" + p[:-5]
    return "/" + p

titles, descs = defaultdict(list), defaultdict(list)
canon_of = {}
alts_of = {}
for p, t in pages.items():
    if p == "404.html": continue
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    if not m: err(f"{p}: pas de <title>")
    else: titles[m.group(1).strip()].append(p)
    m = re.search(r'<meta content="([^"]*)" name="description"', t)
    if not m: err(f"{p}: pas de meta description")
    else:
        descs[m.group(1).strip()].append(p)
        if len(m.group(1)) > 320: warn(f"{p}: description très longue ({len(m.group(1))} caractères)")
    c = re.findall(r'<link href="([^"]*)" rel="canonical"', t)
    if len(c) != 1: err(f"{p}: {len(c)} canonical")
    else: canon_of[p] = c[0]
    if t.count("<h1") != 1: err(f"{p}: {t.count('<h1')} balises h1")
    alts_of[p] = dict((h, u) for u, h in re.findall(r'<link href="([^"]*)" hreflang="([^"]*)" rel="alternate"', t))
    for im in re.findall(r"<img(?![^>]*\balt=)[^>]*>", t): err(f"{p}: image sans alt: {im[:70]}")
    v = visible(t)
    if re.search(r"[—–]", v): err(f"{p}: tiret cadratin ou demi-cadratin dans le texte visible")
    if not re.search(r"<html[^>]*\blang=", t): err(f"{p}: attribut lang manquant")
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', t, re.S):
        try: json.loads(m.group(1))
        except Exception as e: err(f"{p}: JSON-LD invalide ({e})")
def own(p): return canon_of.get(p) == BASE + route(p)
def lang_of(p): return p.split("/")[0] if p.split("/")[0] in ("fr", "en") else "fr"
for k, v in titles.items():
    v = [p for p in v if own(p)]  # une page dont le canonical pointe ailleurs (ex. index.html vers /fr/) n'est pas un doublon
    for lg in ("fr", "en"):
        same = [p for p in v if lang_of(p) == lg]
        if len(same) > 1: err("titre en double dans la même langue: %r sur %s" % (k[:60], ", ".join(same)))
    if len({lang_of(p) for p in v}) > 1: warn("même titre en FR et EN (nom propre ?): %r" % k[:60])
for k, v in descs.items():
    v = [p for p in v if own(p)]
    for lg in ("fr", "en"):
        same = [p for p in v if lang_of(p) == lg]
        if len(same) > 1: warn("description en double sur %s" % ", ".join(same))

# liens internes et ancres
ids = {p: set(re.findall(r'\bid="([^"]+)"', t)) for p, t in pages.items()}
for p, t in pages.items():
    for m in re.finditer(r'(?:href|src)="([^"#?]*)(#[^"]*)?"', t):
        u, frag = m.group(1), m.group(2)
        if re.match(r"(https?:|mailto:|tel:|data:)", u) or "'" in u or "+" in u or u.startswith("//"): continue
        target = os.path.normpath(os.path.join(os.path.dirname(os.path.join(SITE, p)), u)) if u and not u.startswith("/") else os.path.join(SITE, u.lstrip("/")) if u else os.path.join(SITE, p)
        cands = [target, target + ".html", os.path.join(target, "index.html")]
        hit = next((c for c in cands if os.path.isfile(c)), None)
        if not hit: err(f"{p}: lien cassé {u}"); continue
        if frag and hit.endswith("contact.html") and frag[1:] in PRESELECT: continue  # gérées par site.js (présélection de l'accompagnement)
        if frag and hit.endswith(".html"):
            tp = rel(hit)
            if frag[1:] and frag[1:] not in ids.get(tp, set()): err(f"{p}: ancre {frag} introuvable dans {tp}")

# hreflang réciproques
by_canon = {c: p for p, c in canon_of.items()}
for p, a in alts_of.items():
    for lang, u in a.items():
        if lang == "x-default": continue
        q = by_canon.get(u)
        if q is None: err(f"{p}: hreflang {lang} vers une page inconnue {u}"); continue
        if canon_of.get(p) not in alts_of[q].values(): err(f"{p}: hreflang non réciproque avec {q}")
for p, c in canon_of.items():
    if p in alts_of and canon_of[p] not in alts_of[p].values(): warn(f"{p}: absente de ses propres hreflang")

# sitemap
sm = open(os.path.join(SITE, "sitemap.xml"), encoding="utf8").read()
try: minidom.parseString(sm)
except Exception as e: err(f"sitemap.xml invalide: {e}")
locs = set(re.findall(r"<loc>([^<]+)</loc>", sm))
for p, c in canon_of.items():
    if c not in locs: warn(f"{p}: absente du sitemap ({c})")
for l in locs:
    if l not in set(canon_of.values()): warn(f"sitemap: URL sans page correspondante {l}")

# redirections
for line in open(os.path.join(SITE, "_redirects"), encoding="utf8"):
    if line.startswith("#") or not line.strip(): continue
    parts = line.split()
    if len(parts) < 2: continue
    dest = parts[1].split("?")[0].strip("/")
    if dest and not any(os.path.isfile(os.path.join(SITE, dest + s)) for s in ("", ".html", "/index.html")):
        err(f"_redirects: destination introuvable {parts[1]}")

# fichiers référencés par les css
css = open(os.path.join(SITE, "assets", "site.css"), encoding="utf8").read()
for u in re.findall(r"url\((/assets/[^)]+)\)", css):
    if not os.path.isfile(os.path.join(SITE, u.lstrip("/"))): err(f"site.css: fichier introuvable {u}")

# CSS et JavaScript partagés : versionnés par empreinte (voir tools/build_assets.py)
import hashlib
def dig(name): return hashlib.sha256(open(os.path.join(SITE, "assets", name), encoding="utf8").read().encode("utf8")).hexdigest()[:8]
for ext in ("css", "js"):
    h = dig("site." + ext)
    if not os.path.isfile(os.path.join(SITE, "assets", "site.%s.%s" % (h, ext))):
        err("assets/site.%s à jour mais site.%s.%s est absent : lancez python3 tools/build_assets.py" % (ext, h, ext))
    for p, t in pages.items():
        if p == "404.html": continue
        refs = set(re.findall(r"/assets/site\.([0-9a-f]{8})\.%s" % ext, t))
        if refs and refs != {h}: err("%s: référence périmée à site.%s : lancez python3 tools/build_assets.py" % (p, "/".join(sorted(refs))))
        if not refs and ext == "css": err("%s: aucune feuille de style partagée" % p)

# Outil Creative Operations Intelligence : sources dans src/coi, publiées en coi.<empreinte>.js et .css
SRC_COI = os.path.join(SITE, "..", "src", "coi")
def dig_coi(ext):
    names = ("data.js", "calc.js", "report.js", "app.js") if ext == "js" else ("coi.css",)
    txt = "\n;\n".join(open(os.path.join(SRC_COI, n), encoding="utf8").read() for n in names)
    return hashlib.sha256(txt.encode("utf8")).hexdigest()[:8]
for ext in ("css", "js"):
    h = dig_coi(ext)
    if not os.path.isfile(os.path.join(SITE, "assets", "coi.%s.%s" % (h, ext))):
        err("src/coi à jour mais assets/coi.%s.%s est absent : lancez python3 tools/build_assets.py" % (h, ext))
    for p, t in pages.items():
        refs = set(re.findall(r"/assets/coi\.([0-9a-f]{8})\.%s" % ext, t))
        if refs and refs != {h}: err("%s: référence périmée à coi.%s : lancez python3 tools/build_assets.py" % (p, "/".join(sorted(refs))))

print(f"{len(pages)} pages analysées")
for w in warnings: print("AVERTISSEMENT", w)
for e in errors: print("ERREUR", e)
print(f"{len(errors)} erreur(s), {len(warnings)} avertissement(s)")
sys.exit(1 if errors else 0)
