import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

import { fromRepo } from '../scripts/lib/utils.mjs';

const execFileAsync = promisify(execFile);

test('npm run build génère les pages Eleventy avec snapshots injectés', async () => {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: fromRepo(),
  });

  const [indexHtml, portalHtml, agendaHtml] = await Promise.all([
    readFile(fromRepo('_site', 'index.html'), 'utf8'),
    readFile(fromRepo('_site', 'portail.html'), 'utf8'),
    readFile(fromRepo('_site', 'agenda.html'), 'utf8'),
  ]);

  assert.match(indexHtml, /Stratégie de Diffusion/);
  assert.match(portalHtml, /portal-posts-data/);
  assert.match(agendaHtml, /agenda-events-data/);
  assert.doesNotMatch(portalHtml, /fetch\('\.\/data\/citizen-posts\.json'/);
  assert.doesNotMatch(agendaHtml, /fetch\('\.\/data\/calendar-events\.json'/);
});
