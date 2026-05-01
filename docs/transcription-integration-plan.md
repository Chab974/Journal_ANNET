# Integration du module transcription + template dans Journal ANNET

## Constat sur le depot actuel

Le depot n'est pas une application CRUD classique. Aujourd'hui, le coeur du projet repose sur un pipeline editorial stable :

`Notion -> snapshots JSON -> Eleventy -> Vercel / GitHub Pages`

Points d'ancrage deja presents :

- le modele editorial canonique existe deja dans [lib/shared/contentModel.js](lib/shared/contentModel.js) et [lib/shared/publicationSchema.js](lib/shared/publicationSchema.js)
- la generation des snapshots passe par [scripts/sync-notion.mjs](scripts/sync-notion.mjs) et [scripts/lib/notion/snapshot-builders.mjs](scripts/lib/notion/snapshot-builders.mjs)
- un prototype d'analyse d'image existe deja dans [refactor/citizen-portal/server/analyzePublicationImage.example.mjs](refactor/citizen-portal/server/analyzePublicationImage.example.mjs)
- un front de back-office experimental existe dans [refactor/citizen-portal/client/App.jsx](refactor/citizen-portal/client/App.jsx)

Conclusion : il faut integrer le nouveau besoin comme une couche d'ingestion et d'edition en amont du modele `publication`, pas comme un remplacement du site public.

## Decision d'architecture

### Ce qu'il ne faut pas faire

Ne pas injecter directement `SourceImage`, `AnalysisRun`, `VisualRegion`, `SlideDocument` et `TemplateVersion` dans le pipeline Eleventy public.

Pourquoi :

- ces objets sont dynamiques, iteratifs et fortement lies a l'upload
- le site public actuel est statique et derive de snapshots
- Notion reste aujourd'hui la source de verite editoriale du projet

### Ce qu'il faut faire

Ajouter un sous-systeme "studio de transcription" qui produit ensuite des objets compatibles avec le modele editorial actuel.

En pratique :

1. `Image -> analyse OCR/layout/template -> SlideDocument`
2. `SlideDocument -> publication canonique`
3. `publication canonique -> brouillon Notion / import CSV / snapshot local`
4. `publication publiee -> pipeline actuel inchange`

## Positionnement dans le depot

### 1. Domaine partage

Ajouter un nouveau domaine partage dans `lib/shared/` :

- `lib/shared/slideDocumentSchema.js`
- `lib/shared/templateSchema.js`
- `lib/shared/transcriptionMappers.js`

Responsabilites :

- valider et normaliser les objets `Project`, `SourceImage`, `AnalysisRun`, `SlideDocument`, `TemplateFamily`
- convertir un `SlideDocument` valide en `publication` compatible avec [lib/shared/publicationSchema.js](lib/shared/publicationSchema.js)
- conserver la separation entre `contenu` et `design`

### 2. API serveur

Creer un namespace d'API dedie :

- `api/transcription/analyze.js`
- `api/transcription/projects.js`
- `api/transcription/slides.js`
- `api/transcription/templates.js`

Pour le MVP, seul `api/transcription/analyze.js` est indispensable.

Ce point d'entree peut reprendre la logique de [refactor/citizen-portal/server/analyzePublicationImage.example.mjs](refactor/citizen-portal/server/analyzePublicationImage.example.mjs), mais en changeant le contrat de sortie :

- aujourd'hui : sortie directe en `publication`
- cible : sortie en `analysisResult + slideDocument + publicationDraft`

### 3. Interface d'administration

Ne pas ajouter cette UI au site Eleventy public.

La bonne place est une application de back-office separee dans :

- `refactor/citizen-portal/`

Evolution recommandee :

- garder [refactor/citizen-portal/client/App.jsx](refactor/citizen-portal/client/App.jsx) comme base
- la faire evoluer de "scanner une publication" vers "charger une image, corriger les blocs, sauver un template, exporter"

Le site public Eleventy continue de lire `data/*.json`. Le studio de transcription, lui, gere l'upload et l'edition.

## Modele de donnees a ajouter sans casser l'existant

### Principe

Le nouveau modele doit rester amont et non central.

Le modele central du site reste :

- `publication`
- `agenda`
- `cantine`
- `site-sections`

Le nouveau modele sert a fabriquer une `publication` ou une future variation plus riche.

### Mapping minimal recommande

#### Nouveau modele

- `Project`
- `SourceImage`
- `AnalysisRun`
- `VisualRegion`
- `OCRBlock`
- `SlideDocument`
- `SlideSection`
- `SlideBlock`
- `TemplateFamily`
- `TemplateVersion`
- `LayoutZone`
- `RenderRule`

#### Vers le modele actuel

