import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSyncNotionConfig } from '../scripts/lib/notion/sync-config.mjs';

test('resolveSyncNotionConfig accepte le mode legacy avec Sections site seul', () => {
  const config = resolveSyncNotionConfig({
    NOTION_AGENDA_DATA_SOURCE_ID: 'agenda',
    NOTION_MENU_ITEMS_DATA_SOURCE_ID: 'cantine',
    NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'publications',
    NOTION_SITE_SECTIONS_DATA_SOURCE_ID: 'sections',
    NOTION_TOKEN: 'secret',
  });

  assert.deepEqual(config.dataSourceIds, {
    agenda: 'agenda',
    menuItems: 'cantine',
    publications: 'publications',
    sectionItems: '',
    siteSections: 'sections',
  });
  assert.equal(config.warnings.length, 1);
  assert.match(config.warnings[0], /NOTION_SITE_SECTION_ITEMS_DATA_SOURCE_ID/);
});

test('resolveSyncNotionConfig accepte le mode sections-site-items uniquement', () => {
  const config = resolveSyncNotionConfig({
    NOTION_AGENDA_DATA_SOURCE_ID: 'agenda',
    NOTION_MENU_ITEMS_DATA_SOURCE_ID: 'cantine',
    NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'publications',
    NOTION_SITE_SECTION_ITEMS_DATA_SOURCE_ID: 'section-items',
    NOTION_TOKEN: 'secret',
  });

  assert.deepEqual(config.dataSourceIds, {
    agenda: 'agenda',
    menuItems: 'cantine',
    publications: 'publications',
    sectionItems: 'section-items',
    siteSections: '',
  });
  assert.equal(config.warnings.length, 1);
  assert.match(config.warnings[0], /mode sections-site-items uniquement/);
});

test('resolveSyncNotionConfig échoue si une variable principale hors sections manque', () => {
  assert.throws(
    () =>
      resolveSyncNotionConfig({
        NOTION_MENU_ITEMS_DATA_SOURCE_ID: 'cantine',
        NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'publications',
        NOTION_SITE_SECTION_ITEMS_DATA_SOURCE_ID: 'section-items',
        NOTION_TOKEN: 'secret',
      }),
    /NOTION_AGENDA_DATA_SOURCE_ID/,
  );
});
