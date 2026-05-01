# RTK - Journal ANNET

Objectif: garder les consignes projet courtes et utiliser le vault Obsidian commun `~/Documents/Codex` comme memoire durable.

## Lecture de demarrage

1. Lire `AGENTS.md`.
2. Lire `~/Documents/Codex/wiki/hot.md`.
3. Lire `~/Documents/Codex/wiki/index.md`.
4. Lire `~/Documents/Codex/wiki/sources/project-journal-annet.md` pour le contexte projet.
5. Lire uniquement les fichiers projet pertinents.

## Pipeline

- Source de verite: Notion.
- Snapshots generes: `data/*.json`.
- Build: Eleventy vers `_site/`.
- Production: Vercel.
- Demo publique: GitHub Pages.

## Commandes utiles

- `npm run validate:snapshots`
- `npm run build`
- `npm test`
- `npm run sync:notion` quand l'acces Notion est requis.

## Graphify

Graphify reste manuel. Lancer `$graphify .` ou `$graphify . --update` seulement quand une carte du projet doit etre creee ou rafraichie.
