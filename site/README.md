# MAIORIS.NET 2.0 — mise en ligne

> Important : ce dépôt ne contient pas le générateur (`content.py`, `build.py`) cité plus bas. Les pages sont éditées directement dans ce dossier. Voir le README à la racine du dépôt.

Site statique bilingue (français principal, anglais disponible), sans framework ni dépendance.

## Contenu du dossier

- `en/`, `fr/` : 18 pages par langue (accueil, enjeux, accompagnement + 6 offres, système d'intelligence, secteurs, références + 2 cas, analyses, à propos, contact, confidentialité).
- `index.html` : page d'accueil française servie à la racine (sélecteur FR / EN dans l'en-tête).
- `404.html` : page d'erreur bilingue.
- `assets/` : `site.css`, `site.js`, favicon, images Open Graph.
- `sitemap.xml`, `robots.txt`, `_headers` (en-têtes de sécurité), `_redirects` (anciennes URL → nouvelles).
- `functions/api/contact.js` : réception du formulaire (Cloudflare Pages Function).
- `functions/api/subscribe.js` : inscription à la lettre MAIORIS Insights (Cloudflare Pages Function, Resend).

## Déploiement recommandé : Cloudflare Pages

Le site actuel est déjà servi via Cloudflare (robots.txt géré par Cloudflare), d'où ce choix.

1. Créer un projet Cloudflare Pages, « Direct upload » de ce dossier (ou dépôt Git).
2. Dans Settings › Environment variables, ajouter :
   - `RESEND_API_KEY` (secret) — compte gratuit sur resend.com, domaine maioris.net vérifié ;
   - `CONTACT_TO` = hello@maioris.net ;
   - `CONTACT_FROM` = `MAIORIS <site@maioris.net>`.
3. Lettre MAIORIS Insights (`functions/api/subscribe.js`) : ajouter `RESEND_AUDIENCE_ID` (identifiant de l'audience Resend qui reçoit les inscriptions). Optionnel : `RESEND_AUDIENCE_ID_EN` pour une audience distincte des inscriptions faites depuis les pages en anglais.
4. Optionnel : lier un espace KV nommé `RATE_KV` (limite de 5 envois par heure et par IP, partagée par le formulaire de contact et l'inscription à la lettre).
5. Rattacher le domaine maioris.net au projet.
6. Mesure d'audience : ajouter dans chaque page, avant `</head>`, le script Plausible
   `<script defer data-domain="maioris.net" src="https://plausible.io/js/script.tagged-events.js"></script>`.
   Les événements (cta_click, contact_start, contact_step, contact_submit, service_engaged, case_engaged, lang_switch) sont déjà émis par `site.js`.

Sans les variables d'environnement, le formulaire affiche un message d'erreur et l'adresse e-mail : il ne prétend jamais avoir envoyé.

## Modifier les contenus

Les textes sont générés depuis `content.py` et `build.py` (dossier source), puis `python3 build.py`.
Les éléments surlignés en rouge pointillé sur le site (`mark.todo`) doivent être complétés avant la mise en ligne.

## Photos

Déposer chaque photo dans `source/static/assets/photos/` sous le nom indiqué, puis relancer `python3 build.py`.
Les photos d'ambiance reçoivent automatiquement un traitement bleu MAIORIS ; le portrait et les visuels de cas gardent leurs couleurs.
Format conseillé : JPG, 2400 px de large, moins de 400 Ko (compresser avec squoosh.app).

| Fichier | Où | Sujet |
| --- | --- | --- |
| abidjan-plateau.jpg | Accueil (sous le titre) | Le Plateau vu depuis la lagune, cadrage large |
| architecture.jpg | Accueil, Système d'intelligence | Façade contemporaine ou brise-soleil, sans personnes |
| travail.jpg | Accompagnement, pages offre, Références | Séance de travail : mains, documents, tableau, sans regard caméra |
| ville.jpg | Enjeux, À propos | Rue, pont ou trafic d'Abidjan, contemporain |
| marche.jpg | Secteurs | Port, commerce, distribution ou bureaux |
| fondateur.jpg | À propos (vertical 4:5) | Portrait professionnel de Marko Leo |
| sociam.jpg | Références, cas SOCIAM | Visuel réel du travail SOCIAM |
| veone.jpg | Références, cas VeOne | Capture d'une réalisation VeOne |

Sources libres de droits pour usage commercial : unsplash.com et pexels.com (vérifier la licence de chaque photo).

## Version publication et version de relecture

- `python3 build.py` produit la version publication : aucun repère « à compléter » n'est visible. Toute information manquante est simplement retirée (ligne, rangée ou section), et la rubrique Analyses est masquée tant qu'aucun article n'existe.
- `python3 build.py --preview` produit la version de relecture : les informations manquantes apparaissent surlignées en rouge pointillé.
- Chaque information ajoutée dans `content.py` ou `build.py` réapparaît automatiquement à la génération suivante.

### Informations retirées en attendant vos contenus
- LinkedIn page URL (footer)
- Legal entity and registration number (footer)
- URL de la page LinkedIn (footer)
- Raison sociale et RCCM (footer)
- Sector (sociam)
- Dates (sociam)
- Two sentences on SOCIAM and its situation at the start (sociam)
- Verified results, or remove this section (sociam)
- Secteur (sociam)
- Deux phrases sur SOCIAM et sa situation de départ (sociam)
- Résultats vérifiés, ou retirer cette section (sociam)
- Confirm figure and permission to publish (veone)
- Confirmer le chiffre et l'autorisation de publier (veone)
- Budget ranges in FCFA and USD (contact)
- Response time to announce (contact)
- Tranches de budget en FCFA et USD (contact)
- Délai de réponse à annoncer (contact)
- Legal form, registration number and address (privacy)
- Forme juridique, RCCM et adresse (privacy)
- Durée de conservation des données : texte générique publié (« le temps nécessaire au traitement de la demande »), à confirmer
- Rubrique Analyses : à réactiver dès les trois premiers articles
