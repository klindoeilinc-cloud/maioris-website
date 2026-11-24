# Performance : mesure du 24 novembre 2026

Mesure Lighthouse (mobile, réseau et processeur simulés) sur un serveur local, 5 pages représentatives. **Ce sont des mesures de laboratoire, pas des données réelles d'utilisateurs** : seule la Search Console (rapport Core Web Vitals) donnera les valeurs de terrain après quelques semaines de trafic.

| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Accueil FR | 94 | 100 | 96 | 100 | 2,9 s | 20 ms | 0,001 |
| Partners EN (avant) | 94 | 100 | 96 | 100 | 2,6 s | 0 ms | 0,007 |
| Partners EN (après) | 95 | 100 | 96 | 100 | 2,6 s | 0 ms | 0 |
| Marques et groupes FR | 94 | 100 | 96 | 100 | 2,6 s | 0 ms | 0 |
| Creative Audit EN | 98 | 100 | 96 | 100 | 2,1 s | 0 ms | 0 |
| Analyse FR (article) | 98 | 100 | 96 | 100 | 2,1 s | 0 ms | 0.001 |

Seuils « bon » de Google : LCP 2,5 s, CLS 0,1, INP 200 ms (l'INP ne se mesure qu'avec de vrais utilisateurs ; le temps de blocage total, proche de zéro, est un bon indice).

## Lecture
- **Accueil FR : LCP 2,9 s.** L'élément le plus grand est le titre principal, dont les mots apparaissent en animation : l'effet voulu retarde le moment où le titre est considéré comme affiché. Le serveur répond en 14 ms ; le délai vient de l'animation. À garder si l'effet fait partie de l'identité ; sinon, afficher le titre immédiatement ramènerait le LCP sous 2,5 s.
- **Compression :** l'audit signale 130 à 150 Ko à gagner par compression de texte. C'est un artefact du serveur local : en production, Cloudflare sert déjà ces fichiers compressés en Brotli (vérifié) et met en cache les fichiers versionnés un an.
- **Ressources bloquant l'affichage :** deux feuilles de style (le style commun et celui de la page). Le style commun contient aussi des règles d'autres pages (73 à 95 Ko non utilisés sur une page donnée). Le scinder en styles par type de page est possible mais risqué pour un gain modeste.

## Amélioration réalisée
Préchargement des polices Poppins (graisses 400 et 700) sur les pages Partners et Marques et groupes : premier affichage du texte 2,4 s → 2,1 s, décalage de mise en page ramené à 0.

## Limites
Mesure sur serveur local, en laboratoire. Pas de données de terrain. Pas de test sur Safari ni sur de vrais téléphones.
