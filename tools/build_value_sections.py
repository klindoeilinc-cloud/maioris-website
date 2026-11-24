#!/usr/bin/env python3
"""Ajoute (de façon idempotente) deux ensembles de sections aux pages existantes, sans changer leurs URL :
  1. Page Creative Leadership as a Service (EN/FR) : argumentaire économique du leadership créatif fractionné + comparateur de scénarios.
  2. Page de la méthode MCPS (EN/FR) : six étapes détaillées, fondements, exemples illustratifs, cas documentés, liens vers les offres.
Règles de contenu : aucun chiffre de performance inventé, exemples explicitement illustratifs, résultats de cas rapportés tels que documentés.
Commande : python3 tools/build_value_sections.py puis python3 tools/build_assets.py"""
import html, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HERE, "..", "site")
E = lambda s: html.escape(s, quote=False)
def rd(p): return open(os.path.join(SITE, p), encoding="utf8").read()
def wr(p, t): open(os.path.join(SITE, p), "w", encoding="utf8").write(t)
def between(t, start, end):
    a = t.index(start); b = t.index(end, a) + len(end); return a, b

# ---------------------------------------------------------------- 1. Leadership créatif fractionné
FCL = {
 "en": dict(
  lbl="§ 09 · The business case", h="Access senior creative leadership without necessarily building a permanent executive structure.",
  intro="Three ways to obtain senior creative leadership, compared on what changes structurally. None is systematically cheaper than the others: the right choice depends on your scope, your priorities and how much leadership you really need.",
  cols=("", "Permanent internal recruitment", "Distributed agency and vendor management", "Externalised creative leadership with MAIORIS"),
  rows=[("Structural commitment", "A lasting employment commitment and a permanent executive structure.", "No internal structure; commitments are per vendor and per project.", "No permanent executive structure; a defined engagement, with a minimum period set at scoping."),
        ("Access to senior leadership", "Full time access to one senior profile.", "Senior input depends on each agency and is not centralised.", "Senior leadership at a defined rhythm, within an agreed scope."),
        ("Strategic alignment", "Deep internal context; alignment depends on the mandate given to the person.", "Each agency aligns on its own brief; consistency has to be enforced by the client.", "One external owner who connects creative work to business priorities, with an outside perspective."),
        ("Creative governance", "Can be built and owned internally.", "Rarely centralised; often left to the marketing team.", "A governance framework designed and operated within the agreed scope."),
        ("Coordination requirements", "Internal coordination led by the hire.", "High: the client coordinates agencies, briefs and approvals.", "Part of the coordination moves to the external leader; the client keeps the decisions."),
        ("Continuity of leadership", "Depends on retaining one person.", "Depends on each agency relationship.", "Continuity within the engagement period; renewal terms are set in the agreement."),
        ("Cost structure", "A fixed annual cost (compensation and charges) plus recruitment and onboarding.", "Variable fees per project, plus the client's coordination time and the cost of rework.", "A monthly retainer for a defined scope; agency and production budgets stay separate.")],
  note="No model is systematically cheaper. The comparison describes structure, not price.",
  when_t="When it is appropriate", when=["You work with several agencies or vendors and nobody holds the creative direction.", "Your need for senior creative leadership is real but does not justify a full time executive role.", "Creative decisions on briefs, quality and priorities are taken without a senior owner.", "You want a shared governance framework before deciding on a permanent structure."],
  who_t="Who benefits", who="CEOs, marketing and communication directors of organisations that treat creativity as a strategic capability.",
  cond_t="Conditions that make it valuable", cond=["A decision maker who engages at the agreed rhythm.", "Business priorities stated clearly enough to connect creative work to them.", "A defined mandate given to the external leader.", "Internal teams or partners who produce the work."],
  not_t="When it is not the right model", notm="When the need is daily art direction, hierarchical management of a team or creative production: this engagement does not cover them.",
  sim_t="Compare the scenarios with your own figures", sim_p="An illustrative comparison. It uses only the figures you enter and does not present hypothetical savings as returns.",
  nojs="The comparison needs JavaScript. Without it, contact us and we will go through the scenarios with you.",
  cta="Discuss Fractional Leadership", cta2="How engagement works →", jr="../how-engagement-works.html"),
 "fr": dict(
  lbl="§ 09 · L'argument économique", h="Accéder à un leadership créatif senior sans nécessairement bâtir une structure exécutive permanente.",
  intro="Trois façons d'obtenir un leadership créatif senior, comparées sur ce qui change dans la structure. Aucune n'est systématiquement moins chère que les autres : le bon choix dépend de votre périmètre, de vos priorités et du niveau de leadership dont vous avez réellement besoin.",
  cols=("", "Recrutement interne permanent", "Pilotage réparti entre agences et prestataires", "Leadership créatif externalisé avec MAIORIS"),
  rows=[("Engagement structurel", "Un engagement d'emploi durable et une structure exécutive permanente.", "Aucune structure interne ; des engagements par prestataire et par projet.", "Pas de structure exécutive permanente ; un engagement défini, avec une période minimale fixée au cadrage."),
        ("Accès à un leadership senior", "Accès à plein temps à un profil senior.", "L'apport senior dépend de chaque agence et n'est pas centralisé.", "Un leadership senior à un rythme défini, dans un périmètre convenu."),
        ("Alignement stratégique", "Connaissance interne approfondie ; l'alignement dépend du mandat confié à la personne.", "Chaque agence s'aligne sur son propre brief ; la cohérence doit être imposée par le client.", "Un responsable externe qui relie le travail créatif aux priorités de l'activité, avec un regard extérieur."),
        ("Gouvernance créative", "Peut être construite et portée en interne.", "Rarement centralisée ; souvent laissée à l'équipe marketing.", "Un cadre de gouvernance conçu et animé dans le périmètre convenu."),
        ("Besoin de coordination", "Coordination interne portée par la recrue.", "Élevé : le client coordonne agences, briefs et validations.", "Une partie de la coordination passe au responsable externe ; le client garde les décisions."),
        ("Continuité du leadership", "Dépend de la fidélisation d'une personne.", "Dépend de chaque relation d'agence.", "Continuité pendant la durée de l'engagement ; les conditions de renouvellement figurent dans l'accord."),
        ("Structure de coût", "Un coût annuel fixe (rémunération et charges) plus le recrutement et l'intégration.", "Des honoraires variables par projet, plus le temps de coordination du client et le coût des reprises.", "Un forfait mensuel pour un périmètre défini ; les budgets d'agences et de production restent séparés.")],
  note="Aucun modèle n'est systématiquement moins cher. La comparaison décrit la structure, pas le prix.",
  when_t="Quand c'est approprié", when=["Vous travaillez avec plusieurs agences ou prestataires et personne ne tient la direction créative.", "Votre besoin de leadership créatif senior est réel mais ne justifie pas un poste exécutif à temps plein.", "Les décisions créatives sur les briefs, la qualité et les priorités sont prises sans responsable senior.", "Vous voulez un cadre de gouvernance partagé avant de décider d'une structure permanente."],
  who_t="Qui en bénéficie", who="Les directions générales, marketing et communication d'organisations qui considèrent la création comme une capacité stratégique.",
  cond_t="Les conditions qui lui donnent de la valeur", cond=["Un décideur qui s'engage au rythme convenu.", "Des priorités d'activité assez claires pour y relier le travail créatif.", "Un mandat défini confié au responsable externe.", "Des équipes ou des partenaires internes qui produisent le travail."],
  not_t="Quand ce n'est pas le bon modèle", notm="Quand le besoin est la direction artistique quotidienne, le management hiérarchique d'une équipe ou la production créative : cet engagement ne les couvre pas.",
  sim_t="Comparez les scénarios avec vos propres chiffres", sim_p="Une comparaison illustrative. Elle n'utilise que les chiffres que vous saisissez et ne présente aucune économie hypothétique comme un rendement.",
  nojs="Le comparateur nécessite JavaScript. Sans lui, contactez-nous et nous parcourrons les scénarios avec vous.",
  cta="Parler de leadership fractionné", cta2="Comment se déroule une mission →", jr="../comment-se-deroule-une-mission.html"),
}
def fcl_section(lang):
    c = FCL[lang]
    th = "".join('<th scope="col">%s</th>' % E(x) for x in c["cols"][1:])
    rows = "".join('<tr><th scope="row">%s</th>%s</tr>' % (E(r[0]), "".join('<td data-l="%s">%s</td>' % (E(c["cols"][i + 1]), E(v)) for i, v in enumerate(r[1:]))) for r in c["rows"])
    ul = lambda items: '<ul class="vp-ul">%s</ul>' % "".join("<li>%s</li>" % E(x) for x in items)
    return ('<!--fcl-start--><section class="sec" id="business-case" data-reveal=""><div class="wrap"><div class="vp-in"><p class="lbl">%s</p><h2 class="vp-h">%s</h2><p class="vp-lead">%s</p>'
            '<div class="vp-scroll" role="region" tabindex="0" aria-label="%s"><table class="vp-table"><thead><tr><th scope="col"><span class="sr">%s</span></th>%s</tr></thead><tbody>%s</tbody></table></div><p class="vp-fine">%s</p>'
            '<div class="vp-cols"><div><h3>%s</h3>%s</div><div><h3>%s</h3>%s</div></div><div class="vp-cols"><div><h3>%s</h3><p>%s</p></div><div><h3>%s</h3><p>%s</p></div></div>'
            '<h3 class="vp-sim">%s</h3><p class="vp-fine">%s</p><div class="fcl" id="fcl-sim" data-lang="%s"></div><noscript><p class="vp-fine">%s</p></noscript>'
            '<div class="vp-cta"><a class="btn btn-sun" data-label="fractional" data-rank="offer" data-track="cta_click" href="../contact.html#claas">%s</a><a class="link" href="%s">%s</a></div></div></div></section><!--fcl-end-->\n') % (
            E(c["lbl"]), E(c["h"]), E(c["intro"]), E(c["cols"][3]), E({"en": "Criterion", "fr": "Critère"}[lang]), th, rows, E(c["note"]),
            E(c["when_t"]), ul(c["when"]), E(c["cond_t"]), ul(c["cond"]), E(c["who_t"]), E(c["who"]), E(c["not_t"]), E(c["notm"]),
            E(c["sim_t"]), E(c["sim_p"]), lang, E(c["nojs"]), E(c["cta"]), c["jr"], E(c["cta2"]))

