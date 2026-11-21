# maioris.net

Site statique bilingue (français principal, anglais), servi par Cloudflare Pages. Aucun framework, aucune dépendance de build.

## Structure

- `site/` : le site publié. **C'est la source de vérité.** Les pages HTML sont éditées directement.
- `tools/qa.py` : contrôle qualité automatique (liens, ancres, titres uniques, hreflang réciproques, JSON-LD, images sans alt, tirets, sitemap, redirections).
- `newsletter/` : mode d'emploi et modèles de la lettre MAIORIS Insights (non publié).

## Avertissement : ne pas régénérer le site depuis un ancien générateur

`site/README.md` mentionne des fichiers `content.py` et `build.py`. Ils ne sont pas dans ce dépôt. Les pages ont été modifiées directement depuis (analyses, FAQ, niveaux d'accompagnement, cas stratégiques, version anglaise, outil, formulaire, etc.). Régénérer le site depuis l'ancien générateur **effacerait ces modifications**.

## Avant chaque mise en ligne

```bash
python3 tools/qa.py
```

Le script doit afficher `0 erreur(s)`. Les avertissements sont à lire mais ne bloquent pas.

## Configuration Cloudflare Pages

Variables d'environnement : `RESEND_API_KEY` (clé en Full access), `CONTACT_TO`, `CONTACT_FROM`, `RESEND_AUDIENCE_ID` (et `RESEND_AUDIENCE_ID_EN` en option). Espace KV `RATE_KV` en option. Détail dans `site/README.md` et `newsletter/README.md`.

## Mesure d'audience

Chaque page charge le script Plausible (sans cookie). Il faut créer le site `maioris.net` dans le compte Plausible pour recevoir les données.
