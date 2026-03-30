## Import CSV Notion

Ces fichiers servent a creer rapidement les 4 bases attendues par la pipeline `Journal_ANNET`.

Fichiers fournis :

- `publications.csv`
- `agenda.csv`
- `cantine_scolaire.csv`
- `sections-site.csv`

Points a connaitre avant import :

- Le CSV ne peut pas fournir directement les relations Notion avec les IDs internes.
- Dans `agenda.csv` et `cantine_scolaire.csv`, la colonne `Publication liée (helper)` est un repere texte temporaire.
- Apres import, cree une vraie relation `Publication liée` vers la base `Publications`, reconnecte chaque ligne, puis supprime la colonne helper.
- Les images et fichiers ne sont pas importes via ces CSV. Ajoute-les ensuite directement dans Notion si tu veux utiliser `Image`, `Couverture` ou des blocs image.
- La base `Sections site` pilote surtout le contenu via la colonne `JSON`, deja pre-remplie avec les valeurs par defaut du site.
- La base Notion peut etre nommee `cantine_scolaire`, meme si la variable technique du projet reste `NOTION_MENU_ITEMS_DATA_SOURCE_ID`.

Ordre conseille :

1. importer `publications.csv`
2. convertir les types de colonnes utiles dans Notion (`select`, `status`, `date`, `number`, `checkbox`)
3. importer `agenda.csv` et `cantine_scolaire.csv`
4. creer les vraies relations vers `Publications`
5. importer `sections-site.csv`
