import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { fromRepo } from '../scripts/lib/utils.mjs';
import {
  PREFECTURE_RESULT_ERROR,
  buildMairieRssUrl,
  buildPrefectureSearchUrl,
  fetchAnnetSurMarneVeille,
  parseMairieRss,
  parsePrefectureHtml,
} from '../scripts/lib/veille/annetsurmarne.mjs';

const mairieFixturePath = fromRepo('tests', 'fixtures', 'veille', 'mairie-rss.xml');
const prefectureFixturePath = fromRepo('tests', 'fixtures', 'veille', 'prefecture-search.html');
const prefectureBrokenFixturePath = fromRepo('tests', 'fixtures', 'veille', 'prefecture-broken.html');

test('parseMairieRss normalise le flux RSS de la mairie', async () => {
  const xml = await readFile(mairieFixturePath, 'utf8');
  const results = parseMairieRss(xml);

  assert.equal(results.length, 2);
  assert.equal(results[0].source, 'mairie');
  assert.equal(results[0].title, 'Conseil municipal du printemps');
  assert.equal(results[0].link, 'https://www.annetsurmarne.com/conseil-municipal-printemps/');
  assert.match(results[0].excerpt, /Ordre du jour et délibérations prévues/);
  assert.match(results[1].excerpt, /travaux de voirie débutent/i);
});

test("buildPrefectureSearchUrl encode les espaces avec des '+'", () => {
  const url = buildPrefectureSearchUrl('travaux école');

  assert.match(url, /SearchText=annet\+sur\+marne\+travaux\+%C3%A9cole/);
  assert.doesNotMatch(url, /%20/);
});

test('buildMairieRssUrl conserve un flux RSS natif sans proxy public', () => {
  const url = buildMairieRssUrl('travaux');

  assert.match(url, /^https:\/\/www\.annetsurmarne\.com\/\?feed=rss2&s=travaux$/);
});

test('parsePrefectureHtml extrait les cartes de résultats et absolutise les liens relatifs', async () => {
  const html = await readFile(prefectureFixturePath, 'utf8');
  const results = parsePrefectureHtml(html);

  assert.equal(results.length, 2);
  assert.equal(results[0].source, 'prefecture');
  assert.equal(results[0].title, 'Restriction de circulation à Annet-sur-Marne');
  assert.equal(results[0].link, 'https://www.seine-et-marne.gouv.fr/Actions-de-l-Etat/Securite-et-protection-des-populations/Circulation-annet-sur-marne');
  assert.equal(results[0].pubDate, '8 avril 2026');
  assert.match(results[1].excerpt, /réunion d'information/i);
});

test('parsePrefectureHtml signale une structure cassée au lieu de produire un faux résultat', async () => {
  const html = await readFile(prefectureBrokenFixturePath, 'utf8');

  assert.throws(
    () => parsePrefectureHtml(html),
    new Error(PREFECTURE_RESULT_ERROR),
  );
});

test("fetchAnnetSurMarneVeille remonte une erreur ciblée sur la préfecture sans faire échouer l'ensemble", async () => {
  const mairieXml = await readFile(mairieFixturePath, 'utf8');
  const prefectureBrokenHtml = await readFile(prefectureBrokenFixturePath, 'utf8');

  const payload = await fetchAnnetSurMarneVeille('travaux', {
    fetchImpl: async (url) => {
      if (String(url).startsWith('https://www.annetsurmarne.com/')) {
        return new Response(mairieXml, {
          status: 200,
          headers: { 'content-type': 'application/rss+xml' },
        });
      }

      if (String(url).startsWith('https://www.seine-et-marne.gouv.fr/')) {
        return new Response(prefectureBrokenHtml, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }

      throw new Error(`URL inattendue dans le test: ${url}`);
    },
  });

  assert.equal(payload.query, 'travaux');
  assert.equal(payload.mairie.error, null);
  assert.equal(payload.mairie.items.length, 2);
  assert.equal(payload.prefecture.items.length, 0);
  assert.equal(payload.prefecture.error, PREFECTURE_RESULT_ERROR);
  assert.match(payload.lastUpdated, /^\d{4}-\d{2}-\d{2}T/);
});
