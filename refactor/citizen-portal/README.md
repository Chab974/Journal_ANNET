# Version refactoree et securisee

Ce dossier contient une version de reference du composant fourni, en separant :

- `client/App.jsx` : interface React refactoree
- `client/publicationApi.js` : couche d'appel HTTP vers un backend
- `client/mockData.js` : donnees initiales normalisees
- `shared/publicationSchema.js` : validation et normalisation partagees
- `shared/contentModel.js` : modele canonique de contenu + adaptateurs d'export
- `server/analyzePublicationImage.example.mjs` : exemple de route serveur

## Ce qui change par rapport au snippet initial

- La cle API n'est plus exposee dans le navigateur.
- La reponse IA est revalidee avant affichage.
- Le collage d'image utilise un listener `window` et n'exige plus le focus du conteneur.
- Les jours et plats de menu ont des identifiants stables, donc les etats React ne glissent plus.
- Les erreurs serveur sont remontees proprement au frontend.
- Les retries sont reserves aux erreurs temporaires (`429` / `5xx`).

## Contrat frontend

Le frontend poste un `multipart/form-data` vers :

```txt
POST /api/publications/analyze-image
```

Le backend doit repondre avec :

```json
{
  "document": {
    "id": "content-123",
    "schemaVersion": "municipal-content/v1",
    "kind": "event",
    "title": "Brocante de printemps",
    "summary": "Resume court",
    "blocks": []
  },
  "exports": {
    "notion": {
      "properties": {},
      "contentMarkdown": "# Titre"
    },
    "site": {
      "id": "content-123",
      "type": "event",
      "blocks": []
    }
  }
}
```

ou avec :

```json
{
  "error": "Message d'erreur exploitable"
}
```

L'objet `document` est la source de verite backend. Il doit etre assez stable pour :

- alimenter l'UI React
- pousser une page Notion
- generer un JSON pour un autre site
- servir d'archive ou de file d'attente de moderation

## Architecture conseillee

```txt
Image -> Backend ingestion -> OCR / LLM -> Document canonique -> Exporter Notion / Exporter site / UI
```

Le bon niveau d'abstraction n'est pas "une carte React", mais "un document municipal structure".

Champs utiles a conserver dans ce document :

- classification (`kind`, `sourceType`)
- metadonnees (`title`, `summary`, `displayDate`, `location`)
- dates machine (`startsAtUtc`, `endsAtUtc`)
- texte complet (`plainText`)
- structure (`blocks`, `menuDays`)
- metadonnees editoriales (`author`, `publisher`, `externalUrl`)

## Cote serveur

L'exemple `server/analyzePublicationImage.example.mjs` montre la logique a brancher dans une route Express, Next.js ou equivalent.

Points a conserver :

- stocker `GEMINI_API_KEY` uniquement en variable d'environnement
- limiter taille et type MIME du fichier avant appel modele
- journaliser les erreurs cote serveur
- ne jamais renvoyer brut le resultat Gemini sans validation
- enregistrer le document canonique avant export si tu veux rejouer les integrations
