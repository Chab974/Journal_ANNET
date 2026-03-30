# Journal ANNET
https://chab974.github.io/Journal_ANNET/index.html#diffusion

Guide complet de la chaîne éditoriale `Notion -> snapshots -> Eleventy -> GitHub Pages`.

Ce dépôt sert à publier un site statique public avec des contenus saisis dans Notion, transformés en snapshots JSON au build, puis rendus en HTML par Eleventy.

Les URLs publiques restent inchangées :

- `index.html`
- `portail.html`
- `agenda.html`

Le but de cette architecture est simple :

- supprimer la mise à jour manuelle des JSON
- garder un site 100% statique côté GitHub Pages
- garder le design et l'UX existants
- automatiser la republication quand Notion change

## 1. Comprendre le fonctionnement global

Le pipeline fonctionne en 5 étapes :

1. Les contenus sont saisis dans 4 data sources Notion.
2. Un script Node interroge Notion et génère 4 snapshots dans `data/`.
3. Eleventy lit ces snapshots et produit les pages finales dans `_site/`.
4. GitHub Actions publie `_site/` sur GitHub Pages.
5. Un webhook Vercel reçoit les événements Notion et déclenche le workflow GitHub.

En clair :

- Notion est la source de vérité éditoriale.
- `data/*.json` sont les artefacts de travail générés.
- Eleventy est le moteur de rendu.
- GitHub Pages ne sert que les fichiers statiques.
- Vercel ne sert qu'au webhook.

## 2. Ce que contient le dépôt

### Pages et rendu

- `src/index.njk` : source Eleventy de `index.html`
- `src/portail.njk` : source Eleventy de `portail.html`
- `src/agenda.njk` : source Eleventy de `agenda.html`
- `eleventy.config.js` : configuration Eleventy

### Données générées

- `data/publications.json` : publications complètes pour le portail
- `data/agenda.json` : événements pour l'agenda
- `data/menus.json` : reconstruction des menus
- `data/site-sections.json` : contenu structuré des grandes sections du site

Compatibilité conservée avec l'ancien frontend :

- `data/citizen-posts.json`
- `data/calendar-events.json`

Ces deux fichiers sont maintenant des copies de compatibilité. Ils ne doivent plus être édités à la main.

### Scripts

- `scripts/sync-notion.mjs` : synchronise Notion vers les snapshots
- `scripts/validate-snapshots.mjs` : vérifie la cohérence métier des snapshots
- `scripts/lib/notion/snapshot-builders.mjs` : logique de transformation Notion -> site
- `scripts/lib/notion/blocks.mjs` : conversion des blocs Notion en HTML
- `scripts/lib/notion/media.mjs` : gestion des médias Notion
- `scripts/lib/notion/webhook.mjs` : signature et filtrage des webhooks Notion

### Déploiement

- `.github/workflows/deploy-pages.yml` : build + déploiement GitHub Pages
- `api/notion/webhook.js` : webhook Vercel
- `.env.example` : variables d'environnement attendues

### Aide Codex

- `.codex/skills/journal-annet-publisher/SKILL.md`

Ce skill sert à réutiliser le workflow du projet dans Codex sans devoir tout réexpliquer à chaque session.

## 3. Pré-requis

Avant toute chose, il faut :

- Node.js installé
- npm installé
- un dépôt GitHub avec GitHub Pages activé en mode GitHub Actions
- une intégration Notion avec accès lecture au contenu
- un projet Vercel pour héberger le webhook

Ce projet a été validé localement avec :

- `node v25.6.1`
- `npm 11.9.0`

## 4. Installation locale pas à pas

### Étape 1 - Installer les dépendances

Depuis la racine du dépôt :

```bash
npm install
```

Cela installe :

- Eleventy
- le SDK Notion
- le lockfile `package-lock.json`

### Étape 2 - Vérifier que le build statique fonctionne sans Notion

Le dépôt contient déjà des snapshots versionnés. Cela permet de valider le rendu sans credentials Notion.

Lancer :

```bash
npm run validate:snapshots
npm run build
```

Résultat attendu :

- validation OK des snapshots
- génération de `_site/index.html`
- génération de `_site/portail.html`
- génération de `_site/agenda.html`

### Étape 3 - Lancer les tests

```bash
npm test
```

Les tests couvrent :

