# Journal ANNET

Guide pas à pas de la chaîne éditoriale `Notion -> snapshots -> Eleventy -> Vercel + GitHub Pages`.

Le projet a maintenant deux sorties publiques :

- `Vercel` pour la production principale
- `GitHub Pages` pour un site démo miroir

Les trois URLs publiques internes restent inchangées :

- `index.html`
- `portail.html`
- `agenda.html`

## 1. Architecture générale

Le pipeline complet est le suivant :

1. Les contenus sont saisis dans 4 data sources Notion.
2. Le script [`scripts/sync-notion.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/sync-notion.mjs) génère 4 snapshots JSON dans [`data/`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/data).
3. Eleventy lit ces snapshots et produit le HTML final dans [`_site/`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/_site).
4. `Vercel` héberge le site principal.
5. `GitHub Pages` héberge une démo du même site.
6. Le webhook [`api/notion/webhook.js`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/api/notion/webhook.js) reçoit les événements Notion et relance :
   - le déploiement Vercel
   - le workflow GitHub Pages démo si la config GitHub est présente

En clair :

- Notion = source de vérité
- `data/*.json` = artefacts générés
- Eleventy = moteur de rendu
- Vercel = prod
- GitHub Pages = démo
- GitHub = code, historique, miroir démo

## 2. Structure du dépôt

### Pages Eleventy

- [`src/index.njk`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/src/index.njk)
- [`src/portail.njk`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/src/portail.njk)
- [`src/agenda.njk`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/src/agenda.njk)
- [`eleventy.config.js`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/eleventy.config.js)
- [`src/_data/journal.cjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/src/_data/journal.cjs)

### Snapshots générés

- [`data/publications.json`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/data/publications.json)
- [`data/agenda.json`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/data/agenda.json)
- [`data/cantine.json`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/data/cantine.json)
- [`data/site-sections.json`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/data/site-sections.json)

Ces fichiers sont générés. Ils ne doivent plus être édités à la main dans le flux normal.

### Scripts importants

- [`scripts/sync-notion.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/sync-notion.mjs)
- [`scripts/validate-snapshots.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/validate-snapshots.mjs)
- [`scripts/lib/notion/snapshot-builders.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/lib/notion/snapshot-builders.mjs)
- [`scripts/lib/notion/blocks.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/lib/notion/blocks.mjs)
- [`scripts/lib/notion/media.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/lib/notion/media.mjs)
- [`scripts/lib/notion/webhook.mjs`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/scripts/lib/notion/webhook.mjs)

### Déploiement

- [`vercel.json`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/vercel.json)
- [`api/notion/webhook.js`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/api/notion/webhook.js)
- [`deploy-demo-pages.yml`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/.github/workflows/deploy-demo-pages.yml)
- [`.env.example`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/.env.example)

### Skill projet

- [`SKILL.md`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/.codex/skills/journal-annet-publisher/SKILL.md)

## 3. Pré-requis

Il faut :

- Node.js
- npm
- une intégration Notion avec accès lecture
- un projet Vercel connecté au dépôt
- un dépôt GitHub avec Pages activé en mode GitHub Actions

Validation locale déjà faite dans ce dépôt :

- `node v25.6.1`
- `npm 11.9.0`

## 4. Installation locale

### Étape 1 - Installer les dépendances

```bash
npm install
```

### Étape 2 - Vérifier le build sans Notion

Le dépôt contient déjà des snapshots versionnés.

```bash
npm run validate:snapshots
npm run build
```

Résultat attendu :

- `_site/index.html`
- `_site/portail.html`
- `_site/agenda.html`

### Étape 3 - Lancer les tests

```bash
npm test
```

## 5. Variables d’environnement

### Étape 1 - Créer le fichier local

```bash
cp .env.example .env
```

### Étape 2 - Variables Notion communes

À remplir pour la sync et les builds déployés :

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

### Étape 3 - Variables webhook Vercel

- `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- `VERCEL_DEPLOY_HOOK_URL`

### Étape 4 - Variables optionnelles pour la démo GitHub Pages

Si tu veux que le webhook Notion relance aussi la démo GitHub Pages, ajoute :

- `GITHUB_WEBHOOK_TOKEN`
- `GITHUB_REPOSITORY_OWNER`
- `GITHUB_REPOSITORY_NAME`
- `GITHUB_WORKFLOW_FILE`
- `GITHUB_WORKFLOW_REF`

Valeurs usuelles :

```bash
GITHUB_WORKFLOW_FILE=deploy-demo-pages.yml
GITHUB_WORKFLOW_REF=main
```

## 6. Préparer Notion

Le pipeline attend 4 data sources :

1. `Publications`
2. `Agenda`
3. `cantine_scolaire`
4. `Sections site`

### Étape 1 - Créer l’intégration Notion

Dans Notion Developers :

1. créer une intégration
2. activer la lecture du contenu
3. récupérer le token

### Étape 2 - Partager les 4 data sources

Pour chaque data source :

1. ouvrir la base
2. ouvrir `Add connections`
3. ajouter l’intégration

### Étape 3 - Renseigner les IDs

```bash
NOTION_PUBLICATIONS_DATA_SOURCE_ID=...
NOTION_AGENDA_DATA_SOURCE_ID=...
NOTION_MENU_ITEMS_DATA_SOURCE_ID=...
NOTION_SITE_SECTIONS_DATA_SOURCE_ID=...
```

La variable `NOTION_MENU_ITEMS_DATA_SOURCE_ID` garde ce nom technique dans le code, mais la base Notion peut etre nommee `cantine_scolaire`.

## 7. Générer les snapshots

### Sync manuelle

```bash
npm run sync:notion
```

Cette commande :

- interroge les 4 data sources
- filtre les contenus non publiés
- reconstruit les données de cantine
- résout les relations agenda -> publication
- convertit les blocs Notion en HTML
- télécharge les médias Notion dans `assets/notion/`

### Validation des snapshots

```bash
npm run validate:snapshots
```

## 8. Construire le site

### Build simple à partir des snapshots déjà présents

```bash
npm run build
```

### Build complet avec nouvelle sync

```bash
npm run build:site
```

### Build production Vercel

```bash
npm run build:vercel
```

### Build GitHub Pages démo

Le workflow GitHub injecte lui-même :

- `SITE_PATH_PREFIX=/Journal_ANNET/`
- `SITE_DEPLOY_TARGET=github-pages-demo`

En local, tu peux simuler ce build :

```bash
SITE_PATH_PREFIX=/Journal_ANNET/ SITE_DEPLOY_TARGET=github-pages-demo npm run build:pages-demo
```

## 9. Configurer Vercel

### Étape 1 - Importer le dépôt

Dans Vercel :

1. `Add New Project`
2. importer le dépôt `Journal_ANNET`
3. laisser Vercel utiliser la config du dépôt

### Étape 2 - Vérifier la config de build

Le dépôt fournit déjà :

- build command : `npm run build:vercel`
- output directory : `_site`

via [`vercel.json`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/vercel.json).

### Étape 3 - Ajouter les variables d’environnement dans Vercel

Ajouter au minimum :

- `NOTION_TOKEN`
- `NOTION_PUBLICATIONS_DATA_SOURCE_ID`
- `NOTION_AGENDA_DATA_SOURCE_ID`
- `NOTION_MENU_ITEMS_DATA_SOURCE_ID`
- `NOTION_SITE_SECTIONS_DATA_SOURCE_ID`
- `SITE_TIME_ZONE`
- `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- `VERCEL_DEPLOY_HOOK_URL`

Si tu veux aussi que le webhook Notion relance GitHub Pages, ajoute en plus les variables GitHub optionnelles dans Vercel.

## 10. Configurer GitHub Pages démo

### Étape 1 - Activer GitHub Pages

Dans le dépôt GitHub :

1. ouvrir `Settings`
2. aller dans `Pages`
3. choisir `GitHub Actions` comme source

### Étape 2 - Ajouter les secrets GitHub Actions

Ajouter :

- `NOTION_TOKEN`
- `NOTION_PUBLICATIONS_DATA_SOURCE_ID`
- `NOTION_AGENDA_DATA_SOURCE_ID`
- `NOTION_MENU_ITEMS_DATA_SOURCE_ID`
- `NOTION_SITE_SECTIONS_DATA_SOURCE_ID`

### Étape 3 - Laisser le workflow déployer la démo

Le workflow [`deploy-demo-pages.yml`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/.github/workflows/deploy-demo-pages.yml) :

1. installe les dépendances
2. lance `npm test`
3. synchronise Notion
4. construit le site avec `SITE_PATH_PREFIX=/Journal_ANNET/`
5. déploie `_site/` vers GitHub Pages

L’URL démo sera typiquement :

```text
https://chab974.github.io/Journal_ANNET/
```

## 11. Configurer le Deploy Hook Vercel

### Étape 1 - Créer le hook

Dans `Project Settings -> Deploy Hooks` :

1. créer un hook
2. choisir la branche `main`
3. copier l’URL

### Étape 2 - Stocker l’URL dans Vercel

```bash
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
```

## 12. Configurer le webhook Notion

L’URL à déclarer dans Notion est :

```text
https://<votre-projet-vercel>/api/notion/webhook
```

### Étape 1 - Déclarer le webhook dans Notion

Choisir les événements de contenu éditorial utiles.

### Étape 2 - Récupérer le `verification_token`

Au moment de la vérification :

- l’endpoint renvoie le `verification_token`
- il est aussi visible dans les logs Vercel

Le stocker ensuite dans :

```bash
NOTION_WEBHOOK_VERIFICATION_TOKEN=...
```

### Étape 3 - Redéployer Vercel

Après ajout du token, relancer un déploiement.

### Étape 4 - Suivre les logs webhook en local

Si tu veux récupérer les logs Vercel sur ton ordinateur pendant un test webhook :

1. installer la CLI Vercel
2. te connecter avec `vercel login`
3. lancer :

```bash
npm run logs:webhook
```

La commande suit les logs de `journal-annet.vercel.app` et les écrit aussi dans :

```text
logs/vercel-webhook.log
```

Variables optionnelles :

- `VERCEL_LOG_TARGET` pour viser un autre domaine Vercel
- `VERCEL_LOG_ENV` pour changer d’environnement
- `VERCEL_LOG_QUERY` pour filtrer les logs côté CLI
- `VERCEL_LOG_FILE` pour changer le fichier de sortie local

## 13. Ce qui se passe après une modification Notion

Si le contenu change dans Notion :

1. Notion appelle `api/notion/webhook`
2. le webhook vérifie la signature
3. le webhook filtre les événements utiles
4. le webhook déclenche le déploiement Vercel
5. si la config GitHub est présente, il déclenche aussi le workflow GitHub Pages démo

Résultat :

- la prod Vercel reste à jour
- la démo GitHub Pages peut rester alignée

## 14. Ce qui se passe après un push Git

Si tu pousses sur `main` :

1. Vercel redéploie le site principal depuis le dépôt
2. GitHub Actions redéploie la démo Pages

Donc :

- code changé = prod et démo se mettent à jour
- contenu Notion changé = prod toujours mise à jour, démo mise à jour si le dispatch GitHub est configuré

## 15. Gestion des URLs et du sous-chemin GitHub Pages

GitHub Pages sert le site sous un sous-chemin de dépôt.

Le projet gère cela avec :

- `SITE_PATH_PREFIX`
- la balise `<base href="...">` injectée dans les templates

Valeurs utilisées :

- production Vercel : `/`
- démo GitHub Pages : `/Journal_ANNET/`

## 16. Commandes utiles

Installer :

```bash
npm install
```

Synchroniser Notion :

```bash
npm run sync:notion
```

Valider les snapshots :

```bash
npm run validate:snapshots
```

Construire avec snapshots existants :

```bash
npm run build
```

Construire comme Vercel :

```bash
npm run build:vercel
```

Construire comme GitHub Pages :

```bash
SITE_PATH_PREFIX=/Journal_ANNET/ SITE_DEPLOY_TARGET=github-pages-demo npm run build:pages-demo
```

Tester :

```bash
npm test
```

## 17. Dépannage

### Le webhook répond `401`

Vérifier :

- `NOTION_WEBHOOK_VERIFICATION_TOKEN`
- la signature `X-Notion-Signature`
- les logs de [`api/notion/webhook.js`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/api/notion/webhook.js)

### Le webhook répond `502`

Vérifier :

- `VERCEL_DEPLOY_HOOK_URL`
- les éventuelles variables GitHub optionnelles
- les permissions du token GitHub si la démo doit aussi être relancée

### La prod Vercel se met à jour mais pas la démo GitHub Pages

Vérifier :

- que `GITHUB_WEBHOOK_TOKEN` est bien défini dans Vercel
- que `GITHUB_WORKFLOW_FILE=deploy-demo-pages.yml`
- que le workflow existe et que GitHub Pages est activé sur le dépôt

### Le build GitHub Pages casse les liens

Vérifier :

- `SITE_PATH_PREFIX=/Journal_ANNET/`
- la présence de `<base href="...">` dans le HTML généré

### Une publication ou un événement n’apparaît pas

Vérifier :

- le statut Notion
- les relations entre agenda et publication
- le contenu des snapshots dans [`data/`](/Users/chab/Documents/AI-SANDBOX/GITHUB/Journal_ANNET/data)

## 18. Résumé

Le modèle final est simple :

- `Vercel` = production
- `GitHub Pages` = démonstration publique
- `GitHub` = code source
- `Notion` = contenu
