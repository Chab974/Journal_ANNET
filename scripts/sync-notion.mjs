import { createNotionClient, listBlockTree, queryDataSourcePages } from './lib/notion/client.mjs';
import { resolveNotionFileAsset } from './lib/notion/media.mjs';
import { buildTrackedPageIndex } from './lib/notion/page-index.mjs';
import { buildSnapshotsFromSources } from './lib/notion/snapshot-builders.mjs';
import { resolveSyncNotionConfig } from './lib/notion/sync-config.mjs';
import { fromRepo, writeJsonFile } from './lib/utils.mjs';

const syncConfig = resolveSyncNotionConfig();
const syncWarnings = [...syncConfig.warnings];
const notion = createNotionClient();

const [
  publicationPages,
  agendaPages,
  cantinePages,
  sectionPages,
  sectionItemPages,
] = await Promise.all([
  queryDataSourcePages(notion, syncConfig.dataSourceIds.publications),
  queryDataSourcePages(notion, syncConfig.dataSourceIds.agenda),
  queryDataSourcePages(notion, syncConfig.dataSourceIds.menuItems),
  syncConfig.dataSourceIds.siteSections
    ? queryDataSourcePages(notion, syncConfig.dataSourceIds.siteSections)
    : Promise.resolve([]),
  syncConfig.dataSourceIds.sectionItems
    ? queryDataSourcePages(notion, syncConfig.dataSourceIds.sectionItems)
    : Promise.resolve([]),
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
  sectionItemPages,
});
const trackedPageIndex = buildTrackedPageIndex({
  agendaPages,
  cantinePages,
  publicationPages,
  sectionItemPages,
  sectionPages,
});

await Promise.all([
  writeJsonFile(fromRepo('data', 'publications.json'), snapshots.publications),
  writeJsonFile(fromRepo('data', 'agenda.json'), snapshots.agenda),
  writeJsonFile(fromRepo('data', 'cantine.json'), snapshots.cantine),
  writeJsonFile(fromRepo('data', 'site-sections.json'), snapshots.siteSections),
  writeJsonFile(fromRepo('data', 'notion-page-index.json'), trackedPageIndex),
  writeJsonFile(fromRepo('data', 'citizen-posts.json'), snapshots.publications),
  writeJsonFile(fromRepo('data', 'calendar-events.json'), snapshots.agenda),
]);

console.log(
  `Snapshots générés: ${snapshots.publications.length} publications, ${snapshots.agenda.length} dates, ${snapshots.cantine.length} entrées cantine.`,
);

const warnings = [...syncWarnings, ...snapshots.warnings];

if (warnings.length > 0) {
  console.warn('\nAvertissements de sync Notion:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}
