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

test('buildSnapshotsFromSources privilégie le corps de page Notion sur Contenu texte', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [
      {
        has_children: false,
        id: 'block-body-1',
        paragraph: {
          rich_text: [{ plain_text: 'Corps prioritaire depuis la page Notion.' }],
        },
        type: 'paragraph',
      },
    ],
    mediaResolver: async () => '',
    publicationPages: [
      {
        id: 'publication-body-priority-1',
        last_edited_time: '2026-04-07T10:00:00.000Z',
        properties: {
          'Contenu texte': richTextProperty('Ancien contenu de secours.'),
          'Résumé': richTextProperty('Résumé court'),
          'Rubrique': selectProperty('Vie locale'),
          'Statut': selectProperty('Publié'),
          'Titre': titleProperty('Article prioritaire'),
          'Type': selectProperty('info'),
        },
        url: 'https://notion.so/publication-body-priority-1',
      },
    ],
    sectionPages: [],
    sectionItemPages: [],
  });

  assert.equal(snapshots.publications.length, 1);
  assert.equal(snapshots.publications[0].contenu_texte, 'Corps prioritaire depuis la page Notion.');
  assert.match(snapshots.publications[0].contenu_html, /Corps prioritaire depuis la page Notion/);
});

test('buildSnapshotsFromSources publie uniquement les contenus au statut select Publié', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });

  const publicationPage = (id, status) => ({
    id,
    last_edited_time: '2026-04-07T10:00:00.000Z',
    properties: {
      'Résumé': richTextProperty(`Résumé ${id}`),
      'Rubrique': selectProperty('Vie locale'),
      'Statut': selectProperty(status),
      'Titre': titleProperty(`Titre ${id}`),
      'Type': selectProperty('info'),
    },
    url: `https://notion.so/${id}`,
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [
      publicationPage('publication-select-draft-1', 'En cours'),
      publicationPage('publication-select-review-1', 'A valider'),
      publicationPage('publication-select-published-1', 'Publié'),
    ],
    sectionPages: [],
    sectionItemPages: [],
  });

  assert.deepEqual(
    snapshots.publications.map((publication) => publication.id),
    ['publication-select-published-1'],
  );
});

test('buildSnapshotsFromSources publie aussi les contenus au statut select Publication immédiate', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [
      {
        id: 'publication-immediate-1',
        last_edited_time: '2026-04-07T10:00:00.000Z',
        properties: {
          'Résumé': richTextProperty('Résumé publication-immediate-1'),
          'Rubrique': selectProperty('Vie locale'),
          'Statut': selectProperty('Publication immédiate'),
          'Titre': titleProperty('Titre publication-immediate-1'),
          'Type': selectProperty('info'),
        },
        url: 'https://notion.so/publication-immediate-1',
      },
    ],
    sectionPages: [],
    sectionItemPages: [],
  });

  assert.deepEqual(
    snapshots.publications.map((publication) => publication.id),
    ['publication-immediate-1'],
  );
});

