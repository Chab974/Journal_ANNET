import assert from 'node:assert/strict';
import test from 'node:test';

import fixture from './fixtures/notion/mock-notion-source.json' with { type: 'json' };

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

  const snapshots = await buildSnapshotsFromSources({
    agendaPages: fixture.agendaPages,
    cantinePages: fixture.cantinePages,
    fetchBlocks: async (pageId) => blockMap.get(pageId) ?? [],
    mediaResolver,
    publicationPages: fixture.publicationPages,
    sectionPages: fixture.sectionPages,
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

  assert.equal(snapshots.siteSections.footer.legalRight, 'Piloté par Notion');
  assert.ok(snapshots.warnings.some((warning) => warning.includes('Bloc Notion non supporté ignoré: video')));
  assert.ok(snapshots.warnings.some((warning) => warning.includes('Média ignoré')));
  assert.ok(!snapshots.publications.some((publication) => publication.id === 'pub-archived-1'));

  const validation = validateSnapshots(snapshots);
  assert.deepEqual(validation.errors, []);
});
