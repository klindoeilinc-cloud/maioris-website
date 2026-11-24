# MAIORIS.net : rapport SEO et entité de marque

Rapport du 24 novembre 2026, fondé sur le dépôt (`main` + cette branche) et sur des contrôles de la version publiée. Aucune donnée de classement, de trafic ou d'indexation n'est inventée : je n'ai accès ni à Google Search Console, ni à Google Analytics, ni à un outil de recherche de mots-clés.

## 1. Audit initial (mesuré sur 75 pages publiques)

| Contrôle | Résultat avant | Résultat après |
|---|---|---|
| Titres de plus de 60 caractères (coupés dans les résultats) | 42 pages | 0 |
| Descriptions de plus de 160 caractères | 28 pages | 0 |
| Titres identiques au sein d'une même langue | 0 | 0 (test automatique) |
| Titres identiques FR et EN pour des noms propres d'offres | 5 | 1 (l'accueil, voulu) |
| Titres tronqués par une ellipse (« … ») | 3 articles | 0 |
| H1 uniques | 75 sur 75 | 75 sur 75 |
| Pages sans canonique | 0 | 0 |
| Images sans texte alternatif | 0 sur 85 | 0 sur 85 |
| Pages orphelines | 0 | 0 |
| Profondeur de clic maximale depuis l'accueil | 2 | 2 |
| Pages avec données structurées | 57 sur 75 | 60 sur 76 |
| hreflang réciproque FR et EN | oui | oui (test automatique) |
| robots.txt | correct (administration et API exclues, sitemap déclaré) | inchangé |
| Sitemap | 74 adresses | 76 adresses |
| `www.maioris.net` | répond 200 comme le domaine principal | inchangé : à régler dans Cloudflare |
| Performance (Core Web Vitals) | non remesurée aujourd'hui | non remesurée : voir limites |

## 2. Améliorations réalisées