test('buildSnapshotsFromSources résout les publications liées via le helper texte pour agenda et cantine', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });
  const statusProperty = (value) => ({
    status: { name: value },
    type: 'status',
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [
      {
        id: 'agenda-helper-1',
        last_edited_time: '2026-04-07T10:00:00.000Z',
        properties: {
          'Date de début': {
            date: { end: null, start: '2026-04-15T18:00:00.000Z' },
            type: 'date',
          },
          'Publication liée (helper)': richTextProperty('Réunion du village'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Réunion publique'),
        },
        url: 'https://notion.so/agenda-helper-1',
      },
    ],
    cantinePages: [
      {
        id: 'cantine-helper-1',
        properties: {
          'Jour': selectProperty('Lundi'),
          'Nom': titleProperty('Paëlla végétarienne'),
          'Publication liée (helper)': richTextProperty('Cantine des familles'),
          'Statut': statusProperty('Publié'),
        },
        url: 'https://notion.so/cantine-helper-1',
      },
    ],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [
      {
        id: 'publication-cantine-helper-1',
        last_edited_time: '2026-04-07T10:00:00.000Z',
        properties: {
          'Résumé': richTextProperty('Le menu de la semaine.'),
          'Rubrique': selectProperty('Scolaire'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Cantine des familles'),
          'Type': selectProperty('cantine'),
        },
        url: 'https://notion.so/publication-cantine-helper-1',
      },
      {
        id: 'publication-event-helper-1',
        last_edited_time: '2026-04-07T10:00:00.000Z',
        properties: {
          'Résumé': richTextProperty('Temps d’échange avec les habitants.'),
          'Rubrique': selectProperty('Vie locale'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Réunion du village'),
          'Type': selectProperty('evenement'),
        },
        url: 'https://notion.so/publication-event-helper-1',
      },
    ],
    sectionPages: [],
    sectionItemPages: [],
  });

  assert.equal(snapshots.cantine.length, 1);
  assert.equal(snapshots.cantine[0].publication_id, 'publication-cantine-helper-1');
  assert.equal(
    snapshots.publications.find((publication) => publication.id === 'publication-cantine-helper-1').cantine_jours.length,
    1,
  );
  assert.equal(snapshots.agenda.length, 1);
  assert.equal(snapshots.agenda[0].post_id, 'publication-event-helper-1');
  assert.ok(!snapshots.warnings.some((warning) => warning.includes('publication liée absente ou non publiée')));
});

test('buildSnapshotsFromSources accepte une clé de section texte pour Section items', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
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

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [],
    sectionPages: [
      {
        id: 'section-home-editorial-1',
        properties: {
          'Clé': richTextProperty('home-editorial'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Portail Citoyen'),
        },
        url: 'https://notion.so/section-home-editorial-1',
      },
    ],
    sectionItemPages: [
      {
        id: 'item-editorial-cta-1',
        properties: {
          'Groupe': selectProperty('cta_link'),
          'Lien': richTextProperty('agenda.html'),
          'Nom': titleProperty('Agenda du village'),
          'Ordre': numberProperty(1),
          'Section': richTextProperty('home-editorial'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Agenda du village'),
        },
      },
    ],
  });

  assert.deepEqual(snapshots.siteSections['home-editorial'].ctaLinks, [
    {
      href: 'agenda.html',
      label: 'Agenda du village',
    },
  ]);
  assert.ok(
    !snapshots.warnings.some((warning) => warning.includes('section liée absente') || warning.includes('section "home-editorial" inconnue')),
  );
});

test('buildSnapshotsFromSources ne reconstruit pas feature.title depuis Nom quand Titre est vide', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });
  const statusProperty = (value) => ({
    status: { name: value },
    type: 'status',
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [],
    sectionPages: [
      {
        id: 'section-home-hero-1',
        properties: {
          'Clé': richTextProperty('home-hero'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Accueil'),
        },
        url: 'https://notion.so/section-home-hero-1',
      },
    ],
    sectionItemPages: [
      {
        id: 'item-hero-feature-1',
        properties: {
          'Description': richTextProperty('Une esthétique inspirée des newsletters visuelles.'),
          'Groupe': selectProperty('feature'),
          'Kicker': richTextProperty('Édition locale'),
          'Nom': titleProperty('Édition locale'),
          'Section': richTextProperty('home-hero'),
          'Statut': statusProperty('Publié'),
          'Titre': richTextProperty(''),
        },
      },
    ],
  });

  assert.equal(snapshots.siteSections['home-hero'].feature.kicker, 'Édition locale');
  assert.equal(snapshots.siteSections['home-hero'].feature.description, 'Une esthétique inspirée des newsletters visuelles.');
  assert.equal(snapshots.siteSections['home-hero'].feature.title, '');
});

test('buildSnapshotsFromSources propage un Nom enrichi sur feature.kicker quand il étend le kicker', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });
  const statusProperty = (value) => ({
    status: { name: value },
    type: 'status',
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [],
    sectionPages: [
      {
        id: 'section-home-hero-1',
        properties: {
          'Clé': richTextProperty('home-hero'),
          'Statut': statusProperty('Publié'),
          'Titre': titleProperty('Accueil'),
        },
        url: 'https://notion.so/section-home-hero-1',
      },
    ],
    sectionItemPages: [
      {
        id: 'item-hero-feature-1',
        properties: {
          'Description': richTextProperty('Une esthétique inspirée des newsletters visuelles.'),
          'Groupe': selectProperty('feature'),
          'Kicker': richTextProperty('Édition locale'),
          'Nom': titleProperty('Édition locale ♥️'),
          'Section': richTextProperty('home-hero'),
          'Statut': statusProperty('Publié'),
          'Titre': richTextProperty(''),
        },
      },
    ],
  });

  assert.equal(snapshots.siteSections['home-hero'].feature.kicker, 'Édition locale ♥️');
  assert.equal(snapshots.siteSections['home-hero'].feature.title, '');
});

