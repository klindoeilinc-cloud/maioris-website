# Preuve de valeur et autorité de la méthode MCPS : synthèse (24 novembre 2026)

> **Mise à jour du 25 novembre 2026 (protection de la méthode)** : à la demande du propriétaire, la page de la méthode ne publie plus que la finalité, la question stratégique et le résultat attendu de chaque étape ; les lignes « type d'intervention » et « preuve observable » ainsi que les six exemples illustratifs (tableaux de gouvernance, de flux, de classification des tâches d'IA, d'indicateurs) ont été retirés au profit d'une liste de six livrables par leur nom, dont le contenu est remis en mission. Les sections 6 et 7 ci-dessous sont à lire avec cette réserve.

## 1. Pages modifiées
| Page | URL (inchangée) | Modification |
|---|---|---|
| Creative Leadership as a Service, EN et FR | `/en/advisory/claas`, `/fr/accompagnement/claas` | Nouvelle section « The business case » : comparaison de trois modèles, conditions d'usage, comparateur de scénarios, appel à l'action. |
| Système d'intelligence (méthode MCPS), EN et FR | `/en/intelligence-system`, `/fr/systeme-intelligence` | Six étapes détaillées, fondements précisés, six exemples illustratifs, deux cas documentés, liens vers les sept offres, appels à l'action. Titre et description mis à jour. |

Aucun prix, aucune portée contractuelle et aucune architecture d'offres n'ont été modifiés.

## 2. Copie publiée
Le texte publié figure dans les deux pages ci-dessus ; il est généré par `tools/build_value_sections.py` (une seule source pour FR et EN).

## 3. Nouveaux composants
- **Comparateur de scénarios** (`src/fcl/calc.js`, `src/fcl/app.js`, `src/fcl/fcl.css`, bundle `fcl`) : saisies (coût d'un dirigeant permanent, recrutement et intégration, coordination des agences, reprises et retards, niveau de leadership requis, honoraires externes, hypothèses d'efficacité). Sorties : coûts annualisés des trois scénarios, écart par rapport au pilotage réparti, capacité d'un poste permanent au-delà du besoin, différences de structure, hypothèses explicites, pistes d'efficacité qualitatives. Le calcul se fait dans le navigateur, rien n'est envoyé ni conservé.
- **Composants de présentation** `vp-*` : tableau comparatif défilant, cartes d'étapes, exemples illustratifs, cas documentés, liste de liens.

## 4. Choix de conception du comparateur (évaluation demandée)
- **Intégré**, car il peut être honnête : il ne s'appuie que sur les chiffres du visiteur.
- **Aucun tarif MAIORIS n'est présumé** : les honoraires du scénario externalisé sont ceux que le visiteur saisit ; vides, ce scénario n'est pas chiffré. Cela évite aussi de trancher la contradiction de prix de CLaaS encore ouverte.
- **Hypothèses d'efficacité à zéro par défaut**, appliquées de la même façon aux deux scénarios dotés d'un leadership senior, jamais présentées comme des économies.
- **Aucune promesse** : le texte indique que ni la comparaison ni aucun modèle n'est systématiquement moins cher.
- Vérifié par 8 tests de calcul, un test de bout en bout (FR, EN, mobile) et un contrôle d'accessibilité.

## 5. Modifications SEO
Titres et descriptions de la page de la méthode (EN : « MCPS: Creative Performance System | MAIORIS » ; FR : « MCPS : méthode de performance créative | MAIORIS »), dans les limites de longueur, avec le texte de la définition. Aucune donnée structurée supplémentaire : aucun balisage FAQ ou avis. URL et liens internes préservés.

## 6. Lacunes de preuve à valider par un humain
1. **Chiffres du cas TCL** (260+ participants, 1 845 000 vues, 45 000+ interactions, 6 points de contact) : repris du document que vous avez fourni, présentés comme « rapportés par MAIORIS, non audités ». Source primaire à conserver.
2. **Cas SOCIAM** : aucun impact chiffré n'existe ; la page le dit. Un indicateur vérifiable renforcerait la preuve.
3. **Exemples illustratifs** : génériques, marqués comme tels. À valider pour qu'ils reflètent bien votre approche sans en révéler les détails.
4. **Rôles et responsabilités** dans les cas : repris tels que documentés ; confirmez qu'aucune responsabilité n'est sur- ou sous-déclarée.
5. **Comparaison des trois modèles** : qualitative, à confirmer sur le fond par vous (par exemple « une période minimale fixée au cadrage »).
6. **Pas d'étude comparative** ni de donnée externe sur le coût réel du recrutement : aucune n'est citée.

## 7. Évaluation finale (honnête)
| Critère | Note | Constat |
|---|---:|---|
| Clarté de la valeur économique | 16 | Comparaison structurée et comparateur transparent ; aucune donnée externe sur les coûts. |
| Crédibilité méthodologique | 16 | Six étapes, question, intervention, résultat et preuve pour chacune ; sans détail propriétaire. Pas encore de cadre téléchargeable. |
| Intégrité des preuves | 17 | Illustrations marquées, cas rapportés tels que documentés, réserves explicites. |
| Positionnement premium | 17 | Ton sobre, aucun argument de prix bas, aucune promesse. |
| Conversion commerciale | 16 | Appels à l'action contextuels sur les deux pages ; dépendent du parcours de la PR 52. |
| Adaptation mobile | 17 | Contrôlée à 390 px (tableaux défilants, grilles empilées), sans défilement horizontal de la page. |
| Cohérence SEO | 17 | Titres et descriptions aux bonnes longueurs, URL préservées. |
| Cohérence de marque | 17 | Styles et ton existants. |

Aucun critère n'est noté 20/20 : il manque des preuves externes (cas chiffrés vérifiables, données de coût) que seules vos informations peuvent apporter.

## 8. Dépendance
Cette branche s'appuie sur la PR 52 (parcours d'engagement : option de contact « Creative Audit », ancres de contact, lien vers le parcours). À fusionner après elle.