- le builder Notion -> snapshots
- la validation des signatures de webhook
- le filtrage des événements Notion
- le build Eleventy final

## 5. Variables d'environnement

Copier le fichier exemple :

```bash
cp .env.example .env
```

Puis remplir les variables nécessaires.

### Variables pour la sync Notion et GitHub Actions

- `NOTION_TOKEN`
- `NOTION_PUBLICATIONS_DATA_SOURCE_ID`
- `NOTION_AGENDA_DATA_SOURCE_ID`
- `NOTION_MENU_ITEMS_DATA_SOURCE_ID`
- `NOTION_SITE_SECTIONS_DATA_SOURCE_ID`
- `SITE_TIME_ZONE`

Valeur recommandée :

```bash
SITE_TIME_ZONE=Europe/Paris
```

### Variables pour le webhook Vercel

- `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- `GITHUB_WEBHOOK_TOKEN`
- `GITHUB_REPOSITORY_OWNER`
- `GITHUB_REPOSITORY_NAME`
- `GITHUB_WORKFLOW_FILE`
- `GITHUB_WORKFLOW_REF`

Valeurs habituelles :

```bash
GITHUB_WORKFLOW_FILE=deploy-pages.yml
GITHUB_WORKFLOW_REF=main
```

## 6. Préparer Notion pas à pas

Le pipeline attend 4 data sources Notion :

1. `Publications`
2. `Agenda`
3. `Menu Items`
4. `Sections site`

### Étape 1 - Créer ou ouvrir une intégration Notion

Dans Notion Developers :

1. créer une intégration
2. activer au minimum les capacités de lecture du contenu
3. récupérer le token d'intégration

Ce token va dans :

```bash
NOTION_TOKEN=...
```

### Étape 2 - Partager les 4 data sources avec l'intégration

Pour chaque data source Notion :

1. ouvrir la base
2. cliquer sur `...`
3. ouvrir `Add connections`
4. ajouter l'intégration

Sans ce partage, l'API renverra typiquement une `404` même si l'ID est correct.

### Étape 3 - Récupérer les IDs des data sources

Il faut renseigner :

- `NOTION_PUBLICATIONS_DATA_SOURCE_ID`
- `NOTION_AGENDA_DATA_SOURCE_ID`
- `NOTION_MENU_ITEMS_DATA_SOURCE_ID`
- `NOTION_SITE_SECTIONS_DATA_SOURCE_ID`

Le script est tolérant sur les noms de propriétés, mais pas sur l'absence des IDs.

### Étape 4 - Vérifier le mapping métier

Le code accepte plusieurs noms de colonnes proches grâce aux listes de candidats dans :

- [`scripts/lib/notion/snapshot-builders.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/lib/notion/snapshot-builders.mjs)

Si un nom de propriété change dans Notion, la bonne correction consiste à mettre à jour ce fichier, pas à casser le contrat du front.

## 7. Première sync Notion locale

Quand les variables d'environnement sont prêtes :

```bash
npm run sync:notion
```

Ce script :

1. interroge les 4 data sources Notion
2. filtre les contenus publiés
3. reconstruit les menus
4. résout les liens agenda -> publication
5. convertit les blocs Notion en HTML
6. télécharge les médias Notion dans `assets/notion/`
7. écrit les snapshots dans `data/`

Les fichiers écrits sont :

- `data/publications.json`
- `data/agenda.json`
- `data/menus.json`
- `data/site-sections.json`
- `data/citizen-posts.json`
- `data/calendar-events.json`

### Important

Les snapshots sont versionnés pour garder un build local reproductible, mais ils sont considérés comme générés.

Ils ne doivent plus être maintenus à la main.

## 8. Build local complet après sync

Une fois la sync faite :

```bash
npm run build
```

Ce script :

1. valide les snapshots
2. lance Eleventy
3. produit le site final dans `_site/`

Pour reproduire le comportement du workflow de publication :

```bash
npm run build:pages
```

Attention :

- `npm run build` fonctionne avec les snapshots déjà présents
- `npm run build:pages` exige les variables Notion car il relance la sync complète

## 9. Configuration GitHub Pages pas à pas

### Étape 1 - Activer GitHub Pages

Dans GitHub :

1. ouvrir `Settings`
2. aller dans `Pages`
3. choisir `Source: GitHub Actions`

