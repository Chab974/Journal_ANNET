# Le Petit Journal d'Annet

Site statique prêt pour GitHub Pages.

URL du site : https://chab974.github.io/Journal_ANNET/

## Fichiers

- `index.html` : page principale (Tailwind CDN + Chart.js)
- `data/citizen-posts.json` : flux de publications du portail citoyen rendu sur GitHub Pages
- `.github/workflows/deploy-pages.yml` : déploiement automatique GitHub Pages

## Portail citoyen

Le site contient désormais une rubrique `Portail Citoyen` alimentée par `data/citizen-posts.json`.

Workflow recommandé :

1. produire ou extraire le contenu en amont
2. convertir ce contenu dans le format JSON attendu
3. mettre à jour `data/citizen-posts.json`
4. pousser sur GitHub
5. laisser GitHub Pages republier le site

Ce choix garde l'affichage 100% compatible GitHub Pages.
L'analyse d'image et l'IA doivent rester hors du frontend public, puis publier le résultat final dans le JSON.

## Test local

Comme le portail charge `data/citizen-posts.json` via `fetch`, il faut tester avec un serveur HTTP local et non en ouvrant directement `index.html`.

Exemple :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000/`.

## Publication sur GitHub Pages

1. Poussez le dépôt sur GitHub avec une branche `main`.
2. Dans GitHub, ouvrez `Settings > Pages`.
3. Dans `Build and deployment`, choisissez `Source: GitHub Actions`.
4. Faites un `git push` sur `main` (ou lancez le workflow manuellement depuis `Actions`).

Le site est disponible ici : https://chab974.github.io/Journal_ANNET/
