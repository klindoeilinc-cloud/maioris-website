#!/usr/bin/env python3
"""Génère la page MAIORIS PARTNERS (EN : /en/partners, FR : /fr/partenaires) à partir du gabarit du site,
puis ajoute le lien « Partners » à la navigation et au pied de page de toutes les pages publiques (idempotent).
Commande : python3 tools/build_partners_pages.py puis python3 tools/build_assets.py"""
import glob, html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
E = html.escape
def rd(p): return open(os.path.join(SITE, p), encoding="utf8").read()
NB = " "

SLUG = {"en": "partners", "fr": "partenaires"}
URL = {l: "https://maioris.net/%s/%s" % (l, SLUG[l]) for l in SLUG}
OG = {"en": "https://maioris.net/assets/og/en-maioris-partners.png", "fr": "https://maioris.net/assets/og/fr-maioris-partners.png"}
LOCALE = {"en": "en_GB", "fr": "fr_FR"}

# Prix : source unique de vérité (tests/partners-page.test.js vérifie la page contre ces valeurs)
OFFERS = json.load(open(os.path.join(HERE, "offers.json"), encoding="utf8"))
PRICES = {"audit": OFFERS["partners"]["audit"]["price"], "cos": OFFERS["partners"]["cos"]["price"], "fractional": OFFERS["partners"]["fractional"]["price_per_month"], "ai": OFFERS["partners"]["ai"]["price"]}
DIRECT = OFFERS["brands"]["creative_audit"]
BUNDLE = {"price": OFFERS["bundle"]["price"], "separate": OFFERS["bundle"]["separate"], "saving": OFFERS["bundle"]["separate"] - OFFERS["bundle"]["price"]}
assert PRICES["audit"] + PRICES["cos"] == BUNDLE["separate"] and BUNDLE["separate"] - BUNDLE["price"] == BUNDLE["saving"]

def money(n, lang):
    s = "{:,}".format(n).replace(",", NB if lang == "fr" else ",")
    return s + NB + "FCFA"