### Étape 2 - Déclarer les secrets GitHub Actions

Dans `Settings -> Secrets and variables -> Actions`, créer :

- `NOTION_TOKEN`
- `NOTION_PUBLICATIONS_DATA_SOURCE_ID`
- `NOTION_AGENDA_DATA_SOURCE_ID`
- `NOTION_MENU_ITEMS_DATA_SOURCE_ID`
- `NOTION_SITE_SECTIONS_DATA_SOURCE_ID`

### Étape 3 - Comprendre le workflow

Le fichier :

- [`deploy-pages.yml`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/.github/workflows/deploy-pages.yml)

fait ceci :

1. checkout du dépôt
2. installation Node
3. attente de 20 secondes si déclenché par webhook Notion
4. `npm ci`
5. `npm run build:pages`
6. upload de `_site`
7. déploiement GitHub Pages

### Étape 4 - Déduplication

La déduplication est faite par :

- `concurrency`
- `cancel-in-progress: true`
- un court délai de stabilisation

Cela absorbe les rafales d'événements Notion sans ajouter de base de données côté webhook.

## 10. Configuration Vercel pas à pas

Vercel héberge uniquement :

- `api/notion/webhook.js`

### Étape 1 - Créer un projet Vercel

Créer un projet pointant sur ce dépôt.

### Étape 2 - Déclarer les variables d'environnement Vercel

Ajouter :

- `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- `NOTION_PUBLICATIONS_DATA_SOURCE_ID`
- `NOTION_AGENDA_DATA_SOURCE_ID`
- `NOTION_MENU_ITEMS_DATA_SOURCE_ID`
- `NOTION_SITE_SECTIONS_DATA_SOURCE_ID`
- `GITHUB_WEBHOOK_TOKEN`
- `GITHUB_REPOSITORY_OWNER`
- `GITHUB_REPOSITORY_NAME`
- `GITHUB_WORKFLOW_FILE`
- `GITHUB_WORKFLOW_REF`

### Étape 3 - Préparer le token GitHub

`GITHUB_WEBHOOK_TOKEN` doit permettre de déclencher le workflow GitHub via l'API REST.

Il faut donc un token avec des droits suffisants sur le dépôt cible.

## 11. Créer le webhook Notion pas à pas

### Étape 1 - Déclarer l'URL publique du webhook

L'URL attendue sera :

```text
https://<votre-projet-vercel>/api/notion/webhook
```

### Étape 2 - Créer la subscription dans Notion

Dans l'intégration Notion :

1. ouvrir l'onglet `Webhooks`
2. cliquer sur `Create subscription`
3. entrer l'URL Vercel
4. choisir les événements

Événements utiles recommandés :

- `page.created`
- `page.properties_updated`
- `page.content_updated`
- `data_source.content_updated`
- `data_source.schema_updated`

### Étape 3 - Récupérer le `verification_token`

Au moment de la création, Notion envoie une requête POST de vérification.

Le webhook :

- la reçoit
- journalise le `verification_token`
- la renvoie en JSON

Il faut :

1. lire ce token dans les logs Vercel
2. le coller dans Notion pour valider la subscription
3. le stocker dans :

```bash
NOTION_WEBHOOK_VERIFICATION_TOKEN=...
```

### Étape 4 - Vérification de signature

Pour chaque événement réel, le webhook vérifie :

- l'en-tête `X-Notion-Signature`
- avec `NOTION_WEBHOOK_VERIFICATION_TOKEN`

Si la signature ne correspond pas :

- la requête est rejetée
- aucun workflow GitHub n'est déclenché

## 12. Tester la chaîne complète

Une fois Notion, GitHub et Vercel configurés :

### Test 1 - Build local simple

```bash
npm run build
```

Doit réussir sans erreur.

### Test 2 - Sync locale depuis Notion

```bash
npm run sync:notion
npm run build
```

Doit :

- mettre à jour les snapshots
- régénérer `_site`

### Test 3 - Webhook réel

Dans Notion :

1. passer une publication de `Brouillon` à `Publié`
2. attendre le webhook
3. vérifier les logs Vercel
4. vérifier le workflow GitHub
5. vérifier la publication finale sur GitHub Pages

### Test 4 - Cas agenda

Créer ou publier une occurrence d'agenda liée à une publication publiée.

Le résultat attendu :

- apparition dans `agenda.html`
- lien correct vers `portail.html`

## 13. Workflow éditorial au quotidien

### Cas le plus simple

1. l'éditeur modifie le contenu dans Notion
2. Notion envoie un webhook
3. Vercel déclenche GitHub Actions
4. GitHub reconstruit les snapshots et republie

### Si l'automatisation ne marche pas

Utiliser le mode manuel :

1. corriger Notion ou les variables
2. lancer localement :

```bash
npm run sync:notion
npm run build
```

3. committer les snapshots si nécessaire
4. pousser sur `main`

## 14. Ce qu'il faut éditer et ce qu'il ne faut pas éditer

### À éditer

- les contenus éditoriaux dans Notion
- les templates dans `src/`
- la logique de mapping Notion dans `scripts/lib/notion/snapshot-builders.mjs`
- la documentation dans `README.md`

### À ne plus éditer à la main

- `data/publications.json`
- `data/agenda.json`
- `data/menus.json`
- `data/site-sections.json`
- `data/citizen-posts.json`
- `data/calendar-events.json`

## 15. Gestion des médias

Si un média provient de Notion :

1. il est téléchargé au build
2. il reçoit un nom stable basé sur un hash
3. il est copié dans `assets/notion/`

Si un média est une URL publique externe :

- il reste référencé tel quel

Si le téléchargement échoue :

- le build continue
- un warning est émis
- le visuel peut être omis

## 16. Validation métier des snapshots

Le script :

- [`scripts/validate-snapshots.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/validate-snapshots.mjs)

