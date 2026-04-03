import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { readJsonFile, fromRepo } from './lib/utils.mjs';
import { buildNotionImportFiles, extractLegacyPublicationDatesFromCsv } from './lib/notion/import-csv.mjs';

const execFile = promisify(execFileCallback);

const [publications, agenda, cantine, siteSections] = await Promise.all([
  readJsonFile(fromRepo('data', 'publications.json'), []),
  readJsonFile(fromRepo('data', 'agenda.json'), []),
  readJsonFile(fromRepo('data', 'cantine.json'), []),
  readJsonFile(fromRepo('data', 'site-sections.json'), {}),
]);

const legacyPublicationDates = await loadLegacyPublicationDates();

const files = buildNotionImportFiles({
  agenda,
  cantine,
  legacyPublicationDates,
  publications,
  siteSections,
});

await mkdir(fromRepo('notion-imports'), { recursive: true });

for (const [fileName, content] of Object.entries(files)) {
  await writeFile(fromRepo('notion-imports', fileName), content, 'utf8');
  console.log(`Écrit notion-imports/${fileName}`);
}

async function loadLegacyPublicationDates() {
  const sources = [];

  try {
    sources.push(await readFile(fromRepo('notion-imports', 'publications.csv'), 'utf8'));
  } catch {}

  try {
    const { stdout } = await execFile('git', ['show', 'HEAD:notion-imports/publications.csv'], {
      cwd: fromRepo(),
    });
    if (stdout) {
      sources.push(stdout);
    }
  } catch {}

  return sources.reduce((accumulator, source) => {
    const parsed = extractLegacyPublicationDatesFromCsv(source);
    for (const [slug, dates] of Object.entries(parsed)) {
      const current = accumulator[slug] ?? {};
      accumulator[slug] = {
        end: current.end || dates.end || '',
        start: current.start || dates.start || '',
      };
    }
    return accumulator;
  }, {});
}
