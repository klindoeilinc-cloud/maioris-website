#!/usr/bin/env python3
"""Génère les pages FR et EN du Creative Maturity Assessment et du Brand Consistency Review à partir du gabarit du site.
Commande : python3 tools/build_tool_pages.py puis python3 tools/sync_tools.py puis python3 tools/build_assets.py"""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_coi_pages as B
SITE = B.SITE; E = html.escape
rd = B.rd
NB = " "

TOOLS = {
 "mat": dict(slug="creative-maturity-assessment", bundle="mat", root="mat", mount="mat", name="Creative Maturity Assessment",
   fr=dict(title="Creative Maturity Assessment : autoévaluation | MAIORIS",
           desc="Vingt-quatre questions, six dimensions : évaluez la maturité de votre système créatif. Autoévaluation déclarative, calcul dans votre navigateur.",
           lead="Votre organisation possède-t-elle les capacités stratégiques, humaines et opérationnelles nécessaires pour produire une création cohérente et performante ? Évaluez la maturité de votre organisation dans la manière dont elle définit sa stratégie créative, gouverne sa marque, dirige ses équipes, organise ses processus et mesure la performance de ses activités créatives.",
           sig="24 questions · 6 dimensions · 10 à 12 minutes",
           priv=["Le calcul s'exécute dans votre navigateur. Vos réponses ne sont ni envoyées ni enregistrées : elles restent en mémoire le temps de la visite et disparaissent si vous fermez la page.",
                 "Vous pouvez choisir de transmettre votre profil à MAIORIS. Dans ce cas seulement, vos réponses, votre nom et votre adresse e-mail nous sont envoyés, avec votre consentement explicite.",
                 "Il s'agit d'une autoévaluation déclarative propriétaire, et non d'une certification indépendante."]),
   en=dict(title="Creative Maturity Assessment: self-assessment | MAIORIS",
           desc="Twenty four questions, six dimensions: assess the maturity of your creative system. Declarative self-assessment, calculated in your browser.",
           lead="Does your organisation have the strategic, human and operational capabilities needed to produce consistent, high performing creative work? Assess your organisation's maturity in how it defines creative strategy, governs its brand, leads its teams, organises its processes and measures the performance of its creative activities.",
           sig="24 questions · 6 dimensions · 10 to 12 minutes",
           priv=["The calculation runs in your browser. Your answers are neither sent nor saved: they stay in memory during the visit and disappear if you close the page.",
                 "You can choose to send your profile to MAIORIS. Only then are your answers, your name and your email address sent to us, with your explicit consent.",
                 "This is a proprietary declarative self assessment, not an independent certification."]),
   cta_t=dict(fr="Votre diagnostic révèle des éléments qui méritent une analyse stratégique approfondie.", en="Your diagnostic reveals points that deserve an in depth strategic analysis.")),
 "brand": dict(slug="brand-consistency-review", bundle="brand", root="brand", mount="brand", name="Brand Consistency Review",
   fr=dict(title="Brand Consistency Review : cohérence de marque | MAIORIS",
           desc="Une revue guidée de la cohérence et de la singularité de votre marque à travers ses points de contact. Rapport structuré, sans analyse automatique de fichier.",
           lead="Votre marque exprime-t-elle une identité cohérente, reconnaissable et différenciante à travers ses différents points de contact ? Examinez la cohérence de votre identité, de votre discours et de vos expressions créatives afin d'identifier les écarts susceptibles d'affaiblir la perception de votre marque.",
           sig="Revue guidée · 6 dimensions · 10 à 15 minutes selon les supports",
           priv=["Aucun fichier n'est lu, analysé ni envoyé. Le fichier que vous choisissez est seulement contrôlé (format et taille) puis référencé dans votre registre, dans cet onglet.",
                 "Vous pouvez choisir de transmettre votre rapport à MAIORIS. Dans ce cas seulement, le texte du rapport (constats, noms de supports, liens), votre nom et votre adresse e-mail nous sont envoyés, avec votre consentement explicite. Les fichiers ne sont jamais transmis ; pour nous en confier, écrivez-nous à hello@maioris.net.",
                 "Cet outil se distingue du Creative Maturity Assessment : l'un examine l'organisation, celui-ci examine les expressions de la marque."]),
   en=dict(title="Brand Consistency Review: test brand consistency | MAIORIS",
           desc="A guided review of your brand's consistency and distinctiveness across its touchpoints. Structured report, no automatic file analysis.",
           lead="Does your brand express a consistent, recognisable and differentiating identity across its touchpoints? Examine the consistency of your identity, your discourse and your creative expressions in order to identify the gaps that may weaken how your brand is perceived.",
           sig="Guided review · 6 dimensions · 10 to 15 minutes depending on the materials",
           priv=["No file is read, analysed or sent. The file you choose is only checked (format and size) and then listed in your register, in this tab.",
                 "You can choose to send your report to MAIORIS. Only then are the report text (findings, material names, links), your name and your email address sent to us, with your explicit consent. Files are never transmitted; to share some with us, write to hello@maioris.net.",
                 "This tool is distinct from the Creative Maturity Assessment: one examines the organisation, this one examines the expressions of the brand."]),
   cta_t=dict(fr="Votre diagnostic révèle des éléments qui méritent une analyse stratégique approfondie.", en="Your diagnostic reveals points that deserve an in depth strategic analysis.")),
}
CTA_P = dict(fr="Le Creative Audit de MAIORIS Group est une mission indépendante de diagnostic stratégique comprenant analyse documentaire, entretiens, évaluation du système créatif, recommandations et restitution exécutive.",
             en="MAIORIS Group's Creative Audit is an independent strategic diagnostic engagement comprising document analysis, interviews, an assessment of the creative system, recommendations and an executive debrief.")