C = {}
C["en"] = dict(
    title="MAIORIS Partners: Strategic Advisory for Independent Agencies | MAIORIS",
    desc="Agency strategic advisory by MAIORIS: Agency Creative Audit, Creative Operating System, Fractional Creative Leadership and AI Creative Transformation for independent agencies and consulting firms. Fixed fees in FCFA.",
    crumb="Partners", kicker="MAIORIS Partners · Strategic Advisory for Independent Agencies",
    h1=("We don't compete with agencies. ", "We strengthen their strategic capacity."),
    lead="MAIORIS Partners helps independent agencies and consulting firms strengthen their organisation, their strategic intelligence, their creative governance and their operational performance. We are a complementary strategic partner, not a production competitor.",
    cta1="Discuss a Partnership", cta2="Explore Our Services",
    branch_t="Two branches, one method",
    branch=[("MAIORIS Direct", False, "For brands, companies and groups. Creative Leadership as a Service."), ("MAIORIS Partners", True, "For independent agencies and consulting firms. Strategic Advisory for Independent Agencies.")],
    eco_k="01 / 09", eco_h="One firm, two ways to work with it", eco_i="MAIORIS Group serves two kinds of clients through two branches. They share one identity and one methodology, and they address different needs.",
    eco=[("MAIORIS Direct", False, "Creative Leadership as a Service", "For brands, companies and groups.", "We direct the creative system of the organisation itself: strategy, governance, operations and performance.", "advisory/claas.html", "Discover MAIORIS Direct"),
         ("MAIORIS Partners", True, "Strategic Advisory for Independent Agencies", "For agencies, studios and consulting firms.", "We strengthen the strategic capacity of the agency: its positioning, its operating model, its decisions and its use of AI.", "#offers", "See the four offers")],
    mcps="Both branches rely on the same methodology, MCPS, the MAIORIS Creative Performance System. MAIORIS Partners is a commercial branch of MAIORIS Group, not a separate legal entity.",
    who_k="02 / 09", who_h="Who we work with, and why they call us",
    who_i="Independent creative agencies, branding studios, communication, digital and advertising agencies, and brand consulting firms. Typically teams of 2 to 30 people.",
    who_t="Agencies and firms", who=["Independent creative agencies", "Branding studios", "Communication agencies", "Digital agencies", "Advertising agencies", "Brand consulting firms", "Creative studios of 2 to 30 people"],
    mk="Priority markets: France, Côte d'Ivoire, Senegal, Canada and French speaking Africa.",
    prob_t="Situations we are brought in for", prob=["A strategy that lives in the founder's head rather than in the organisation.", "Briefs, validations and handovers that follow no shared framework, and rework as a consequence.", "Growth that moves faster than the structure meant to carry it.", "AI tools adopted one by one, without governance or quality control.", "Founder decisions taken without a senior sounding board outside the agency."],
    off_k="03 / 09", off_h="Four offers, each with a defined scope", off_i="Each offer has a fixed reference fee in FCFA, a stated duration and named deliverables. Prices are fixed reference fees, excluding any applicable taxes.",
    scope_note="A summary, not the full scope. The detailed scope is set out in the proposal.",
    d_label="Deliverables", l_problem="The problem", l_buyer="Who it is for", l_excl="Not included", inc_label="Included", out_label="Expected outcome", dur="Duration", pos="Positioning", eng="Initial commitment", fee="Reference fee",
    offers=[
      dict(key="audit", n="Offer 01", name="Agency Creative Audit", pos="Strategic Diagnostic", problem="The agency senses that its organisation limits its growth, but cannot say where.", buyer="Agency founders and managing directors.", excl="Implementation of the recommendations, production work, and any review of your own clients' brands.", dur="10 to 15 working days", price_sub="Fixed reference fee", rate="Agency scope. The Creative Audit for brands is a separate engagement: " + money(DIRECT["price"], "en") + ", 7 to 10 working days.",
           desc="An in depth diagnostic for agencies that want to understand the limits of their creative organisation, their commercial model and their operating processes.",
           lab="Deliverables", items=["A written diagnostic and a score out of 100", "Prioritised recommendations", "A 90 day roadmap"],
           out="A clear view of dysfunctions, improvement opportunities and strategic priorities.", cta="Request an Agency Audit", note=None),
      dict(key="cos", n="Offer 02", name="Creative Operating System", pos="Creative Operations Transformation", problem="Results depend on individuals: briefs, approvals and roles change from one project to the next.", buyer="Founders, managing directors, strategy and operations leads.", excl="Software or tool development, day to day project management, and production.", dur="4 to 6 weeks", price_sub="Fixed reference fee", rate="Agency rate. For brands and groups, the scope and investment are set on request.",
           desc="Design of an operating system that lets the agency better organise, govern and steer its creative activity.",
           lab="Deliverables", items=["An operating model for the agency", "Governance rules and clear roles", "Tools to steer performance"],
           out="A more structured, consistent and measurable creative organisation.", cta="Build Your Creative Operating System", note=None),
      dict(key="fractional", n="Offer 03", name="Fractional Creative Leadership", pos="External Strategic Creative Leadership", problem="The founder takes strategic decisions alone, without a senior sounding board.", buyer="Agency founders and leaders.", excl="Daily art direction, hierarchical management and creative production.", dur="Initial commitment of 3 months", price_sub="Billed monthly", rate="Agency rate. The offer for brands and groups is priced separately.",
           desc="Recurring strategic support for agency founders and leaders who want senior expertise without hiring a full time strategy director.",
           lab="Included", items=["Two strategic sessions per month", "A monthly review with recommendations", "Decision support between sessions"],
           out="Better capacity for decision, direction and strategic steering.", cta="Explore Strategic Partnership",
           note="This service is not a daily art direction service, hierarchical management or creative production."),
      dict(key="ai", n="Offer 04", name="AI Creative Transformation", pos="AI & Creative Infrastructure", problem="AI tools are adopted one by one, with no rules, no owner and no quality control.", buyer="Founders, creative and strategy directors.", excl="Tool licences, bespoke software and AI content production.", dur="3 to 5 weeks", price_sub="Fixed reference fee", rate="",
           desc="Support for agencies that want to bring artificial intelligence into their creative organisation in a structured, controlled and effective way.",
           lab="Deliverables", items=["A reading of your AI maturity", "Governance and quality rules for AI use", "An adoption roadmap"],
           out="Moving from occasional use of AI tools to a structured creative infrastructure.", cta="Transform Your Creative Infrastructure", note=None),
    ],
    pr_k="04 / 09", pr_h="Pricing at a glance", pr_i="All amounts are fixed reference fees in FCFA, excluding any applicable taxes. Only the Fractional offer is billed monthly.",
    tbl_cap="Reference fees by offer", th=("Offer", "Duration", "Reference fee"),
    rows=[("Agency Creative Audit", "10 to 15 working days", "audit", ""), ("Creative Operating System", "4 to 6 weeks", "cos", ""), ("Fractional Creative Leadership", "Initial commitment of 3 months", "fractional", " per month"), ("AI Creative Transformation", "3 to 5 weeks", "ai", "")],
    paths_t="Three ways to start",
    paths=[dict(n="Path 01", name="Diagnose & Decide", price=money(PRICES["audit"], "en"), unit="", items=["Agency Creative Audit"], p="Understand where the agency stands before deciding what to change."),
           dict(n="Path 02", name="Restructure & Optimize", price=money(BUNDLE["price"], "en"), unit="", items=["Agency Creative Audit", "Creative Operating System"], p="Separate prices: %s. You save %s." % (money(BUNDLE["separate"], "en"), money(BUNDLE["saving"], "en"))),
           dict(n="Path 03", name="Strategic Partner", price=money(PRICES["fractional"], "en"), unit=" per month", items=["Fractional Creative Leadership"], p="Initial commitment of three months.")],
    fine="No other discount applies. Fixed fees stay fixed fees: they are not monthly amounts.",
    mod_k="06 / 09", mod_h="How we work with agencies", mod_i="Three collaboration models, depending on who the client is and where the strategic work sits. The scope of MAIORIS is always defined by contract.",
    mod=[("A", "Agency Advisory", "MAIORIS supports the founder or the leadership of the agency directly.", "The agency is MAIORIS's contractual client."),
         ("B", "Strategic Co-consulting", "MAIORIS works alongside an agency on a strategic mission for the agency's own client. The agency keeps the main commercial relationship, unless agreed otherwise.", "MAIORIS acts within its contractually defined strategic scope."),
         ("C", "Direct Corporate Engagement", "MAIORIS supports an advertiser directly. A partner agency can take on creation and production needs.", "The advertiser is MAIORIS's contractual client.")],
    mod_foot="Read our principles for working with agencies", mod_link="advisory/agencies-and-partners.html",
    wdw_k="08 / 09", wdw_h="What we do, and what we don't", wdw_i="MAIORIS is not a production agency. This page says it plainly so that the scope of every engagement stays clear.",
    do_t="What we do", do=["Creative Intelligence", "Strategic Advisory", "Creative Leadership", "Creative Governance", "Creative Operations", "AI Creative Transformation", "Performance Architecture"],
    dont_t="What we don't do", dont=["Graphic Design Production", "Motion Design Production", "Video Production", "Social Media Management", "Media Buying", "Daily Content Production", "Website Development"],
    quote=("MAIORIS does not replace your creative team. ", "We strengthen the system behind its performance."),
    con_k="09 / 09", con_h="Tell us about your agency", con_i="Eleven short questions in four steps. They help us prepare a useful first conversation. A person reads every request.",
    steps=["Agency", "Needs", "Problem", "Contact"],
    f=dict(l1="Your agency", agency="Agency name", site="Website", site_h="Optional. For example agency.com", country="Country", team="Team size", role="Your role", l2="What you need", need="Main need", offer="The offer that interests you", l3="The problem you face",
           ctx="Describe the problem you are facing", ctx_h="A few sentences are enough, 35 characters minimum. What is happening, since when, and what have you tried?", l4="How can we reach you?", first="First name", last="Last name", email="Work email",
           consent="I agree that MAIORIS uses this information to answer my request, as described in the", priv="privacy policy", back="← Back", cont="Continue", send="Send my request", select="Select"),
    o_country=[("france", "France"), ("ci", "Côte d'Ivoire"), ("senegal", "Senegal"), ("canada", "Canada"), ("fr-africa", "Other French speaking African country"), ("other", "Other country")],
    o_team=[("1", "1 person"), ("2-5", "2 to 5 people"), ("6-10", "6 to 10 people"), ("11-20", "11 to 20 people"), ("21-30", "21 to 30 people"), ("30+", "More than 30 people")],
    o_role=[("founder", "Founder"), ("md", "Managing director"), ("strategy", "Strategy director"), ("creative", "Creative director"), ("other", "Other")],
    o_need=[("diagnostic", "Understand what holds the agency back"), ("structure", "Structure operations and creative governance"), ("leadership", "Senior strategic counsel for the founder"), ("ai", "Integrate AI in a structured way"), ("other", "Another need")],
    o_offer=[("audit", "Agency Creative Audit"), ("cos", "Creative Operating System"), ("fractional", "Fractional Creative Leadership"), ("ai", "AI Creative Transformation"), ("undecided", "Not decided yet, I would like advice")],
    done_l="Request received", done_h="Thank you. Your request is on our desk.", done_p="We will reply by email to propose a first conversation.", done_a="In the meantime, discover our method →", done_href="intelligence-system.html",
    alt_p="Prefer to talk first?", alt_a="Book a Strategic Conversation", priv_href="privacy.html",
    svc_type="Agency strategic advisory", aud="Independent agencies and consulting firms",
)
C["fr"] = dict(
    title="MAIORIS Partners : conseil stratégique pour agences indépendantes | MAIORIS",
    desc="Le conseil stratégique de MAIORIS pour les agences : Agency Creative Audit, Creative Operating System, Fractional Creative Leadership et AI Creative Transformation, pour agences indépendantes et cabinets de conseil. Tarifs forfaitaires en FCFA.",
    crumb="Partners", kicker="MAIORIS Partners · Conseil stratégique pour agences indépendantes",
    h1=("Nous ne concurrençons pas les agences. ", "Nous renforçons leur capacité stratégique."),
    lead="MAIORIS Partners aide les agences indépendantes et les cabinets de conseil à renforcer leur organisation, leur intelligence stratégique, leur gouvernance créative et leur performance opérationnelle. Nous sommes un partenaire stratégique complémentaire, pas un concurrent de production.",
    cta1="Discuter d'un partenariat", cta2="Découvrir nos services",
    branch_t="Deux branches, une méthode",
    branch=[("MAIORIS Direct", False, "Pour les marques, entreprises et groupes. Creative Leadership as a Service."), ("MAIORIS Partners", True, "Pour les agences indépendantes et cabinets de conseil. Conseil stratégique pour agences indépendantes.")],
    eco_k="01 / 09", eco_h="Un cabinet, deux façons de travailler avec lui", eco_i="MAIORIS Group sert deux types de clients à travers deux branches. Elles partagent une même identité et une même méthodologie, et répondent à des besoins différents.",
    eco=[("MAIORIS Direct", False, "Creative Leadership as a Service", "Pour les marques, entreprises et groupes.", "Nous dirigeons le système créatif de l'organisation elle-même : stratégie, gouvernance, opérations et performance.", "accompagnement/claas.html", "Découvrir MAIORIS Direct"),
         ("MAIORIS Partners", True, "Conseil stratégique pour agences indépendantes", "Pour les agences, studios et cabinets de conseil.", "Nous renforçons la capacité stratégique de l'agence : son positionnement, son modèle opérationnel, ses décisions et son usage de l'IA.", "#offers", "Voir les quatre offres")],
    mcps="Les deux branches reposent sur la même méthodologie, MCPS, le MAIORIS Creative Performance System. MAIORIS Partners est une branche commerciale de MAIORIS Group, et non une entité juridique distincte.",
    who_k="02 / 09", who_h="Qui nous accompagnons, et pourquoi on nous appelle",
    who_i="Agences créatives indépendantes, studios de branding, agences de communication, digitales et de publicité, cabinets de conseil en marque. Le plus souvent des équipes de 2 à 30 personnes.",
    who_t="Agences et cabinets", who=["Agences créatives indépendantes", "Studios de branding", "Agences de communication", "Agences digitales", "Agences de publicité", "Cabinets de conseil en marque", "Studios créatifs de 2 à 30 personnes"],
    mk="Marchés prioritaires : France, Côte d'Ivoire, Sénégal, Canada et Afrique francophone.",
    prob_t="Les situations pour lesquelles on nous sollicite", prob=["Une stratégie qui vit dans la tête du fondateur plutôt que dans l'organisation.", "Des briefs, des validations et des passages de relais sans cadre commun, et des reprises qui en découlent.", "Une croissance plus rapide que la structure censée la porter.", "Des outils d'IA adoptés un par un, sans gouvernance ni contrôle qualité.", "Des décisions de dirigeant prises sans interlocuteur senior extérieur à l'agence."],
    off_k="03 / 09", off_h="Quatre offres, chacune à périmètre défini", off_i="Chaque offre a un tarif forfaitaire de référence en FCFA, une durée annoncée et des livrables nommés. Les prix sont des tarifs forfaitaires de référence, hors taxes éventuellement applicables.",
    scope_note="Un aperçu, pas le périmètre complet. Le périmètre détaillé est remis dans la proposition.",
    d_label="Livrables", l_problem="Le problème", l_buyer="Pour qui", l_excl="Hors périmètre", inc_label="Inclus", out_label="Résultat attendu", dur="Durée", pos="Positionnement", eng="Engagement initial", fee="Tarif de référence",
    offers=[
      dict(key="audit", n="Offre 01", name="Agency Creative Audit", pos="Diagnostic stratégique", problem="L'agence sent que son organisation freine sa croissance, sans pouvoir dire où.", buyer="Fondateurs et directions générales d'agences.", excl="La mise en œuvre des recommandations, la production, et toute revue des marques de vos propres clients.", dur="10 à 15 jours ouvrés", price_sub="Tarif forfaitaire de référence", rate="Périmètre agence. Le Creative Audit pour les marques est une mission distincte : " + money(DIRECT["price"], "fr") + ", 7 à 10 jours ouvrés.",
           desc="Un diagnostic approfondi destiné aux agences qui souhaitent comprendre les limites de leur organisation créative, leur modèle commercial et leurs processus opérationnels.",
           lab="Livrables", items=["Un diagnostic écrit et une note sur 100", "Des recommandations hiérarchisées", "Une feuille de route à 90 jours"],
           out="Une vision claire des dysfonctionnements, des opportunités d'amélioration et des priorités stratégiques.", cta="Demander un Agency Audit", note=None),
      dict(key="cos", n="Offre 02", name="Creative Operating System", pos="Transformation des opérations créatives", problem="Les résultats dépendent des personnes : briefs, validations et rôles changent d'un projet à l'autre.", buyer="Fondateurs, directions générales, responsables stratégie et opérations.", excl="Le développement d'outils ou de logiciels, la gestion de projet au quotidien et la production.", dur="4 à 6 semaines", price_sub="Tarif forfaitaire de référence", rate="Tarif agence. Pour les marques et groupes, le périmètre et l'investissement sont définis sur demande.",
           desc="Conception d'un système opérationnel permettant à l'agence de mieux organiser, gouverner et piloter ses activités créatives.",
           lab="Livrables", items=["Un modèle opérationnel pour l'agence", "Des règles de gouvernance et des rôles clairs", "Des outils de pilotage de la performance"],
           out="Une organisation créative plus structurée, cohérente et mesurable.", cta="Construire votre Creative Operating System", note=None),
      dict(key="fractional", n="Offre 03", name="Fractional Creative Leadership", pos="Direction créative stratégique externe", problem="Le dirigeant tranche seul les décisions stratégiques, sans interlocuteur senior.", buyer="Fondateurs et dirigeants d'agences.", excl="La direction artistique quotidienne, le management hiérarchique et la production créative.", dur="Engagement initial de 3 mois", price_sub="Facturation mensuelle", rate="Tarif agence. L'offre pour les marques et groupes est tarifée séparément.",
           desc="Un accompagnement stratégique récurrent destiné aux fondateurs et dirigeants d'agences qui souhaitent bénéficier d'une expertise senior sans recruter un directeur stratégique à temps plein.",
           lab="Inclus", items=["Deux sessions stratégiques par mois", "Un bilan mensuel assorti de recommandations", "Un appui à la décision entre les sessions"],
           out="Une meilleure capacité de décision, d'orientation et de pilotage stratégique.", cta="Explorer un partenariat stratégique",
           note="Ce service ne constitue pas une prestation de direction artistique quotidienne, de management hiérarchique ou de production créative."),
      dict(key="ai", n="Offre 04", name="AI Creative Transformation", pos="IA et infrastructure créative", problem="Les outils d'IA sont adoptés un par un, sans règle, sans responsable ni contrôle qualité.", buyer="Fondateurs, directions créatives et stratégie.", excl="Les licences d'outils, les logiciels sur mesure et la production de contenus par IA.", dur="3 à 5 semaines", price_sub="Tarif forfaitaire de référence", rate="",
           desc="Accompagnement des agences souhaitant intégrer l'intelligence artificielle dans leur organisation créative de manière structurée, maîtrisée et performante.",
           lab="Livrables", items=["Une lecture de votre maturité en IA", "Des règles de gouvernance et de qualité pour l'usage de l'IA", "Une feuille de route d'adoption"],
           out="Passer d'une utilisation ponctuelle des outils d'IA à une infrastructure créative structurée.", cta="Transformer votre infrastructure créative", note=None),
    ],
    pr_k="04 / 09", pr_h="Les tarifs en un coup d'œil", pr_i="Tous les montants sont des tarifs forfaitaires de référence en FCFA, hors taxes éventuellement applicables. Seule l'offre Fractional est facturée au mois.",
    tbl_cap="Tarifs de référence par offre", th=("Offre", "Durée", "Tarif de référence"),
    rows=[("Agency Creative Audit", "10 à 15 jours ouvrés", "audit", ""), ("Creative Operating System", "4 à 6 semaines", "cos", ""), ("Fractional Creative Leadership", "Engagement initial de 3 mois", "fractional", " par mois"), ("AI Creative Transformation", "3 à 5 semaines", "ai", "")],
    paths_t="Trois façons de commencer",
    paths=[dict(n="Parcours 01", name="Diagnose & Decide", price=money(PRICES["audit"], "fr"), unit="", items=["Agency Creative Audit"], p="Comprendre où en est l'agence avant de décider ce qu'il faut changer."),
           dict(n="Parcours 02", name="Restructure & Optimize", price=money(BUNDLE["price"], "fr"), unit="", items=["Agency Creative Audit", "Creative Operating System"], p="Prix séparés : %s. Économie : %s." % (money(BUNDLE["separate"], "fr"), money(BUNDLE["saving"], "fr"))),
           dict(n="Parcours 03", name="Strategic Partner", price=money(PRICES["fractional"], "fr"), unit=" par mois", items=["Fractional Creative Leadership"], p="Engagement initial de trois mois.")],
    fine="Aucune autre remise ne s'applique. Un tarif forfaitaire reste un forfait : ce n'est pas un montant mensuel.",
    mod_k="06 / 09", mod_h="Comment nous travaillons avec les agences", mod_i="Trois modèles de collaboration, selon la nature du client et l'endroit où se situe le travail stratégique. Le périmètre de MAIORIS est toujours défini par contrat.",
    mod=[("A", "Agency Advisory", "MAIORIS accompagne directement le fondateur ou la direction de l'agence.", "L'agence est le client contractuel de MAIORIS."),
         ("B", "Strategic Co-consulting", "MAIORIS intervient aux côtés d'une agence sur une mission stratégique auprès de son client. L'agence conserve la relation commerciale principale, sauf accord différent.", "MAIORIS intervient sur son périmètre stratégique contractuellement défini."),
         ("C", "Direct Corporate Engagement", "MAIORIS accompagne directement un annonceur. Une agence partenaire peut intervenir sur les besoins de création et de production.", "L'annonceur est le client contractuel de MAIORIS.")],
    mod_foot="Lire nos principes de travail avec les agences", mod_link="accompagnement/agences-et-partenaires.html",
    wdw_k="08 / 09", wdw_h="Ce que nous faisons, et ce que nous ne faisons pas", wdw_i="MAIORIS n'est pas une agence de production. Cette page le dit sans détour pour que le périmètre de chaque mission reste clair.",
    do_t="Ce que nous faisons", do=["Creative Intelligence", "Strategic Advisory", "Creative Leadership", "Creative Governance", "Creative Operations", "AI Creative Transformation", "Performance Architecture"],
    dont_t="Ce que nous ne faisons pas", dont=["Production de design graphique", "Production de motion design", "Production vidéo", "Gestion des réseaux sociaux", "Achat média", "Production quotidienne de contenu", "Développement de sites web"],
    quote=("MAIORIS ne remplace pas votre équipe créative. ", "Nous renforçons le système qui porte sa performance."),
    con_k="09 / 09", con_h="Parlez-nous de votre agence", con_i="Onze questions courtes en quatre étapes. Elles nous aident à préparer un premier échange utile. Une personne lit chaque demande.",
    steps=["Agence", "Besoins", "Problème", "Contact"],
    f=dict(l1="Votre agence", agency="Nom de l'agence", site="Site web", site_h="Facultatif. Par exemple agence.com", country="Pays", team="Taille de l'équipe", role="Votre fonction", l2="Votre besoin", need="Besoin principal", offer="L'offre qui vous intéresse", l3="Le problème rencontré",
           ctx="Décrivez le problème que vous rencontrez", ctx_h="Quelques phrases suffisent, 35 caractères minimum. Que se passe-t-il, depuis quand, et qu'avez-vous déjà essayé ?", l4="Comment vous joindre ?", first="Prénom", last="Nom", email="E-mail professionnel",
           consent="J'accepte que MAIORIS utilise ces informations pour répondre à ma demande, comme décrit dans la", priv="politique de confidentialité", back="← Retour", cont="Continuer", send="Envoyer ma demande", select="Sélectionner"),
    o_country=[("france", "France"), ("ci", "Côte d'Ivoire"), ("senegal", "Sénégal"), ("canada", "Canada"), ("fr-africa", "Autre pays d'Afrique francophone"), ("other", "Autre pays")],
    o_team=[("1", "1 personne"), ("2-5", "2 à 5 personnes"), ("6-10", "6 à 10 personnes"), ("11-20", "11 à 20 personnes"), ("21-30", "21 à 30 personnes"), ("30+", "Plus de 30 personnes")],
    o_role=[("founder", "Fondateur ou fondatrice"), ("md", "Direction générale"), ("strategy", "Direction stratégie"), ("creative", "Direction créative"), ("other", "Autre")],
    o_need=[("diagnostic", "Comprendre ce qui freine l'agence"), ("structure", "Structurer les opérations et la gouvernance créative"), ("leadership", "Un conseil stratégique senior pour le dirigeant"), ("ai", "Intégrer l'IA de façon structurée"), ("other", "Autre besoin")],
    o_offer=[("audit", "Agency Creative Audit"), ("cos", "Creative Operating System"), ("fractional", "Fractional Creative Leadership"), ("ai", "AI Creative Transformation"), ("undecided", "Pas encore décidé, je souhaite un conseil")],
    done_l="Demande reçue", done_h="Merci. Votre demande est sur notre bureau.", done_p="Nous vous répondrons par e-mail pour proposer un premier échange.", done_a="En attendant, découvrez notre méthode →", done_href="systeme-intelligence.html",
    alt_p="Vous préférez d'abord échanger ?", alt_a="Réserver une conversation stratégique", priv_href="confidentialite.html",
    svc_type="Conseil stratégique pour agences", aud="Agences indépendantes et cabinets de conseil",
)

