# maioris.net

Site statique bilingue (français principal, anglais), servi par Cloudflare Pages. Aucun framework, aucune dépendance de build.

## Structure

- `site/` : le site publié. **C'est la source de vérité.** Les pages HTML sont éditées directement.
- `tools/build_assets.py` : publie le CSS et le JavaScript partagés (nom versionné).
- `tools/qa.py` : contrôle qualité automatique (liens, ancres, titres uniques, hreflang réciproques, JSON-LD, images sans alt, tirets, sitemap, redirections).
- `src/coi/` : sources de l'outil **Creative Operations Intelligence™** (`data.js` questions, `calc.js` formules et validations, `report.js` textes et rapport, `app.js` interface, `coi.css`). `build_assets.py` les assemble en `site/assets/coi.<empreinte>.js` et `.css`.
- `tools/build_coi_pages.py` : génère les deux pages de l'outil (FR et EN) à partir du gabarit du site.
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
python3 tools/sync_tools.py
python3 tools/build_assets.py
node --test tests/*.test.js
python3 tools/qa.py
```

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
