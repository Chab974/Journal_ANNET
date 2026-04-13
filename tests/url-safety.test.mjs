import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePublication } from '../lib/shared/publicationSchema.js';
import {
  buildMailtoHref,
  buildTelHref,
  normalizeExternalUrl,
  normalizePublicHref,
} from '../lib/shared/urlSafety.js';
import { notionRichTextToHtml } from '../scripts/lib/notion/property-helpers.mjs';
import { buildSnapshotsFromSources } from '../scripts/lib/notion/snapshot-builders.mjs';

function titleProperty(value) {
  return {
    title: [{ plain_text: value }],
    type: 'title',
  };
}

function richTextProperty(value) {
  return {
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  };
}

function selectProperty(value) {
  return {
    select: { name: value },
    type: 'select',
  };
}

function statusProperty(value) {
  return {
    status: { name: value },
    type: 'status',
  };
}

test('normalizeExternalUrl et normalizePublicHref refusent les protocoles dangereux', () => {
  assert.equal(normalizeExternalUrl('https://example.com/article'), 'https://example.com/article');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');

  assert.equal(normalizePublicHref('agenda.html'), 'agenda.html');
  assert.equal(normalizePublicHref('/portail.html'), '/portail.html');
  assert.equal(normalizePublicHref('#ancre-locale'), '#ancre-locale');
  assert.equal(normalizePublicHref('data:text/html,<svg/onload=alert(1)>'), '');
  assert.equal(normalizePublicHref('//evil.example.com/payload.js'), '');
});

test('buildMailtoHref et buildTelHref ne produisent des liens que pour des valeurs valides', () => {
  assert.equal(buildMailtoHref('contact@annet.fr'), 'mailto:contact@annet.fr');
  assert.equal(buildMailtoHref('javascript:alert(1)'), '');
  assert.equal(buildTelHref('+33 1 64 00 00 00'), 'tel:+33164000000');
  assert.equal(buildTelHref('+++/'), '');
});

test('normalizePublication neutralise un lien_externe non http(s)', () => {
  const publication = normalizePublication({
    lien_externe: 'javascript:alert(1)',
    resume: 'Résumé lisible',
    titre: 'Titre de test',
    type: 'info',
  });

  assert.equal(publication.lien_externe, '');
});

test('notionRichTextToHtml retire les liens Notion à protocole interdit', () => {
  const html = notionRichTextToHtml([
    {
      annotations: {},
      href: 'javascript:alert(1)',
      plain_text: 'Lien piégé',
      text: {
        content: 'Lien piégé',
      },
    },
  ]);

  assert.equal(html, 'Lien piégé');
});

test('buildSnapshotsFromSources localise aussi les fichiers externes Notion', async () => {
  const mediaCalls = [];
  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async ({ file, pageId }) => {
      mediaCalls.push({ file, pageId });
      return 'assets/notion/couverture-localisee.png';
    },
    publicationPages: [
      {
        id: 'publication-external-cover',
        last_edited_time: '2026-04-13T12:00:00.000Z',
        properties: {
          'Couverture': {
            files: [
              {
                external: {
                  url: 'https://cdn.notion-static.com/couverture-externe.jpg',
                },
                name: 'couverture-externe.jpg',
                type: 'external',
              },
            ],
            type: 'files',
          },
          'Résumé': richTextProperty('Résumé court'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Article avec couverture distante'),
          'Type': selectProperty('info'),
        },
        url: 'https://notion.so/publication-external-cover',
      },
    ],
    sectionPages: [],
    sectionItemPages: [],
  });

  assert.equal(mediaCalls.length, 1);
  assert.equal(mediaCalls[0].file.type, 'external');
  assert.equal(snapshots.publications[0].cover_image, 'assets/notion/couverture-localisee.png');
  assert.equal(snapshots.publications[0].image, 'assets/notion/couverture-localisee.png');
  assert.deepEqual(snapshots.publications[0].images, [
    {
      alt: 'Illustration de Article avec couverture distante',
      caption: '',
      src: 'assets/notion/couverture-localisee.png',
    },
  ]);
});

test('buildSnapshotsFromSources neutralise les href de section non autorisés', async () => {
  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [],
    sectionItemPages: [
      {
        id: 'section-item-unsafe-href',
        properties: {
          'Groupe': selectProperty('action'),
          'Lien': richTextProperty('javascript:alert(1)'),
          'Nom': titleProperty('Lien dangereux'),
          'Section': {
            relation: [{ id: 'section-home-hero-safe' }],
            type: 'relation',
          },
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Lien dangereux'),
        },
      },
    ],
    sectionPages: [
      {
        id: 'section-home-hero-safe',
        properties: {
          'Clé': richTextProperty('home-hero'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Accueil'),
        },
        url: 'https://notion.so/section-home-hero-safe',
      },
    ],
  });

  assert.equal(snapshots.siteSections['home-hero'].actions[0].href, '');
  assert.ok(snapshots.warnings.some((warning) => warning.includes('href non autorisé')));
});
