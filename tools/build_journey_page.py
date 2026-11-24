#!/usr/bin/env python3
"""Génère la page transversale « How engagement works » (EN : /en/how-engagement-works, FR : /fr/comment-se-deroule-une-mission),
puis relie la page depuis les pages d'offre, le pied de page et le contact (idempotent).
Aucun prix, aucun délai de réponse ni engagement contractuel n'est inventé : la page décrit le déroulement général ;
le périmètre, la durée, les livrables et les honoraires de chaque mission restent fixés par écrit.
Commande : python3 tools/build_journey_page.py puis python3 tools/build_assets.py"""
import glob, html, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build_partners_pages as P
E = P.E; SITE = P.SITE
SLUG = {"en": "how-engagement-works", "fr": "comment-se-deroule-une-mission"}
URL = {l: "https://maioris.net/%s/%s" % (l, SLUG[l]) for l in SLUG}
OG = {l: "https://maioris.net/assets/og/%s-engagement.png" % l for l in SLUG}

C = {}
C["en"] = dict(
    title="How engagement works | MAIORIS",
    desc="From the first message to the start of the mission: the five stages of a MAIORIS engagement, what to expect, what we need from you and what happens next.",
    crumb="How engagement works", kicker="Engagement journey",
    h1=("How engagement works. ", "Five stages, from first contact to activation."),
    lead="Every engagement follows the same path, whether you are a brand, a group or an agency. You know what to expect at each stage, what MAIORIS needs from you, and what happens next.",
    note="This page describes how engagements typically unfold. The scope, duration, deliverables and fees of each mission are set in writing before work starts.",
    lbl_what="What happens", lbl_exp="What you can expect", lbl_need="What we need from you", lbl_next="What happens next",
    stages=[
      ("Initial Contact", "You reach MAIORIS through the qualification form, by email, on WhatsApp, or by booking a conversation.", "A person reads every request and replies by email to propose a first conversation.", "Who you are, the situation you face and, if you already have one in mind, the offer that interests you.", "A first conversation is proposed."),
      ("Strategic Discovery", "A first conversation of about thirty minutes, without a sales presentation, to understand the decision you have to take.", "Questions about your organisation, your ambitions and what you have already tried.", "The decision maker, and the context: objectives, current organisation and recent work.", "MAIORIS assesses how it can help, and with which offer."),
      ("Strategic Recommendation", "MAIORIS recommends the offer and the scope that fit your situation, and the right entry point.", "A reasoned recommendation, not a catalogue purchase.", "Your feedback on the recommendation and, if useful, additional context or documents.", "If you wish to continue, a proposal is prepared."),
      ("Proposal and Agreement", "A written proposal sets out the scope, the deliverables, the duration and the fees. An agreement confirms the conditions.", "The roles of each party, the boundaries of the engagement and what is excluded are made explicit.", "Your validation of the proposal, and the people who sign for your organisation.", "Signature, then activation."),
      ("Engagement and Activation", "The mission starts with a kick off and a working rhythm that depends on the offer: a defined intervention, a programme with a fixed horizon, or a recurring leadership.", "Reviews and recommendations at the moments set in the agreement.", "Access to the people and materials listed in the proposal, and a decision maker available at the key moments.", "The agreed deliverables are delivered. A following step can then be discussed."),
    ],
    ag_h="Agencies follow the same path", ag_p="The agency remains the owner of its client relationship. The collaboration model (A, B or C) and its boundaries are confirmed at the recommendation and agreement stages.", ag_a="See MAIORIS Partners", ag_href="partners.html",
    br_a="See MAIORIS Direct", br_href="brands-groups.html",
    fin_t="Start with a strategic consultation.", fin_p="A first conversation of about thirty minutes, without a sales presentation.", fin_a="Request a Strategic Consultation", fin_b="Book a 30 minute conversation",
    contact="contact.html", bk="https://cal.com/maioris",
)
C["fr"] = dict(
    title="Comment se déroule une mission | MAIORIS",
    desc="Du premier message au démarrage de la mission : les cinq étapes d'un engagement MAIORIS, ce que vous pouvez attendre, ce dont nous avons besoin et la suite.",
    crumb="Comment se déroule une mission", kicker="Parcours d'engagement",
    h1=("Comment se déroule une mission. ", "Cinq étapes, du premier contact à l'activation."),
    lead="Tout engagement suit le même chemin, que vous soyez une marque, un groupe ou une agence. Vous savez ce que vous pouvez attendre à chaque étape, ce dont MAIORIS a besoin et ce qui se passe ensuite.",
    note="Cette page décrit le déroulement habituel d'un engagement. Le périmètre, la durée, les livrables et les honoraires de chaque mission sont fixés par écrit avant tout démarrage.",
    lbl_what="Ce qui se passe", lbl_exp="Ce que vous pouvez attendre", lbl_need="Ce dont nous avons besoin", lbl_next="Et ensuite",
    stages=[
      ("Premier contact", "Vous joignez MAIORIS par le formulaire de qualification, par e-mail, sur WhatsApp ou en réservant un échange.", "Une personne lit chaque demande et répond par e-mail pour proposer un premier échange.", "Qui vous êtes, la situation à laquelle vous faites face et, si vous en avez une en tête, l'offre qui vous intéresse.", "Un premier échange vous est proposé."),
      ("Découverte stratégique", "Un premier échange d'une trentaine de minutes, sans présentation commerciale, pour comprendre la décision que vous avez à prendre.", "Des questions sur votre organisation, vos ambitions et ce que vous avez déjà essayé.", "Le décideur, et le contexte : objectifs, organisation actuelle et travaux récents.", "MAIORIS évalue comment il peut vous aider, et avec quelle offre."),
      ("Recommandation stratégique", "MAIORIS recommande l'offre et le périmètre adaptés à votre situation, ainsi que le bon point d'entrée.", "Une recommandation argumentée, pas un achat sur catalogue.", "Votre avis sur la recommandation et, si utile, des éléments de contexte ou des documents complémentaires.", "Si vous souhaitez poursuivre, une proposition est préparée."),
      ("Proposition et accord", "Une proposition écrite détaille le périmètre, les livrables, la durée et les honoraires. Un accord confirme les conditions.", "Les rôles de chacun, les limites de l'engagement et ce qui est exclu sont rendus explicites.", "Votre validation de la proposition, et les personnes qui signent pour votre organisation.", "Signature, puis activation."),
      ("Engagement et activation", "La mission démarre par un lancement et un rythme de travail qui dépend de l'offre : une intervention définie, un programme à horizon fixe ou un leadership récurrent.", "Des points d'étape et des recommandations aux moments prévus par l'accord.", "L'accès aux personnes et aux éléments listés dans la proposition, et un décideur disponible aux moments clés.", "Les livrables convenus sont remis. Une suite peut ensuite être discutée."),
    ],
    ag_h="Les agences suivent le même chemin", ag_p="L'agence reste propriétaire de sa relation client. Le modèle de collaboration (A, B ou C) et ses limites sont confirmés aux étapes de recommandation et d'accord.", ag_a="Voir MAIORIS Partners", ag_href="partenaires.html",
    br_a="Voir MAIORIS Direct", br_href="marques-et-groupes.html",
    fin_t="Commencez par une consultation stratégique.", fin_p="Un premier échange d'une trentaine de minutes, sans présentation commerciale.", fin_a="Demander une consultation stratégique", fin_b="Réserver une conversation de 30 minutes",
    contact="contact.html", bk="https://cal.com/maioris",
)