def _fm(n, lang): return money(n, lang)
A, P = OFFERS["brands"]["creative_audit"], OFFERS["partners"]
EXTRA = {
 "en": dict(
  cmp_k="05 / 09", cmp_h="MAIORIS Direct and MAIORIS Partners", cmp_i="Two catalogues, never interchangeable. The agency catalogue is priced and scoped for agencies; the brands catalogue is described on the advisory pages.",
  cmp_cols=("", "MAIORIS Direct, brands and groups", "MAIORIS Partners, agencies"),
  cmp_rows=[("Who it serves", "Brands, companies and groups", "Independent agencies and consulting firms"),
            ("Diagnostic", "Creative Audit: %s, 7 to 10 working days" % _fm(A["price"], "en"), "Agency Creative Audit: %s, 10 to 15 working days" % _fm(P["audit"]["price"], "en")),
            ("Operating system", "Creative Operating System: scope and investment on request", "Creative Operating System: %s, 4 to 6 weeks" % _fm(P["cos"]["price"], "en")),
            ("AI", "Included in Transformation 90: 90 days, on request", "AI Creative Transformation: %s, 3 to 5 weeks" % _fm(P["ai"]["price"], "en")),
            ("Recurring leadership", "Creative Leadership as a Service: monthly retainer, from %s per month as an indication" % _fm(OFFERS["brands"]["claas_indication"]["price_from_per_month"], "en"), "Fractional Creative Leadership: %s per month, initial commitment of 3 months" % _fm(P["fractional"]["price_per_month"], "en")),
            ("Client relationship", "MAIORIS advises the organisation directly", "The agency keeps its client relationship")],
  cmp_link="advisory/index.html", cmp_link_t="See the MAIORIS Direct advisory offers",
  bnd_k="07 / 09", bnd_h="Who does what", bnd_i="MAIORIS strengthens the agency. It does not take its place, its clients or its production.",
  bnd_give_t="MAIORIS provides", bnd_give=["Strategic intelligence", "Creative leadership", "Campaign architecture", "Creative governance", "Operating systems", "AI transformation advisory"],
  bnd_keep_t="The agency keeps", bnd_keep=["Its client relationship", "Commercial ownership of its accounts", "Production and execution responsibilities", "Its creative production teams", "Final production delivery"],
  bnd_wl="MAIORIS does not become a production agency and does not compete with its agency partners. White label collaboration is possible only when explicitly agreed and defined by contract."),
 "fr": dict(
  cmp_k="05 / 09", cmp_h="MAIORIS Direct et MAIORIS Partners", cmp_i="Deux catalogues, jamais interchangeables. Le catalogue agences est tarifé et délimité pour les agences ; celui des marques est décrit sur les pages d'accompagnement.",
  cmp_cols=("", "MAIORIS Direct, marques et groupes", "MAIORIS Partners, agences"),
  cmp_rows=[("Qui nous accompagnons", "Marques, entreprises et groupes", "Agences indépendantes et cabinets de conseil"),
            ("Diagnostic", "Creative Audit : %s, 7 à 10 jours ouvrés" % _fm(A["price"], "fr"), "Agency Creative Audit : %s, 10 à 15 jours ouvrés" % _fm(P["audit"]["price"], "fr")),
            ("Système opérationnel", "Creative Operating System : périmètre et investissement sur demande", "Creative Operating System : %s, 4 à 6 semaines" % _fm(P["cos"]["price"], "fr")),
            ("IA", "Intégrée à Transformation 90 : 90 jours, sur demande", "AI Creative Transformation : %s, 3 à 5 semaines" % _fm(P["ai"]["price"], "fr")),
            ("Leadership récurrent", "Creative Leadership as a Service : forfait mensuel, à partir de %s par mois à titre indicatif" % _fm(OFFERS["brands"]["claas_indication"]["price_from_per_month"], "fr"), "Fractional Creative Leadership : %s par mois, engagement initial de 3 mois" % _fm(P["fractional"]["price_per_month"], "fr")),
            ("Relation client", "MAIORIS conseille directement l'organisation", "L'agence conserve sa relation client")],
  cmp_link="accompagnement/index.html", cmp_link_t="Voir les offres d'accompagnement MAIORIS Direct",
  bnd_k="07 / 09", bnd_h="Qui fait quoi", bnd_i="MAIORIS renforce l'agence. Il ne prend ni sa place, ni ses clients, ni sa production.",
  bnd_give_t="MAIORIS apporte", bnd_give=["L'intelligence stratégique", "Le leadership créatif", "L'architecture de campagne", "La gouvernance créative", "Les systèmes opérationnels", "Le conseil en transformation par l'IA"],
  bnd_keep_t="L'agence conserve", bnd_keep=["Sa relation client", "La propriété commerciale de ses comptes", "Les responsabilités de production et d'exécution", "Ses équipes de production créative", "La livraison finale de la production"],
  bnd_wl="MAIORIS ne devient pas une agence de production et ne concurrence pas ses agences partenaires. La collaboration en marque blanche n'est possible que si elle est expressément convenue et définie par contrat."),
}
for _l in EXTRA: C[_l].update(EXTRA[_l])

