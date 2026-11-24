# MAIORIS.net : audit de la phase 1

Audit en lecture seule, réalisé le 24 novembre 2026 sur la version publiée (maioris.net) et sur la branche `main`. Aucune page n'a été modifiée. Les points marqués **Décision** attendent une validation du propriétaire avant la phase 2.

## 1. Architecture technique

| Élément | État vérifié |
|---|---|
| Site | HTML statique FR et EN, sans framework. Hébergé sur Cloudflare Pages (domaines maioris.net et www). |
| Fonctions | Pages Functions : `/api/contact`, `/api/diagnostic`, `/api/subscribe`, `/api/partners`, `/api/erase`, `/api/admin/*`, `/media/*`. Envoi par Resend, base D1, images R2. |
| Accès | Administration protégée par Cloudflare Access (jeton vérifié dans la fonction, refus par défaut). |
| Style | `site/assets/site.css` (jetons : bleu #243AFF, marine #0B1650, Geist). Bundles hachés pour outils, éditorial et Partners. |
| Contrôles existants | `tools/qa.py` (liens, titres, hreflang, JSON-LD, sitemap, assets) : 0 erreur, 2 avertissements. 214 tests unitaires. E2E : outils (251), COI, éditorial (126), Partners. |
| Pas de build de production | Aucun framework : la « build » est `python3 tools/build_assets.py` (empreintes des fichiers). Pas de vérification de types ni de lint JavaScript configurés. |

## 2. Inventaire des pages (73 pages publiques, hors administration)

- **Institutionnel :** accueil, à propos, enjeux, secteurs, système d'intelligence (la méthode), FAQ, autodiagnostic, contact, confidentialité.
- **Accompagnement (6 pages d'offre + 3) :** MCPS Diagnostic, Brand Intelligence, Growth Architecture, Creative Operating System, Transformation 90, Creative Leadership as a Service ; Creative Audit, Niveaux d'accompagnement, Agences et partenaires.
- **Partners :** `/en/partners`, `/fr/partenaires`.
- **Outils :** Creative Operations Intelligence, Creative Maturity Assessment, Brand Consistency Review, évaluation du brief.
- **Éditorial :** analyses (Insights) ; la section Perspectives est volontairement désactivée.
- **Références :** deux pages de références (FR).
- **Non publics :** administration (Cloudflare Access), gabarits des fonctions.

## 3. Inventaire des offres et des prix publiés

| Offre | Prix publié | Durée publiée | Observation |
|---|---|---|---|
| Creative Audit | 800 000 FCFA | 5 à 7 jours ouvrés | Absent de la liste « Six façons de travailler avec MAIORIS ». |
| Creative Direction | « à partir de 1 200 000 FCFA » | à définir | Uniquement sur Niveaux d'accompagnement, sans page dédiée. |
| Campaign Architect | « à partir de 2 500 000 FCFA » | à définir | Uniquement sur Niveaux d'accompagnement, sans page dédiée. |
| Fractional Creative Director (niveau 02) | « à partir de 2 500 000 FCFA par mois » | engagement fixé au cadrage | Même famille que CLaaS, nom différent. |
| Creative Leadership as a Service | « sur demande » | période minimale fixée au cadrage | Contradiction avec le niveau 02. |
| MCPS Diagnostic | « sur demande » | court, fixé au cadrage | Se dit « périmètre fixe, tarif fixe » mais sans prix. |
| Brand Intelligence, Growth Architecture, Creative Operating System | « sur demande » | fixé au cadrage | |
| Transformation 90 | « sur demande » | 90 jours | |
| Partners : Agency Creative Audit | 800 000 FCFA | 10 à 15 jours ouvrés | Même prix que l'audit direct pour une durée double. |
| Partners : Creative Operating System | 2 300 000 FCFA | 4 à 6 semaines | « sur demande » côté Direct. |
| Partners : Fractional Creative Leadership | 1 000 000 FCFA par mois | engagement initial de 3 mois | 2,5 fois moins que le niveau 02 Direct. |
| Partners : AI Creative Transformation | 1 650 000 FCFA | 3 à 5 semaines | Sans équivalent côté Direct. |

Il n'existe pas de source centrale des prix : chaque page porte les siens (`tools/build_coi_pages.py` pour les outils, HTML pour les autres).

## 4. Incohérences relevées

### Prix et durées
1. Le cahier des charges de la phase 1 déclare « Creative Audit = 750 000 FCFA, 7 à 10 jours ouvrés, autoritaire ». Le site publie 800 000 FCFA et 5 à 7 jours, suite à votre instruction du 23 novembre. **Décision D1.**
2. Deux audits au même prix pour deux durées et périmètres différents (Direct 5 à 7 jours, Partners 10 à 15 jours).
3. Le Fractional est publié à trois prix ou absence de prix : 2 500 000 (niveau 02), « sur demande » (CLaaS), 1 000 000 (Partners).

### Positionnement et méthode
4. La méthode porte deux noms : « MCPS » (cahier des charges, MCPS Diagnostic) et « MAIORIS CPS » (page Système d'intelligence).
5. La méthode est présentée de deux façons : une chaîne de six étapes (Creative Intelligence, Creative Strategy, Creative System, Creative Operating System, AI Creative Infrastructure, Creative Performance) et un cycle de sept étapes (Observer, Diagnostiquer, Prioriser, Concevoir, Gouverner, Exécuter, Mesurer). Ce sont deux lectures complémentaires, mais aucune page ne les articule.
6. Les principes fondateurs affichés sont la Theory of Constraints, Six Sigma, l'intelligence stratégique et l'amélioration continue. Le « Systems Thinking » demandé n'apparaît nulle part.
7. Le Creative Audit ne figure pas dans la liste des offres d'accompagnement (six offres) alors que c'est l'offre d'entrée.
8. Creative Direction et Campaign Architect n'existent que dans un tableau de niveaux, sans page ni périmètre propres.
9. Le symbole ™ a été retiré du site à votre demande. Le cahier des charges le réintroduit.

### Branches commerciales
10. Les deux branches existent (Direct sur la page Accompagnement, Partners sur sa page), mais Direct n'a pas de page de branche équivalente à Partners : le parcours « Marques et groupes » est implicite.
11. Les engagements Partners du cahier des charges (Strategic Creative Advisory, Campaign Strategy & Architecture, Senior Creative Direction, Creative Governance Advisory, White-label) diffèrent des quatre offres publiées (Agency Creative Audit, Creative Operating System, Fractional, AI Creative Transformation). **Décision D3.**
12. La protection de l'agence partenaire (propriété du client, confidentialité, propriété intellectuelle, non-contournement) n'est pas exposée publiquement.

### Éditorial
13. Les pages d'offre n'ont pas toutes les 15 rubriques du standard demandé (promesse, public, implications, exclusions, processus, FAQ, etc.). Elles en ont environ 7 (défi, opportunité, méthodologie, périmètre, livrables, modèle d'engagement, résultats).
14. Les noms d'outils et d'offres se mélangent : Creative Operations Intelligence, Creative Maturity Assessment et Brand Consistency Review sont des outils gratuits qui renvoient vers le Creative Audit ; ils ne sont pas dans le catalogue du cahier des charges.
15. Aucune étude de cas publique. Les deux pages de références doivent être validées par vous comme réelles et autorisées.

### Technique, UX, SEO
16. Menu principal : 8 entrées plus le sélecteur de langue. Sous 1240 px il passe en menu compact.
17. SEO vérifié par `tools/qa.py` : titres, descriptions, canonique, hreflang, JSON-LD, sitemap, balises Open Graph : aucune erreur. Deux avertissements : titres identiques en FR et en EN pour deux pages d'offre (noms propres).
18. Aucune mesure de performance rejouée aujourd'hui (la dernière série date de la phase vitesse et accessibilité).
19. La structure de navigation cible (Philosophie, Diagnostics, Architecture, Systèmes, Leadership, Marques et groupes, Agences et partenaires, Cockpit) n'existe pas telle quelle.

## 5. Registre des décisions

| N° | Sujet | Information manquante | Recommandation |
|---|---|---|---|
| D1 | Prix et durée du Creative Audit | 750 000 FCFA en 7 à 10 jours (cahier des charges) ou 800 000 FCFA en 5 à 7 jours (site publié, instruction du 23 novembre) | Confirmer. Je n'appliquerai rien tant que ce n'est pas tranché. |
| D2 | Symbole ™ | Faut-il le remettre (cahier des charges) ou le laisser retiré (votre instruction) ? | Laisser retiré. |
| D3 | Offres de la branche Agences | Garder les quatre offres tarifées publiées, ou les remplacer par les cinq engagements du cahier des charges ? Aucun prix n'est fourni pour ces derniers. | Garder les quatre offres et décrire les cinq engagements comme modèles de collaboration. |
| D4 | Nom de la méthode | MCPS ou MAIORIS CPS | MCPS partout (MAIORIS Creative Performance System). |
| D5 | Creative Direction, Campaign Architect | Périmètres, durées, prix confirmés ou non ? Les « à partir de » actuels sont-ils validés ? | Créer des pages seulement avec vos périmètres. |
| D6 | Prix de CLaaS et du Fractional | Un seul prix de référence ? Écart assumé entre Direct et Partners ? | Un tarif de référence Direct et une explication. |
| D7 | Références | Les deux pages de références sont-elles validées et autorisées ? | Vérifier avant toute mise en avant. |
| D8 | Mentions de protection de l'agence partenaire | Conditions contractuelles réelles (non-contournement, propriété du client, etc.) | Uniquement vos termes. Rien n'est inventé. |

## 6. Plan de la phase 2 proposé (après vos décisions)

1. Source centrale des offres et des prix (un fichier lu par les générateurs et vérifié par un test).
2. Méthode MCPS présentée en six étapes avec les cinq principes fondateurs, et le cycle de sept étapes comme son mode d'exécution.
3. Page Marques et groupes (parcours acheteur Direct) en miroir de Partners, et navigation alignée.
4. Pages d'offre au standard de 15 rubriques pour les offres validées, en FR et EN.
5. Accueil restructuré en huit sections, sans contenu inventé.
6. Contrôle final (QA, tests, accessibilité, SEO) et registre mis à jour.