def patch_fcl(path, lang):
    t = rd(path)
    t = re.sub(r"<!--fcl-start-->.*?<!--fcl-end-->\n", "", t, flags=re.S)
    anchor = '<section class="sec" data-reveal=""><div class="wrap"><div class="cta-band">'
    assert t.count(anchor) == 1, path
    t = t.replace(anchor, fcl_section(lang) + anchor)
    if "/assets/tools." not in t:
        t = re.sub(r'(<link href="/assets/site\.[0-9a-f]{8}\.css" rel="stylesheet"/>)', lambda m: m.group(1) + '<link href="/assets/tools.00000000.css" rel="stylesheet"/>', t, count=1)
    if "/assets/fcl." not in t:
        t = re.sub(r'(<script defer="" src="/assets/site\.[0-9a-f]{8}\.js"></script>)', lambda m: m.group(1) + '<script defer="" src="/assets/fcl.00000000.js"></script>', t, count=1)
    wr(path, t)

# ---------------------------------------------------------------- 2. Méthode MCPS
STAGES = {
 "en": [("1 · Creative Intelligence", "Ground creative decisions in a documented understanding of market, audience and competition.", "What do we actually know, and what do we only assume?", "Research and analysis that separate facts, observations, hypotheses and unknowns.", "A documented reading of the context, with each statement carrying its status.", "Sources are cited; facts can be told apart from interpretation."),
        ("2 · Creative Strategy", "Turn understanding into choices: positioning, priorities and creative direction aligned with the business.", "What do we choose, and what do we leave aside?", "Strategic decisions, prioritisation and direction, taken with the leadership team.", "Written strategic choices and priorities.", "Decisions can be traced back to the intelligence, with the trade offs stated."),
        ("3 · Creative System", "Design the organisation that carries the strategy: roles, flows and resources.", "How must the creative function be built to carry this strategy?", "Organisational design and workflow architecture.", "A defined creative architecture: roles, responsibilities, flows and resource allocation.", "Roles and flows are documented; each has a named owner."),
        ("4 · Creative Operating System", "Make the way decisions are taken and work is validated explicit and repeatable.", "Who decides what, on which criteria, and how does work move?", "Governance, briefing and approval design, with the teams concerned.", "Governance rules, briefing and approval processes, decision rights.", "Approvals follow stated criteria; decisions are recorded."),
        ("5 · AI Creative Infrastructure", "Use AI to augment capabilities and improve workflows, under human control.", "Where does AI help, and who remains accountable?", "Opportunity mapping and design of governed, AI assisted workflows.", "A classification of tasks (automatable, AI assisted, human expertise, mandatory approval) and the rules around it.", "Every AI use has a named human owner and a quality check."),
        ("6 · Creative Performance", "Know whether the system works, and adapt it.", "How do we know it works, and what do we change next?", "Indicator design and a review rhythm.", "Indicators defined before the work starts, and a routine to review them.", "Indicators are tracked over time against targets set beforehand.")],
 "fr": [("1 · Creative Intelligence", "Fonder les décisions créatives sur une compréhension documentée du marché, des audiences et de la concurrence.", "Que savons-nous réellement, et que supposons-nous seulement ?", "Recherche et analyse qui séparent faits, observations, hypothèses et inconnues.", "Une lecture documentée du contexte, où chaque affirmation porte son statut.", "Les sources sont citées ; les faits se distinguent de l'interprétation."),
        ("2 · Creative Strategy", "Transformer la compréhension en choix : positionnement, priorités et direction créative alignés sur l'activité.", "Que choisissons-nous, et que laissons-nous de côté ?", "Décisions stratégiques, priorisation et direction, prises avec l'équipe dirigeante.", "Des choix et des priorités stratégiques écrits.", "Les décisions se rattachent à l'intelligence, avec les arbitrages énoncés."),
        ("3 · Creative System", "Concevoir l'organisation qui porte la stratégie : rôles, flux et ressources.", "Comment la fonction créative doit-elle être construite pour porter cette stratégie ?", "Conception de l'organisation et architecture des flux de travail.", "Une architecture créative définie : rôles, responsabilités, flux et allocation des ressources.", "Rôles et flux sont documentés ; chacun a un responsable nommé."),
        ("4 · Creative Operating System", "Rendre explicite et reproductible la façon de décider et de valider le travail.", "Qui décide quoi, sur quels critères, et comment le travail circule-t-il ?", "Conception de la gouvernance, du brief et des validations, avec les équipes concernées.", "Règles de gouvernance, processus de brief et de validation, droits de décision.", "Les validations suivent des critères énoncés ; les décisions sont consignées."),
        ("5 · AI Creative Infrastructure", "Utiliser l'IA pour augmenter les capacités et améliorer les flux de travail, sous contrôle humain.", "Où l'IA aide-t-elle, et qui reste responsable ?", "Cartographie des opportunités et conception de flux assistés par IA et gouvernés.", "Une classification des tâches (automatisable, assistée par IA, expertise humaine, validation obligatoire) et les règles qui l'entourent.", "Chaque usage de l'IA a un responsable humain nommé et un contrôle qualité."),
        ("6 · Creative Performance", "Savoir si le système fonctionne, et l'adapter.", "Comment savons-nous que cela fonctionne, et que changeons-nous ensuite ?", "Conception d'indicateurs et d'un rythme de revue.", "Des indicateurs définis avant le début du travail, et une routine pour les revoir.", "Les indicateurs sont suivis dans le temps par rapport à des cibles fixées au préalable.")],
}
STAGE_T = {"en": ("What MCPS covers.", "A strategic operating system designed to transform creative intelligence into structured decisions, operational coherence and measurable creative performance.", "MCPS is not a service in the catalogue: it is the proprietary methodology that informs every service. The six stages describe what it covers; the seven step cycle above describes how each engagement is run.", ("Purpose", "Strategic question", "Type of intervention", "Expected output", "Observable evidence"), "The six stages"),
           "fr": ("Ce que couvre MCPS.", "Un système d'exploitation stratégique conçu pour transformer l'intelligence créative en décisions structurées, en cohérence opérationnelle et en performance créative mesurable.", "MCPS n'est pas un service du catalogue : c'est la méthodologie propriétaire qui éclaire chaque service. Les six étapes décrivent ce qu'elle couvre ; le cycle en sept temps ci-dessus décrit comment chaque mission est conduite.", ("Finalité", "Question stratégique", "Type d'intervention", "Résultat attendu", "Preuve observable"), "Les six étapes")}
