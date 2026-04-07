import assert from 'node:assert/strict';
import test from 'node:test';

import agenda from '../data/agenda.json' with { type: 'json' };
import cantine from '../data/cantine.json' with { type: 'json' };
import publications from '../data/publications.json' with { type: 'json' };
import siteSections from '../data/site-sections.json' with { type: 'json' };
import {
  buildNotionImportFiles,
  buildNotionImportTables,
  extractLegacyPublicationDatesFromCsv,
} from '../scripts/lib/notion/import-csv.mjs';

const legacyPublicationDates = {
  'cantine-scolaire-semaine': {
    end: '2026-04-10',
    start: '2026-04-06',
  },
};

test('buildNotionImportTables reconstruit des tables CSV coherentes depuis les snapshots', () => {
  const tables = buildNotionImportTables({
    agenda,
    cantine,
    legacyPublicationDates,
    publications,
    siteSections,
  });

  assert.deepEqual(tables.publications.headers, [
    'Titre',
    'Type',
    'Statut',
    'Rubrique',
    'Résumé',
    'Date affichée',
    'Date de début',
    'Date de fin',
    'Lieu',
    'Slug',
    'Auteur',
    'Édition',
    'Lien externe',
    'Ordre manuel',
    'Highlights',
    'Featured',
    'Contenu texte',
  ]);
  assert.deepEqual(tables.agenda.headers, [
    'Titre',
    'Statut',
    'Publication liée (helper)',
    'Date de début',
    'Date de fin',
    'Date affichée',
    'Horaire affiché',
    'Lieu',
    'Description',
    'Rubrique',
  ]);
  assert.deepEqual(tables.cantine.headers, [
    'Nom',
    'Statut',
    'Publication liée (helper)',
    'Date',
    'Jour',
    'Ordre',
    'Badges',
    'Description',
    'Spécial',
    'Message spécial',
    'Ordre jour',
  ]);
  assert.deepEqual(tables.sections.headers, [
    'Titre',
    'Statut',
    'Clé',
    'Description',
    'Kicker',
    'Sous-titre',
    'Quote',
    'Page title',
    'Quick links eyebrow',
    'Legal left',
    'Legal right',
    'CTA label',
    'CTA href',
    'Contenu HTML',
  ]);
  assert.deepEqual(tables.sectionItems.headers, [
    'Nom',
    'Statut',
    'Section',
    'Groupe',
    'Ordre',
    'Texte',
    'Eyebrow',
    'Kicker',
    'Titre',
    'Description',
    'Valeur',
    'Lien',
    'Theme',
    'Variant',
    'Emoji',
  ]);

  assert.equal(tables.publications.rows.length, 10);
  assert.equal(tables.agenda.rows.length, 15);
  assert.equal(tables.cantine.rows.length, 17);
  assert.equal(tables.sections.rows.length, 5);
  assert.equal(tables.sectionItems.rows.length, 44);

  assert.equal(tables.publications.rows[0]['Ordre manuel'], '1');
  assert.equal(tables.publications.rows[9]['Ordre manuel'], '10');
  assert.equal(
    tables.publications.rows.find((row) => row.Slug === 'brocante-printemps-centre-ville')['Date de début'],
    '2026-05-24T08:00:00+02:00',
  );
  assert.equal(
    tables.agenda.rows.find((row) => row['Titre'] === 'Instant Gourmand' && row['Date affichée'] === 'Lundi 23 mars 2026')['Date de début'],
    '2026-03-23T15:00:00+01:00',
  );
  assert.equal(
    tables.agenda.rows.find((row) => row['Titre'] === 'Instant Gourmand' && row['Date affichée'] === 'Lundi 30 mars 2026')['Date de début'],
    '2026-03-30T15:00:00+02:00',
  );
  assert.equal(
    tables.agenda.rows.find((row) => row['Titre'] === 'Brocante de printemps au centre-ville')['Publication liée (helper)'],
    'Brocante de printemps au centre-ville',
  );
  assert.equal(
    tables.cantine.rows[0]['Publication liée (helper)'],
    'La cantine de la semaine',
  );
  assert.equal(
    tables.cantine.rows[0]['Date'],
    '2026-04-06',
  );
  assert.equal(
    tables.cantine.rows.find((row) => row['Jour'] === 'Mercredi')['Date'],
    '2026-04-08',
  );
  assert.equal(
    tables.cantine.rows.find((row) => row['Jour'] === 'Vendredi')['Date'],
    '2026-04-10',
  );
  assert.equal(tables.cantine.rows[0]['Ordre jour'], '1');
  assert.equal(
    tables.cantine.rows.find((row) => row['Jour'] === 'Mercredi')['Nom'],
    'Information spéciale - Mercredi',
  );
  assert.equal(
    tables.cantine.rows.find((row) => row['Jour'] === 'Mercredi')['Spécial'],
    'true',
  );
  assert.equal(
    tables.sections.rows.find((row) => row['Clé'] === 'home-hero').Quote,
    "L'actualité du village, claire, utile et bien envoyée.",
  );
  assert.equal(
    tables.sections.rows.find((row) => row['Clé'] === 'footer')['Legal right'],
    'Une initiative citoyenne pour renouer le dialogue',
  );
  assert.deepEqual(
    tables.sectionItems.rows[0],
    {
      'Description': '',
      'Emoji': '',
      'Eyebrow': '',
      'Groupe': 'masthead',
      'Kicker': '',
      'Lien': '',
      'Nom': 'Édition locale',
      'Ordre': '1',
      'Section': 'home-hero',
      'Statut': 'Publié',
      'Texte': 'Édition locale',
      'Theme': '',
      'Titre': '',
      'Valeur': '',
      'Variant': '',
    },
  );
  assert.equal(
    tables.sectionItems.rows.find((row) => row.Section === 'home-hero' && row.Groupe === 'feature').Titre,
    '',
  );
  assert.equal(
    tables.sectionItems.rows.find((row) => row.Section === 'home-hero' && row.Groupe === 'feature').Nom,
    'Édition locale',
  );
  assert.equal(
    tables.sectionItems.rows.find((row) => row.Section === 'home-editorial' && row.Groupe === 'cta_link' && row.Ordre === '5').Texte,
    'Agenda du village',
  );
  assert.deepEqual(
    tables.sectionItems.rows.find((row) => row.Section === 'home-hero' && row.Groupe === 'field' && row.Nom === 'quote'),
    {
      'Description': '',
      'Emoji': '',
      'Eyebrow': '',
      'Groupe': 'field',
      'Kicker': '',
      'Lien': '',
      'Nom': 'quote',
      'Ordre': '1',
      'Section': 'home-hero',
      'Statut': 'Publié',
      'Texte': "L'actualité du village, claire, utile et bien envoyée.",
      'Theme': '',
      'Titre': '',
      'Valeur': '',
      'Variant': '',
    },
  );
  assert.equal(
    tables.sectionItems.rows.find((row) => row.Section === 'footer' && row.Groupe === 'field' && row.Nom === 'legal_right').Texte,
    'Une initiative citoyenne pour renouer le dialogue',
  );
  assert.equal(
    tables.sectionItems.rows.find((row) => row.Section === 'home-diffusion' && row.Groupe === 'field' && row.Nom === 'title').Texte,
    'Stratégie de Diffusion',
  );
});

