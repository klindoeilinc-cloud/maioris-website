#!/usr/bin/env python3
"""Génère la page MAIORIS Direct pour les marques et groupes (EN : /en/brands-groups, FR : /fr/marques-et-groupes).
Parcours acheteur de la branche Direct, en miroir de la page Partners. Tarifs lus dans tools/offers.json ; aucune offre ni prix inventé :
les repères de prix sont ceux déjà publiés sur la page Niveaux d'accompagnement.
Commande : python3 tools/build_brands_page.py puis python3 tools/build_assets.py"""
import html, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build_partners_pages as P
E = P.E; SITE = P.SITE; money = P.money; OFFERS = P.OFFERS
SLUG = {"en": "brands-groups", "fr": "marques-et-groupes"}
URL = {l: "https://maioris.net/%s/%s" % (l, SLUG[l]) for l in SLUG}
OG = {l: "https://maioris.net/assets/og/%s-brands-groups.png" % l for l in SLUG}
A = OFFERS["brands"]["creative_audit"]

def offer(link, name, purpose, model):
    return dict(link=link, name=name, purpose=purpose, model=model)

C = {}
C["en"] = dict(
    title="Creative leadership for brands and groups | MAIORIS",
    desc="MAIORIS Direct: independent strategic and creative leadership for brands and groups. Creative Audit at 750,000 FCFA in 7 to 10 working days.",
    crumb="Brands and groups", kicker="MAIORIS Direct · Creative Leadership as a Service",
    h1=("Independent creative leadership ", "for brands and groups."),
    lead="MAIORIS provides independent strategic and creative leadership to organisations that want stronger brand intelligence, creative governance, operational efficiency and business performance. We direct the creative system. We do not produce the work.",
    cta1="Request a Strategic Consultation", cta2="Explore the offers",
    branch_t="Two branches, one method", branch=[("MAIORIS Direct", True, "For brands, companies and groups. Creative Leadership as a Service."), ("MAIORIS Partners", False, "For independent agencies and consulting firms. Strategic Advisory for Independent Agencies.")],
    branch_link=("partners.html", "Looking for the agency catalogue?"),
    who_k="01 / 05", who_h="Who we work with, and why they call us", who_i="Leadership teams that treat creativity as a strategic capability and need it to be directed, governed and measured.",
    who_t="Decision makers", who=["CEOs and managing directors", "CMOs and marketing directors", "COOs", "Brand and communication directors", "Corporate leadership teams"],
    prob_t="Situations we are brought in for", prob=["Several agencies without unified direction.", "An inconsistent brand identity across channels.", "Briefs that generate repeated revisions.", "No creative governance framework.", "Creative decisions taken without a senior owner."],
    off_k="02 / 05", off_h="Nine offers in four families", off_i="Each offer has its own purpose. Fees are shown only where they are published; every other engagement is quoted after a strategic conversation.",
    fam=[
      ("A", "Strategic Diagnostics", [
        offer("advisory/creative-audit.html", "Creative Audit", "Evaluate the maturity, effectiveness and governance of an organisation's creative function.", "%s · 7 to 10 working days" % money(A["price"], "en")),
        offer("advisory/mcps-diagnostic.html", "MCPS Diagnostic", "Diagnose the systemic performance constraints of the wider organisation.", "On strategic quote")],
        "The Creative Audit diagnoses the creative function. The MCPS Diagnostic diagnoses the performance of the organisation as a system. They are not interchangeable."),
      ("B", "Strategic Architecture", [
        offer("advisory/brand-intelligence.html", "Brand Intelligence", "Develop the strategic understanding and architecture of a brand.", "Defined project, on strategic quote"),
        offer("advisory/growth-architecture.html", "Growth Architecture", "Structure growth opportunities, business priorities and scalable growth systems.", "Defined project, on strategic quote"),
        offer("advisory/levels.html", "Campaign Architect", "Design the strategic and creative architecture of high value campaigns.", "Pricing indication from %s" % money(OFFERS["brands"]["campaign_architect"]["price_from"], "en"))],
        "Three distinct interventions: the brand, the growth of the business, the campaign. Their scopes are not merged."),
      ("C", "Creative Systems and Transformation", [
        offer("advisory/creative-operating-system.html", "Creative Operating System", "Design and establish the operating architecture of a creative organisation.", "Defined project, on strategic quote"),
        offer("advisory/transformation-90.html", "Transformation 90", "Lead a structured, time bound 90 day transformation.", "90 days, on strategic quote")],
        "The Creative Operating System is a specialised design of how the creative function runs. Transformation 90 is a time bound programme that may include it. The same deliverables are never sold twice."),
      ("D", "Creative Leadership", [
        offer("advisory/levels.html", "Creative Direction", "Senior strategic creative direction for defined initiatives, campaigns or projects.", "Pricing indication from %s" % money(OFFERS["brands"]["creative_direction"]["price_from"], "en")),
        offer("advisory/claas.html", "Creative Leadership as a Service", "An external senior creative leadership capability, on a recurring basis.", "Monthly retainer, on strategic quote")],
        "Creative Direction is a mission with a defined scope and no automatic production responsibility. Creative Leadership as a Service is a recurring leadership engagement, not Creative Direction billed monthly."),
    ],
    more="See the offer", fam_k="Family",
    mod_k="03 / 05", mod_h="Three engagement models", mod_i="The model follows the question: a defined mission, a time bound transformation, or a continuing leadership capability.",
    mod=[("Project", "A defined mission with a stated scope: diagnostics, architecture or a creative operating system.", "Creative Audit, MCPS Diagnostic, Brand Intelligence, Growth Architecture, Campaign Architect, Creative Operating System, Creative Direction"),
         ("Transformation", "A time bound programme with a fixed horizon that diagnoses, designs and installs priority changes with your teams.", "Transformation 90"),
         ("Recurring leadership", "A continuing external senior leadership, with a monthly rhythm and a minimum period set at scoping.", "Creative Leadership as a Service")],
    mod_for="Offers",
    jr_k="04 / 05", jr_h="How an engagement starts", jr_i="No catalogue purchase without a conversation. We start by understanding the decision to be taken.",
    jr=[("A strategic consultation", "A first conversation of about thirty minutes, without a sales presentation."), ("The right entry point", "Most organisations start with a diagnostic, because it shows what to change first."), ("A scoped proposal", "Scope, duration and fees are confirmed in writing before any work starts.")],
    jr_link=("how-engagement-works.html", "How engagement works →"), ag_k="05 / 05", ag_h="Are you an agency?", ag_i="Agencies have their own catalogue, with its own offers, fees and boundaries. MAIORIS strengthens agencies and never competes with their production.", ag_a="See MAIORIS Partners",
    fin_t="Let's discuss the decision in front of you.", fin_p="A first conversation of about thirty minutes, without a sales presentation.", fin_a="Request a Strategic Consultation", fin_b="Book a 30 minute conversation",
    contact="contact.html", bk="https://cal.com/maioris",
)
C["fr"] = dict(
    title="Leadership créatif pour marques et groupes | MAIORIS",
    desc="MAIORIS Direct : leadership stratégique et créatif indépendant pour marques et groupes. Creative Audit à 750 000 FCFA en 7 à 10 jours ouvrés.",
    crumb="Marques et groupes", kicker="MAIORIS Direct · Creative Leadership as a Service",
    h1=("Un leadership créatif indépendant ", "pour les marques et les groupes."),
    lead="MAIORIS apporte un leadership stratégique et créatif indépendant aux organisations qui veulent renforcer leur intelligence de marque, leur gouvernance créative, leur efficacité opérationnelle et leur performance. Nous dirigeons le système créatif. Nous ne produisons pas le travail.",
    cta1="Demander une consultation stratégique", cta2="Découvrir les offres",
    branch_t="Deux branches, une méthode", branch=[("MAIORIS Direct", True, "Pour les marques, entreprises et groupes. Creative Leadership as a Service."), ("MAIORIS Partners", False, "Pour les agences indépendantes et cabinets de conseil. Conseil stratégique pour agences indépendantes.")],
    branch_link=("partenaires.html", "Vous cherchez le catalogue agences ?"),
    who_k="01 / 05", who_h="Qui nous accompagnons, et pourquoi on nous appelle", who_i="Des directions qui considèrent la création comme une capacité stratégique et ont besoin qu'elle soit dirigée, gouvernée et mesurée.",
    who_t="Décideurs", who=["Directions générales et dirigeants", "Directions marketing", "Directions des opérations", "Directions de marque et de communication", "Comités de direction"],
    prob_t="Les situations pour lesquelles on nous sollicite", prob=["Plusieurs agences sans direction unifiée.", "Une identité de marque incohérente d'un canal à l'autre.", "Des briefs qui provoquent des révisions à répétition.", "Aucun cadre de gouvernance créative.", "Des décisions créatives prises sans responsable senior."],
    off_k="02 / 05", off_h="Neuf offres en quatre familles", off_i="Chaque offre a sa propre finalité. Les tarifs ne sont affichés que lorsqu'ils sont publiés ; toute autre mission est chiffrée après une conversation stratégique.",
    fam=[
      ("A", "Diagnostics stratégiques", [
        offer("accompagnement/creative-audit.html", "Creative Audit", "Évaluer la maturité, l'efficacité et la gouvernance de la fonction créative d'une organisation.", "%s · 7 à 10 jours ouvrés" % money(A["price"], "fr")),
        offer("accompagnement/diagnostic-mcps.html", "MCPS Diagnostic", "Diagnostiquer les contraintes systémiques de performance de l'organisation au sens large.", "Sur devis stratégique")],
        "Le Creative Audit diagnostique la fonction créative. Le MCPS Diagnostic diagnostique la performance de l'organisation comme système. Ils ne sont pas interchangeables."),
      ("B", "Architecture stratégique", [
        offer("accompagnement/brand-intelligence.html", "Brand Intelligence", "Développer la compréhension et l'architecture stratégiques d'une marque.", "Projet défini, sur devis stratégique"),
        offer("accompagnement/growth-architecture.html", "Growth Architecture", "Structurer les opportunités de croissance, les priorités et les systèmes de croissance évolutifs.", "Projet défini, sur devis stratégique"),
        offer("accompagnement/niveaux-d-accompagnement.html", "Campaign Architect", "Concevoir l'architecture stratégique et créative de campagnes à forte valeur.", "Indication tarifaire à partir de %s" % money(OFFERS["brands"]["campaign_architect"]["price_from"], "fr"))],
        "Trois interventions distinctes : la marque, la croissance de l'activité, la campagne. Leurs périmètres ne sont pas fusionnés."),
      ("C", "Systèmes créatifs et transformation", [
        offer("accompagnement/creative-operating-system.html", "Creative Operating System", "Concevoir et installer l'architecture opérationnelle d'une organisation créative.", "Projet défini, sur devis stratégique"),
        offer("accompagnement/transformation-90.html", "Transformation 90", "Conduire une transformation structurée de 90 jours.", "90 jours, sur devis stratégique")],
        "Le Creative Operating System est la conception spécialisée du fonctionnement de la fonction créative. Transformation 90 est un programme borné dans le temps qui peut l'intégrer. Les mêmes livrables ne sont jamais vendus deux fois."),
      ("D", "Leadership créatif", [
        offer("accompagnement/niveaux-d-accompagnement.html", "Creative Direction", "Direction créative stratégique senior pour des initiatives, campagnes ou projets définis.", "Indication tarifaire à partir de %s" % money(OFFERS["brands"]["creative_direction"]["price_from"], "fr")),
        offer("accompagnement/claas.html", "Creative Leadership as a Service", "Une capacité externe de leadership créatif senior, de façon récurrente.", "Forfait mensuel, sur devis stratégique")],
        "Creative Direction est une mission au périmètre défini, sans responsabilité de production automatique. Creative Leadership as a Service est un engagement de leadership récurrent, pas une Creative Direction facturée au mois."),
    ],
    more="Voir l'offre", fam_k="Famille",
    mod_k="03 / 05", mod_h="Trois modèles d'engagement", mod_i="Le modèle suit la question : une mission définie, une transformation bornée dans le temps, ou une capacité de leadership continue.",
    mod=[("Projet", "Une mission définie, au périmètre annoncé : diagnostics, architecture ou système opérationnel créatif.", "Creative Audit, MCPS Diagnostic, Brand Intelligence, Growth Architecture, Campaign Architect, Creative Operating System, Creative Direction"),
         ("Transformation", "Un programme à horizon fixe qui diagnostique, conçoit et installe les changements prioritaires avec vos équipes.", "Transformation 90"),
         ("Leadership récurrent", "Un leadership externe senior continu, à rythme mensuel, avec une période minimale fixée au cadrage.", "Creative Leadership as a Service")],
    mod_for="Offres",
    jr_k="04 / 05", jr_h="Comment une mission commence", jr_i="Pas d'achat sur catalogue sans conversation. Nous commençons par comprendre la décision à prendre.",
    jr=[("Une consultation stratégique", "Un premier échange d'une trentaine de minutes, sans présentation commerciale."), ("Le bon point d'entrée", "La plupart des organisations commencent par un diagnostic, car il montre ce qu'il faut changer en premier."), ("Une proposition cadrée", "Périmètre, durée et tarifs sont confirmés par écrit avant tout démarrage.")],
    jr_link=("comment-se-deroule-une-mission.html", "Comment se déroule une mission →"), ag_k="05 / 05", ag_h="Vous êtes une agence ?", ag_i="Les agences ont leur propre catalogue, avec ses offres, ses tarifs et ses limites. MAIORIS renforce les agences et ne concurrence jamais leur production.", ag_a="Voir MAIORIS Partners",
    fin_t="Parlons de la décision qui est devant vous.", fin_p="Un premier échange d'une trentaine de minutes, sans présentation commerciale.", fin_a="Demander une consultation stratégique", fin_b="Réserver une conversation de 30 minutes",
    contact="contact.html", bk="https://cal.com/maioris",
)

