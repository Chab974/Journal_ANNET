# Le Petit Journal d'Annet

Site statique prêt pour GitHub Pages.

## Fichiers

- `index.html` : page principale (Tailwind CDN + Chart.js)
- `.github/workflows/deploy-pages.yml` : déploiement automatique GitHub Pages

## Publication sur GitHub Pages

1. Poussez le dépôt sur GitHub avec une branche `main`.
2. Dans GitHub, ouvrez `Settings > Pages`.
3. Dans `Build and deployment`, choisissez `Source: GitHub Actions`.
4. Faites un `git push` sur `main` (ou lancez le workflow manuellement depuis `Actions`).

Le site sera ensuite disponible à l'URL GitHub Pages du dépôt.