FOUND = {"en": [("Theory of Constraints", "Identify and address the constraint that limits overall performance, before acting elsewhere."), ("Six Sigma", "Measure, analyse and improve operational consistency."), ("Data intelligence", "Support strategic decisions with relevant indicators, defined before the work starts."), ("AI and automation", "Identify opportunities to augment capabilities and improve workflows."), ("Continuous improvement", "Measure outcomes and adapt the system, so that each engagement improves the next one.")],
         "fr": [("Theory of Constraints", "Identifier et traiter la contrainte qui limite la performance d'ensemble, avant d'agir ailleurs."), ("Six Sigma", "Mesurer, analyser et améliorer la constance opérationnelle."), ("Data intelligence", "Appuyer les décisions stratégiques sur des indicateurs pertinents, définis avant le début du travail."), ("IA et automatisation", "Repérer les opportunités d'augmenter les capacités et d'améliorer les flux de travail."), ("Amélioration continue", "Mesurer les résultats et adapter le système, pour que chaque mission améliore la suivante.")]}
EXH = {
 "en": dict(lbl="Illustrative evidence", h="What the work looks like.", p="Six artefacts, shown as generic examples to make the approach understandable. They are illustrations, not results from a client.", tag="Illustrative example, not a client result",
  items=[("Creative diagnostic framework", ("Dimension", "Question asked", "Evidence examined"), [("Positioning", "Is the promise clear and distinct?", "Brand platform, recent communications"), ("Organisation", "Who decides, and how does work flow?", "Roles, briefs, approval records"), ("Execution", "Is output consistent across channels?", "Samples of recent work"), ("Performance", "Are results measured against stated goals?", "Indicators and reports available")]),
         ("Constraint identification", ("Step", "Illustration", ""), [("Observed symptom", "Campaigns are delivered late.", ""), ("Candidate constraints", "Unclear briefs, approval bottleneck, lack of capacity.", ""), ("Test", "Where does work wait the longest?", ""), ("Main constraint (hypothesis to verify)", "Approvals.", ""), ("Implication", "Improve approvals before adding capacity.", "")]),
         ("Creative governance model", ("Decision", "Proposes", "Decides"), [("Creative strategy", "Creative lead", "Leadership team"), ("Brief", "Brand manager", "Marketing director"), ("Final creative approval", "Creative lead", "Marketing director"), ("Agency selection", "Marketing team", "Leadership team")]),
         ("Workflow architecture", ("Stage", "Control point", ""), [("Brief", "Brief complete against a template", ""), ("Concept", "Alignment with the strategy", ""), ("Review gate", "Decision recorded", ""), ("Production", "Quality check", ""), ("Release", "Approval by the named owner", "")]),
         ("AI opportunity mapping", ("Task", "Classification", "Human owner"), [("Resizing of variants", "Automatable", "Production lead"), ("First draft of copy options", "AI assisted", "Creative lead"), ("Brand positioning decision", "Human expertise", "Marketing director"), ("Sensitive claims before release", "Mandatory approval", "Communication director")]),
         ("Creative performance scorecard", ("Indicator", "Definition", "Target"), [("First time approval rate", "Share of deliverables approved without revision", "Set before the work starts"), ("Cycle time", "Working days from brief to approval", "Set before the work starts"), ("Rework rounds", "Revision rounds per deliverable", "Set before the work starts"), ("Brand consistency", "Result of a structured review", "Set before the work starts")])]),
 "fr": dict(lbl="Preuves illustratives", h="À quoi ressemble le travail.", p="Six livrables, présentés comme des exemples génériques pour rendre l'approche compréhensible. Ce sont des illustrations, pas des résultats obtenus chez un client.", tag="Exemple illustratif, pas un résultat client",
  items=[("Cadre de diagnostic créatif", ("Dimension", "Question posée", "Éléments examinés"), [("Positionnement", "La promesse est-elle claire et distincte ?", "Plateforme de marque, communications récentes"), ("Organisation", "Qui décide, et comment le travail circule-t-il ?", "Rôles, briefs, traces de validation"), ("Exécution", "La production est-elle cohérente d'un canal à l'autre ?", "Échantillons de travaux récents"), ("Performance", "Les résultats sont-ils mesurés par rapport à des objectifs énoncés ?", "Indicateurs et rapports disponibles")]),
         ("Identification de la contrainte", ("Étape", "Illustration", ""), [("Symptôme observé", "Les campagnes sont livrées en retard.", ""), ("Contraintes candidates", "Briefs flous, goulot de validation, manque de capacité.", ""), ("Test", "Où le travail attend-il le plus longtemps ?", ""), ("Contrainte principale (hypothèse à vérifier)", "Les validations.", ""), ("Conséquence", "Améliorer les validations avant d'ajouter de la capacité.", "")]),
         ("Modèle de gouvernance créative", ("Décision", "Propose", "Décide"), [("Stratégie créative", "Responsable créatif", "Équipe dirigeante"), ("Brief", "Responsable de marque", "Direction marketing"), ("Validation créative finale", "Responsable créatif", "Direction marketing"), ("Choix d'une agence", "Équipe marketing", "Équipe dirigeante")]),
         ("Architecture des flux de travail", ("Étape", "Point de contrôle", ""), [("Brief", "Brief complet par rapport à un modèle", ""), ("Concept", "Alignement avec la stratégie", ""), ("Point de revue", "Décision consignée", ""), ("Production", "Contrôle qualité", ""), ("Diffusion", "Validation par le responsable nommé", "")]),
         ("Cartographie des opportunités d'IA", ("Tâche", "Classification", "Responsable humain"), [("Déclinaison de formats", "Automatisable", "Responsable production"), ("Premières pistes de texte", "Assistée par IA", "Responsable créatif"), ("Décision de positionnement de marque", "Expertise humaine", "Direction marketing"), ("Allégations sensibles avant diffusion", "Validation obligatoire", "Direction communication")]),
         ("Tableau de bord de performance créative", ("Indicateur", "Définition", "Cible"), [("Taux de validation du premier coup", "Part des livrables validés sans révision", "Fixée avant le début du travail"), ("Délai de cycle", "Jours ouvrés du brief à la validation", "Fixée avant le début du travail"), ("Tours de reprise", "Tours de révision par livrable", "Fixée avant le début du travail"), ("Cohérence de marque", "Résultat d'une revue structurée", "Fixée avant le début du travail")])]),
}
CASES = {
 "en": dict(lbl="Documented cases", h="Real work, reported as documented.", p="Two cases are documented by MAIORIS. They show the challenge, the contribution and the reported impact. They are not presented as full MCPS deployments, and no result is added to what the documents state.",
  cols=("Challenge", "MAIORIS contribution", "Reported impact"),
  items=[("SOCIAM", "Give a brand a territory and a creative team a direction.", "Development of the brand territory. Supervision of the creative team. Use of an early version of a production cockpit to organise production.", "No quantified impact is published for this case. Its lesson: a brand territory only holds if the creative organisation is built to carry it.", "work/sociam.html", "Read the case"),
         ("TCL West Africa 2026", "A regional launch in West Africa, through SOCIAM.", "Roles documented: Brand Experience Architecture and Strategic Brand Architecture. Participation in the identity and the programme: staging, screens, print, digital, broadcast.", "As reported in the case document: 260+ participants, 1 845 000 views, 45 000+ social interactions, 6 touchpoints activated. Figures reported by MAIORIS, not independently audited.", "../assets/docs/cas-tcl-west-africa-2026-nasco-maioris.pdf", "See the experience (PDF, in French)")]),
 "fr": dict(lbl="Cas documentés", h="Un travail réel, rapporté tel que documenté.", p="Deux cas sont documentés par MAIORIS. Ils montrent l'enjeu, la contribution et l'impact rapporté. Ils ne sont pas présentés comme des déploiements complets de MCPS, et aucun résultat n'est ajouté à ce que disent les documents.",
  cols=("Enjeu", "Contribution de MAIORIS", "Impact rapporté"),
  items=[("SOCIAM", "Donner un territoire à une marque et une direction à une équipe créative.", "Développement du territoire de marque. Supervision de l'équipe créative. Utilisation d'une première version d'un cockpit de production pour organiser la production.", "Aucun impact chiffré n'est publié pour ce cas. Son enseignement : un territoire de marque ne tient que si l'organisation créative est construite pour le porter.", "references/sociam.html", "Lire le cas"),
         ("TCL West Africa 2026", "Un lancement régional en Afrique de l'Ouest, via SOCIAM.", "Rôles documentés : Brand Experience Architecture et Strategic Brand Architecture. Participation à l'identité et au dispositif : scène, écrans, print, digital, broadcast.", "Tel que rapporté dans le document du cas : 260+ participants, 1 845 000 vues, 45 000+ interactions sociales, 6 points de contact activés. Chiffres rapportés par MAIORIS, non audités de façon indépendante.", "../assets/docs/cas-tcl-west-africa-2026-nasco-maioris.pdf", "Voir l'expérience (PDF)")]),
}
LINKS = {"en": dict(h="Services that apply MCPS", items=[("advisory/mcps-diagnostic.html", "MCPS Diagnostic", "Find the main constraint across the organisation."), ("advisory/brand-intelligence.html", "Brand Intelligence", "Stages 1 and 2: understanding and positioning."), ("advisory/growth-architecture.html", "Growth Architecture", "Stage 2: priorities and growth systems."), ("advisory/creative-operating-system.html", "Creative Operating System", "Stages 3 and 4: organisation and governance."), ("advisory/transformation-90.html", "Transformation 90", "A time bound programme across the stages."), ("advisory/claas.html", "Creative Leadership as a Service", "Ongoing senior leadership across the stages."), ("advisory/creative-audit.html", "Creative Audit", "A diagnosis of the creative function.")], cta1="Explore a Strategic Engagement", cta2="Request a Creative Audit", ct="contact.html#advice", ca="contact.html#audit"),
         "fr": dict(h="Les services qui appliquent MCPS", items=[("accompagnement/diagnostic-mcps.html", "MCPS Diagnostic", "Trouver la contrainte principale de l'organisation."), ("accompagnement/brand-intelligence.html", "Brand Intelligence", "Étapes 1 et 2 : compréhension et positionnement."), ("accompagnement/growth-architecture.html", "Growth Architecture", "Étape 2 : priorités et systèmes de croissance."), ("accompagnement/creative-operating-system.html", "Creative Operating System", "Étapes 3 et 4 : organisation et gouvernance."), ("accompagnement/transformation-90.html", "Transformation 90", "Un programme borné dans le temps sur l'ensemble des étapes."), ("accompagnement/claas.html", "Creative Leadership as a Service", "Un leadership senior continu sur l'ensemble des étapes."), ("accompagnement/creative-audit.html", "Creative Audit", "Un diagnostic de la fonction créative.")], cta1="Explorer un engagement stratégique", cta2="Demander un Creative Audit", ct="contact.html#advice", ca="contact.html#audit")}