def opts(lst, sel): return '<option value="">%s</option>' % E(sel) + "".join('<option value="%s">%s</option>' % (v, E(l)) for v, l in lst)
def radios(name, lst):
    return '<div class="choices">' + "".join('<label class="choice"><input name="%s" type="radio" value="%s"%s/><span>%s</span></label>' % (name, v, ' required=""' if i == 0 else "", E(l)) for i, (v, l) in enumerate(lst)) + "</div>"

LOGO_PATHS = ('<path class="pn" d="M385 213L670 379V1359L385 1524Z"></path><path class="pn" d="M750 424L1024 581L995 606V1131L1024 1156L750 1313Z"></path>'
              '<path class="pn" d="M1332 424L1059 581L1087 606V1131L1059 1156L1332 1313Z"></path><path class="pn" d="M1697 213L1412 379V1359L1697 1524Z"></path>')

def build(lang):
    c = C[lang]; f = c["f"]; url = URL[lang]; other = URL["en" if lang == "fr" else "fr"]
    src = rd("fr/faq.html" if lang == "fr" else "en/faq.html")
    keep = src[src.index('<link href="../assets/favicon.svg"'):src.index('<script type="application/ld+json">')]
    keep = re.sub(r'<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>', lambda m: m.group(0) + '<link href="/assets/partners.00000000.css" rel="stylesheet"/>', keep)
    plaus = re.search(r'<script data-domain="maioris.net"[^>]*></script>', src).group(0)
    body_start = src.index('<body data-lang'); main_start = src.index('<main id="main">'); foot_start = src.index('</main>') + len('</main>')
    foot = src[foot_start:src.index('</footer>') + len('</footer>')]
    site_js = re.search(r'<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>', src).group(0)
    aside = src[src.index('<aside aria-label'):src.index('</aside>') + len('</aside>')]
    pre = re.sub(r'data-page="[^"]*"', 'data-page="partners"', src[body_start:main_start], count=1)
    pre = re.sub(r'(<a class="lang"[^>]*href=")[^"]*(")', lambda m: m.group(1) + "../%s/%s.html" % ("en" if lang == "fr" else "fr", SLUG["en" if lang == "fr" else "fr"]) + m.group(2), pre)

    pre = pre.replace('<li><a href="%s.html">Partners</a></li>' % SLUG[lang], '<li><a aria-current="page" href="%s.html">Partners</a></li>' % SLUG[lang])

    services = []
    for o in c["offers"]:
        price = {"@type": "UnitPriceSpecification", "price": str(PRICES[o["key"]]), "priceCurrency": "XOF", "unitCode": "MON"} if o["key"] == "fractional" else None
        offer = {"@type": "Offer", "price": str(PRICES[o["key"]]), "priceCurrency": "XOF", "url": url + "#offers", **({"priceSpecification": price} if price else {})}
        services.append({"@type": "Service", "name": o["name"], "serviceType": o["pos"], "description": o["desc"], "inLanguage": lang,
                         "provider": {"@type": "Organization", "name": "MAIORIS Group", "url": "https://maioris.net"},
                         "audience": {"@type": "Audience", "audienceType": c["aud"]}, "offers": offer})
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": c["title"], "description": c["desc"], "inLanguage": lang, "url": url,
           "publisher": {"@type": "Organization", "name": "MAIORIS", "logo": {"@type": "ImageObject", "url": "https://maioris.net/assets/symbol.svg"}}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "MAIORIS", "item": "https://maioris.net/%s/" % lang},
              {"@type": "ListItem", "position": 2, "name": c["crumb"], "item": url}]},
          {"@context": "https://schema.org", "@type": "ItemList", "name": c["off_h"], "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": s} for i, s in enumerate(services)]}]
    fr_url, en_url = (url, other) if lang == "fr" else (other, url)
    head = ('<!DOCTYPE html>\n\n<html lang="%s">\n<head>\n<meta charset="utf-8"/>\n<meta content="width=device-width, initial-scale=1" name="viewport"/>\n<title>%s</title>\n<meta content="%s" name="description"/>\n'
            '<link href="%s" rel="canonical"/>\n<link href="%s" hreflang="en" rel="alternate"/><link href="%s" hreflang="fr" rel="alternate"/><link href="%s" hreflang="x-default" rel="alternate"/>\n\n'
            '<meta content="website" property="og:type"/>\n<meta content="MAIORIS" property="og:site_name"/>\n<meta content="%s" property="og:title"/>\n<meta content="%s" property="og:description"/>\n<meta content="%s" property="og:url"/>\n<meta content="%s" property="og:locale"/>\n'
            '<meta content="%s" property="og:image"/><meta content="%s" name="twitter:image"/><meta content="1200" property="og:image:width"/><meta content="630" property="og:image:height"/><meta content="%s" property="og:image:alt"/>\n'
            '<meta content="summary_large_image" name="twitter:card"/>\n<meta content="#FFFFFF" name="theme-color"/>\n') % (
            lang, E(c["title"], False), E(c["desc"]), url, en_url, fr_url, fr_url, E(c["title"]), E(c["desc"]), url, LOCALE[lang], OG[lang], OG[lang], E(c["title"]))
    head += keep + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>\n' + plaus + '\n</head>\n'

    def sec_head(k, h, i): return '<div class="pt-head"><p class="pt-k"><span>%s</span></p><div><h2 class="pt-h2">%s</h2><p class="pt-intro">%s</p></div></div>' % (E(k), E(h), E(i))

    hero = ('<section class="pt-hero" data-reveal=""><div class="wrap"><div><p class="lbl"><a href="%s">%s</a> / %s</p><p class="lbl pt-mono" style="margin-bottom:26px">%s</p>'
            '<h1 class="pt-h1">%s<span>%s</span></h1><p class="pt-lead">%s</p><div class="pt-cta"><a class="btn" data-track="cta_click" data-rank="primary" data-label="partners-discuss" href="#contact">%s</a><a class="link" data-track="cta_click" data-rank="secondary" data-label="partners-services" href="#offers">%s</a></div></div>'
            '<div class="pt-branch"><b>%s</b><dl>%s</dl></div></div></section>') % (
            "index.html", "MAIORIS", E(c["crumb"]), E(c["kicker"]), E(c["h1"][0]), E(c["h1"][1]), E(c["lead"]), E(c["cta1"]), E(c["cta2"]), E(c["branch_t"]),
            "".join('<div><dt%s>%s</dt><dd>%s</dd></div>' % (' class="on"' if on else "", E(n), E(d)) for n, on, d in c["branch"]))

    eco = '<section class="pt-sec" data-reveal="" aria-labelledby="eco-t"><div class="wrap">' + sec_head(c["eco_k"], c["eco_h"], c["eco_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="eco-t">') + '<div class="pt-eco">' + "".join(
        '<div%s><h3>%s</h3><p class="pt-pos">%s</p><p><b>%s</b></p><p>%s</p><p><a href="%s">%s</a></p></div>' % (' class="on"' if on else "", E(n), E(pos), E(aud), E(d), href, E(lk)) for n, on, pos, aud, d, href, lk in c["eco"]) + '</div><p class="pt-mcps">%s</p></div></section>' % E(c["mcps"])

    who = ('<section class="pt-sec alt" data-reveal="" aria-labelledby="who-t"><div class="wrap">' + sec_head(c["who_k"], c["who_h"], c["who_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="who-t">') +
           '<div class="pt-two"><div><h3>%s</h3><ul class="pt-list">%s</ul><p class="pt-markets">%s</p></div><div><h3>%s</h3><ul class="pt-list">%s</ul></div></div></div></section>') % (
           E(c["who_t"]), "".join("<li>%s</li>" % E(x) for x in c["who"]), E(c["mk"]), E(c["prob_t"]), "".join("<li>%s</li>" % E(x) for x in c["prob"]))

    def offer_html(o):
        p = money(PRICES[o["key"]], lang)
        meta = '<li><b>%s</b> : %s</li><li><b>%s</b> : %s</li>' % (E(c["dur"] if o["key"] != "fractional" else c["eng"]), E(o["dur"] if o["key"] != "fractional" else o["dur"].replace("Initial commitment of ", "").replace("Engagement initial de ", "")), E(c["pos"]), E(o["pos"]))
        return ('<li class="pt-offer" id="offer-%s"><div><p class="pt-num">%s</p><h3>%s</h3><p class="pt-pos">%s</p></div>'
                '<div><p class="pt-desc">%s</p><dl class="pt-facts"><div><dt>%s</dt><dd>%s</dd></div><div><dt>%s</dt><dd>%s</dd></div><div><dt>%s</dt><dd>%s</dd></div></dl><h4>%s</h4><ul class="pt-del">%s</ul><p class="pt-scope">%s</p><p class="pt-out"><b>%s :</b> %s</p>%s</div>'
                '<div class="pt-buy"><p class="pt-price">%s%s<small>%s</small></p>%s<ul class="pt-meta">%s</ul><a class="btn btn-sm" data-offer="%s" data-track="cta_click" data-rank="primary" data-label="partners-%s" href="#contact">%s</a></div></li>') % (
            o["key"], E(o["n"]), E(o["name"]), E(o["pos"]), E(o["desc"]), E(c["l_problem"]), E(o["problem"]), E(c["l_buyer"]), E(o["buyer"]), E(c["l_excl"]), E(o["excl"]), E(o["lab"]), "".join("<li>%s</li>" % E(x) for x in o["items"]), E(c["scope_note"]), E(c["out_label"]), E(o["out"]),
            ('<p class="pt-note">%s</p>' % E(o["note"])) if o["note"] else "", p, ("<br>" + E({"en": "per month", "fr": "par mois"}[lang])) if o["key"] == "fractional" else "", E(o["price_sub"]), ('<p class="pt-rate">%s</p>' % E(o["rate"])) if o["rate"] else "", meta, o["key"], o["key"], E(o["cta"]))
    offers = ('<section class="pt-sec" id="offers" data-reveal="" aria-labelledby="off-t"><div class="wrap">' + sec_head(c["off_k"], c["off_h"], c["off_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="off-t">') +
              '<ol class="pt-offers">%s</ol></div></section>') % "".join(offer_html(o) for o in c["offers"])

    table = '<table class="pt-table"><caption>%s</caption><thead><tr><th scope="col">%s</th><th scope="col">%s</th><th scope="col">%s</th></tr></thead><tbody>%s</tbody></table>' % (
        E(c["tbl_cap"]), E(c["th"][0]), E(c["th"][1]), E(c["th"][2]),
        "".join('<tr><th scope="row">%s</th><td data-l="%s">%s</td><td data-l="%s" class="pt-price-c">%s%s</td></tr>' % (E(n), E(c["th"][1]), E(d), E(c["th"][2]), money(PRICES[k], lang), E(u)) for n, d, k, u in c["rows"]))
    paths = '<div class="pt-paths" role="list" aria-label="%s">%s</div>' % (E(c["paths_t"]), "".join(
        '<div class="pt-path" role="listitem"><p class="pt-num">%s</p><h3>%s</h3><p class="pt-price">%s%s</p><ul>%s</ul><p style="margin-top:14px">%s</p></div>' % (
            E(p["n"]), E(p["name"]), p["price"], E(p["unit"]), "".join("<li>%s</li>" % E(i) for i in p["items"]), E(p["p"])) for p in c["paths"]))
    pricing = ('<section class="pt-sec alt" id="pricing" data-reveal="" aria-labelledby="pr-t"><div class="wrap">' + sec_head(c["pr_k"], c["pr_h"], c["pr_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="pr-t">') +
               table + '<h3 class="pt-sub" style="font-size:20px;margin:clamp(40px,5vw,64px) 0 0">%s</h3>' % E(c["paths_t"]) + paths + '<p class="pt-fine">%s</p></div></section>' % E(c["fine"]))

    cmp_t = '<table class="pt-table pt-cmp"><caption>%s</caption><thead><tr><th scope="col">%s</th><th scope="col">%s</th><th scope="col">%s</th></tr></thead><tbody>%s</tbody></table>' % (
        E(c["cmp_h"]), E({"en": "Topic", "fr": "Sujet"}[lang]), E(c["cmp_cols"][1]), E(c["cmp_cols"][2]),
        "".join('<tr><th scope="row">%s</th><td data-l="%s">%s</td><td data-l="%s">%s</td></tr>' % (E(a_), E(c["cmp_cols"][1]), E(b_), E(c["cmp_cols"][2]), E(d_)) for a_, b_, d_ in c["cmp_rows"]))
    compare = ('<section class="pt-sec" id="compare" data-reveal="" aria-labelledby="cmp-t"><div class="wrap">' + sec_head(c["cmp_k"], c["cmp_h"], c["cmp_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="cmp-t">') + cmp_t + '<p class="pt-mcps"><a href="%s">%s →</a></p></div></section>') % (c["cmp_link"], E(c["cmp_link_t"]))
    bound = ('<section class="pt-sec alt" id="boundaries" data-reveal="" aria-labelledby="bnd-t"><div class="wrap">' + sec_head(c["bnd_k"], c["bnd_h"], c["bnd_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="bnd-t">') +
             '<div class="pt-two"><div><h3>%s</h3><ul class="pt-list">%s</ul></div><div><h3>%s</h3><ul class="pt-list">%s</ul></div></div><p class="pt-fine">%s</p></div></section>') % (
        E(c["bnd_give_t"]), "".join("<li>%s</li>" % E(x) for x in c["bnd_give"]), E(c["bnd_keep_t"]), "".join("<li>%s</li>" % E(x) for x in c["bnd_keep"]), E(c["bnd_wl"]))
    models = ('<section class="pt-sec" id="models" data-reveal="" aria-labelledby="mod-t"><div class="wrap">' + sec_head(c["mod_k"], c["mod_h"], c["mod_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="mod-t">') +
              '<div class="pt-models">%s</div><p class="pt-mcps"><a href="%s">%s →</a></p></div></section>') % (
        "".join('<div class="pt-model"><p class="pt-letter" aria-hidden="true">%s</p><h3>%s</h3><p>%s</p><p class="pt-who">%s</p></div>' % (L_, E(n), E(d), E(w)) for L_, n, d, w in c["mod"]), c["mod_link"], E(c["mod_foot"]))

    scope = ('<section class="pt-sec alt" data-reveal="" aria-labelledby="wdw-t"><div class="wrap">' + sec_head(c["wdw_k"], c["wdw_h"], c["wdw_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="wdw-t">') +
             '<div class="pt-wdw"><div class="yes"><h3>%s</h3><ul>%s</ul></div><div class="no"><h3>%s</h3><ul>%s</ul></div></div><p class="pt-quote">%s<span>%s</span></p></div></section>') % (
        E(c["do_t"]), "".join("<li>%s</li>" % E(x) for x in c["do"]), E(c["dont_t"]), "".join("<li>%s</li>" % E(x) for x in c["dont"]), E(c["quote"][0]), E(c["quote"][1]))

    form = ('<section class="pt-sec pt-contact" id="contact" data-reveal="" aria-labelledby="con-t"><div class="wrap form-wrap">' + sec_head(c["con_k"], c["con_h"], c["con_i"]).replace('<h2 class="pt-h2">', '<h2 class="pt-h2" id="con-t">') + '\n'
            '<form class="qualify" data-endpoint="/api/partners" id="qualify" novalidate="">\n<ol aria-label="%s" class="steps">%s</ol>\n'
            '<fieldset data-step="1"><legend>%s</legend>\n'
            '<div class="f"><label for="agency">%s</label><input autocomplete="organization" id="agency" name="agency" required=""/></div>\n'
            '<div class="f"><label for="agency_site">%s</label><p class="hint" id="site-hint">%s</p><input aria-describedby="site-hint" autocomplete="url" id="agency_site" inputmode="url" name="agency_site" placeholder="agency.com"/></div>\n'
            '<div class="pt-row2"><div class="f"><label for="country">%s</label><select id="country" name="country" required="">%s</select></div><div class="f"><label for="team">%s</label><select id="team" name="team" required="">%s</select></div></div>\n'
            '<div class="f"><label for="role">%s</label><select id="role" name="role" required="">%s</select></div></fieldset>\n'
            '<fieldset data-step="2" hidden=""><legend>%s</legend><p class="hint" id="need-h">%s</p>%s<p class="hint" style="margin-top:8px" id="offer-h">%s</p>%s</fieldset>\n'
            '<fieldset data-step="3" hidden=""><legend>%s</legend><div class="f"><label for="context">%s</label><p class="hint" id="context-hint">%s</p><textarea aria-describedby="context-hint context-count" data-minwords="35" id="context" name="context" required="" rows="6"></textarea>'
            '<p aria-live="polite" class="hint wc" id="context-count" data-unit="%s">0 / 35 %s</p></div></fieldset>\n'
            '<fieldset data-step="4" hidden=""><legend>%s</legend>\n<div class="pt-row2"><div class="f"><label for="firstname">%s</label><input autocomplete="given-name" id="firstname" name="firstname" required=""/></div><div class="f"><label for="lastname">%s</label><input autocomplete="family-name" id="lastname" name="lastname" required=""/></div></div>\n'
            '<div class="f"><label for="email">%s</label><input autocomplete="email" id="email" name="email" required="" type="email"/></div>\n'
            '<div aria-hidden="true" class="hp"><label for="website">Website</label><input autocomplete="off" id="website" name="website" tabindex="-1"/></div>\n'
            '<label class="consent"><input name="consent" required="" type="checkbox"/><span>%s <a href="%s">%s</a>.</span></label></fieldset>\n'
            '<p class="err" hidden="" role="alert"></p>\n<div class="form-nav"><button class="link" data-prev="" hidden="" type="button">%s</button><button class="btn" data-next="" type="button">%s</button><button class="btn" hidden="" type="submit">%s</button></div>\n'
            '<input name="lang" type="hidden" value="%s"/>\n</form>\n'
            '<div class="done" hidden="" id="done" tabindex="-1"><div aria-hidden="true" class="done-sym"><svg viewbox="385 213 1312 1311">%s</svg></div><p class="lbl">%s</p><p class="h2">%s</p><p>%s</p><p><a href="%s">%s</a></p></div>\n'
            '<p class="pt-alt">%s <a data-track="cta_click" data-rank="secondary" data-label="partners-booking" href="https://cal.com/maioris" rel="noopener" target="_blank">%s →</a></p></div></section>') % (
        E({"en": "Form steps", "fr": "Étapes du formulaire"}[lang]), "".join("<li%s>%s</li>" % (' class="on"' if i == 0 else "", E(s)) for i, s in enumerate(c["steps"])),
        E(f["l1"]), E(f["agency"]), E(f["site"]), E(f["site_h"]), E(f["country"]), opts(c["o_country"], f["select"]), E(f["team"]), opts(c["o_team"], f["select"]), E(f["role"]), opts(c["o_role"], f["select"]),
        E(f["l2"]), E(f["need"]), radios("need", c["o_need"]), E(f["offer"]), radios("offer", c["o_offer"]),
        E(f["l3"]), E(f["ctx"]), E(f["ctx_h"]), {"en": "characters", "fr": "caractères"}[lang], {"en": "characters", "fr": "caractères"}[lang],
        E(f["l4"]), E(f["first"]), E(f["last"]), E(f["email"]), E(f["consent"]), c["priv_href"], E(f["priv"]), E(f["back"]), E(f["cont"]), E(f["send"]), lang,
        LOGO_PATHS, E(c["done_l"]), E(c["done_h"]), E(c["done_p"]), c["done_href"], E(c["done_a"]), E(c["alt_p"]), E(c["alt_a"]))

    main = '<main class="pt" id="main">\n' + hero + "\n" + eco + "\n" + who + "\n" + offers + "\n" + pricing + "\n" + compare + "\n" + models + "\n" + bound + "\n" + scope + "\n" + form + "\n</main>"
    out = head + pre + main + foot + "\n" + site_js + aside + "\n</body>\n</html>\n"
    open(os.path.join(SITE, "%s/%s.html" % (lang, SLUG[lang])), "w", encoding="utf8").write(out)
    print("écrit %s/%s.html" % (lang, SLUG[lang]), len(out))

# ---- navigation et pied de page de toutes les pages publiques (idempotent)
def nav_sync():
    n = 0
    for fp in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(fp, SITE).replace(os.sep, "/")
        if not (rel.startswith("fr/") or rel.startswith("en/")) or "/admin/" in rel: continue
        t = o = open(fp, encoding="utf8").read()
        lang = rel[:2]; slug = SLUG[lang] + ".html"; label = "Partners"
        adv_label = "Advisory" if lang == "en" else "Accompagnement"
        pref = "../" * (rel.count("/") - 1)
        hd = t.split("</header>")[0]
        if ('href="%s%s">' % (pref, slug)) in hd: continue
        m = re.search(r'<li><a[^>]*>%s</a></li>' % adv_label, hd)
        if not m: continue
        cur = ' aria-current="page"' if rel.endswith("/" + slug) else ""
        t = t.replace(m.group(0), m.group(0) + '<li><a%s href="%s%s">%s</a></li>' % (cur, pref, slug, label), 1)
        # pied de page : liste « Advisory » / « Accompagnement »
        ft = t[t.index("<footer"):]
        ap = "agencies-and-partners.html" if lang == "en" else "agences-et-partenaires.html"
        mm = re.search(r'<li><a href="[^"]*%s">[^<]*</a></li>' % re.escape(ap), ft)
        if mm and (slug + '">') not in ft:
            t = t.replace(mm.group(0), mm.group(0) + '<li><a href="%s%s">%s</a></li>' % (pref, slug, label), 1)
        if t != o: open(fp, "w", encoding="utf8").write(t); n += 1
    print("navigation : %d pages mises à jour" % n)

if __name__ == "__main__":
    for l in ("en", "fr"): build(l)
    nav_sync()
