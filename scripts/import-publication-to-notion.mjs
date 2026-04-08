import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createNotionClient } from './lib/notion/client.mjs';
import {
  buildPublicationBlocks,
  derivePublicationDraft,
  importPublicationToNotion,
  sanitizeTranscriptionText,
} from './lib/notion/publication-import.mjs';
import { buildCanonicalContent } from '../lib/shared/contentModel.js';

function printHelp() {
  console.log(`
Usage:
  node scripts/import-publication-to-notion.mjs --ocr-file <fichier.md> --image-path <image> [options]

Options:
  --ocr-file <path>       Fichier markdown ou texte contenant la transcription OCR.
  --image-path <path>     Image locale a uploader dans Notion.
  --source-url <url>      URL Gemini share ou URL source a conserver dans la page.
  --title <texte>         Titre force pour le brouillon.
  --resume <texte>        Resume force pour le brouillon.
  --type <valeur>         cantine, alerte, evenement, info ou coup_de_coeur. Defaut: info.
  --status <valeur>       Statut Notion a appliquer. Defaut: Brouillon.
  --display-date <texte>  Date affichee libre.
  --start <utc-stamp>     Date de debut au format YYYYMMDDTHHmmssZ ou ISO.
  --end <utc-stamp>       Date de fin au format YYYYMMDDTHHmmssZ ou ISO.
  --location <texte>      Lieu.
  --author <texte>        Auteur.
  --edition <texte>       Edition.
  --external-url <url>    Lien externe editorial.
  --image-caption <texte> Legende de l'image dans Notion.
  --dry-run               Affiche le brouillon derive sans appel Notion.
  --help                  Affiche cette aide.

Exemple:
  node scripts/import-publication-to-notion.mjs \\
    --ocr-file "transcription/import React, { useState, useRef, useEffect } from 'react';/transcription-image.md" \\
    --image-path "/chemin/vers/image.png" \\
    --source-url "https://gemini.google.com/share/61da73bbcfd4" \\
    --title "Capture OCR d'une maquette React"
`.trim());
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Argument inattendu: ${token}`);
    }

    const key = token.slice(2);
    if (key === 'dry-run' || key === 'help') {
      args[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Valeur manquante pour --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

async function readOcrText(ocrFilePath) {
  if (!ocrFilePath) {
    throw new Error('Le parametre --ocr-file est obligatoire.');
  }

  const content = await readFile(ocrFilePath, 'utf8');
  return sanitizeTranscriptionText(content);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const ocrText = await readOcrText(args['ocr-file']);
  const publication = derivePublicationDraft({
    author: args.author,
    displayDate: args['display-date'],
    edition: args.edition,
    endsAt: args.end,
    externalUrl: args['external-url'],
    location: args.location,
    ocrText,
    resume: args.resume,
    startsAt: args.start,
    title: args.title,
    type: args.type || 'info',
  });
  const document = buildCanonicalContent(publication, {
    fallbackId: publication.id,
  });
  const previewBlocks = buildPublicationBlocks({
    document,
    imageCaption: args['image-caption'],
    imageFilename: args['image-path'] ? path.basename(args['image-path']) : '',
    sourceUrl: args['source-url'],
  });

  if (args['dry-run']) {
    console.log(
      JSON.stringify(
        {
          draft: publication,
          notionPreview: {
            blockCount: previewBlocks.length,
            hasSourceUrl: Boolean(args['source-url']),
            imagePath: args['image-path'] || '',
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!args['image-path']) {
    throw new Error('Le parametre --image-path est obligatoire hors mode --dry-run.');
  }

  const notion = createNotionClient();
  const result = await importPublicationToNotion({
    author: args.author,
    displayDate: args['display-date'],
    edition: args.edition,
    endsAt: args.end,
    externalUrl: args['external-url'],
    imageCaption: args['image-caption'],
    imagePath: args['image-path'],
    location: args.location,
    notion,
    ocrText,
    publicationsDataSourceId: process.env.NOTION_PUBLICATIONS_DATA_SOURCE_ID,
    resume: args.resume,
    sourceUrl: args['source-url'],
    startsAt: args.start,
    status: args.status || 'Brouillon',
    title: args.title,
    type: args.type || 'info',
  });

  console.log(
    JSON.stringify(
      {
        notion_page_id: result.page.id,
        notion_url: result.page.url,
        title: result.publication.titre,
        uploaded_image: path.basename(args['image-path']),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
