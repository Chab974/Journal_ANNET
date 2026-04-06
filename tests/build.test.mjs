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

  const [indexHtml, portalHtml, agendaHtml, aboutHtml] = await Promise.all([
    readFile(fromRepo('_site', 'index.html'), 'utf8'),
    readFile(fromRepo('_site', 'portail.html'), 'utf8'),
    readFile(fromRepo('_site', 'agenda.html'), 'utf8'),
    readFile(fromRepo('_site', 'a-propos.html'), 'utf8'),
  ]);
  const agendaDataMatch = agendaHtml.match(/<script id="agenda-events-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(agendaDataMatch, 'Le snapshot agenda embarqué doit être présent dans agenda.html');
  const embeddedAgenda = JSON.parse(agendaDataMatch[1]);

  assert.match(indexHtml, /En ce moment/);
  assert.match(indexHtml, /Cette semaine/);
  assert.match(indexHtml, /Cantine & familles/);
  assert.match(indexHtml, /Coup de cœur/);
  assert.match(indexHtml, /max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12/);
  assert.match(indexHtml, /Rechercher un titre, une rubrique, un lieu, un auteur/);
  assert.match(indexHtml, /action="portail\.html"/);
  assert.match(indexHtml, />Actualités</);
  assert.doesNotMatch(indexHtml, /Stratégie de Diffusion/);
  assert.match(portalHtml, /portal-posts-data/);
  assert.match(portalHtml, /initialSearchParams\.get\('q'\)/);
  assert.match(portalHtml, /<h1[^>]*>Actualités</);
  assert.match(portalHtml, /Résumé rapide/);
  assert.match(portalHtml, /En bref/);
  assert.match(portalHtml, /max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12/);
  assert.match(portalHtml, /grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s*minmax\(18rem,\s*22rem\)/);
  assert.match(portalHtml, /portal-article-main/);
  assert.match(portalHtml, /aria-label="Repères liés à cette publication"/);
  assert.doesNotMatch(portalHtml, /max-w-\[96rem\]/);
  assert.match(agendaHtml, /agenda-events-data/);
  assert.match(agendaHtml, /Vue calendrier/);
  assert.match(agendaHtml, /Prochainement/);
  assert.match(agendaHtml, /Passés récemment/);
  assert.match(agendaHtml, /Résumé rapide/);
  assert.match(agendaHtml, /max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12/);
  assert.ok(!embeddedAgenda.some((entry) => entry?.rubrique === 'Coup de cœur littéraire'));
  assert.match(aboutHtml, /7 piliers éditoriaux/i);
  assert.match(aboutHtml, /Stratégie de Diffusion/);
  assert.match(aboutHtml, /max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12/);
  assert.doesNotMatch(portalHtml, /fetch\('\.\/data\/citizen-posts\.json'/);
  assert.doesNotMatch(agendaHtml, /fetch\('\.\/data\/calendar-events\.json'/);
});

test('le build GitHub Pages injecte un base href compatible sous-répertoire', async () => {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: fromRepo(),
    env: {
      ...process.env,
      SITE_DEPLOY_TARGET: 'github-pages-demo',
      SITE_PATH_PREFIX: '/Journal_ANNET/',
    },
  });

  const [indexHtml, portalHtml, agendaHtml, aboutHtml] = await Promise.all([
    readFile(fromRepo('_site', 'index.html'), 'utf8'),
    readFile(fromRepo('_site', 'portail.html'), 'utf8'),
    readFile(fromRepo('_site', 'agenda.html'), 'utf8'),
    readFile(fromRepo('_site', 'a-propos.html'), 'utf8'),
  ]);

  assert.match(indexHtml, /<base href="\/Journal_ANNET\/">/);
  assert.match(portalHtml, /<base href="\/Journal_ANNET\/">/);
  assert.match(agendaHtml, /<base href="\/Journal_ANNET\/">/);
  assert.match(aboutHtml, /<base href="\/Journal_ANNET\/">/);
});