test('buildNotionImportTables exporte les dates simples des publications au format YYYY-MM-DD', () => {
  const tables = buildNotionImportTables({
    publications: [
      {
        id: 'post-date-only',
        type: 'info',
        titre: 'Publication date simple',
        resume: 'Résumé',
        date: 'Cette semaine',
        date_debut_iso: '20260406T000000Z',
        date_fin_iso: '20260410T235959Z',
        slug: 'publication-date-simple',
      },
    ],
    siteSections,
  });

  assert.equal(tables.publications.rows[0]['Date de début'], '2026-04-06');
  assert.equal(tables.publications.rows[0]['Date de fin'], '2026-04-10');
});

test('buildNotionImportTables restaure les dates publication depuis un fallback CSV', () => {
  const tables = buildNotionImportTables({
    legacyPublicationDates,
    publications,
    siteSections,
  });

  const cantinePublication = tables.publications.rows.find((row) => row.Slug === 'cantine-scolaire-semaine');
  assert.equal(cantinePublication['Date de début'], '2026-04-06');
  assert.equal(cantinePublication['Date de fin'], '2026-04-10');
});

test('extractLegacyPublicationDatesFromCsv lit les dates malgre les cellules multiline', () => {
  const csv = [
    'Titre,Slug,Date de début,Date de fin,Contenu texte',
    'La cantine de la semaine,cantine-scolaire-semaine,2026-04-06,2026-04-10,"Ligne 1',
    'Ligne 2"',
  ].join('\n');

  assert.deepEqual(extractLegacyPublicationDatesFromCsv(csv), {
    'cantine-scolaire-semaine': {
      end: '2026-04-10',
      start: '2026-04-06',
    },
  });
});

test('buildNotionImportFiles est deterministe sur deux executions', () => {
  const first = buildNotionImportFiles({
    agenda,
    cantine,
    legacyPublicationDates,
    publications,
    siteSections,
  });
  const second = buildNotionImportFiles({
    agenda,
    cantine,
    legacyPublicationDates,
    publications,
    siteSections,
  });

  assert.deepEqual(first, second);
  assert.ok(first['sections-site-items.csv']);
});