test('buildSnapshotsFromSources construit les sections depuis sections-site-items seul', async () => {
  const titleProperty = (value) => ({
    title: [{ plain_text: value }],
    type: 'title',
  });
  const richTextProperty = (value) => ({
    rich_text: [{ plain_text: value }],
    type: 'rich_text',
  });
  const selectProperty = (value) => ({
    select: { name: value },
    type: 'select',
  });
  const statusProperty = (value) => ({
    status: { name: value },
    type: 'status',
  });

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [],
    cantinePages: [],
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: [],
    sectionPages: [],
    sectionItemPages: [
      {
        id: 'item-site-nav-brand-title-1',
        properties: {
          'Groupe': selectProperty('field'),
          'Nom': titleProperty('brand_title'),
          'Section': richTextProperty('site-nav'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Le Bulletin citoyen'),
        },
      },
      {
        id: 'item-site-nav-home-1',
        properties: {
          'Groupe': selectProperty('nav_item'),
          'Nom': titleProperty('home'),
          'Ordre': { number: 1, type: 'number' },
          'Section': richTextProperty('site-nav'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Une'),
        },
      },
      {
        id: 'item-home-page-fallback-1',
        properties: {
          'Description': richTextProperty('Parents, portail famille et repères utiles.'),
          'Groupe': selectProperty('quick_link_fallback'),
          'Nom': titleProperty('Scolaire'),
          'Section': richTextProperty('home-page'),
          'Statut': statusProperty('Publié'),
          'Titre': richTextProperty('Vie scolaire'),
        },
      },
      {
        id: 'item-home-hero-quote-1',
        properties: {
          'Groupe': selectProperty('field'),
          'Nom': titleProperty('quote'),
          'Section': richTextProperty('home-hero'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Une citation pilotée uniquement par Section items.'),
        },
      },
      {
        id: 'item-footer-legal-right-1',
        properties: {
          'Groupe': selectProperty('field'),
          'Nom': titleProperty('legal_right'),
          'Section': richTextProperty('footer'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Mention footer portée par Section items.'),
        },
      },
      {
        id: 'item-home-diffusion-title-1',
        properties: {
          'Groupe': selectProperty('field'),
          'Nom': titleProperty('title'),
          'Section': richTextProperty('home-diffusion'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Diffusion pilotée sans Sections site'),
        },
      },
      {
        id: 'item-portal-intro-all-1',
        properties: {
          'Description': richTextProperty('Un portail structuré page par page.'),
          'Groupe': selectProperty('intro_variant'),
          'Kicker': richTextProperty('Vue générale'),
          'Nom': titleProperty('all'),
          'Section': richTextProperty('portal-page'),
          'Statut': statusProperty('Publié'),
          'Titre': richTextProperty('Portail citoyen'),
        },
      },
      {
        id: 'item-portal-type-cantine-1',
        properties: {
          'Groupe': selectProperty('type_meta'),
          'Nom': titleProperty('cantine'),
          'Section': richTextProperty('portal-page'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Cantine utile'),
          'Valeur': richTextProperty('Repas'),
        },
      },
      {
        id: 'item-portal-contact-phone-1',
        properties: {
          'Groupe': selectProperty('contact_field'),
          'Nom': titleProperty('phone'),
          'Section': richTextProperty('portal-page'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('01 00 00 00 00'),
        },
      },
      {
        id: 'item-portal-cantine-note-1',
        properties: {
          'Groupe': selectProperty('cantine_microcopy'),
          'Nom': titleProperty('note_label'),
          'Section': richTextProperty('portal-page'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Note pratique'),
        },
      },
      {
        id: 'item-agenda-phase-near-1',
        properties: {
          'Description': richTextProperty('Les dates les plus proches.'),
          'Groupe': selectProperty('phase'),
          'Nom': titleProperty('near'),
          'Section': richTextProperty('agenda-page'),
          'Statut': statusProperty('Publié'),
          'Titre': richTextProperty('Bientôt'),
        },
      },
      {
        id: 'item-agenda-weekday-1',
        properties: {
          'Groupe': selectProperty('weekday'),
          'Nom': titleProperty('monday'),
          'Ordre': { number: 1, type: 'number' },
          'Section': richTextProperty('agenda-page'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Lu'),
        },
      },
      {
        id: 'item-about-pillar-1',
        properties: {
          'Description': richTextProperty('Principe piloté depuis Section items.'),
          'Groupe': selectProperty('pillar'),
          'Nom': titleProperty('p1'),
          'Section': richTextProperty('about-page'),
          'Statut': statusProperty('Publié'),
          'Texte': richTextProperty('Objectif piloté depuis Section items.'),
          'Titre': richTextProperty('Pilier piloté'),
        },
      },
      {
        id: 'item-about-mockup-1',
        properties: {
          'Description': richTextProperty('Description maquette Notion.'),
          'Groupe': selectProperty('mockup_page'),
          'Kicker': richTextProperty('Page alpha'),
          'Nom': titleProperty('page-1'),
          'Section': richTextProperty('about-page'),
          'Statut': statusProperty('Publié'),
          'Titre': richTextProperty('Maquette alpha'),
        },
      },
    ],
  });

  assert.equal(snapshots.siteSections['site-nav'].brandTitle, 'Le Bulletin citoyen');
  assert.equal(snapshots.siteSections['site-nav'].items[0].label, 'Une');
  assert.equal(snapshots.siteSections['home-page'].quickLinkFallbacks[0].title, 'Vie scolaire');
  assert.equal(snapshots.siteSections['home-hero'].quote, 'Une citation pilotée uniquement par Section items.');
  assert.equal(snapshots.siteSections.footer.legalRight, 'Mention footer portée par Section items.');
  assert.equal(snapshots.siteSections['home-diffusion'].title, 'Diffusion pilotée sans Sections site');
  assert.equal(snapshots.siteSections['portal-page'].introVariants[0].title, 'Portail citoyen');
  assert.equal(snapshots.siteSections['portal-page'].typeMeta[0].label, 'Cantine utile');
  assert.equal(snapshots.siteSections['portal-page'].contact.phone, '01 00 00 00 00');
  assert.equal(snapshots.siteSections['portal-page'].cantineMicrocopy.noteLabel, 'Note pratique');
  assert.equal(snapshots.siteSections['agenda-page'].phases[0].title, 'Bientôt');
  assert.equal(snapshots.siteSections['agenda-page'].weekdays[0].label, 'Lu');
  assert.equal(snapshots.siteSections['about-page'].pillars[0].title, 'Pilier piloté');
  assert.equal(snapshots.siteSections['about-page'].mockupPages[0].title, 'Maquette alpha');
});

test('buildSnapshotsFromSources exclut les coups de coeur de l’agenda', async () => {
  const snapshots = await buildSnapshotsFromSources({
    agendaPages: [
      ...fixture.agendaPages,
      {
        id: 'ag-book-1',
        url: 'https://notion.so/ag-book-1',
        properties: {
          'Date de début': {
            date: { end: null, start: '2026-04-15T10:00:00.000Z' },
            type: 'date',
          },
          'Publication liée': {
            relation: [{ id: 'pub-book-1' }],
            type: 'relation',
          },
          'Statut': {
            status: { name: 'Publié' },
            type: 'status',
          },
          'Titre': {
            title: [{ plain_text: 'Rencontre lecture' }],
            type: 'title',
          },
        },
      },
    ],
    cantinePages: fixture.cantinePages,
    fetchBlocks: async () => [],
    mediaResolver: async () => '',
    publicationPages: fixture.publicationPages,
    sectionPages: fixture.sectionPages,
    sectionItemPages: [],
  });

  assert.equal(snapshots.agenda.length, 1);
  assert.ok(!snapshots.agenda.some((event) => event.id === 'ag-book-1'));
  assert.ok(snapshots.warnings.some((warning) => warning.includes("ag-book-1 ignoré: la publication liée n'est pas affichée dans l'agenda")));
});
