# Fly Atlas — neuroflyatlas.pages.dev

Atlas anatomique 3D du système nerveux central mâle de *Drosophila melanogaster*
(connectome MaleCNS · FlyEM / HHMI Janelia, licence CC BY 4.0).
Site statique : HTML + CSS + JavaScript vanilla + three.js. Aucune clé API, aucun backend.

## Structure

```
index.html                  Page principale (SPA)
style.css                   Styles (thème sombre, responsive, contrastes WCAG)
app.js                      Logique de la carte 3D et de l'inspecteur de neurones
atlas-layers.js             Chargement des régions anatomiques et synapses
404.html                    Page 404 custom (servie avec le statut 404)
confidentialite.html        Politique de confidentialité / RGPD
mentions-legales.html       Mentions légales & CGU
_headers                    En-têtes de sécurité (HSTS, CSP…) + règles de cache
_redirects                  Routes propres (/confidentialite, /rgpd, /cgu…)
sitemap.xml · robots.txt    SEO
favicon.svg · apple-touch-icon.png · og-image.jpg   Icônes & image de partage
vendor/                     three.module.js + OrbitControls.js (inchangés)
data/                       neurons.json, regions/index.json, synapse-info.json,
                            neuroglancer-scene.json
data-regions-*.bin          Maillages des régions (à la racine, inchangés)
```

> Note copie de travail : `data/neurons.json` et les `data-regions-*.bin` ne sont pas
> dupliqués dans cette copie (fichiers lourds déjà présents dans le repo d'origine et
> sur le déploiement). Les correctifs portent uniquement sur le code et la config.

## Déploiement

Cloudflare Pages (build : aucun — déploiement statique direct du dossier racine).
Chaque push sur la branche principale redéploie automatiquement.

## Lancer en local

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## Mesure d'audience

Cloudflare Web Analytics (sans cookies) : jeton à renseigner dans `index.html`
(rechercher `REMPLACER_PAR_VOTRE_TOKEN`). Dashboard Cloudflare → zone → Web Analytics.

## À compléter avant mise en ligne des pages légales

Rechercher `À COMPLÉTER` dans `confidentialite.html` et `mentions-legales.html`
(nom/entité, email de contact, date, droit applicable).
