# maioris.net

Site statique bilingue (français principal, anglais), servi par Cloudflare Pages. Aucun framework, aucune dépendance de build.

## Structure

- `site/` : le site publié. **C'est la source de vérité.** Les pages HTML sont éditées directement.
- `tools/build_assets.py` : publie le CSS et le JavaScript partagés (nom versionné).
- `tools/qa.py` : contrôle qualité automatique (liens, ancres, titres uniques, hreflang réciproques, JSON-LD, images sans alt, tirets, sitemap, redirections).
- `src/core/` : **MAIORIS INTELLIGENCE CORE™**, le noyau commun aux outils (`options.js` secteurs et tailles, `core.js` profil, historique et consolidation, `core.css`).
- `src/mat/` : **Creative Maturity Assessment™** (24 questions, six dimensions). `src/brand/` : **Brand Consistency Review™** (revue guidée, six dimensions, registre de preuves).
- `tools/bundles.py` : définit les bundles publiés (`coi`, `mat`, `brand`, `core` en JavaScript, `tools` en CSS), à partir des sources de `src/`.
- `src/coi/` : sources de l'outil **Creative Operations Intelligence™** (`data.js` questions, `calc.js` formules et validations, `report.js` textes et rapport, `app.js` interface, `coi.css`). `build_assets.py` les assemble en `site/assets/coi.<empreinte>.js` et `.css`.
- `tools/build_coi_pages.py` et `tools/build_tool_pages.py` : génèrent les pages FR et EN des trois outils modulaires à partir du gabarit du site.
- `tools/sync_tools.py` : insère le bloc partagé « Poursuivre votre diagnostic » sur les trois outils et sur Insights (à relancer après `build_coi_pages.py`).
- `site/functions/api/diagnostic.js` : envoi facultatif du Snapshot (Resend), uniquement avec le consentement du visiteur.
- `tests/` : tests automatiques (`node --test tests/*.test.js`) et test de bout en bout (`tests/e2e/coi.e2e.js`, nécessite Playwright et un serveur local).
- `newsletter/` : mode d'emploi et modèles de la lettre MAIORIS Insights (non publié).

## Avertissement : ne pas régénérer le site depuis un ancien générateur