def build(lang):
    c = C[lang]; url = URL[lang]; other = URL["en" if lang == "fr" else "fr"]
    src = P.rd("fr/faq.html" if lang == "fr" else "en/faq.html")
    keep = src[src.index('<link href="../assets/favicon.svg"'):src.index('<script type="application/ld+json">')]
    keep = re.sub(r'<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>', lambda m: '<link as="font" crossorigin="" href="/assets/fonts/poppins-700-latin.woff2" rel="preload" type="font/woff2"/><link as="font" crossorigin="" href="/assets/fonts/poppins-400-latin.woff2" rel="preload" type="font/woff2"/>' + m.group(0) + '<link href="/assets/partners.00000000.css" rel="stylesheet"/>', keep)
    plaus = re.search(r'<script data-domain="maioris.net"[^>]*></script>', src).group(0)
    body_start = src.index('<body data-lang'); foot_start = src.index('</main>') + len('</main>'); main_start = src.index('<main id="main">')
    foot = src[foot_start:src.index('</footer>') + len('</footer>')]
    site_js = re.search(r'<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>', src).group(0)
    aside = src[src.index('<aside aria-label'):src.index('</aside>') + len('</aside>')]
    pre = re.sub(r'data-page="[^"]*"', 'data-page="journey"', src[body_start:main_start], count=1)
    pre = re.sub(r'(<a class="lang"[^>]*href=")[^"]*(")', lambda m: m.group(1) + "../%s/%s.html" % ("en" if lang == "fr" else "fr", SLUG["en" if lang == "fr" else "fr"]) + m.group(2), pre)
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": c["title"], "description": c["desc"], "inLanguage": lang, "url": url,
           "publisher": {"@type": "Organization", "name": "MAIORIS", "logo": {"@type": "ImageObject", "url": "https://maioris.net/assets/symbol.svg"}}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "MAIORIS", "item": "https://maioris.net/%s/" % lang},
              {"@type": "ListItem", "position": 2, "name": c["crumb"], "item": url}]}]
    fr_url, en_url = (url, other) if lang == "fr" else (other, url)
    head = ('<!DOCTYPE html>\n\n<html lang="%s">\n<head>\n<meta charset="utf-8"/>\n<meta content="width=device-width, initial-scale=1" name="viewport"/>\n<title>%s</title>\n<meta content="%s" name="description"/>\n'
            '<link href="%s" rel="canonical"/>\n<link href="%s" hreflang="en" rel="alternate"/><link href="%s" hreflang="fr" rel="alternate"/><link href="%s" hreflang="x-default" rel="alternate"/>\n\n'
            '<meta content="website" property="og:type"/>\n<meta content="MAIORIS" property="og:site_name"/>\n<meta content="%s" property="og:title"/>\n<meta content="%s" property="og:description"/>\n<meta content="%s" property="og:url"/>\n<meta content="%s" property="og:locale"/>\n'
            '<meta content="%s" property="og:image"/><meta content="%s" name="twitter:image"/><meta content="1200" property="og:image:width"/><meta content="630" property="og:image:height"/><meta content="%s" property="og:image:alt"/>\n'
            '<meta content="summary_large_image" name="twitter:card"/>\n<meta content="#FFFFFF" name="theme-color"/>\n') % (
            lang, E(c["title"], False), E(c["desc"]), url, en_url, fr_url, fr_url, E(c["title"]), E(c["desc"]), url, P.LOCALE[lang], OG[lang], OG[lang], E(c["title"]))
    head += keep + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>\n' + plaus + '\n</head>\n'
    hero = ('<section class="pt-hero" data-reveal=""><div class="wrap"><div><p class="lbl"><a href="index.html">MAIORIS</a> / %s</p><p class="lbl pt-mono" style="margin-bottom:26px">%s</p>'
            '<h1 class="pt-h1">%s<span>%s</span></h1><p class="pt-lead">%s</p></div><div class="pt-branch"><b>%s</b><p style="margin:0">%s</p></div></div></section>') % (
            E(c["crumb"]), E(c["kicker"]), E(c["h1"][0]), E(c["h1"][1]), E(c["lead"]), E({"en": "Good to know", "fr": "À savoir"}[lang]), E(c["note"]))
    def stage(i, s):
        n, what, exp, need, nxt = s
        cols = "".join('<div><h4>%s</h4><p>%s</p></div>' % (E(l), E(v)) for l, v in ((c["lbl_what"], what), (c["lbl_exp"], exp), (c["lbl_need"], need), (c["lbl_next"], nxt)))
        return '<li class="pj-stage"><div class="pj-head"><p class="pj-n" aria-hidden="true">%02d</p><h3>%s</h3></div><div class="pj-cols">%s</div></li>' % (i + 1, E(n), cols)
    stages = '<section class="pt-sec" data-reveal="" aria-labelledby="pj-t"><div class="wrap"><h2 class="pt-h2" id="pj-t" style="margin-bottom:34px">%s</h2><ol class="pj-list">%s</ol></div></section>' % (
        E({"en": "The five stages", "fr": "Les cinq étapes"}[lang]), "".join(stage(i, s) for i, s in enumerate(c["stages"])))
    agency = ('<section class="pt-sec alt" data-reveal="" aria-labelledby="pj-a"><div class="wrap"><div class="pt-head"><p class="pt-k"><span>%s</span></p><div><h2 class="pt-h2" id="pj-a">%s</h2><p class="pt-intro">%s</p></div></div>'
              '<div class="pt-cta"><a class="btn" data-track="cta_click" data-rank="secondary" data-label="journey-partners" href="%s">%s</a><a class="link" data-track="cta_click" data-rank="secondary" data-label="journey-direct" href="%s">%s</a></div></div></section>') % (
              E({"en": "Agencies", "fr": "Agences"}[lang]), E(c["ag_h"]), E(c["ag_p"]), c["ag_href"], E(c["ag_a"]), c["br_href"], E(c["br_a"]))
    final = ('<section class="pt-sec" data-reveal=""><div class="wrap"><p class="pt-quote" style="margin-top:0;border-top:0;padding-top:0">%s</p><p class="pt-lead" style="margin-top:18px">%s</p><div class="pt-cta"><a class="btn" data-track="cta_click" data-rank="primary" data-label="journey-final" href="%s">%s</a>'
             '<a class="link" data-track="cta_click" data-rank="direct" data-label="booking" href="%s" rel="noopener" target="_blank">%s</a></div></div></section>') % (E(c["fin_t"]), E(c["fin_p"]), c["contact"], E(c["fin_a"]), c["bk"], E(c["fin_b"]))
    main = '<main class="pt" id="main">\n' + hero + "\n" + stages + "\n" + agency + "\n" + final + "\n</main>"
    out = head + pre + main + foot + "\n" + site_js + aside + "\n</body>\n</html>\n"
    open(os.path.join(SITE, "%s/%s.html" % (lang, SLUG[lang])), "w", encoding="utf8").write(out)
    print("écrit %s/%s.html" % (lang, SLUG[lang]), len(out))

# ---- pied de page : lien vers la page, sur toutes les pages publiques (idempotent)
def footer_sync():
    n = 0
    for fp in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(fp, SITE).replace(os.sep, "/")
        if not (rel.startswith("fr/") or rel.startswith("en/")) or "/admin/" in rel: continue
        lang = rel[:2]; slug = SLUG[lang] + ".html"
        t = open(fp, encoding="utf8").read()
        if ('href="%s%s"' % ("../" * (rel.count("/") - 1), slug)) in t.split("<footer")[-1]: continue
        pref = "../" * (rel.count("/") - 1)
        m = re.search(r'<li><a href="[^"]*faq\.html">[^<]*</a></li>', t.split("<footer")[-1])
        if not m: continue
        label = {"en": "How engagement works", "fr": "Comment se déroule une mission"}[lang]
        t = t.replace(m.group(0), m.group(0) + '<li><a href="%s%s">%s</a></li>' % (pref, slug, label), 1)
        open(fp, "w", encoding="utf8").write(t); n += 1
    print("pied de page : %d pages" % n)

if __name__ == "__main__":
    for l in ("en", "fr"): build(l)
    footer_sync()