def table(head, rows):
    th = "".join('<th scope="col">%s</th>' % E(x) for x in head if x)
    n = len([x for x in head if x])
    body = "".join("<tr>%s</tr>" % "".join(("<th scope=\"row\">%s</th>" if i == 0 else "<td>%s</td>") % E(v) for i, v in enumerate(r[:n])) for r in rows)
    return '<div class="vp-scroll" role="region" tabindex="0" aria-label="%s"><table class="vp-table vp-ex-t"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (E(head[0]), th, body)

def method_sections(lang):
    S = STAGE_T[lang]; ST = STAGES[lang]; labs = S[3]
    stage_cards = "".join('<div class="vp-stage"><h3>%s</h3>%s</div>' % (E(s[0]), "".join('<p><b>%s</b>%s</p>' % (E(labs[i]), E(s[i + 1])) for i in range(5))) for s in ST)
    stages = '<section class="sec" id="mcps-stages" data-reveal=""><div class="wrap"><p class="lbl">%s</p><p class="h2 narrow">%s</p><p class="vp-lead"><b>%s</b></p><p class="vp-lead">%s</p><div class="vp-stages">%s</div></div></section>' % (E(S[4]), E(S[0]), E(S[1]), E(S[2]), stage_cards)
    X = EXH[lang]
    ex = "".join('<div class="vp-ex"><h3>%s</h3><p class="vp-tag">%s</p>%s</div>' % (E(t), E(X["tag"]), table(h_, r_)) for t, h_, r_ in X["items"])
    exh = '<section class="sec alt" id="mcps-evidence" data-reveal=""><div class="wrap"><p class="lbl">%s</p><p class="h2 narrow">%s</p><p class="vp-lead">%s</p><div class="vp-exs">%s</div></div></section>' % (E(X["lbl"]), E(X["h"]), E(X["p"]), ex)
    K = CASES[lang]
    cs = "".join('<div class="vp-case"><h3>%s</h3><div class="vp-case-g"><div><h4>%s</h4><p>%s</p></div><div><h4>%s</h4><p>%s</p></div><div><h4>%s</h4><p>%s</p></div></div><p><a class="link" href="%s">%s →</a></p></div>' % (E(n), E(K["cols"][0]), E(a), E(K["cols"][1]), E(b), E(K["cols"][2]), E(c_), href, E(lk)) for n, a, b, c_, href, lk in K["items"])
    cases = '<section class="sec" id="mcps-cases" data-reveal=""><div class="wrap"><p class="lbl">%s</p><p class="h2 narrow">%s</p><p class="vp-lead">%s</p><div class="vp-cases">%s</div></div></section>' % (E(K["lbl"]), E(K["h"]), E(K["p"]), cs)
    L = LINKS[lang]
    lk = "".join('<li><a href="%s">%s</a><span>%s</span></li>' % (h_, E(n), E(d)) for h_, n, d in L["items"])
    services = '<section class="sec alt" id="mcps-services" data-reveal=""><div class="wrap"><p class="lbl">%s</p><ul class="vp-links">%s</ul><div class="vp-cta"><a class="btn btn-sun" data-label="mcps-engagement" data-rank="offer" data-track="cta_click" href="%s">%s</a><a class="btn" data-label="mcps-audit" data-rank="soft" data-track="cta_click" href="%s">%s</a></div></div></section>' % (E(L["h"]), lk, L["ct"], E(L["cta1"]), L["ca"], E(L["cta2"]))
    return stages, exh, cases, services

