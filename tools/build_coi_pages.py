#!/usr/bin/env python3
"""Génère les pages FR et EN de Creative Operations Intelligence à partir du gabarit (en-tête, navigation, pied de page)
des pages existantes. Commande : python3 tools/build_coi_pages.py puis python3 tools/build_assets.py"""
import html, json, os, re
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
rd = lambda p: open(os.path.join(SITE, p), encoding="utf8").read()

CFG = {
 "fr": dict(src="fr/index.html", out="fr/creative-operations-intelligence.html", url="https://maioris.net/fr/creative-operations-intelligence", other="../en/creative-operations-intelligence.html", otherurl="https://maioris.net/en/creative-operations-intelligence",
   og="https://maioris.net/assets/og/fr-calc.png", locale="fr_FR", crumb=("analyses.html", "Insights"), crumb_t="Outil",
   title="Creative Operations Intelligence : diagnostic de vos opérations créatives | MAIORIS",
   desc="Un outil de diagnostic en cinq étapes pour estimer ce que les reprises, validations et frictions coûtent à vos opérations créatives, et identifier ce qui limite votre performance. Calcul dans votre navigateur.",
   h1="Creative Operations Intelligence", sig="Understand your creative operations. Identify what limits your performance.",
   lead="Comprenez vos opérations créatives. Identifiez ce qui limite votre performance. Vingt questions, cinq étapes, et une estimation indicative de ce que les reprises et les validations répétées coûtent chaque année à votre organisation.",
   privT="Ce qui se passe avec vos réponses",
   priv=["Le calcul s'exécute dans votre navigateur. Vos réponses ne sont ni envoyées ni enregistrées : elles restent en mémoire le temps de la visite et disparaissent si vous fermez la page.",
         "Vous pouvez choisir de transmettre votre Snapshot à MAIORIS. Dans ce cas seulement, vos réponses, votre nom et votre adresse e-mail nous sont envoyés, avec votre consentement explicite.",
         "Nous mesurons uniquement la fréquentation de l'outil, par exemple le nombre d'étapes atteintes, sans jamais enregistrer vos réponses."],
   privL=("confidentialite.html", "Lire la politique de confidentialité"), nojs="Cet outil a besoin de JavaScript pour fonctionner. Le calcul s'exécute entièrement dans votre navigateur.",
   cta_t="Votre système créatif mérite une analyse approfondie.",
   cta_p="Ce Snapshot s'appuie sur vos déclarations. Le Creative Audit de MAIORIS Group va plus loin : une mission indépendante de diagnostic stratégique qui examine, à partir de vos documents et de vos pratiques réelles, pourquoi votre système créatif produit, ou non, les résultats attendus.",
   facts=[("Durée", "5 à 7 jours ouvrés"), ("Restitution", "60 à 90 minutes"), ("Livrables", "5 documents stratégiques")], price_l="Tarif", price="800\u00a0000 FCFA",
   cta1=("Découvrir le Creative Audit", "accompagnement/creative-audit.html"), cta2=("Échanger avec MAIORIS", "contact.html"),
   send_t="Transmettre mon Snapshot à MAIORIS (facultatif)", send_p="Vous recevrez un accusé de réception et nous vous répondrons par e-mail. Vos données sont conservées 12 mois ; pour les faire effacer, écrivez à hello@maioris.net.",
   f_name="Nom", f_email="Adresse e-mail", f_co="Organisation (facultatif)", consent="J'accepte que MAIORIS reçoive mes réponses et mon Snapshot, les conserve 12 mois et les utilise pour me répondre.", submit="Transmettre mon Snapshot",
   msgs=dict(invalid="Indiquez votre nom et une adresse e-mail valide.", noconsent="Cochez la case de consentement pour transmettre votre Snapshot.", sending="Envoi en cours…", sent="Merci, votre Snapshot a bien été transmis.", fail="L'envoi a échoué. Réessayez, ou écrivez-nous à hello@maioris.net."),
   head_lbl="Progression"),
 "en": dict(src="en/index.html", out="en/creative-operations-intelligence.html", url="https://maioris.net/en/creative-operations-intelligence", other="../fr/creative-operations-intelligence.html", otherurl="https://maioris.net/fr/creative-operations-intelligence",
   og="https://maioris.net/assets/og/en-calc.png", locale="en_GB", crumb=("insights.html", "Insights"), crumb_t="Tool",
   title="Creative Operations Intelligence: a diagnostic of your creative operations | MAIORIS",
   desc="A five step diagnostic tool to estimate what rework, approvals and friction cost your creative operations, and to identify what limits your performance. The calculation runs in your browser.",
   h1="Creative Operations Intelligence", sig="Understand your creative operations. Identify what limits your performance.",
   lead="Twenty questions, five steps, and an indicative estimate of what rework and repeated approvals cost your organisation every year, so you can see what limits your creative performance.",
   privT="What happens to your answers",
   priv=["The calculation runs in your browser. Your answers are neither sent nor saved: they stay in memory during the visit and disappear if you close the page.",
         "You can choose to send your Snapshot to MAIORIS. Only then are your answers, your name and your email address sent to us, with your explicit consent.",
         "We only measure how the tool is used, for example the number of steps reached, and never record your answers."],
   privL=("privacy.html", "Read the privacy policy"), nojs="This tool needs JavaScript to work. The calculation runs entirely in your browser.",
   cta_t="Your creative system deserves a deeper analysis.",
   cta_p="This Snapshot relies on what you declared. MAIORIS Group's Creative Audit goes further: an independent strategic diagnostic engagement that examines, from your documents and real practices, why your creative system does or does not deliver the expected results.",
   facts=[("Duration", "5 to 7 working days"), ("Debrief", "60 to 90 minutes"), ("Deliverables", "5 strategic documents")], price_l="Fee", price="800\u00a0000 FCFA",
   cta1=("Discover the Creative Audit", "advisory/creative-audit.html"), cta2=("Talk to MAIORIS", "contact.html"),
   send_t="Send my Snapshot to MAIORIS (optional)", send_p="You will receive an acknowledgement and we will reply by email. Your data is kept for 12 months; to have it deleted, write to hello@maioris.net.",
   f_name="Name", f_email="Email address", f_co="Organisation (optional)", consent="I agree that MAIORIS receives my answers and my Snapshot, keeps them for 12 months and uses them to reply to me.", submit="Send my Snapshot",
   msgs=dict(invalid="Enter your name and a valid email address.", noconsent="Tick the consent box to send your Snapshot.", sending="Sending…", sent="Thank you, your Snapshot has been sent.", fail="Sending failed. Please try again, or write to hello@maioris.net."),
   head_lbl="Progress"),
}
E=html.escape
def build(lang):
    c = CFG[lang]; src = rd("fr/faq.html" if lang == "fr" else "en/faq.html")
    head_start = src.index('<link href="../assets/favicon.svg"'); head_end = src.index('<script type="application/ld+json">')
    keep = src[head_start:head_end]; plaus = re.search(r'<script data-domain="maioris.net"[^>]*></script>', src).group(0)
    keep = re.sub(r'<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>', lambda m: m.group(0) + '<link href="/assets/tools.00000000.css" rel="stylesheet"/>', keep)
    body_start = src.index('<body data-lang'); main_start = src.index('<main id="main">'); foot_start = src.index('</main>') + len('</main>')
    foot_end = src.index('<script defer="" src="/assets/site.')
    foot = src[foot_start:src.index('</footer>') + len('</footer>')]
    site_js = re.search(r'<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>', src).group(0)
    aside = src[src.index('<aside aria-label'):src.index('</aside>') + len('</aside>')]
    pre = re.sub(r'data-page="[^"]*"', 'data-page="coi"', src[body_start:main_start], count=1)
    pre = re.sub(r'(<a class="lang"[^>]*href=")[^"]*(")', lambda m: m.group(1) + c["other"] + m.group(2), pre)
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": c["title"], "description": c["desc"], "inLanguage": lang, "url": c["url"],
           "publisher": {"@type": "Organization", "name": "MAIORIS", "logo": {"@type": "ImageObject", "url": "https://maioris.net/assets/symbol.svg"}}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "MAIORIS", "item": "https://maioris.net/%s/" % lang},
            {"@type": "ListItem", "position": 2, "name": "Insights", "item": "https://maioris.net/%s/%s" % (lang, "analyses" if lang == "fr" else "insights")},
            {"@type": "ListItem", "position": 3, "name": c["h1"], "item": c["url"]}]}]
    fr_url, en_url = (c["url"], c["otherurl"]) if lang == "fr" else (c["otherurl"], c["url"])
    head = ('<!DOCTYPE html>\n\n<html lang="%s">\n<head>\n<meta charset="utf-8"/>\n<meta content="width=device-width, initial-scale=1" name="viewport"/>\n<title>%s</title>\n<meta content="%s" name="description"/>\n'
            '<link href="%s" rel="canonical"/>\n<link href="%s" hreflang="en" rel="alternate"/><link href="%s" hreflang="fr" rel="alternate"/><link href="%s" hreflang="x-default" rel="alternate"/>\n\n'
            '<meta content="website" property="og:type"/>\n<meta content="MAIORIS" property="og:site_name"/>\n<meta content="%s" property="og:title"/>\n<meta content="%s" property="og:description"/>\n<meta content="%s" property="og:url"/>\n<meta content="%s" property="og:locale"/>\n'
            '<meta content="%s" property="og:image"/><meta content="%s" name="twitter:image"/><meta content="1200" property="og:image:width"/><meta content="630" property="og:image:height"/><meta content="%s" property="og:image:alt"/>\n'
            '<meta content="summary_large_image" name="twitter:card"/>\n<meta content="#FFFFFF" name="theme-color"/>\n') % (
            lang, E(c["title"], False), E(c["desc"]), c["url"], en_url, fr_url, fr_url, E(c["title"]), E(c["desc"]), c["url"], c["locale"], c["og"], c["og"], E(c["title"]))
    head += keep + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>\n' + plaus + '\n</head>\n'
    cb = c["crumb"]
    main = ('<main id="main">\n<section class="hero sub" data-reveal=""><div class="wrap g12"><div class="crumb"><p class="lbl"><a href="%s">%s</a> / %s</p></div><h1 class="thesis s">%s</h1><p class="lead">%s</p><p class="lbl">%s</p></div></section>\n'
            '<section class="sec"><div class="wrap">\n<noscript><p class="coi-note">%s</p></noscript>\n'
            '<div class="coi-priv" id="coi-priv"><h2>%s</h2>%s<p><a href="%s">%s</a></p></div>\n'
            '<div class="coi" id="coi" data-lang="%s" style="margin-top:34px"><div data-coi-head aria-label="%s"></div><div data-coi-body></div><div class="coi-nav" data-coi-nav></div></div><script>document.getElementById("coi").setAttribute("data-js","")</script>\n'
            '<div class="coi-result" id="coi-result" hidden></div>\n'
            '<section class="coi-cta" id="coi-cta" hidden aria-labelledby="coi-cta-t"><h3 id="coi-cta-t">%s</h3><p>%s</p><ul class="coi-facts">%s<li>%s<b class="coi-price">%s</b></li></ul>'
            '<div class="actions"><a class="btn" data-track="cta_click" data-rank="primary" data-label="coi-audit" href="%s">%s</a><a class="link" data-track="cta_click" data-rank="secondary" data-label="coi-contact" href="%s">%s</a></div>\n'
            '<h3 style="margin-top:34px;font-size:20px">%s</h3><p style="font-size:15px">%s</p>\n'
            '<form class="coi-send" id="coi-send" novalidate data-consent="tx-coi-%s-v1" data-invalid="%s" data-noconsent="%s" data-sending="%s" data-sent="%s" data-fail="%s">'
            '<label>%s<input type="text" name="name" autocomplete="name" required/></label><label>%s<input type="email" name="email" autocomplete="email" required/></label><label>%s<input type="text" name="company" autocomplete="organization"/></label>'
            '<div class="coi-trap" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"/></label></div>'
            '<label class="coi-consent"><input type="checkbox" name="consent"/><span>%s <a href="%s">%s</a>.</span></label><button class="btn" type="submit">%s</button><p class="coi-send-status" id="coi-send-status" role="status"></p></form></section>\n'
            '</div></section>\n</main>') % (
            cb[0], cb[1], c["crumb_t"], c["h1"], E(c["lead"]), E(c["sig"]), E(c["nojs"]),
            E(c["privT"]), "".join("<p>%s</p>" % E(p) for p in c["priv"]), c["privL"][0], E(c["privL"][1]),
            lang, c["head_lbl"],
            E(c["cta_t"]), E(c["cta_p"]), "".join("<li>%s%s<b>%s</b></li>" % (E(a), " : " if lang == "fr" else ": ", E(b)) for a, b in c["facts"]), E(c["price_l"]) + (" : " if lang == "fr" else ": "), E(c["price"]),
            c["cta1"][1], E(c["cta1"][0]), c["cta2"][1], E(c["cta2"][0]),
            E(c["send_t"]), E(c["send_p"]), lang, E(c["msgs"]["invalid"]), E(c["msgs"]["noconsent"]), E(c["msgs"]["sending"]), E(c["msgs"]["sent"]), E(c["msgs"]["fail"]),
            E(c["f_name"]), E(c["f_email"]), E(c["f_co"]), E(c["consent"]), c["privL"][0], E(c["privL"][1].replace("Lire la politique","Politique").replace("Read the privacy policy","Privacy policy")), E(c["submit"]))
    # le texte de consentement devient un lien vers la politique de confidentialité
    scripts = '<script defer="" src="/assets/coi.00000000.js"></script>'
    out = head + pre + main + foot + "\n" + site_js + scripts + aside + "\n</body>\n</html>\n"
    open(os.path.join(SITE, c["out"]), "w", encoding="utf8").write(out)
    print("écrit", c["out"], len(out))
if __name__ == "__main__":
    for l in ("fr", "en"): build(l)
