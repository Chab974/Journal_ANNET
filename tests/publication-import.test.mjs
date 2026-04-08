import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCanonicalContent } from '../lib/shared/contentModel.js';
import {
  buildPublicationBlocks,
  buildPublicationProperties,
  derivePublicationDraft,
  sanitizeTranscriptionText,
} from '../scripts/lib/notion/publication-import.mjs';

test('sanitizeTranscriptionText retire les fences markdown tout en conservant le contenu OCR', () => {
  const input = `
\`\`\`
Titre principal
\`\`\`

\`\`\`
Paragraphe OCR
\`\`\`
`;

  assert.equal(sanitizeTranscriptionText(input), 'Titre principal\n\nParagraphe OCR');
});

test('buildPublicationProperties aligne les champs d’un brouillon sur le schéma Publications', () => {
  const publication = derivePublicationDraft({
    displayDate: '8 avril 2026',
    ocrText: 'Texte OCR complet de la publication.',
    title: 'Titre importé',
    type: 'info',
  });

  const properties = buildPublicationProperties({
    fileUploadId: 'file-upload-1',
    filename: 'capture.png',
    imageCaption: 'Visuel importé',
    publication,
    schemaProperties: {
      Couverture: { files: {}, type: 'files' },
      'Contenu texte': { rich_text: {}, type: 'rich_text' },
      'Date affichée': { rich_text: {}, type: 'rich_text' },
      Rubrique: { select: { options: [] }, type: 'select' },
      Statut: {
        status: {
          options: [{ name: 'Brouillon' }, { name: 'Publié' }],
        },
        type: 'status',
      },
      Titre: { title: {}, type: 'title' },
      Type: { select: { options: [] }, type: 'select' },
    },
    status: 'Brouillon',
  });

  assert.equal(properties.Titre.title[0].text.content, 'Titre importé');
  assert.equal(properties.Type.select.name, 'info');
  assert.equal(properties.Statut.status.name, 'Brouillon');
  assert.equal(properties.Rubrique.select.name, 'Vie locale');
  assert.equal(properties['Date affichée'].rich_text[0].text.content, '8 avril 2026');
  assert.equal(properties.Couverture.files[0].file_upload.id, 'file-upload-1');
  assert.equal(properties['Contenu texte'].rich_text[0].text.content, 'Texte OCR complet de la publication.');
});

test('buildPublicationBlocks ajoute image, provenance et paragraphes OCR', () => {
  const publication = derivePublicationDraft({
    ocrText: 'Premier paragraphe.\n\nDeuxième paragraphe.',
    title: 'Brouillon',
    type: 'info',
  });
  const document = buildCanonicalContent(publication, {
    fallbackId: publication.id,
  });

  const blocks = buildPublicationBlocks({
    document,
    fileUploadId: 'file-upload-1',
    imageCaption: 'Légende',
    imageFilename: 'capture.png',
    sourceUrl: 'https://gemini.google.com/share/61da73bbcfd4',
  });

  assert.equal(blocks[0].type, 'image');
  assert.equal(blocks[0].image.file_upload.id, 'file-upload-1');
  assert.equal(blocks[1].type, 'paragraph');
  assert.match(blocks[1].paragraph.rich_text[1].text.link.url, /gemini\.google\.com/);
  assert.equal(blocks[2].type, 'paragraph');
  assert.equal(blocks[2].paragraph.rich_text[0].text.content, 'Premier paragraphe.');
  assert.equal(blocks[3].paragraph.rich_text[0].text.content, 'Deuxième paragraphe.');
});