`site/README.md` mentionne des fichiers `content.py` et `build.py`. Ils ne sont pas dans ce dépôt. Les pages ont été modifiées directement depuis (analyses, FAQ, niveaux d'accompagnement, cas stratégiques, version anglaise, outil, formulaire, etc.). Régénérer le site depuis l'ancien générateur **effacerait ces modifications**.

## Modifier le style ou le JavaScript

Le CSS et le JavaScript du site sont des fichiers partagés versionnés. Éditer `site/assets/site.css` ou `site/assets/site.js`, puis :

```bash
python3 tools/build_assets.py
python3 tools/qa.py
```

Le premier met à jour le nom des fichiers publiés (`site.<empreinte>.css` et `.js`) et leur référence dans toutes les pages. Le second vérifie que rien n'a été oublié. Ne jamais éditer directement les fichiers `site.<empreinte>.*`.

## Outil Creative Operations Intelligence™

Les formules sont centralisées dans `compute()` (`src/coi/calc.js`) :

- A, coût externe des reprises = budget annuel × part de reprises
- B, heures évitables par an = heures hebdomadaires × semaines travaillées × part évitable
- C, coût interne des frictions = B × coût horaire interne (facultatif)
- D, coût annuel des inefficiences = A + C

Les parts sont des fourchettes (bas, valeur centrale, haut). Une donnée inconnue n'est jamais remplacée par zéro : l'indicateur est déclaré non calculable et le total devient partiel. Les surcoûts externes déclarés enrichissent le profil sans être ajoutés au calcul, pour éviter tout double comptage.

Après toute modification de `src/coi/` ou de `tools/build_coi_pages.py` :

```bash
python3 tools/build_coi_pages.py
python3 tools/build_tool_pages.py
python3 tools/sync_tools.py
python3 tools/build_assets.py
node --test tests/*.test.js
python3 tools/qa.py
```

## Creative Maturity Assessment™ : méthode de scoring

- Chaque question a cinq niveaux comportementaux (1 Absent à 5 Intégré) et « Je ne sais pas / Non applicable ». Cette dernière réponse, comme l'absence de réponse, sort du calcul : elle n'est jamais comptée zéro.
- Score dimensionnel = moyenne des réponses valides / 5 × 100 (échelle de 20 à 100, le niveau le plus bas valant 1 sur 5).
- Score global = moyenne des six dimensions, **uniquement** si chaque dimension compte au moins `MIN_VALID` réponses valides (`src/mat/data.js`). Sinon, diagnostic partiel sans niveau global.
- **Écart avec la spécification** : le seuil recommandé était de 4 réponses valides par dimension. Chaque dimension n'ayant que 4 questions, ce seuil interdirait toute réponse « Je ne sais pas ». Il est fixé à 3, et modifiable en une ligne (`MIN_VALID`).
- Niveaux (bandes égales entre 20 et 100) : Initial < 36, Émergent < 52, Structuré < 68, Intégré < 84, Optimisé à partir de 84.
- Forces : dimensions à 68 ou plus (niveau Intégré et au-delà). Attention particulière : dimensions sous 52 (sous le niveau Structuré), trois au plus. Priorités : les trois dimensions les plus faibles, chacune avec sa pratique la plus fragile.
- Instrument propriétaire d'autoévaluation, pas une certification indépendante.

## Brand Consistency Review™ : méthode et limites

- **Mode guidé.** Aucune capacité d'analyse automatique de documents n'existe sur le site : aucun fichier n'est lu, analysé ni envoyé. Le fichier choisi est seulement contrôlé (extension, type déclaré, 10 Mo maximum) et référencé dans un registre en mémoire. L'outil le dit explicitement.
- Chaque constat (conforme, partiellement conforme, non conforme, non observable, non applicable) cite un support du registre et décrit un **fait observé** ; l'interprétation et l'hypothèse à vérifier sont des champs séparés.
- Un indice de cohérence n'est produit pour une dimension que si elle compte au moins 3 critères observés avec preuve, au moins 2 supports distincts et au moins la moitié des critères applicables observés ; Creative Distinctiveness exige en plus une référence concurrentielle. Aucun score global.
- Le rapport (A à H) n'affirme aucune certitude élevée, signale les catégories de supports non fournies et rappelle que l'observation de supports ne mesure pas la reconnaissance par les audiences.

## MAIORIS INTELLIGENCE CORE™ : synchronisation

- Désactivée par défaut. Si le visiteur coche « Conserver mon profil et mes résultats dans cet onglet », un profil limité (organisation, secteur, taille, marché, contact) avec identifiant, date et consentement, et un résumé par évaluation (outil, version, base « declared », date) sont conservés dans le `sessionStorage` du navigateur.
- Les outils reprennent le profil au lieu de le redemander, l'historique est conservé (une entrée par évaluation) et le panneau « Vos résultats dans cet onglet » consolide les cinq outils. Chaque outil garde sa méthodologie, ses réponses et sa version, et fonctionne sans le noyau.
- Ce n'est **pas** un stockage sécurisé et rien n'est conservé côté serveur.

## Ce qui n'existe pas encore (et ce qu'il faudrait configurer)

Le site n'a ni base de données, ni stockage de fichiers, ni authentification. Les fonctions suivantes de la spécification ne sont donc **pas** opérationnelles :

- profil organisationnel et historique durables côté serveur, consolidation entre appareils ;
- dépôt et conservation de documents clients, avec contrôle d'accès ;
- espace d'administration de consultation des évaluations (aujourd'hui : l'e-mail reçu via `/api/diagnostic`, avec consentement) ;
- politique de conservation et suppression automatisées côté serveur ;
- analyse automatique de documents (aucune intégration IA documentaire).

Pour les construire : Cloudflare R2 (fichiers) et D1 (profils, évaluations), Cloudflare Access (administration), un identifiant de profil signé, et un service d'analyse documentaire si souhaité. Tant que ce n'est pas configuré, le site ne prétend pas disposer de cette infrastructure.

## Avant chaque mise en ligne

```bash
node --test tests/*.test.js
python3 tools/qa.py
```

Le script doit afficher `0 erreur(s)`. Les avertissements sont à lire mais ne bloquent pas.

## Configuration Cloudflare Pages

Variables d'environnement : `RESEND_API_KEY` (clé en Full access), `CONTACT_TO`, `CONTACT_FROM`, `RESEND_AUDIENCE_ID` (et `RESEND_AUDIENCE_ID_EN` en option). Espace KV `RATE_KV` en option. Détail dans `site/README.md` et `newsletter/README.md`.

## Mesure d'audience

Chaque page charge le script Plausible (sans cookie). Il faut créer le site `maioris.net` dans le compte Plausible pour recevoir les données.
