import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSyncNotionConfig } from '../scripts/lib/notion/sync-config.mjs';

test('resolveSyncNotionConfig conserve les sources principales et accepte l’absence des section items', () => {
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

test('resolveSyncNotionConfig échoue si une variable principale manque', () => {
  assert.throws(
    () =>
      resolveSyncNotionConfig({
        NOTION_AGENDA_DATA_SOURCE_ID: 'agenda',
        NOTION_MENU_ITEMS_DATA_SOURCE_ID: 'cantine',
        NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'publications',
        NOTION_TOKEN: 'secret',
      }),
    /NOTION_SITE_SECTIONS_DATA_SOURCE_ID/,
  );
});
