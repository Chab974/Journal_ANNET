import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

import { fromRepo } from '../scripts/lib/utils.mjs';

const execFileAsync = promisify(execFile);

function assertBuiltPageUsesLocalAssets(html, { pageCssHref, pageScriptHref }) {
  assert.match(html, /<link rel="stylesheet" href="assets\/styles\/tailwind\.css">/);
  assert.match(html, /<link rel="stylesheet" href="assets\/styles\/site-shared\.css">/);
  assert.match(html, new RegExp(`<link rel="stylesheet" href="${pageCssHref.replaceAll('.', '\\.')}">`));
  assert.match(html, /<script src="assets\/scripts\/journal-shared-client\.js"><\/script>/);
  assert.match(html, /<script src="assets\/scripts\/site-nav\.js"><\/script>/);
  assert.match(html, new RegExp(`<script src="${pageScriptHref.replaceAll('.', '\\.')}"><\\/script>`));

  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.doesNotMatch(html, /fonts\.gstatic\.com/);
  assert.doesNotMatch(html, /tailwindSafelist/);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /application\/json/i);
  assert.doesNotMatch(html, /<link\b[^>]+rel="stylesheet"[^>]+href="https?:\/\//i);
  assert.doesNotMatch(html, /<(?:script|img)\b[^>]+src="https?:\/\//i);
}

test('npm run build génère le site avec assets first-party et JSON UI same-origin', async () => {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: fromRepo(),
  });

  await Promise.all([
    assert.rejects(readFile(fromRepo('index.html'), 'utf8'), { code: 'ENOENT' }),
    assert.rejects(readFile(fromRepo('portail.html'), 'utf8'), { code: 'ENOENT' }),
    assert.rejects(readFile(fromRepo('agenda.html'), 'utf8'), { code: 'ENOENT' }),
  ]);

  const [indexHtml, portalHtml, agendaHtml, aboutHtml] = await Promise.all([
    readFile(fromRepo('_site', 'index.html'), 'utf8'),
    readFile(fromRepo('_site', 'portail.html'), 'utf8'),
    readFile(fromRepo('_site', 'agenda.html'), 'utf8'),
    readFile(fromRepo('_site', 'a-propos.html'), 'utf8'),
  ]);

  const [portalPosts, portalPage, agendaEvents, agendaPage, aboutPage] = await Promise.all([
    readFile(fromRepo('_site', 'data', 'ui', 'portal-posts.json'), 'utf8').then((raw) => JSON.parse(raw)),
    readFile(fromRepo('_site', 'data', 'ui', 'portal-page.json'), 'utf8').then((raw) => JSON.parse(raw)),
    readFile(fromRepo('_site', 'data', 'ui', 'agenda-events.json'), 'utf8').then((raw) => JSON.parse(raw)),
    readFile(fromRepo('_site', 'data', 'ui', 'agenda-page.json'), 'utf8').then((raw) => JSON.parse(raw)),
    readFile(fromRepo('_site', 'data', 'ui', 'about-page.json'), 'utf8').then((raw) => JSON.parse(raw)),
  ]);

  assertBuiltPageUsesLocalAssets(indexHtml, {
    pageCssHref: 'assets/styles/page-home.css',
    pageScriptHref: 'assets/scripts/page-home.js',
  });
  assertBuiltPageUsesLocalAssets(portalHtml, {
    pageCssHref: 'assets/styles/page-portal.css',
    pageScriptHref: 'assets/scripts/page-portal.js',
  });
  assertBuiltPageUsesLocalAssets(agendaHtml, {
    pageCssHref: 'assets/styles/page-agenda.css',
    pageScriptHref: 'assets/scripts/page-agenda.js',
  });
  assertBuiltPageUsesLocalAssets(aboutHtml, {
    pageCssHref: 'assets/styles/page-about.css',
    pageScriptHref: 'assets/scripts/page-about.js',
  });

  assert.match(indexHtml, /En ce moment/);
  assert.match(indexHtml, /Cette semaine/);
  assert.match(indexHtml, /Coup de cœur/);
  assert.match(indexHtml, /action="portail\.html"/);
  assert.match(indexHtml, /Rechercher un titre, une rubrique, un lieu/);

  assert.match(portalHtml, /id="portal-search"/);
  assert.match(portalHtml, /id="portal-posts"/);
  assert.match(portalHtml, /Actualités/);
  assert.doesNotMatch(portalHtml, /portal-posts-data/);
  assert.doesNotMatch(portalHtml, /portal-copy-data/);
  assert.doesNotMatch(portalHtml, /const portalIntroConfig = \{/);

  assert.match(agendaHtml, /id="agenda-search"/);
  assert.match(agendaHtml, /id="agenda-results"/);
  assert.match(agendaHtml, /Vue calendrier/);
  assert.doesNotMatch(agendaHtml, /agenda-events-data/);
  assert.doesNotMatch(agendaHtml, /agenda-copy-data/);
  assert.doesNotMatch(agendaHtml, /const weekDayLabels = \['Lun', 'Mar', 'Mer'/);

  assert.match(aboutHtml, /7 piliers éditoriaux/i);
  assert.match(aboutHtml, /Stratégie de Diffusion/);
  assert.doesNotMatch(aboutHtml, /about-copy-data/);
  assert.doesNotMatch(aboutHtml, /const pillarsData = \[/);

  assert.ok(Array.isArray(portalPosts));
  assert.ok(portalPosts.length > 0);
  assert.ok(portalPosts.every((post) => !post?.cover_image || !/^https?:\/\//i.test(post.cover_image)));
  assert.ok(portalPosts.every((post) => !post?.image || !/^https?:\/\//i.test(post.image)));

  assert.equal(typeof portalPage, 'object');
  assert.equal(typeof agendaPage, 'object');
  assert.equal(typeof aboutPage, 'object');
  assert.ok(Array.isArray(aboutPage.pillars));
  assert.ok(aboutPage.pillars.length > 0);

  assert.ok(Array.isArray(agendaEvents));
  assert.ok(!agendaEvents.some((entry) => entry?.rubrique === 'Coup de cœur littéraire'));
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
