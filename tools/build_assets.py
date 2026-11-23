#!/usr/bin/env python3
"""Publie le CSS et le JavaScript du site comme fichiers partagés, avec un nom versionné.

Sources à éditer :  site/assets/site.css  et  site/assets/site.js
Commande          :  python3 tools/build_assets.py

Le script calcule une empreinte du contenu, écrit site/assets/site.<empreinte>.css et .js,
supprime les anciennes versions, puis met à jour la référence dans chaque page HTML.
Le nom change dès que le contenu change : le cache d'un an du dossier /assets reste donc sans risque.
(Première exécution : remplace aussi le CSS et le JavaScript recopiés dans chaque page par un lien.)
"""
import glob, hashlib, os, re, sys

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
A = os.path.join(SITE, "assets")

def read(p): return open(p, encoding="utf8").read()
def write(p, t): open(p, "w", encoding="utf8").write(t)
def digest(t): return hashlib.sha256(t.encode("utf8")).hexdigest()[:8]

css, js = read(os.path.join(A, "site.css")), read(os.path.join(A, "site.js"))
hc, hj = digest(css), digest(js)
for ext, h, src in (("css", hc, css), ("js", hj, js)):
    for old in glob.glob(os.path.join(A, "site.*.%s" % ext)):
        if not old.endswith("site.%s.%s" % (h, ext)): os.remove(old)
    write(os.path.join(A, "site.%s.%s" % (h, ext)), src)

# Outils : sources dans src/, bundles définis dans tools/bundles.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bundles
BUILT = bundles.all_bundles()
HASH = {}
for name, (src_, ext) in BUILT.items():
    h = digest(src_); HASH[name] = h
    for old in glob.glob(os.path.join(A, "%s.*.%s" % (name, ext))):
        if not old.endswith("%s.%s.%s" % (name, h, ext)): os.remove(old)
    write(os.path.join(A, "%s.%s.%s" % (name, h, ext)), src_)
for old in glob.glob(os.path.join(A, "coi.*.css")): os.remove(old)

LINK = '<link href="/assets/site.%s.css" rel="stylesheet"/>' % hc
SCRIPT = '<script defer="" src="/assets/site.%s.js"></script>' % hj
changed = 0
for f in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
    if f.endswith("404.html"): continue
    t = o = read(f)
    t = t.replace("<style>" + css + "</style>", LINK)                       # première exécution
    m = re.search(r"<script>(/\* MAIORIS\.NET 2\.0.*?)</script>", t, re.S)  # JS recopié dans la page
    if m and m.group(1) == js: t = t.replace(m.group(0), SCRIPT)
    t = re.sub(r"/assets/site\.[0-9a-f]{8}\.css", "/assets/site.%s.css" % hc, t)
    t = re.sub(r"/assets/site\.[0-9a-f]{8}\.js", "/assets/site.%s.js" % hj, t)
    for name, (_, ext) in BUILT.items():
        t = re.sub(r"/assets/%s\.[0-9a-f]{8}\.%s" % (name, ext), "/assets/%s.%s.%s" % (name, HASH[name], ext), t)
    if t != o: write(f, t); changed += 1
print("site.%s.css  site.%s.js  %s  |  %d pages mises à jour" % (hc, hj, "  ".join("%s.%s.%s" % (n, HASH[n], e) for n, (_, e) in BUILT.items()), changed))
