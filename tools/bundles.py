"""Définition des bundles des outils, partagée par build_assets.py et qa.py."""
import os
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src")
BUNDLES = {
    "coi": ["core/options.js", "core/core.js", "coi/data.js", "coi/calc.js", "coi/report.js", "coi/app.js"],
    "mat": ["core/options.js", "core/core.js", "mat/data.js", "mat/calc.js", "mat/report.js", "mat/app.js"],
    "brand": ["core/options.js", "core/core.js", "brand/data.js", "brand/calc.js", "brand/report.js", "brand/app.js"],
    "core": ["core/options.js", "core/core.js"],
    "edjs": ["editorial/editorial.js"],
}
CSS_TOOLS = ["coi/coi.css", "core/core.css", "mat/mat.css", "brand/brand.css"]
CSS_EDITORIAL = ["editorial/editorial.css"]
CSS_PARTNERS = ["partners/partners.css"]
def _read(n): return open(os.path.join(SRC, n), encoding="utf8").read()
def bundle_js(name): return "\n;\n".join(_read(n) for n in BUNDLES[name] if os.path.isfile(os.path.join(SRC, n)))
def bundle_css(): return "\n".join(_read(n) for n in CSS_TOOLS if os.path.isfile(os.path.join(SRC, n)))
def bundle_editorial_css(): return "\n".join(_read(n) for n in CSS_EDITORIAL if os.path.isfile(os.path.join(SRC, n)))
def bundle_partners_css(): return "\n".join(_read(n) for n in CSS_PARTNERS if os.path.isfile(os.path.join(SRC, n)))
def all_bundles():
    out = {n: (bundle_js(n), "js") for n in BUNDLES}
    out["tools"] = (bundle_css(), "css")
    out["editorial"] = (bundle_editorial_css(), "css")
    out["partners"] = (bundle_partners_css(), "css")
    return out
