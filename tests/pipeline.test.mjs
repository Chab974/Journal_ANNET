import assert from 'node:assert/strict';
import test from 'node:test';

import fixture from './fixtures/notion/mock-notion-source.json' with { type: 'json' };

import { defaultSiteSections } from '../scripts/lib/default-site-sections.mjs';
import { buildSnapshotsFromSources } from '../scripts/lib/notion/snapshot-builders.mjs';
import { validateSnapshots } from '../scripts/lib/snapshot-validation.mjs';

test('buildSnapshotsFromSources construit des snapshots cohérents depuis Notion', async () => {
  const blockMap = new Map(Object.entries(fixture.blocksByPageId));
  const mediaResolver = async ({ file }) => {
    const sourceUrl = file?.file?.url ?? file?.external?.url ?? '';
    if (sourceUrl.includes('broken-event-cover')) {
      throw new Error('download failed');
    }
    if (sourceUrl.includes('cadre-noir-cover')) {
      return 'assets/notion/cadre-noir-test.png';
    }
    return sourceUrl;
  };

  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const relationProperty = (...ids) => ({
    relation: ids.map((id) => ({ id })),
    type: 'relation',
  });
  const numberProperty = (value) => ({
    number: value,
    type: 'number',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });
  const statusProperty = (value) => ({
    status: { name: value },
    type: 'status',
  });

  const footerPage = {
    ...fixture.sectionPages[0],
    properties: {
      ...fixture.sectionPages[0].properties,
      'Legal left': richTextProperty('Mention structurée'),
    },
  };

  const homeHeroPage = {
    id: 'section-home-hero-1',
    properties: {
      'Clé': richTextProperty('home-hero'),
      'JSON': richTextProperty(JSON.stringify({
        feature: {
          title: 'Feature JSON ignorée',
        },
        quote: 'Quote JSON ignorée',
      })),
      'Page title': richTextProperty('Accueil structuré'),
      'Quote': richTextProperty('Une édition de proximité, lisible et structurée.'),
      'Statut': statusProperty('Publié'),
      'Titre': titleProperty('Accueil'),
    },
    url: 'https://notion.so/section-home-hero-1',
  };

  const sectionItemPages = [
    {
      id: 'item-hero-masthead-1',
      properties: {
        'Groupe': selectProperty('masthead'),
        'Nom': titleProperty('Édition locale'),
        'Ordre': numberProperty(1),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty('Édition locale'),
      },
    },
    {
      id: 'item-hero-masthead-2',
      properties: {
        'Groupe': selectProperty('masthead'),
        'Nom': titleProperty('Village newsletter'),
        'Ordre': numberProperty(2),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty('Village newsletter'),
      },
    },
    {
      id: 'item-hero-masthead-3',
      properties: {
        'Groupe': selectProperty('masthead'),
        'Nom': titleProperty('Annet-sur-Marne 2026'),
        'Ordre': numberProperty(3),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty('Annet-sur-Marne 2026'),
      },
    },
    {
      id: 'item-hero-title-1',
      properties: {
        'Groupe': selectProperty('title_line'),
        'Nom': titleProperty('Le Journal'),
        'Ordre': numberProperty(1),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty('Le Journal'),
      },
    },
    {
      id: 'item-hero-title-2',
      properties: {
        'Groupe': selectProperty('title_line'),
        'Nom': titleProperty("d'Annet-sur-Marne"),
        'Ordre': numberProperty(2),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty("d'Annet-sur-Marne"),
      },
    },
    {
      id: 'item-hero-feature-1',
      properties: {
        'Description': richTextProperty('Une mise en page nette pour aller à l’essentiel.'),
        'Groupe': selectProperty('feature'),
        'Kicker': richTextProperty('Édition locale'),
        'Nom': titleProperty('Feature prioritaire'),
        'Ordre': numberProperty(1),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Titre': richTextProperty('Une édition structurée pour les annetois'),
      },
    },
    {
      id: 'item-hero-feature-2',
      properties: {
        'Description': richTextProperty('Ne doit pas être retenue.'),
        'Groupe': selectProperty('feature'),
        'Kicker': richTextProperty('Secondaire'),
        'Nom': titleProperty('Feature secondaire'),
        'Ordre': numberProperty(2),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Titre': richTextProperty('Feature secondaire'),
      },
    },
    {
      id: 'item-hero-editorial-1',
      properties: {
        'Description': richTextProperty('Le site devient un support éditorial plus pratique.'),
        'Eyebrow': richTextProperty('Édito'),
        'Groupe': selectProperty('editorial'),
        'Nom': titleProperty('Editorial'),
        'Ordre': numberProperty(1),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Titre': richTextProperty('Une direction plus newsletter que magazine rétro'),
      },
    },
    {
      id: 'item-hero-stat-1',
      properties: {
        'Description': richTextProperty("Pour hiérarchiser l'information locale."),
        'Eyebrow': richTextProperty('Rubriques'),
        'Groupe': selectProperty('stat'),
        'Nom': titleProperty('Rubriques'),
        'Ordre': numberProperty(1),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Valeur': richTextProperty('6'),
      },
    },
    {
      id: 'item-hero-stat-2',
      properties: {
        'Description': richTextProperty('Publié sur Vercel, avec une démo publique sur GitHub Pages.'),
        'Eyebrow': richTextProperty('Format'),
        'Groupe': selectProperty('stat'),
        'Nom': titleProperty('Format'),
        'Ordre': numberProperty(2),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Valeur': richTextProperty('Web'),
      },
    },
    {
      id: 'item-hero-action-1',
      properties: {
        'Groupe': selectProperty('action'),
        'Lien': richTextProperty('portail.html'),
        'Nom': titleProperty('Explorer le portail'),
        'Ordre': numberProperty(1),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty('Explorer le portail'),
        'Theme': richTextProperty('red'),
      },
    },
    {
      id: 'item-hero-action-2',
      properties: {
        'Groupe': selectProperty('action'),
        'Lien': richTextProperty('agenda.html'),
        'Nom': titleProperty("Voir l'agenda"),
        'Ordre': numberProperty(2),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty("Voir l'agenda"),
        'Theme': richTextProperty('blue'),
      },
    },
    {
      id: 'item-hero-action-3',
      properties: {
        'Groupe': selectProperty('action'),
        'Lien': richTextProperty('#maquette'),
        'Nom': titleProperty('Voir la maquette'),
        'Ordre': numberProperty(3),
        'Section': relationProperty('section-home-hero-1'),
        'Statut': statusProperty('Publié'),
        'Texte': richTextProperty('Voir la maquette'),
        'Theme': richTextProperty('light'),
      },
    },
  ];

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: fixture.agendaPages,
    cantinePages: fixture.cantinePages,
    fetchBlocks: async (pageId) => blockMap.get(pageId) ?? [],
    mediaResolver,
    publicationPages: fixture.publicationPages,
    sectionItemPages,
    sectionPages: [footerPage, homeHeroPage],
  });

  assert.equal(snapshots.publications.length, 5);
  assert.equal(snapshots.agenda.length, 1);
  assert.equal(snapshots.cantine.length, 1);

  const cantinePublication = snapshots.publications.find((publication) => publication.type === 'cantine');
  assert.equal(cantinePublication.cantine_jours.length, 2);
  assert.equal(cantinePublication.cantine_jours[1].isSpecial, true);

  const eventPublication = snapshots.publications.find((publication) => publication.type === 'evenement');
  assert.equal(eventPublication.event_dates.length, 1);
  assert.match(eventPublication.contenu_html, /<ul>/);

  const bookPublication = snapshots.publications.find((publication) => publication.type === 'coup_de_coeur');
  assert.equal(bookPublication.cover_image, 'assets/notion/cadre-noir-test.png');
  assert.deepEqual(bookPublication.highlights, ['Enquête intime', 'Histoire du Cadre noir']);

  assert.deepEqual(snapshots.siteSections['home-hero'].masthead, [
    'Édition locale',
    'Village newsletter',
    'Annet-sur-Marne 2026',
  ]);
  assert.deepEqual(snapshots.siteSections['home-hero'].titleLines, [
    'Le Journal',
    "d'Annet-sur-Marne",
  ]);
  assert.equal(snapshots.siteSections['home-hero'].quote, 'Une édition de proximité, lisible et structurée.');
  assert.equal(snapshots.siteSections['home-hero'].pageTitle, 'Accueil structuré');
  assert.equal(snapshots.siteSections['home-hero'].feature.title, 'Une édition structurée pour les annetois');
  assert.equal(snapshots.siteSections['home-hero'].editorial.eyebrow, 'Édito');
  assert.equal(snapshots.siteSections['home-hero'].stats[0].value, '6');
  assert.equal(snapshots.siteSections['home-hero'].actions[2].theme, 'light');
  assert.equal(snapshots.siteSections.footer.legalLeft, 'Mention structurée');
  assert.equal(snapshots.siteSections.footer.legalRight, 'Piloté par Notion');
  assert.equal(snapshots.siteSections.footer.description, defaultSiteSections.footer.description);
  assert.ok(snapshots.warnings.some((warning) => warning.includes('Bloc Notion non supporté ignoré: video')));
  assert.ok(snapshots.warnings.some((warning) => warning.includes('Média ignoré')));
  assert.ok(snapshots.warnings.some((warning) => warning.includes('groupe singulier "feature" multiple')));
  assert.ok(!snapshots.publications.some((publication) => publication.id === 'pub-archived-1'));

  const validation = validateSnapshots(snapshots);
  assert.deepEqual(validation.errors, []);
});
