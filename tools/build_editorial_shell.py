#!/usr/bin/env python3
"""Génère les gabarits statiques de la section éditoriale (site/editorial-shell/) : en-tête et pied de page du site avec des liens absolus
(les pages éditoriales sont servies à des profondeurs d'URL variables), et le formulaire de lettre éditoriale.
Commande : python3 tools/build_editorial_shell.py puis python3 tools/build_assets.py"""
import html, os, posixpath, re
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
rd = lambda p: open(os.path.join(SITE, p), encoding="utf8").read()

def absolutize(fragment, lang):
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r"^(https?:|/|#|mailto:|tel:|javascript:|data:)", val) or val == "": return m.group(0)
        frag = ""; 
        if "#" in val: val, frag = val.split("#", 1); frag = "#" + frag
        q = ""
        if "?" in val: val, q = val.split("?", 1); q = "?" + q
        path = posixpath.normpath(posixpath.join("/" + lang + "/", val)) if val else "/" + lang + "/"
        if val.endswith("/"): path += "/"
        return '%s="%s%s%s"' % (attr, path, q, frag)
    return re.sub(r'\b(href|src|action)="([^"]*)"', fix, fragment)

TXT = {
 "fr": dict(email="Adresse e-mail professionnelle", consent="J'accepte de recevoir la lettre éditoriale de MAIORIS à cette adresse. Je peux me désinscrire à tout moment.", priv="/fr/confidentialite.html", priv_t="Politique de confidentialité", btn="S'abonner", ok="Merci, vous êtes inscrit(e) à la lettre éditoriale MAIORIS."),
 "en": dict(email="Professional email address", consent="I agree to receive the MAIORIS editorial newsletter at this address. I can unsubscribe at any time.", priv="/en/privacy.html", priv_t="Privacy policy", btn="Subscribe", ok="Thank you, you are subscribed to the MAIORIS editorial newsletter."),
}
def build(lang):
    src = rd("fr/faq.html" if lang == "fr" else "en/faq.html"); T = TXT[lang]
    keep = src[src.index('<link href="../assets/favicon.svg"'):src.index('<script type="application/ld+json">')]
    keep = absolutize(keep, lang)
    keep = re.sub(r'(<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>)', lambda m: m.group(1) + '<link href="/assets/editorial.00000000.css" rel="stylesheet"/><link as="font" crossorigin="" href="/assets/fonts/poppins-700-latin.woff2" rel="preload" type="font/woff2"/><link as="font" crossorigin="" href="/assets/fonts/poppins-400-latin.woff2" rel="preload" type="font/woff2"/>', keep, count=1)
    plaus = re.search(r'<script data-domain="maioris.net"[^>]*></script>', src).group(0)
    body = src[src.index('<body data-lang'):src.index('<main id="main">')]
    body = re.sub(r'data-page="[^"]*"', 'data-page="perspectives"', body, count=1)
    body = absolutize(body, lang)
    body = re.sub(r'(<a class="lang"[^>]*href=")[^"]*(")', lambda m: m.group(1) + "__LANGHREF__" + m.group(2), body, count=1)
    foot = absolutize(src[src.index('</main>') + len('</main>'):src.index('</footer>') + len('</footer>')], lang)
    site_js = re.search(r'<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>', src).group(0)
    aside = src[src.index('<aside aria-label'):src.index('</aside>') + len('</aside>')]
    page = ('<!DOCTYPE html>\n<html lang="%s">\n<head>\n<meta charset="utf-8"/>\n<meta content="width=device-width, initial-scale=1" name="viewport"/>\n<!--ED_HEAD-->\n%s%s\n</head>\n%s<main id="main"><!--ED_MAIN--></main>%s\n%s<script defer="" src="/assets/edjs.00000000.js"></script>%s\n</body>\n</html>\n'
            % (lang, keep, plaus, body, foot, site_js, aside))
    os.makedirs(os.path.join(SITE, "editorial-shell"), exist_ok=True)
    open(os.path.join(SITE, "editorial-shell", lang + ".html"), "w", encoding="utf8").write(page)
    # formulaire de lettre éditoriale : mêmes classes et attributs que la lettre du site (le script du site les reconnaît), sans promesse de fréquence
    other = rd("fr/analyses.html" if lang == "fr" else "en/insights.html"); form = re.search(r'<form class="nl-form"(.*?)>', other, re.S).group(1)
    attrs = re.sub(r'data-ok="[^"]*"', 'data-ok="%s"' % html.escape(T["ok"]), form)
    frag = ('<form class="nl-form"%s><div><label for="ed-nl-email">%s</label><input autocomplete="email" id="ed-nl-email" name="email" required type="email"/></div>'
            '<div aria-hidden="true" class="nl-hp"><label>Website<input autocomplete="off" name="website" tabindex="-1" type="text"/></label></div>'
            '<label class="nl-consent"><input name="consent" required type="checkbox"/><span>%s <a href="%s">%s</a>.</span></label><button type="submit">%s</button><p class="nl-status" role="status" aria-live="polite"></p></form>\n'
            % (attrs, T["email"], html.escape(T["consent"]), T["priv"], T["priv_t"], T["btn"]))
    open(os.path.join(SITE, "editorial-shell", "newsletter-%s.html" % lang), "w", encoding="utf8").write(frag)
    print("écrit editorial-shell/%s.html" % lang, len(page))
for l in ("fr", "en"): build(l)