def patch_method(path, lang):
    t = rd(path)
    # sections ajoutées : on les retire avant de les réécrire
    t = re.sub(r'<section class="sec" id="mcps-stages".*?</section>', "", t, flags=re.S)
    t = re.sub(r'<section class="sec alt" id="mcps-evidence".*?</section>', "", t, flags=re.S)
    t = re.sub(r'<section class="sec" id="mcps-cases".*?</section>', "", t, flags=re.S)
    t = re.sub(r'<section class="sec alt" id="mcps-services".*?</section>', "", t, flags=re.S)
    old_stage = re.search(r'<section class="sec" data-reveal=""><div class="wrap"><p class="lbl">(?:The six stages|Les six étapes)</p>.*?</section>\n', t, re.S)
    stages, exh, cases, services = method_sections(lang)
    if old_stage: t = t.replace(old_stage.group(0), stages + "\n", 1)
    else:
        a = '<section class="sec" data-reveal=""><div class="wrap"><p class="lbl">%s</p>' % ("Philosophy" if lang == "en" else "Philosophie")
        assert t.count(a) == 1, path; t = t.replace(a, stages + "\n" + a)
    # fondements : textes alignés sur la définition de chaque principe
    for (name, desc), (old_name, _) in zip(FOUND[lang], FOUND[lang]):
        pat = re.compile(r'(<p class="rn">%s</p><p>)[^<]*(</p>)' % re.escape(name))
        t = pat.sub(lambda m: m.group(1) + E(desc) + m.group(2), t, count=1)
    closing = '<section class="sec closing" data-reveal="">'
    assert t.count(closing) == 1, path
    t = t.replace(closing, exh + "\n" + cases + "\n" + services + "\n" + closing)
    wr(path, t)

if __name__ == "__main__":
    patch_fcl("en/advisory/claas.html", "en"); patch_fcl("fr/accompagnement/claas.html", "fr")
    patch_method("en/intelligence-system.html", "en"); patch_method("fr/systeme-intelligence.html", "fr")
    print("sections ajoutées")
