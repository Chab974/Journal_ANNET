import { createNotionClient, listBlockTree, queryDataSourcePages } from './lib/notion/client.mjs';
import { resolveNotionFileAsset } from './lib/notion/media.mjs';
import { buildSnapshotsFromSources } from './lib/notion/snapshot-builders.mjs';
import { fromRepo, writeJsonFile } from './lib/utils.mjs';

const requiredEnv = [
  'NOTION_TOKEN',
  'NOTION_PUBLICATIONS_DATA_SOURCE_ID',
  'NOTION_AGENDA_DATA_SOURCE_ID',
  'NOTION_MENU_ITEMS_DATA_SOURCE_ID',
  'NOTION_SITE_SECTIONS_DATA_SOURCE_ID',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
}

const notion = createNotionClient();

const [
  publicationPages,
  agendaPages,
  cantinePages,
  sectionPages,
] = await Promise.all([
  queryDataSourcePages(notion, process.env.NOTION_PUBLICATIONS_DATA_SOURCE_ID),
  queryDataSourcePages(notion, process.env.NOTION_AGENDA_DATA_SOURCE_ID),
  queryDataSourcePages(notion, process.env.NOTION_MENU_ITEMS_DATA_SOURCE_ID),
  queryDataSourcePages(notion, process.env.NOTION_SITE_SECTIONS_DATA_SOURCE_ID),
]);

const blockCache = new Map();
async function fetchBlocks(pageId) {
  if (!blockCache.has(pageId)) {
    blockCache.set(pageId, listBlockTree(notion, pageId));
  }

  return blockCache.get(pageId);
}

const snapshots = await buildSnapshotsFromSources({
  agendaPages,
  cantinePages,
  fetchBlocks,
  mediaResolver: ({ file, pageId }) => resolveNotionFileAsset({ file, pageId }),
  publicationPages,
  sectionPages,
});

await Promise.all([
  writeJsonFile(fromRepo('data', 'publications.json'), snapshots.publications),
  writeJsonFile(fromRepo('data', 'agenda.json'), snapshots.agenda),
  writeJsonFile(fromRepo('data', 'cantine.json'), snapshots.cantine),
  writeJsonFile(fromRepo('data', 'site-sections.json'), snapshots.siteSections),
  writeJsonFile(fromRepo('data', 'citizen-posts.json'), snapshots.publications),
  writeJsonFile(fromRepo('data', 'calendar-events.json'), snapshots.agenda),
]);

console.log(
  `Snapshots générés: ${snapshots.publications.length} publications, ${snapshots.agenda.length} dates, ${snapshots.cantine.length} entrées cantine.`,
);

if (snapshots.warnings.length > 0) {
  console.warn('\nAvertissements de sync Notion:');
  for (const warning of snapshots.warnings) {
    console.warn(`- ${warning}`);
  }
}
