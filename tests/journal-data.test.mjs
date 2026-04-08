import assert from 'node:assert/strict';
import test from 'node:test';

import loadJournalData from '../src/_data/journal.cjs';

const { buildHomeData } = loadJournalData.__private__;

test('buildHomeData privilégie la publication featured et les prochains événements', () => {
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
      { id: 'post-3', rubrique: 'Scolaire', slug: 'cantine-semaine', titre: 'Cantine de la semaine' },
    ],
    referenceDate: new Date('2026-04-06T00:00:00Z'),
  });

  assert.equal(home.featuredPublication.titre, 'Brocante de printemps');
  assert.equal(home.featuredPublication.href, 'portail.html?rubrique=%C3%89v%C3%A9nements&slug=brocante-printemps');
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
