## Import CSV Notion

Ces fichiers servent a creer rapidement les 4 bases attendues par la pipeline `Journal_ANNET`.
Ils sont regenes a partir des snapshots versionnes dans `data/`.

Commande de regeneration :

```bash
npm run generate:notion-imports
```

Sources utilisees :

- `data/publications.json`
- `data/agenda.json`
- `data/cantine.json`
- `data/site-sections.json`

Fichiers fournis :

- `publications.csv`
- `agenda.csv`
- `cantine_scolaire.csv`
- `sections-site.csv`

Points a connaitre avant import :

- `Publications` reste la base centrale multi-type (`cantine`, `alerte`, `evenement`, `info`, `coup_de_coeur`).
- `Agenda`, `cantine_scolaire` et `Sections site` restent des bases separees car elles portent des structures differentes.
- Le CSV ne peut pas fournir directement les relations Notion avec les IDs internes.
- Dans `agenda.csv` et `cantine_scolaire.csv`, la colonne `Publication liée (helper)` est un repere texte temporaire.
- Dans `cantine_scolaire.csv`, la colonne `Date` est exportee au format date (`YYYY-MM-DD`) quand une vraie semaine de reference est connue.
- Si les snapshots ne portent plus ces dates, le generateur tente de les restaurer depuis l'historique/version precedente de `publications.csv`.
- Apres import, cree une vraie relation `Publication liée` vers la base `Publications`, reconnecte chaque ligne, puis supprime la colonne helper.
- Les images et fichiers ne sont pas importes via ces CSV. Ajoute-les ensuite directement dans Notion si tu veux utiliser `Image`, `Couverture` ou des blocs image.
- La base `Sections site` pilote surtout le contenu via la colonne `JSON`, deja pre-remplie avec les valeurs par defaut du site.
- La base Notion peut etre nommee `cantine_scolaire`, meme si la variable technique du projet reste `NOTION_MENU_ITEMS_DATA_SOURCE_ID`.
- `Ordre manuel`, `Ordre`, `Ordre jour` et certaines lignes speciales de cantine sont reconstruits automatiquement pendant la generation.

Ordre conseille :

1. importer `publications.csv`
2. convertir les types de colonnes utiles dans Notion (`select`, `status`, `date`, `number`, `checkbox`)
3. importer `agenda.csv` et `cantine_scolaire.csv`
4. creer les vraies relations vers `Publications`
5. importer `sections-site.csv`
