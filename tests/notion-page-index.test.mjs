import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTrackedPageIndex,
  getTrackedPageSource,
  normalizeTrackedPageIndex,
} from '../scripts/lib/notion/page-index.mjs';

test('buildTrackedPageIndex recense les pages Notion suivies', () => {
  const index = buildTrackedPageIndex({
    agendaPages: [{ id: 'agenda-1' }],
    cantinePages: [{ id: 'cantine-1' }],
    publicationPages: [{ id: 'pub-1' }],
    sectionItemPages: [{ id: 'section-item-1' }],
    sectionPages: [{ id: 'section-1' }],
  });

  assert.equal(getTrackedPageSource(index, 'pub-1'), 'publications');
  assert.equal(getTrackedPageSource(index, 'agenda-1'), 'agenda');
  assert.equal(getTrackedPageSource(index, 'cantine-1'), 'cantine');
  assert.equal(getTrackedPageSource(index, 'section-1'), 'site-sections');
  assert.equal(getTrackedPageSource(index, 'section-item-1'), 'site-section-items');
});

test('normalizeTrackedPageIndex filtre les entrées invalides', () => {
  const normalized = normalizeTrackedPageIndex({
    generated_at: '',
    page_sources: {
      '': 'publications',
      'page-1': '',
      'page-2': 'agenda',
    },
    schema_version: 999,
  });

  assert.equal(normalized.generated_at, null);
  assert.deepEqual(normalized.page_sources, {
    'page-2': 'agenda',
  });
  assert.equal(normalized.schema_version, 1);
});
