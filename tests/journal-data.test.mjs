import assert from 'node:assert/strict';
import test from 'node:test';

import loadJournalData from '../src/_data/journal.cjs';

const { buildHomeData } = loadJournalData.__private__;

test('buildHomeData met en avant jusqu’à trois publications featured et les prochains événements', () => {
  const home = buildHomeData({
    agenda: [
      {
        date_label: 'Lundi 7 avril 2026',
        description: 'Premier événement futur',
        post_slug: 'concert-printemps',
        rubrique: 'Événements',
        start_iso: '20260407T180000Z',
        title: 'Concert de printemps',
      },
      {
        date_label: 'Samedi 11 avril 2026',
        description: 'Deuxième événement futur',
        post_slug: 'forum-metiers',
        rubrique: 'Vie locale',
        start_iso: '20260411T120000Z',
        title: 'Forum des métiers',
      },
      {
        date_label: 'Dimanche 24 mai 2026',
        description: 'Troisième événement futur',
        post_slug: 'brocante-printemps',
        rubrique: 'Événements',
        start_iso: '20260524T060000Z',
        title: 'Brocante',
      },
      {
        date_label: 'Samedi 4 avril 2026',
        description: 'Événement passé',
        post_slug: 'marche-passee',
        rubrique: 'Vie locale',
        start_iso: '20260404T090000Z',
        title: 'Marché passé',
      },
    ],
    cantine: [
      {
        cantine_jours: [
          { day: 'Lundi', items: [{ name: 'Plat 1' }, { name: 'Plat 2' }] },
          { day: 'Mercredi', isSpecial: true, message: 'Message spécial', items: [] },
        ],
        publication_slug: 'cantine-semaine',
        publication_title: 'Cantine de la semaine',
      },
    ],
    publications: [
      { id: 'post-1', rubrique: 'Vie locale', slug: 'balade-patrimoine', titre: 'Balade patrimoine' },
      { featured: true, id: 'post-2', rubrique: 'Événements', slug: 'brocante-printemps', titre: 'Brocante de printemps' },
      { featured: true, id: 'post-3', rubrique: 'Scolaire', slug: 'cantine-semaine', titre: 'Cantine de la semaine' },
      { featured: true, id: 'post-4', rubrique: 'Vie associative', slug: 'forum-associations', titre: 'Forum des associations' },
      { id: 'post-5', rubrique: 'Vie locale', slug: 'marche-local', titre: 'Marché local' },
    ],
    referenceDate: new Date('2026-04-06T00:00:00Z'),
  });

  assert.equal(home.featuredPublication.titre, 'Brocante de printemps');
  assert.equal(home.featuredPublication.href, 'portail.html?rubrique=%C3%89v%C3%A9nements&slug=brocante-printemps#post-brocante-printemps');
  assert.deepEqual(home.secondaryPublications.map((item) => item.titre), [
    'Cantine de la semaine',
    'Forum des associations',
  ]);
  assert.equal(home.heroSpotlightMode, 'upcoming');
  assert.deepEqual(home.heroSpotlightItems.map((item) => item.title), [
    'Concert de printemps',
    'Forum des métiers',
    'Brocante',
  ]);
  assert.deepEqual(home.upcomingEvents.map((item) => item.title), [
    'Concert de printemps',
    'Forum des métiers',
    'Brocante',
  ]);
  assert.equal(home.cantineEntry.totalItems, 2);
  assert.equal(home.cantineEntry.specialTitle, 'Mercredi');
  assert.equal(home.quickLinks.find((item) => item.rubrique === 'Scolaire').headline, 'Cantine de la semaine');
  assert.equal(home.quickLinks.find((item) => item.rubrique === 'Scolaire').chipClass, 'quick-link-chip--brown');
  assert.equal(home.quickLinks.find((item) => item.rubrique === 'Événements').chipClass, 'quick-link-chip--green');
  assert.equal(home.quickLinks.find((item) => item.rubrique === 'Vie associative').chipClass, 'quick-link-chip--blue');
});

test('buildHomeData fournit des fallbacks quand les données sont absentes', () => {
  const home = buildHomeData({
    agenda: [],
    cantine: [],
    publications: [],
    referenceDate: new Date('2026-04-06T00:00:00Z'),
  });

  assert.equal(home.featuredPublication, null);
  assert.equal(home.heroSpotlightMode, 'upcoming');
  assert.deepEqual(home.heroSpotlightItems, []);
  assert.deepEqual(home.secondaryPublications, []);
  assert.deepEqual(home.upcomingEvents, []);
  assert.equal(home.cantineEntry, null);
  assert.equal(home.quickLinks.length, 6);
  assert.equal(home.quickLinks.find((item) => item.rubrique === 'Vie associative').hasContent, false);
});

test("buildHomeData n'utilise plus automatiquement le premier article comme mise en avant", () => {
  const home = buildHomeData({
    publications: [
      { id: 'post-1', rubrique: 'Vie locale', slug: 'troisieme-article', titre: '3 eme article' },
      { id: 'post-2', rubrique: 'Vie locale', slug: 'deuxieme-article', titre: '2e article' },
      { id: 'post-3', rubrique: 'Information', slug: 'premier-article', titre: 'Création d 1er article' },
    ],
    referenceDate: new Date('2026-04-06T00:00:00Z'),
  });

  assert.equal(home.featuredPublication, null);
  assert.deepEqual(
    home.secondaryPublications.map((item) => item.titre),
    ['3 eme article', '2e article', 'Création d 1er article'],
  );
});

test("buildHomeData privilégie les actus du jour dans le hero et prépare un carrousel s'il y en a plusieurs", () => {
  const home = buildHomeData({
    agenda: [
      {
        date_label: 'Lundi 13 avril 2026',
        description: 'Premier rendez-vous du jour',
        location: 'Place de la mairie',
        post_slug: 'actu-1',
        rubrique: 'Vie locale',
        start_iso: '20260413T070000Z',
        time_label: '09h00 - 10h00',
        title: 'Café citoyen',
      },
      {
        date_label: 'Lundi 13 avril 2026',
        description: 'Deuxième rendez-vous du jour',
        location: 'Salle des fêtes',
        post_slug: 'actu-2',
        rubrique: 'Vie associative',
        start_iso: '20260413T120000Z',
        time_label: '14h00 - 16h00',
        title: 'Atelier associatif',
      },
      {
        date_label: 'Mardi 14 avril 2026',
        description: 'Rendez-vous du lendemain',
        location: 'Bibliothèque',
        post_slug: 'actu-3',
        rubrique: 'Coup de cœur littéraire',
        start_iso: '20260414T080000Z',
        time_label: '10h00 - 11h00',
        title: 'Lecture publique',
      },
    ],
    referenceDate: new Date('2026-04-13T08:00:00Z'),
  });

  assert.equal(home.heroSpotlightMode, 'today');
  assert.deepEqual(home.heroSpotlightItems.map((item) => item.title), [
    'Café citoyen',
    'Atelier associatif',
  ]);
  assert.deepEqual(home.heroSpotlightItems.map((item) => item.articleHref), [
    'portail.html?rubrique=Vie+locale&slug=actu-1#post-actu-1',
    'portail.html?rubrique=Vie+associative&slug=actu-2#post-actu-2',
  ]);
});
