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
- `site/functions/_lib/editorial/`, `site/functions/[lang]/perspectives/[[path]].js`, `site/admin/editorial.html` : section éditoriale **STRATEGIC CASES & PERSPECTIVES** (voir plus bas). `tools/build_editorial_shell.py` génère ses gabarits statiques (`site/editorial-shell/`), `tools/build_editorial_demo.js` ses exemples fictifs (`d1/demo/`).
- `site/functions/_lib/editorial/image.js` (analyse et nettoyage des images), `media.js` (R2 et registre), `site/functions/media/[id].js` (lecture publique), `d1/migrations/0004_media.sql`.
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
python3 tools/build_editorial_shell.py
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

## Base de données D1 `maioris-intelligence` (binding `MAIORIS_DB`)

**Ce qui est enregistré** : seulement les évaluations transmises avec consentement (`/api/diagnostic`) : profil et contact (tables séparées), libellé exact du consentement, évaluation (version du questionnaire, réponses, indicateurs), rapport texte. Aucune adresse IP. Les trois outils concernés sont Creative Operations Intelligence™, Creative Maturity Assessment™ et Brand Consistency Review™. Le brief et l'autodiagnostic n'envoient rien (le schéma est prêt à les accueillir).

**Fichiers**
- `d1/migrations/0001_core.sql` : schéma (13 tables), strictement additif (`CREATE ... IF NOT EXISTS`).
- `d1/migrations/0002_reference_data.sql` : outils, versions de questionnaires avec empreinte, libellés de consentement, durées de conservation. **Généré** par `node tools/export_d1_seed.js` ; ne jamais le modifier à la main ni le régénérer après application. Une nouvelle version de questionnaire ou de libellé s'ajoute par une **nouvelle** migration (`0003_...`, `INSERT OR IGNORE`).
- `site/functions/_lib/` : code commun (identifiants ULID, persistance, effacement, purge, contrôle d'accès). `site/functions/api/erase.js` et `site/functions/api/admin/[[path]].js` : effacement par le visiteur et API d'administration.

**Appliquer les migrations** (une seule fois, dans l'ordre). Deux possibilités :
1. Tableau de bord Cloudflare > Storage & Databases > D1 > `maioris-intelligence` > Console : coller le contenu de `0001_core.sql`, exécuter, puis `0002_reference_data.sql`.
2. En ligne de commande : renseigner `database_id` dans `d1/wrangler.toml`, puis `cd d1 && npx wrangler d1 migrations apply maioris-intelligence --remote`. Ce fichier est dans un sous-dossier : il n'est pas lu par Cloudflare Pages, dont les bindings du tableau de bord restent la référence.

Vérification : `SELECT id, version FROM questionnaire_versions;` doit renvoyer cinq lignes.

**Environnements.** Production : binding `MAIORIS_DB` lié. Prévisualisation (branches) : sans binding, `/api/diagnostic` envoie seulement l'e-mail, comme avant (rien n'est conservé). Pour tester la conservation en prévisualisation, créer une seconde base (par exemple `maioris-intelligence-preview`) et la lier à l'environnement Preview : ne pas réutiliser la base de production.

## Administration (`/admin`)

Page `site/admin/index.html` et API `/api/admin/*`. L'API vérifie elle-même le jeton signé de Cloudflare Access : **sans configuration, tout est refusé (503), jamais ouvert.** Configuration :
1. Zero Trust > Access > Applications > Add > Self-hosted : domaine `maioris.net`, chemins `/admin` et `/api/admin`. Politique : Allow, adresses e-mail des administrateurs.
2. Relever le **Application Audience (AUD) Tag** de l'application et le **domaine d'équipe** (`xxx.cloudflareaccess.com`).
3. Pages > Settings > Environment variables (Production) : `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, et facultativement `ADMIN_EMAILS` (liste séparée par des virgules, restreint en plus à ces adresses).

Chaque consultation de détail, export, effacement et purge est inscrit dans `audit_events` (adresse de l'administrateur, date, objet).

## Conservation et purge

Durées dans `retention_policies` (initialement 365 jours pour les évaluations, les rapports et les documents, 730 jours pour le journal). L'effacement garde une ligne technique (identifiants, outil, dates) sans donnée personnelle. Le visiteur peut effacer ses données (`/api/erase`, avec le jeton de reprise reçu à l'envoi) ; un administrateur peut effacer un profil ou purger depuis `/admin`.

**Purge planifiée.** Cloudflare Pages ne lance pas de tâche planifiée : `workers/purge/` est un petit Worker (cron quotidien, 03h17 UTC) à déployer à part : renseigner `database_id` dans `workers/purge/wrangler.toml`, puis `cd workers/purge && npx wrangler deploy`. Sans lui, la purge reste possible manuellement depuis `/admin`.

## État des fonctions de la spécification

| Fonction | État |
|---|---|
| Profil et historique durables côté serveur (consentis) | Opérationnel après application des migrations (testé sur SQLite local, pas sur le D1 de Cloudflare) |
| Consultation par MAIORIS (administration, export, journal) | Opérationnel après configuration de Cloudflare Access |
| Effacement par le visiteur, purge à l'expiration | Opérationnel (la purge automatique demande le Worker ci-dessus) |
| Consolidation entre appareils, lien de reprise par e-mail | **Non réalisé** (le jeton existe, pas l'envoi du lien) |
| Brief et autodiagnostic conservés côté serveur | **Non réalisé** (pas de consentement ni de contact dans ces outils) |
| Dépôt et conservation de documents clients (R2) | **Non réalisé** (la table `documents` est prête, aucun fichier n'est reçu) |
| Analyse automatique de documents | **Non réalisé** et non prévu sans décision explicite |

## STRATEGIC CASES & PERSPECTIVES (plateforme éditoriale)

> **État actuel : section retirée du site public.** Les pages « Strategic Cases » (4 études) et « Strategic Cases & Perspectives » ont été supprimées du site. Leurs adresses renvoient vers MAIORIS Insights (redirections 301 dans `site/_redirects` pour les cas, redirection temporaire 302 pour `/fr/perspectives` et `/en/perspectives`). Le **moteur éditorial reste en place, inchangé et inactif côté public** : back-office, base, images, règles de publication, aperçu. Les tables restent dans la base D1 ; rien n'a été supprimé.
>
> **Pour réactiver la partie publique :** (1) définir la variable `EDITORIAL_PUBLIC` à `1` dans le projet Pages ; (2) ajouter un lien vers `/fr/perspectives` (et `/en/perspectives`) dans le pied de page ; (3) ajouter `Sitemap: https://maioris.net/sitemap-perspectives.xml` à `site/robots.txt` ; (4) relancer un déploiement. Les pages « Strategic Cases » supprimées sont récupérables dans l'historique Git (PR 24 à 30).

Section servie en direct depuis la base D1 par une Pages Function (`/fr/perspectives`, `/en/perspectives`, rubriques et articles), avec l'en-tête et le pied de page du site. Identité propre à la section (palette Soft Cream, Deep Navy, Cobalt, Solar Yellow, Coral, Emerald ; Poppins auto-hébergée) : `src/editorial/editorial.css`, limitée à la classe `.ed`. Le reste du site ne change pas.

**Contenu.** Cinq rubriques permanentes et six formats (Strategic Case, Executive Brief, Deep Perspective, Market Signals, Strategic Framework, Future Outlook), définis dans `site/functions/_lib/editorial/taxonomy.js` et contrôlés en base. Ils s'attribuent aux publications, ils ne se créent pas depuis l'interface. Chaque publication affiche son format et son temps de lecture (calculé à 220 mots par minute).

**Back-office** : `/admin/editorial.html` (protégé par Cloudflare Access, voir la section Administration). Statuts Draft, In Review, Approved, Published, Archived ; transitions contrôlées (on ne publie qu'un contenu approuvé) ; brouillons enregistrés avec historique des versions ; aperçu non indexable ; publication programmée (une date future rend le contenu visible à l'échéance, sans tâche planifiée) ; dépublication immédiate ; versions française et anglaise ; sources numérotées ; articles associés ; à la une et Strategic Selection ; métadonnées SEO.

**Règles de publication** (`gate.js`) : la mise en ligne est refusée tant que la grille de qualité interne n'atteint pas **85 sur 100** (jamais affichée au public), que les métadonnées sont incomplètes, qu'un chiffre n'est ni sourcé ni présenté comme hypothèse, qu'une citation `[^n]` n'a pas de source, qu'une source n'est pas consultable (https) ou, pour une étude de cas, qu'il manque les blocs faits vérifiés, analyse, hypothèses et questions ouvertes ou deux sources. Une publication en ligne reste soumise à ces règles à chaque modification, et son adresse ne change plus.

**Rédaction.** Markdown restreint, sans HTML brut (tout est échappé) : `##` et `###`, listes, citations, `**gras**`, liens http(s) ou internes, images de `/assets/` ou https avec texte alternatif, `[^n]` pour les sources, et les blocs `:::facts`, `:::analysis`, `:::hypotheses`, `:::questions`, `:::insight` fermés par `:::`.

**Outils MAIORIS.** Chaque article peut suggérer **un seul** outil, choisi à la main, uniquement s'il répond au sujet traité. Le Creative Audit™ n'apparaît qu'en mention discrète (tarif officiel de 750 000 FCFA).

**Mise en route.** Appliquer `d1/migrations/0003_editorial.sql` (comme les deux premières, voir la section D1). Sans cette migration, `/fr/perspectives` s'affiche sans publication et renvoie vers les archives. Les exemples fictifs (`d1/demo/editorial_demo.sql`, marqués `is_demo`) **ne se chargent jamais en production** : ils servent à une base de test ou de prévisualisation (bandeau « Exemple éditorial fictif », jamais indexés, absents du plan du site). Plan du site : `/sitemap-perspectives.xml`, déclaré dans `robots.txt`.

**Limites connues.** Une seule personne ou plusieurs adresses autorisées avec les mêmes droits : pas de rôles distincts (rédacteur, relecteur, éditeur). La lettre éditoriale utilise le même formulaire et la même audience Resend que la lettre existante. Les images se gèrent dans la bibliothèque (section suivante).

## Images éditoriales (stockage R2)

Les images se téléversent depuis le back-office (bouton « Choisir ou téléverser l'image principale » et bouton « Image » de la barre d'outils du texte). Elles sont stockées dans un bucket **R2 privé** et servies par la fonction `/media/<id>`.

**Mise en route.**
1. Cloudflare > Storage & Databases > R2 > Create bucket (par exemple `maioris-media`). **Ne pas activer l'accès public ni le domaine r2.dev** : le bucket reste privé, seule la fonction le lit.
2. Pages > Settings > Bindings (Functions) > Add > R2 bucket : nom de variable **`MAIORIS_MEDIA`**, bucket choisi, en Production. Pour la prévisualisation, lier un second bucket de test plutôt que celui de production.
3. Appliquer `d1/migrations/0004_media.sql` (registre des images, voir la section D1).
Sans le binding, la bibliothèque s'ouvre mais le téléversement est refusé avec un message clair, et les publications sans image continuent de fonctionner.

**Règles (côté serveur, non contournables depuis l'interface).**
- Formats JPEG, PNG, WebP. Le type est déterminé sur les **octets du fichier** : l'extension et le type déclaré par le navigateur sont ignorés. **SVG et GIF refusés** (le SVG peut contenir du script).
- 5 Mo au maximum, 6000 pixels au maximum sur un côté, 30 millions de pixels au maximum. Un fichier tronqué, corrompu ou suivi de données parasites est refusé.
- **Métadonnées retirées avant stockage** (EXIF et GPS, commentaires, IPTC, XMP, textes PNG) sans ré-encoder l'image : aucune perte de qualité. Profils colorimétriques conservés.
- **Texte alternatif obligatoire** (3 à 300 caractères). Un doublon exact (même fichier) n'est stocké qu'une fois. 1000 images au plus.
- Identifiants aléatoires et non devinables. Seul un identifiant du registre est lisible : jamais de chemin libre. Une image supprimée disparaît de R2 et du registre ; la suppression est **refusée tant qu'une publication l'utilise** (image principale ou texte).
- Tout est journalisé (`audit_events`) avec l'adresse de l'administrateur. Réponses publiques : `Cache-Control` d'un an en `immutable`, `nosniff`, politique de sécurité qui interdit toute exécution.

**À savoir.** Une image téléversée mais encore utilisée par un brouillon est lisible par quiconque connaît son adresse (non devinable, jamais indexée) : n'y mettez pas d'information confidentielle. Pas de redimensionnement automatique : téléversez une image à la bonne taille (1600 à 2400 px de large suffisent pour l'image principale). Les en-têtes de sécurité des pages dynamiques sont posés par les fonctions (`_lib/security.js`), car Cloudflare n'applique pas `_headers` aux réponses des Functions.

## Avant chaque mise en ligne

```bash
node --test tests/*.test.js
python3 tools/qa.py
```

Le script doit afficher `0 erreur(s)`. Les avertissements sont à lire mais ne bloquent pas.

## Configuration Cloudflare Pages

Variables d'environnement : `RESEND_API_KEY` (clé en Full access), `CONTACT_TO`, `CONTACT_FROM`, `RESEND_AUDIENCE_ID` (et `RESEND_AUDIENCE_ID_EN` en option). Espace KV `RATE_KV` en option. Détail dans `site/README.md` et `newsletter/README.md`.

**PDF joint aux e-mails reçus.** Chaque envoi d'un visiteur (formulaire de qualification, résultat d'un outil de diagnostic, inscription à la lettre) arrive à `CONTACT_TO` avec un PDF structuré en pièce jointe, au logo et aux couleurs MAIORIS : tout ce que le visiteur a saisi, sans modification. Généré dans la fonction (`site/functions/_lib/pdf.js`, sans dépendance). Si la génération échoue, l'e-mail part quand même, sans pièce jointe. L'inscription à la lettre n'est notifiée à l'équipe que si `CONTACT_TO` est défini.

## Mesure d'audience

Chaque page charge le script Plausible (sans cookie). Il faut créer le site `maioris.net` dans le compte Plausible pour recevoir les données.

## MAIORIS Partners (agences indépendantes)

Page d'offre `/en/partners` et `/fr/partenaires`, ajoutée à la navigation et au pied de page de toutes les pages publiques. Quatre offres (Agency Creative Audit 800 000 FCFA, Creative Operating System 2 300 000 FCFA, Fractional Creative Leadership 1 000 000 FCFA par mois avec engagement initial de trois mois, AI Creative Transformation 1 650 000 FCFA), trois parcours (Diagnose & Decide, Restructure & Optimize à 3 000 000 FCFA au lieu de 3 100 000, Strategic Partner), trois modèles de collaboration, périmètre « ce que nous faisons / ne faisons pas ». Aucun client, résultat chiffré ni témoignage inventé ; aucun symbole ™ (retiré du site à la demande).

- Source : `tools/build_partners_pages.py` (contenu FR et EN, tarifs dans `PRICES`, vérifiés par `tests/partners.test.js`), style `src/partners/partners.css` (bundle `partners.<empreinte>.css`, Poppins hébergée). Régénérer : `python3 tools/build_partners_pages.py && python3 tools/build_assets.py`.
- Formulaire : `POST /api/partners` (`site/functions/api/partners.js`). Mêmes variables que le formulaire de contact (`RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, `RATE_KV` en option). L'équipe reçoit l'e-mail avec le PDF structuré joint, le visiteur un accusé avec le lien de réservation existant. Un échec d'envoi renvoie une erreur : le formulaire ne confirme jamais une demande non transmise.
- Tests : `tests/partners.test.js`, `tests/partners-api.test.js`, e2e `node tests/e2e/partners.e2e.js`.
- Le menu principal passe en mode « burger » sous 1240 px (au lieu de 1100) pour absorber le nouvel élément.