vérifie notamment :

- le contrat des publications
- les liens agenda -> publication
- la présence des sections de site attendues
- la structure générale des snapshots

Le but est de bloquer les erreurs de structure avant le rendu Eleventy.

## 17. Que faire si un nom de colonne Notion change

C'est un cas normal.

La bonne procédure :

1. ouvrir `scripts/lib/notion/snapshot-builders.mjs`
2. repérer la liste de candidats de la famille concernée
3. ajouter le nouveau nom de propriété
4. relancer :

```bash
npm run sync:notion
npm run validate:snapshots
```

Le front public ne doit pas être modifié pour absorber un simple renommage de colonne Notion.

## 18. Dépannage rapide

### `404` ou `object_not_found` côté Notion

Ca signifie souvent :

- mauvais ID
- base non partagée avec l'intégration

### Le webhook Vercel répond mais rien ne se passe

Vérifier :

- `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- `GITHUB_WEBHOOK_TOKEN`
- `GITHUB_REPOSITORY_OWNER`
- `GITHUB_REPOSITORY_NAME`
- `GITHUB_WORKFLOW_FILE`

### Le build GitHub échoue sur la sync Notion

Vérifier les secrets GitHub Actions :

- `NOTION_TOKEN`
- les 4 IDs de data sources

### L'agenda n'affiche rien

Vérifier :

- que la publication liée est bien publiée
- que la relation agenda -> publication est correcte
- que `validate:snapshots` ne remonte pas d'erreur de cross-link

### Une image manque dans le portail

Vérifier :

- si le média est bien accessible côté Notion
- si le téléchargement a produit un warning
- si `assets/notion/` contient bien le fichier

## 19. Commandes utiles

Installation :

```bash
npm install
```

Validation seule :

```bash
npm run validate:snapshots
```

Sync Notion seule :

```bash
npm run sync:notion
```

Build Eleventy sur snapshots existants :

```bash
npm run build
```

Reproduction du workflow complet :

```bash
npm run build:pages
```

Tests :

```bash
npm test
```

## 20. Résumé opérateur

Si vous ne devez retenir qu'une chose :

1. les contenus se gèrent dans Notion
2. les snapshots sont générés, pas édités à la main
3. `npm run build` doit toujours rester vert
4. le webhook Vercel ne fait que déclencher GitHub
5. GitHub Pages ne sert que `_site`

## 21. Références utiles

- Notion Webhooks
- Notion Query a data source
- Notion Blocks API
- GitHub Actions workflow dispatch API
- Eleventy

Si un doute persiste sur le fonctionnement du projet dans Codex, utiliser le skill :

- [`journal-annet-publisher`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/.codex/skills/journal-annet-publisher/SKILL.md)
