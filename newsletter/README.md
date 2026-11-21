# Lettre MAIORIS Insights : mode d'emploi

Ce dossier n'est pas publié sur le site. Il décrit comment envoyer la lettre mensuelle.

## Mise en place (une seule fois)

1. Dans Resend, créer une audience (par exemple « MAIORIS Insights ») et copier son identifiant.
2. Dans Cloudflare Pages, Settings, Environment variables : ajouter `RESEND_AUDIENCE_ID` avec cet identifiant.
   Option : `RESEND_AUDIENCE_ID_EN` pour une audience séparée des lecteurs anglophones.
   `RESEND_API_KEY` et `CONTACT_FROM` existent déjà pour le formulaire de contact.
3. Redéployer le site, puis s'inscrire soi-même avec une adresse de test : le contact doit apparaître dans l'audience Resend et un e-mail de bienvenue doit arriver.

## Chaque mois

1. Dans Resend, ouvrir Broadcasts, créer une diffusion, choisir l'audience.
2. Coller le contenu de `modele-lettre-fr.html` (ou `-en.html`) et remplacer le titre, l'extrait, la citation et les liens par ceux de l'analyse du mois. Le modèle est pré-rempli avec la première analyse.
3. Conserver le lien `{{{RESEND_UNSUBSCRIBE_URL}}}` en bas de lettre : Resend le remplace par un lien de désinscription propre à chaque lecteur. Il est obligatoire.
4. Envoyer un test à soi-même, vérifier sur mobile, puis programmer ou envoyer.

## À vérifier avant le premier envoi

- Le domaine d'envoi est vérifié dans Resend (c'est déjà le cas pour le formulaire de contact).
- La page de confidentialité (`fr/confidentialite`, `en/privacy`) décrit bien votre pratique : durée de conservation et prestataire.