def build(lang):
    c = C[lang]; url = URL[lang]; other = URL["en" if lang == "fr" else "fr"]
    src = P.rd("fr/faq.html" if lang == "fr" else "en/faq.html")
    keep = src[src.index('<link href="../assets/favicon.svg"'):src.index('<script type="application/ld+json">')]
    keep = re.sub(r'<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>', lambda m: m.group(0) + '<link href="/assets/partners.00000000.css" rel="stylesheet"/>', keep)
    plaus = re.search(r'<script data-domain="maioris.net"[^>]*></script>', src).group(0)
    body_start = src.index('<body data-lang'); foot_start = src.index('</main>') + len('</main>')
    main_start = src.index('<main id="main">')
    foot = src[foot_start:src.index('</footer>') + len('</footer>')]
    site_js = re.search(r'<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>', src).group(0)
    aside = src[src.index('<aside aria-label'):src.index('</aside>') + len('</aside>')]
    pre = re.sub(r'data-page="[^"]*"', 'data-page="brands"', src[body_start:main_start], count=1)
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

    def sec_head(k, h, i, sid): return '<div class="pt-head"><p class="pt-k"><span>%s</span></p><div><h2 class="pt-h2" id="%s">%s</h2><p class="pt-intro">%s</p></div></div>' % (E(k), sid, E(h), E(i))
    bp = c["branch_link"]
    hero = ('<section class="pt-hero" data-reveal=""><div class="wrap"><div><p class="lbl"><a href="index.html">MAIORIS</a> / %s</p><p class="lbl pt-mono" style="margin-bottom:26px">%s</p>'
            '<h1 class="pt-h1">%s<span>%s</span></h1><p class="pt-lead">%s</p><div class="pt-cta"><a class="btn" data-track="cta_click" data-rank="primary" data-label="brands-consult" href="%s">%s</a><a class="link" data-track="cta_click" data-rank="secondary" data-label="brands-offers" href="#offers">%s</a></div></div>'
            '<div class="pt-branch"><b>%s</b><dl>%s</dl><p style="margin:16px 0 0"><a href="%s">%s</a></p></div></div></section>') % (
            E(c["crumb"]), E(c["kicker"]), E(c["h1"][0]), E(c["h1"][1]), E(c["lead"]), c["contact"], E(c["cta1"]), E(c["cta2"]), E(c["branch_t"]),
            "".join('<div><dt%s>%s</dt><dd>%s</dd></div>' % (' class="on"' if on else "", E(n), E(d)) for n, on, d in c["branch"]), bp[0], E(bp[1]))
    who = ('<section class="pt-sec" data-reveal="" aria-labelledby="who-t"><div class="wrap">' + sec_head(c["who_k"], c["who_h"], c["who_i"], "who-t") +
           '<div class="pt-two"><div><h3>%s</h3><ul class="pt-list">%s</ul></div><div><h3>%s</h3><ul class="pt-list">%s</ul></div></div></div></section>') % (
           E(c["who_t"]), "".join("<li>%s</li>" % E(x) for x in c["who"]), E(c["prob_t"]), "".join("<li>%s</li>" % E(x) for x in c["prob"]))
    def fam(f):
        k, name, offers, diff = f
        rows = "".join('<li class="pb-row"><div><h4>%s</h4><p>%s</p></div><p class="pb-model">%s</p><a class="link" href="%s">%s →</a></li>' % (E(o["name"]), E(o["purpose"]), E(o["model"]), o["link"], E(c["more"])) for o in offers)
        return '<div class="pb-fam"><p class="pt-num">%s %s</p><h3>%s</h3><ul class="pb-list">%s</ul><p class="pt-fine pb-diff">%s</p></div>' % (E(c["fam_k"]), k, E(name), rows, E(diff))
    offers = '<section class="pt-sec alt" id="offers" data-reveal="" aria-labelledby="off-t"><div class="wrap">' + sec_head(c["off_k"], c["off_h"], c["off_i"], "off-t") + "".join(fam(f) for f in c["fam"]) + '</div></section>'
    models = ('<section class="pt-sec" data-reveal="" aria-labelledby="mod-t"><div class="wrap">' + sec_head(c["mod_k"], c["mod_h"], c["mod_i"], "mod-t") +
              '<div class="pt-models">%s</div></div></section>') % "".join('<div class="pt-model"><p class="pt-letter" aria-hidden="true">%d</p><h3>%s</h3><p>%s</p><p class="pt-who">%s : %s</p></div>' % (i + 1, E(n), E(d), E(c["mod_for"]), E(w)) for i, (n, d, w) in enumerate(c["mod"]))
    journey = ('<section class="pt-sec alt" data-reveal="" aria-labelledby="jr-t"><div class="wrap">' + sec_head(c["jr_k"], c["jr_h"], c["jr_i"], "jr-t") +
               '<ol class="pb-steps">%s</ol><p class="pt-mcps"><a href="%s">%s</a></p></div></section>') % ("".join('<li><p class="pt-num">%02d</p><h3>%s</h3><p>%s</p></li>' % (i + 1, E(a), E(b)) for i, (a, b) in enumerate(c["jr"])), c["jr_link"][0], E(c["jr_link"][1]))
    agency = ('<section class="pt-sec" data-reveal="" aria-labelledby="ag-t"><div class="wrap">' + sec_head(c["ag_k"], c["ag_h"], c["ag_i"], "ag-t") +
              '<p><a class="btn" data-track="cta_click" data-rank="secondary" data-label="brands-to-partners" href="%s">%s</a></p></div></section>') % (bp[0], E(c["ag_a"]))
    final = ('<section class="pt-sec alt" data-reveal=""><div class="wrap"><p class="pt-quote" style="margin-top:0;border-top:0;padding-top:0">%s</p><p class="pt-lead" style="margin-top:18px">%s</p><div class="pt-cta"><a class="btn" data-track="cta_click" data-rank="primary" data-label="brands-final" href="%s">%s</a>'
             '<a class="link" data-track="cta_click" data-rank="direct" data-label="booking" href="%s" rel="noopener" target="_blank">%s</a></div></div></section>') % (E(c["fin_t"]), E(c["fin_p"]), c["contact"], E(c["fin_a"]), c["bk"], E(c["fin_b"]))
    main = '<main class="pt" id="main">\n' + hero + "\n" + who + "\n" + offers + "\n" + models + "\n" + journey + "\n" + agency + "\n" + final + "\n</main>"
    out = head + pre + main + foot + "\n" + site_js + aside + "\n</body>\n</html>\n"
    open(os.path.join(SITE, "%s/%s.html" % (lang, SLUG[lang])), "w", encoding="utf8").write(out)
    print("écrit %s/%s.html" % (lang, SLUG[lang]), len(out))

if __name__ == "__main__":
    for l in ("en", "fr"): build(l)