- **Titre et description de l'accueil** (FR et EN) : « MAIORIS | Creative Intelligence & Performance », description recentrée sur Creative Leadership, intelligence stratégique et systèmes créatifs orientés performance (moins de 160 caractères).
- **Titres** de 45 pages raccourcis à 60 caractères au plus, sans bourrage de mots-clés, et différenciés entre le français et l'anglais (métadonnées localisées, pas traduites mot à mot).
- **Descriptions** de 28 pages ramenées à 160 caractères au plus.
- **Données structurées** : `Organization` (nom, nom légal, domaine, logo, e-mail, adresse à Abidjan, langues, domaines d'expertise) et `WebSite` sur l'accueil, avec un identifiant commun ; `Service` et `Offer` pour le Creative Audit (750 000 FCFA, devise XOF, identique au prix affiché). Les autres offres avaient déjà `Service`, les articles `Article`, les pages `BreadcrumbList`.
- **Tests automatiques** (`tests/seo.test.js`) : longueur des titres et descriptions, H1 unique, canoniques, unicité des titres, hreflang réciproque, JSON-LD valide, absence de types non pris en charge (FAQ, avis), prix du Creative Audit conforme à la source `tools/offers.json`, robots.txt et sitemap.

## 3. Architecture de l'entité de marque

| Élément | Formulation retenue sur le site |
|---|---|
| Marque | MAIORIS |
| Descripteur | Creative Intelligence & Performance |
| Nom institutionnel | MAIORIS Group |
| Positionnement | Creative Leadership as a Service |
| Méthode | MCPS (MAIORIS Creative Performance System) |
| Promesse | Voir la décision D12 |

Les noms alternatifs (« MAIORIS Group », « MAIORIS Creative Intelligence & Performance ») sont déclarés dans `Organization.alternateName`. Aucun profil social n'est déclaré (`sameAs`) : aucun n'est vérifié dans le dépôt.

## 4. Correspondance mots-clés et pages

Aucun volume de recherche n'est affirmé : il faut une étude de mots-clés réelle (voir feuille de route). Intention : C = commerciale, I = informationnelle, N = navigationnelle.

| Grappe | Intention | Page existante | Observation |
|---|---|---|---|
| 01 Marque (MAIORIS, MAIORIS Group) | N | Accueil FR et EN, À propos | Couverte. Dépend de la fiche Google et des liens entrants. |
| 02 Creative Leadership (CLaaS, Fractional Creative Director, direction créative externe) | C | Creative Leadership as a Service, Niveaux d'accompagnement, Marques et groupes | Pas de page dédiée à « Fractional Creative Director » : traité sur Niveaux d'accompagnement. |
| 03 Creative Intelligence (stratégie, gouvernance, transformation) | I et C | Système d'intelligence (MCPS), Brand Intelligence, MCPS Diagnostic, Analyses | Matière éditoriale à développer. |
| 04 Creative Systems (Operating System, opérations, workflow, infrastructure IA) | C | Creative Operating System, Transformation 90, outils de diagnostic | Pas de page « AI Creative Infrastructure » côté Direct : à créer seulement avec vos contenus. |
| 05 Creative Audit | C | Creative Audit, outils (Maturity, Brand Review, Operations Intelligence) | Risque de cannibalisation limité : les outils ciblent l'autodiagnostic gratuit. |
| 06 Partenariats agences | C | Partners, Agences et partenaires | Deux pages ciblent les agences : Partners est la page commerciale, Agences et partenaires les principes. À arbitrer (décision D13). |

Opportunités éditoriales à fort potentiel (à écrire avec vos analyses, sans contenu générique) : coût réel de la production créative sans gouvernance ; fractional creative director en Afrique francophone ; mesurer la performance créative ; intelligence artificielle et gouvernance créative ; économie créative en Afrique de l'Ouest.

## 5. International

Architecture déjà en place : `/fr/` et `/en/`, hreflang réciproque FR, EN et x-default, canoniques par langue, `og:locale` fr_FR et en_GB, navigation avec sélecteur de langue. Aucune migration d'adresses n'est proposée : le risque pour le référencement acquis dépasserait le gain.

## 6. Données structurées

Types utilisés : Organization, WebSite, ProfessionalService (accueil), Service et Offer (offres), ItemList (Partners), Article (analyses), Person (À propos), BreadcrumbList, WebPage. Aucun type FAQ ou avis. **À valider par vous** dans le Rich Results Test et le Schema Markup Validator : je n'ai pas accès à ces outils en ligne depuis cet environnement.

## 7. Limites restantes (honnêtes)

1. Aucun signal externe : pas de fiche Google Business Profile, pas de profils sociaux déclarés, très peu de liens entrants connus. C'est le premier frein à un classement durable.
2. Search Console et Bing Webmaster ne sont pas encore reliés : aucune vérification d'indexation possible.
3. Core Web Vitals non remesurés aujourd'hui.
4. `www` répond encore sans redirection (configuration Cloudflare).
5. Contenu éditorial limité : 16 analyses publiées, la section Perspectives reste désactivée.
6. Mesure d'audience : le site utilise Plausible (sans cookies). Google Analytics 4 n'est pas installé : il demanderait un bandeau de consentement et un identifiant de mesure.

## 8. Instructions de déploiement

Aucun déploiement automatique. Après fusion de la PR, Cloudflare Pages publie `main`. Vérifier ensuite : `https://maioris.net/sitemap.xml`, `https://maioris.net/robots.txt`, le titre de l'accueil dans l'onglet, et exécuter le Rich Results Test sur l'accueil et sur le Creative Audit.

## 9. Liste de contrôle Google Search Console

1. Ajouter la propriété « Domaine » maioris.net (vérification DNS dans Cloudflare).
2. Soumettre `https://maioris.net/sitemap.xml`.
3. Inspecter l'accueil FR, l'accueil EN, Partners, Marques et groupes, Creative Audit, puis demander l'indexation.
4. Vérifier « Pages » (indexées, exclues) et « Améliorations » (données structurées).
5. Relever la requête « MAIORIS » après 2 à 4 semaines.
6. Faire de même dans Bing Webmaster Tools (import depuis Search Console possible).
7. Créer la fiche Google Business Profile **seulement** si une adresse et une présence réelles sont vérifiables.

## 10. Feuille de route des 90 prochains jours

| Période | Actions |
|---|---|
| Jours 1 à 14 | Search Console et Bing, soumission du sitemap, redirection `www`, validation des données structurées, vérification de la fiche Google. |
| Jours 15 à 45 | Étude de mots-clés réelle (outil dédié), liens vers le site depuis profils et annuaires fiables, page entreprise LinkedIn déclarée dans `sameAs`. |
| Jours 46 à 90 | Un article de fond par mois sur les piliers éditoriaux, mesure des requêtes de marque, ajustement des titres selon les données Search Console. |

## 11. Notation (honnête)

| Dimension | Poids | Note | Justification |
|---|---:|---:|---|
| SEO technique | 20 | 16 | Base propre et testée. Manque : redirection `www`, performance remesurée, indexation vérifiée. |
| SEO sémantique | 20 | 13 | Grappes couvertes par des pages existantes ; peu de contenu informationnel ; deux pages ciblent les agences. |
| Architecture d'entité de marque | 20 | 12 | Entité déclarée de façon cohérente ; aucun signal externe (profils, fiche, liens). |
| SEO international | 15 | 13 | Architecture et hreflang corrects ; localisation des métadonnées faite ; marchés européen et canadien non travaillés. |
| Autorité éditoriale | 10 | 4 | 16 analyses, dont la qualité est bonne mais le volume faible. |
| Performance et expérience | 10 | 7 | Bonne base ; non remesurée. |
| Conversion | 5 | 4 | Parcours distincts Direct et Partners, formulaires opérationnels, PDF d'équipe ; suivi GA4 absent. |
| **Total** | **100** | **69** | **13,8 sur 20** |

20/20 n'est pas atteignable honnêtement aujourd'hui : il exige des signaux externes et des données d'indexation que seul le temps et vos actions peuvent fournir.

## 12. Décisions et conflits à arbitrer

| N° | Sujet | Constat |
|---|---|---|
| D10 | Symbole ™ | Le cahier des charges l'emploie ; votre consigne l'interdit. Aucun ™ n'a été remis. |
| D11 | Nom de la méthode | Le cahier des charges écrit « Marko Creative Performance System » et « Maioris Creative Performance System ». Le site publie « MAIORIS Creative Performance System ». Je garde ce dernier. |
| D12 | Promesse de marque « Architecting Creative Performance » | Non appliquée telle quelle : à valider avant de l'utiliser comme signature, car le site utilise « Beyond Transformation ». |
| D13 | Deux pages pour les agences | Conserver les deux (principes et offres) ou rediriger Agences et partenaires vers Partners. |
| D14 | Palette et typographie | Le cahier des charges impose crème, marine #101A3A, jaune, corail, émeraude et Poppins. Le site utilise le bleu #243AFF, le marine #0B1650 et Geist (Poppins sur Partners). Je n'ai pas changé l'identité visuelle, comme le demandaient vos consignes précédentes. |
| D15 | Google Analytics 4 | Remplacer Plausible demanderait un consentement. À décider avec l'identifiant de mesure. |
