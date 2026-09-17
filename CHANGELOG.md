# Changelog — kit de lancement (18/09/2026)

Correctifs appliqués d'après l'audit des « 20 points de vérification avant lancement ».

| # | Point | Correctif |
|---|-------|-----------|
| 1 | Page RGPD | Nouvelle page `confidentialite.html` (données, cookies, analytics, droits, hébergeur) |
| 2 | CGU / mentions | Nouvelle page `mentions-legales.html` (éditeur, hébergeur, licence CC BY 4.0, CGU) |
| 4 | HTTPS | Déjà OK (301) ; **HSTS ajouté** via `_headers` (`max-age=2 ans, includeSubDomains, preload`) |
| 6/7 | Meta & image réseaux | `og:image` + `og:image:width/height/alt`, `twitter:card=summary_large_image`, `twitter:image` → `og-image.jpg` (1200×630, 114 Ko) |
| 8 | Favicon | Fichiers réels `favicon.svg` + `apple-touch-icon.png` (remplace la data-URI ; `/favicon.ico` ne renvoie plus du HTML) |
| 9 | Sitemap | `sitemap.xml` mis à jour (accueil + 2 pages légales, lastmod 2026-09-18) |
| 12 | Vitesse | `_headers` : cache `immutable` 1 an sur `/data/*`, `/data-regions-*`, `/vendor/*` ; revalidation 1 h sur CSS/JS ; `preload` de `neurons.json` |
| 13 | Contraste | Séparateur `.header-meta span` #455964 → #6b7f8c (2,7:1 → 4,7:1) ; couleur de placeholder explicite #7d909c |
| 15 | 404 | `404.html` custom + retrait du catch-all SPA : les URLs inconnues renvoient un vrai statut 404 ; alias `/rgpd`, `/privacy`, `/cgu`, `/terms` dans `_redirects` |
| 19 | Analytics | Script Cloudflare Web Analytics (sans cookies → pas de bannière cookies), token à renseigner |
| 20 | CTA unique | « Outil scientifique externe ↗ » rétrogradé en bouton secondaire (le CTA principal reste la recherche/exploration) |
| + | Sécurité (bonus) | `_headers` : CSP complète, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| + | Navigation | Liens Confidentialité / Mentions légales ajoutés au footer de toutes les pages |

## Non modifié (déjà conforme)

robots.txt, meta title/description/canonical/JSON-LD, validation du formulaire
(regex `^\d+$` + messages d'erreur explicites), absence de cookies/trackers,
liens externes valides, responsive (4 breakpoints), accessibilité de base
(aria-live, focus visibles, prefers-reduced-motion).

## Prochaines étapes suggérées (hors kit)

- Convertir `data/neurons.json` (2,7 Mo gzip) en binaire quantifié type Float16/Int16
  (+ division par ~5 du poids) — chantier perf dédié.
- Renseigner les placeholders `À COMPLÉTER` des pages légales.
- Renseigner le token Cloudflare Web Analytics dans `index.html`.