def build(key, lang):
    T = TOOLS[key]; c = B.CFG[lang]; x = T[lang]; url = "https://maioris.net/%s/%s" % (lang, T["slug"]); other = "https://maioris.net/%s/%s" % ("en" if lang == "fr" else "fr", T["slug"])
    src = rd("fr/faq.html" if lang == "fr" else "en/faq.html")
    keep = src[src.index('<link href="../assets/favicon.svg"'):src.index('<script type="application/ld+json">')]
    keep = re.sub(r'<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>', lambda m: m.group(0) + '<link href="/assets/tools.00000000.css" rel="stylesheet"/>', keep)
    plaus = re.search(r'<script data-domain="maioris.net"[^>]*></script>', src).group(0)
    body_start = src.index('<body data-lang'); main_start = src.index('<main id="main">'); foot_start = src.index('</main>') + len('</main>')
    foot = src[foot_start:src.index('</footer>') + len('</footer>')]
    site_js = re.search(r'<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>', src).group(0)
    aside = src[src.index('<aside aria-label'):src.index('</aside>') + len('</aside>')]
    pre = re.sub(r'data-page="[^"]*"', 'data-page="%s"' % key, src[body_start:main_start], count=1)
    pre = re.sub(r'(<a class="lang"[^>]*href=")[^"]*(")', lambda m: m.group(1) + "../%s/%s.html" % ("en" if lang == "fr" else "fr", T["slug"]) + m.group(2), pre)
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": x["title"], "description": x["desc"], "inLanguage": lang, "url": url,
           "publisher": {"@type": "Organization", "name": "MAIORIS", "logo": {"@type": "ImageObject", "url": "https://maioris.net/assets/symbol.svg"}}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "MAIORIS", "item": "https://maioris.net/%s/" % lang},
            {"@type": "ListItem", "position": 2, "name": "Insights", "item": "https://maioris.net/%s/%s" % (lang, "analyses" if lang == "fr" else "insights")},
            {"@type": "ListItem", "position": 3, "name": T["name"], "item": url}]}]
    fr_url, en_url = (url, other) if lang == "fr" else (other, url)
    head = ('<!DOCTYPE html>\n\n<html lang="%s">\n<head>\n<meta charset="utf-8"/>\n<meta content="width=device-width, initial-scale=1" name="viewport"/>\n<title>%s</title>\n<meta content="%s" name="description"/>\n'
            '<link href="%s" rel="canonical"/>\n<link href="%s" hreflang="en" rel="alternate"/><link href="%s" hreflang="fr" rel="alternate"/><link href="%s" hreflang="x-default" rel="alternate"/>\n\n'
            '<meta content="website" property="og:type"/>\n<meta content="MAIORIS" property="og:site_name"/>\n<meta content="%s" property="og:title"/>\n<meta content="%s" property="og:description"/>\n<meta content="%s" property="og:url"/>\n<meta content="%s" property="og:locale"/>\n'
            '<meta content="%s" property="og:image"/><meta content="%s" name="twitter:image"/><meta content="1200" property="og:image:width"/><meta content="630" property="og:image:height"/><meta content="%s" property="og:image:alt"/>\n'
            '<meta content="summary_large_image" name="twitter:card"/>\n<meta content="#FFFFFF" name="theme-color"/>\n') % (
            lang, E(x["title"], False), E(x["desc"]), url, en_url, fr_url, fr_url, E(x["title"]), E(x["desc"]), url, c["locale"], c["og"], c["og"], E(x["title"]))
    head += keep + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>\n' + plaus + '\n</head>\n'
    r = T["root"]; cb = c["crumb"]
    privL = c["privL"]
    brand = key == "brand"
    L = dict(
        send_t=("Transmettre mon rapport à MAIORIS (facultatif)" if brand else "Transmettre mon profil à MAIORIS (facultatif)") if lang == "fr" else ("Send my report to MAIORIS (optional)" if brand else "Send my profile to MAIORIS (optional)"),
        sent=("Merci, votre rapport a bien été transmis." if brand else "Merci, votre profil a bien été transmis.") if lang == "fr" else ("Thank you, your report has been sent." if brand else "Thank you, your profile has been sent."),
        consent=c["consent"].replace("mon Snapshot", "mon rapport" if brand else "mon profil").replace("my Snapshot", "my report" if brand else "my profile"),
        submit=("Transmettre mon rapport" if brand else "Transmettre mon profil") if lang == "fr" else ("Send my report" if brand else "Send my profile"),
        pl=privL[1].replace("Lire la politique", "Politique").replace("Read the privacy policy", "Privacy policy"))
    sep = " : " if lang == "fr" else ": "
    facts = "".join("<li>%s%s<b>%s</b></li>" % (E(a_), sep, E(b_)) for a_, b_ in c["facts"])
    cta = (
        '<section class="coi-cta" id="{r}-cta" hidden aria-labelledby="{r}-cta-t"><h3 id="{r}-cta-t">{ct}</h3><p>{cp}</p><ul class="coi-facts">{facts}<li>{pl_}<b class="coi-price">{price}</b></li></ul>'
        '<div class="actions"><a class="btn" data-track="cta_click" data-rank="primary" data-label="{r}-audit" href="{h1}">{t1}</a><a class="link" data-track="cta_click" data-rank="secondary" data-label="{r}-contact" href="{h2}">{t2}</a></div>\n'
        '<h3 style="margin-top:34px;font-size:20px">{st}</h3><p style="font-size:15px">{sp}</p>\n'
        '<form class="coi-send" id="{r}-send" novalidate data-consent="tx-{tid}-{lang}-v1" data-invalid="{m_inv}" data-noconsent="{m_nc}" data-sending="{m_sd}" data-sent="{m_ok}" data-fail="{m_ko}">'
        '<label>{f1}<input type="text" name="name" autocomplete="name" required/></label><label>{f2}<input type="email" name="email" autocomplete="email" required/></label><label>{f3}<input type="text" name="company" autocomplete="organization"/></label>'
        '<div class="coi-trap" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"/></label></div>'
        '<label class="coi-consent"><input type="checkbox" name="consent"/><span>{cons} <a href="{ph}">{pl}</a>.</span></label><button class="btn" type="submit">{sub}</button><p class="coi-send-status" id="{r}-send-status" role="status"></p></form></section>\n'
    ).format(r=r, tid=("maturity" if key == "mat" else key), lang=lang, ct=E(T["cta_t"][lang]), cp=E(CTA_P[lang]), facts=facts, pl_=E(c["price_l"]) + sep, price=E(c["price"]), h1=c["cta1"][1], t1=E(c["cta1"][0]), h2=c["cta2"][1], t2=E(c["cta2"][0]),
             st=E(L["send_t"]), sp=E(c["send_p"]), m_inv=E(c["msgs"]["invalid"]), m_nc=E(c["msgs"]["noconsent"]), m_sd=E(c["msgs"]["sending"]), m_ok=E(L["sent"]), m_ko=E(c["msgs"]["fail"]),
             f1=E(c["f_name"]), f2=E(c["f_email"]), f3=E(c["f_co"]), cons=E(L["consent"]), ph=privL[0], pl=E(L["pl"]), sub=E(L["submit"]))
    main = ('<main id="main">\n<section class="hero sub" data-reveal=""><div class="wrap g12"><div class="crumb"><p class="lbl"><a href="%s">%s</a> / %s</p></div><h1 class="thesis s">%s</h1><p class="lead">%s</p><p class="lbl">%s</p></div></section>\n'
            '<section class="sec"><div class="wrap">\n<noscript><p class="coi-note">%s</p></noscript>\n'
            '<div class="coi-priv" id="%s-priv"><h2>%s</h2>%s<p><a href="%s">%s</a></p></div>\n'
            '<div class="coi" id="%s" data-lang="%s" style="margin-top:34px"><div data-head aria-label="%s"></div><div data-body></div><div class="coi-nav" data-nav></div></div><script>document.getElementById("%s").setAttribute("data-js","")</script>\n'
            '<div class="coi-result" id="%s-result" hidden></div>\n%s</div></section>\n</main>') % (
            cb[0], cb[1], c["crumb_t"], E(T["name"]), E(x["lead"]), E(x["sig"]), E(c["nojs"]), r, E(c["privT"]), "".join("<p>%s</p>" % E(p) for p in x["priv"]), privL[0], E(privL[1]), r, lang, c["head_lbl"], r, r, cta)
    scripts = '<script defer="" src="/assets/%s.00000000.js"></script>' % T["bundle"]
    out = head + pre + main + foot + "\n" + site_js + scripts + aside + "\n</body>\n</html>\n"
    out = out.replace('data-js=""', 'data-js=""')
    open(os.path.join(SITE, "%s/%s.html" % (lang, T["slug"])), "w", encoding="utf8").write(out)
    print("écrit %s/%s.html" % (lang, T["slug"]), len(out))

if __name__ == "__main__":
    for key in TOOLS:
        for lang in ("fr", "en"): build(key, lang)