- `SlideDocument.title` -> `publication.titre`
- `SlideDocument.clean_text` ou aggregation des `SlideBlock` -> `publication.contenu_texte`
- `SlideDocument.slide_type` -> candidat pour `publication.type`
- `SlideSection` et `SlideBlock` -> derive `resume`, `highlights`, `date`, `lieu`
- `Template*` -> reste hors du modele `publication`, sauf quelques `style_hint`

Important :

`publicationSchema.js` ne doit pas devenir un depot fourre-tout de donnees graphiques. Les informations de template doivent rester dans leur propre schema.

## Stockage recommande

## MVP local

Pour aller vite sans destabiliser la prod :

- stockage JSON sur disque pour les analyses
- dossiers dedies hors `data/` public, par exemple :
  - `storage/transcription/projects/`
  - `storage/transcription/runs/`
  - `storage/transcription/templates/`

Pourquoi pas `data/` :

- `data/` alimente Eleventy
- ces donnees ne doivent pas etre publiees telles quelles

## V1 exploitable en ligne

Passer ensuite sur une vraie persistence applicative :

- Postgres si le studio devient multi-projets, multi-runs, multi-templates
- SQLite acceptable pour un back-office local ou mono-utilisateur

Recommendation concrete :

- ne pas brancher cette couche sur Notion en lecture/ecriture temps reel au debut
- utiliser Notion comme sortie editoriale, pas comme base transactionnelle d'analyse

## Pipeline d'integration cible

### Etape 1

Upload d'une image depuis le studio.

### Etape 2

Analyse serveur :

- OCR
- segmentation visuelle
- detection de slide type
- generation d'un `SlideDocument`
- proposition de `TemplateMatch`

### Etape 3

Correction manuelle dans l'UI :

- texte
- types de blocs
- ordre
- style hints
- template associe

### Etape 4

Export editorial :

- `publicationDraft`
- Markdown
- JSON structure
- template JSON

### Etape 5

Publication vers l'existant :

- soit export CSV compatible avec [scripts/lib/notion/import-csv.mjs](scripts/lib/notion/import-csv.mjs)
- soit generation d'un brouillon via `toNotionDraft()`
- soit insertion locale dans un snapshot de travail

## Plan d'integration par phases

## Phase A - Normaliser le domaine

Objectif : poser les schemas et le mapping sans toucher au public.

Fichiers cibles :

- `lib/shared/slideDocumentSchema.js`
- `lib/shared/templateSchema.js`
- `lib/shared/transcriptionMappers.js`
- `tests/slide-document-schema.test.mjs`

Sortie attendue :

- validation des objets de transcription
- fonction `slideDocumentToPublicationDraft()`

## Phase B - Transformer le prototype existant

Objectif : reutiliser l'exemple d'analyse d'image deja present.

Actions :

- extraire la logique utile de [refactor/citizen-portal/server/analyzePublicationImage.example.mjs](refactor/citizen-portal/server/analyzePublicationImage.example.mjs)
- remplacer la sortie "publication seule" par une sortie triple :
  - `analysis`
  - `slideDocument`
  - `publicationDraft`

## Phase C - Ajouter l'editeur de correction

Objectif : rendre le resultat exploitable editorialement.

Base existante :

- [refactor/citizen-portal/client/App.jsx](refactor/citizen-portal/client/App.jsx)

Evolution recommandee :

- panneau image source
- liste des blocs detectes
- edition du texte
- changement de `block_type`
- reordonnancement
- export JSON / Markdown / Notion draft

## Phase D - Introduire les templates

Objectif : separer clairement design et contenu.

Au debut :

- detecter seulement palette, header, logo, zones principales
- stocker un `TemplateVersion` simple

Plus tard :

- rejouer le template dans un rendu HTML ou image

## Phase E - Connecter au pipeline editorial

Objectif : brancher le studio sans casser la prod.

Options de sortie :

1. `publicationDraft -> import Notion`
2. `publicationDraft -> snapshot local de previsualisation`
3. `publicationDraft -> workflow d'approbation avant publication`

La meilleure option pour ce depot aujourd'hui est `publicationDraft -> Notion`, car elle respecte la source de verite existante.

## Recommandation concrete pour Journal ANNET

Pour ce projet, la bonne integration est :

1. garder le site public et les snapshots inchanges
2. faire evoluer `refactor/citizen-portal` en studio de transcription prive
3. ajouter un domaine partage `slide/template`
4. produire un `publicationDraft` compatible avec l'existant
5. publier ensuite dans Notion, pas directement dans `data/publications.json`

## Premiere iteration conseillee

Si on veut avancer sans sur-ingenierie :

1. creer `slideDocumentSchema.js`
2. creer `transcriptionMappers.js`
3. brancher une route `api/transcription/analyze.js`
4. adapter `refactor/citizen-portal/client/App.jsx` pour afficher `slideDocument`
5. exporter vers `toNotionDraft()`

Cela donne une integration utile rapidement, sans introduire tout de suite une base relationnelle complete ni toucher au rendu public Eleventy.
