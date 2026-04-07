import assert from 'node:assert/strict';
import test from 'node:test';

import { hashPublicSnapshotPayload } from '../scripts/lib/public-snapshot-hash.mjs';

test('hashPublicSnapshotPayload est stable quand seul l’ordre des clés change', () => {
  const left = {
    'agenda.json': [{ id: 'agenda-1', title: 'Forum' }],
    'cantine.json': [{ day: 'Lundi', items: ['Salade'] }],
    'publications.json': [{ id: 'pub-1', titre: 'Bonjour', type: 'info' }],
    'site-sections.json': {
      footer: {
        legalLeft: 'Villevaude',
        legalRight: 'ANNET',
      },
    },
  };

  const right = {
    'site-sections.json': {
      footer: {
        legalRight: 'ANNET',
        legalLeft: 'Villevaude',
      },
    },
    'publications.json': [{ type: 'info', titre: 'Bonjour', id: 'pub-1' }],
    'cantine.json': [{ items: ['Salade'], day: 'Lundi' }],
    'agenda.json': [{ title: 'Forum', id: 'agenda-1' }],
  };

  assert.equal(hashPublicSnapshotPayload(left), hashPublicSnapshotPayload(right));
});

test('hashPublicSnapshotPayload change quand le contenu public change', () => {
  const base = {
    'agenda.json': [],
    'cantine.json': [],
    'publications.json': [{ id: 'pub-1', titre: 'Bonjour' }],
    'site-sections.json': {},
  };

  const updated = {
    ...base,
    'publications.json': [{ id: 'pub-1', titre: 'Bonjour tout le monde' }],
  };

  assert.notEqual(hashPublicSnapshotPayload(base), hashPublicSnapshotPayload(updated));
});
