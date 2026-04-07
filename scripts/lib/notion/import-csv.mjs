import { ensureArray, siteTimeZone, slugify } from '../utils.mjs';

const publicationsHeaders = [
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
];

const agendaHeaders = [
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
];

const cantineHeaders = [
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
];

const siteSectionHeaders = [
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
];

const siteSectionItemHeaders = [
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
];

const requiredSiteSectionOrder = ['home-hero', 'home-editorial', 'home-rubriques', 'home-diffusion', 'footer'];
const sectionItemGroupOrder = new Map([
  ['home-hero', ['masthead', 'title_line', 'feature', 'editorial', 'stat', 'action', 'field']],
  ['home-editorial', ['highlight', 'action', 'cta_link', 'field']],
  ['home-rubriques', ['item', 'field']],
  ['home-diffusion', ['card', 'field']],
  ['footer', ['card', 'field']],
]);

const sectionScalarFieldDefinitions = [
  { field: 'title', property: 'title' },
  { field: 'kicker', property: 'kicker' },
  { field: 'eyebrow', property: 'eyebrow' },
  { field: 'description', property: 'description' },
  { field: 'quote', property: 'quote' },
  { field: 'page_title', property: 'pageTitle' },
  { field: 'quick_links_eyebrow', property: 'quickLinksEyebrow' },
  { field: 'subtitle', property: 'subtitle' },
  { field: 'legal_left', property: 'legalLeft' },
  { field: 'legal_right', property: 'legalRight' },
  { field: 'cta_label', property: 'cta_label' },
  { field: 'cta_href', property: 'cta_href', valueType: 'href' },
  { field: 'content_html', property: 'content_html' },
];

const dayOrder = new Map([
  ['lundi', 1],
  ['mardi', 2],
  ['mercredi', 3],
  ['jeudi', 4],
  ['vendredi', 5],
  ['samedi', 6],
  ['dimanche', 7],
]);

const formatterCache = new Map();

function asText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function joinList(values) {
  return ensureArray(values)
    .map((value) => asText(value))
    .filter(Boolean)
    .join('; ');
}

function parseUtcStamp(value) {
  const match = String(value ?? '').match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;

  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));
}

function stampToDateOnly(value) {
  const match = String(value ?? '').match(/^(\d{4})(\d{2})(\d{2})T\d{6}Z$/);
  if (!match) {
    return '';
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function isDateOnlyStamp(value) {
  return /^\d{8}T(?:000000|235959)Z$/.test(String(value ?? ''));
}

function getDateTimeFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone,
        timeZoneName: 'longOffset',
      }),
    );
  }

  return formatterCache.get(timeZone);
}

function normalizeOffset(rawOffset) {
  const normalized = String(rawOffset ?? '').trim();
  if (!normalized || normalized === 'GMT' || normalized === 'UTC') {
    return '+00:00';
  }

  const match = normalized.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return '+00:00';
  }

  const [, sign, hours, minutes = '00'] = match;
  return `${sign}${hours.padStart(2, '0')}:${minutes}`;
}

function formatLocalDateTime(stamp, timeZone) {
  const date = parseUtcStamp(stamp);
  if (!date) {
    return '';
  }

  const parts = getDateTimeFormatter(timeZone).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return [
    `${partMap.get('year')}-${partMap.get('month')}-${partMap.get('day')}`,
    `T${partMap.get('hour')}:${partMap.get('minute')}:${partMap.get('second')}`,
    normalizeOffset(partMap.get('timeZoneName')),
  ].join('');
}

function formatPublicationDate(stamp, timeZone) {
  const normalized = asText(stamp);
  if (!normalized) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
    return normalized;
  }

  if (isDateOnlyStamp(normalized)) {
    return stampToDateOnly(normalized);
  }

  return formatLocalDateTime(normalized, timeZone);
}

function createPublicationLookups(publications) {
  const titleCounts = new Map();

  for (const publication of ensureArray(publications)) {
    const title = asText(publication.titre);
    if (!title) {
      continue;
    }

    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }

  const byId = new Map();
  const bySlug = new Map();
  const helperLabelById = new Map();

  for (const publication of ensureArray(publications)) {
    const title = asText(publication.titre);
    const slug = asText(publication.slug);
    const id = asText(publication.id);
    const hasDuplicateTitle = title && titleCounts.get(title) > 1;
    const helperLabel = buildPublicationHelperLabel(
      hasDuplicateTitle && slug ? `${title} [${slug}]` : title || slug || id,
    );

    if (id) {
      byId.set(id, publication);
      helperLabelById.set(id, helperLabel);
    }

    if (slug) {
      bySlug.set(slug, publication);
    }
  }

  return {
    byId,
    bySlug,
    helperLabelById,
  };
}

function resolvePublicationDateRange(publication, legacyPublicationDates = {}) {
  const slug = asText(publication?.slug);
  const legacy = slug ? legacyPublicationDates[slug] ?? {} : {};

  return {
    end: asText(publication?.date_fin_iso) || asText(legacy.end),
    start: asText(publication?.date_debut_iso) || asText(legacy.start),
  };
}

function extractDateOnly(value) {
  const normalized = asText(value);
  if (!normalized) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
    return normalized.slice(0, 10);
  }

  if (isDateOnlyStamp(normalized)) {
    return stampToDateOnly(normalized);
  }

  const parsed = parseUtcStamp(normalized);
  return parsed ? parsed.toISOString().slice(0, 10) : '';
}

function addDays(dateOnly, days) {
  const match = asText(dateOnly).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }

  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatHelperDate(publication, legacyPublicationDates, timeZone) {
  const { start, end } = resolvePublicationDateRange(publication, legacyPublicationDates);
  const displayDate = asText(publication?.date);

  if (start && end && isDateOnlyStamp(start) && isDateOnlyStamp(end)) {
    return `${stampToDateOnly(start)} -> ${stampToDateOnly(end)}`;
  }

  if (start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return `${start} -> ${end}`;
  }

  if (start && !end && isDateOnlyStamp(start)) {
    return stampToDateOnly(start);
  }

  if (start && !end && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return start;
  }

  if (start) {
    return formatPublicationDate(start, timeZone);
  }

  return displayDate;
}

function buildPublicationHelperLabel(fallbackLabel) {
  const baseLabel = asText(fallbackLabel);
  return baseLabel;
}

function buildPublicationsRows(publications, legacyPublicationDates, timeZone) {
  return ensureArray(publications).map((publication, index) => ({
    ...(() => {
      const { start, end } = resolvePublicationDateRange(publication, legacyPublicationDates);
      return {
        'Date de début': formatPublicationDate(start, timeZone),
        'Date de fin': formatPublicationDate(end, timeZone),
      };
    })(),
    'Titre': asText(publication.titre),
    'Type': asText(publication.type),
    'Statut': 'Publié',
    'Rubrique': asText(publication.rubrique),
    'Résumé': asText(publication.resume),
    'Date affichée': asText(publication.date),
    'Lieu': asText(publication.lieu),
    'Slug': asText(publication.slug),
    'Auteur': asText(publication.auteur),
    'Édition': asText(publication.edition),
    'Lien externe': asText(publication.lien_externe),
    'Ordre manuel': String(index + 1),
    'Highlights': joinList(publication.highlights),
    'Featured': publication.featured === true ? 'true' : 'false',
    'Contenu texte': asText(publication.contenu_texte),
  }));
}

function buildAgendaRows(agendaEntries, publicationLookups, timeZone) {
  return ensureArray(agendaEntries).map((event) => {
    const publication = publicationLookups.bySlug.get(asText(event.post_slug));
    if (!publication) {
      throw new Error(`Agenda orphelin: impossible de retrouver la publication "${event.post_slug}".`);
    }

    return {
      'Titre': asText(event.title),
      'Statut': 'Publié',
      'Publication liée (helper)': publicationLookups.helperLabelById.get(asText(publication.id)) || asText(publication.titre),
      'Date de début': formatLocalDateTime(event.start_iso, timeZone),
      'Date de fin': formatLocalDateTime(event.end_iso, timeZone),
      'Date affichée': asText(event.date_label),
      'Horaire affiché': asText(event.time_label),
      'Lieu': asText(event.location),
      'Description': asText(event.description),
      'Rubrique': asText(event.rubrique),
    };
  });
}

function sortCantineDays(days) {
  return ensureArray(days)
    .map((day, index) => ({
      day,
      order: dayOrder.get(slugify(day?.day ?? '')) ?? index + 1,
      index,
    }))
    .sort((left, right) => left.order - right.order || left.index - right.index);
}

function buildCantineRowDate(publication, orderForDay, legacyPublicationDates) {
  const { start } = resolvePublicationDateRange(publication, legacyPublicationDates);
  const startDate = extractDateOnly(start);

  if (!startDate) {
    return '';
  }

  return addDays(startDate, Math.max(orderForDay - 1, 0));
}

function buildCantineRows(cantineEntries, publicationLookups, legacyPublicationDates, timeZone) {
  const rows = [];

  for (const entry of ensureArray(cantineEntries)) {
    const publication =
      publicationLookups.byId.get(asText(entry.publication_id)) ??
      publicationLookups.bySlug.get(asText(entry.publication_slug));
    const helperLabel =
      (publication && publicationLookups.helperLabelById.get(asText(publication.id))) ||
      asText(entry.publication_title);

    for (const { day, order: orderForDay } of sortCantineDays(entry.cantine_jours)) {
      const dayLabel = asText(day?.day);

      if (day?.isSpecial) {
        rows.push({
          'Nom': `Information spéciale - ${dayLabel || 'Jour'}`,
          'Statut': 'Publié',
          'Publication liée (helper)': helperLabel,
          'Date': buildCantineRowDate(publication, orderForDay, legacyPublicationDates),
          'Jour': dayLabel,
          'Ordre': '',
          'Badges': '',
          'Description': '',
          'Spécial': 'true',
          'Message spécial': asText(day?.message),
          'Ordre jour': String(orderForDay),
        });
        continue;
      }

      ensureArray(day?.items).forEach((item, itemIndex) => {
        rows.push({
          'Nom': asText(item?.name),
          'Statut': 'Publié',
          'Publication liée (helper)': helperLabel,
          'Date': buildCantineRowDate(publication, orderForDay, legacyPublicationDates),
          'Jour': dayLabel,
          'Ordre': String(itemIndex + 1),
          'Badges': joinList(item?.badges),
          'Description': asText(item?.description),
          'Spécial': 'false',
          'Message spécial': '',
          'Ordre jour': String(orderForDay),
        });
      });
    }
  }

  return rows;
}

function buildSiteSectionRows(siteSections) {
  const sections = siteSections && typeof siteSections === 'object' ? siteSections : {};
  const missingKeys = requiredSiteSectionOrder.filter((key) => !sections[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Sections de site manquantes: ${missingKeys.join(', ')}.`);
  }

  const extraKeys = Object.keys(sections)
    .filter((key) => !requiredSiteSectionOrder.includes(key))
    .sort((left, right) => left.localeCompare(right));

  const orderedKeys = [...requiredSiteSectionOrder, ...extraKeys];

  return orderedKeys.map((key) => ({
    'CTA href': asText(sections[key]?.cta_href),
    'CTA label': asText(sections[key]?.cta_label),
    'Clé': key,
    'Contenu HTML': asText(sections[key]?.content_html),
    'Description': asText(sections[key]?.description),
    'Kicker': asText(sections[key]?.kicker) || asText(sections[key]?.eyebrow),
    'Legal left': asText(sections[key]?.legalLeft),
    'Legal right': asText(sections[key]?.legalRight),
    'Page title': asText(sections[key]?.pageTitle),
    'Quick links eyebrow': asText(sections[key]?.quickLinksEyebrow),
    'Quote': asText(sections[key]?.quote),
    'Sous-titre': asText(sections[key]?.subtitle),
    'Titre': asText(sections[key]?.title) || key,
    'Statut': 'Publié',
  }));
}

function buildSiteSectionItemRow(sectionKey, group, order, values = {}) {
  const title = asText(values.title);
  const text = asText(values.text);
  const name = asText(values.name) || title || text || `${sectionKey} ${group} ${order}`;

  return {
    'Description': asText(values.description),
    'Emoji': asText(values.emoji),
    'Eyebrow': asText(values.eyebrow),
    'Groupe': group,
    'Kicker': asText(values.kicker),
    'Lien': asText(values.href),
    'Nom': name,
    'Ordre': String(order),
    'Section': sectionKey,
    'Statut': 'Publié',
    'Texte': text,
    'Theme': asText(values.theme),
    'Titre': title,
    'Valeur': asText(values.value),
    'Variant': asText(values.variant),
  };
}

function buildRowsFromSectionList(sectionKey, group, items, mapItem) {
  return ensureArray(items).map((item, index) =>
    buildSiteSectionItemRow(sectionKey, group, index + 1, mapItem(item, index)),
  );
}

function buildSectionFieldRows(sectionKey, section = {}) {
  const rows = [];
  let order = 1;

  for (const definition of sectionScalarFieldDefinitions) {
    const rawValue = section?.[definition.property];
    const value = asText(rawValue);

    if (!value) {
      continue;
    }

    rows.push(buildSiteSectionItemRow(sectionKey, 'field', order, {
      href: definition.valueType === 'href' ? value : '',
      name: definition.field,
      text: definition.valueType === 'href' ? '' : value,
    }));
    order += 1;
  }

  return rows;
}

function buildSiteSectionItemRows(siteSections) {
  const sections = siteSections && typeof siteSections === 'object' ? siteSections : {};
  const missingKeys = requiredSiteSectionOrder.filter((key) => !sections[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Sections de site manquantes: ${missingKeys.join(', ')}.`);
  }

  const rows = [];

  for (const sectionKey of [...requiredSiteSectionOrder, ...Object.keys(sections)
    .filter((key) => !requiredSiteSectionOrder.includes(key))
    .sort((left, right) => left.localeCompare(right))]) {
    const section = sections[sectionKey] ?? {};
    const groupOrder = sectionItemGroupOrder.get(sectionKey) ?? [];

    for (const group of groupOrder) {
      switch (`${sectionKey}:${group}`) {
        case 'home-hero:masthead':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.masthead, (item) => ({
            name: asText(item),
            text: asText(item),
          })));
          break;

        case 'home-hero:title_line':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.titleLines, (item) => ({
            name: asText(item),
            text: asText(item),
          })));
          break;

        case 'home-hero:feature':
          if (section.feature) {
            rows.push(buildSiteSectionItemRow(sectionKey, group, 1, {
              description: section.feature.description,
              kicker: section.feature.kicker,
              name: section.feature.kicker || section.feature.title || 'Feature',
              title: section.feature.title,
            }));
          }
          break;

        case 'home-hero:editorial':
          if (section.editorial) {
            rows.push(buildSiteSectionItemRow(sectionKey, group, 1, {
              description: section.editorial.description,
              eyebrow: section.editorial.eyebrow,
              name: section.editorial.title || 'Editorial',
              title: section.editorial.title,
            }));
          }
          break;

        case 'home-hero:stat':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.stats, (item, index) => ({
            description: item?.description,
            eyebrow: item?.eyebrow,
            name: item?.eyebrow || item?.value || `Stat ${index + 1}`,
            value: item?.value,
          })));
          break;

        case 'home-hero:action':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.actions, (item, index) => ({
            href: item?.href,
            name: item?.label || `Action ${index + 1}`,
            text: item?.label,
            theme: item?.theme,
          })));
          break;

        case 'home-editorial:highlight':
          if (section.highlightTitle || section.highlightDescription || section.highlightEyebrow) {
            rows.push(buildSiteSectionItemRow(sectionKey, group, 1, {
              description: section.highlightDescription,
              eyebrow: section.highlightEyebrow,
              name: section.highlightTitle || 'Highlight',
              title: section.highlightTitle,
            }));
          }
          break;

        case 'home-editorial:action':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.actions, (item, index) => ({
            href: item?.href,
            name: item?.label || `Action ${index + 1}`,
            text: item?.label,
            variant: item?.variant,
          })));
          break;

        case 'home-editorial:cta_link':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.ctaLinks, (item, index) => ({
            href: item?.href,
            name: item?.label || `Lien rapide ${index + 1}`,
            text: item?.label,
          })));
          break;

        case 'home-rubriques:item':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.items, (item, index) => ({
            description: item?.description,
            href: item?.href,
            kicker: item?.kicker,
            name: item?.title || `Rubrique ${index + 1}`,
            theme: item?.theme,
            title: item?.title,
          })));
          break;

        case 'home-diffusion:card':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.cards, (item, index) => ({
            description: item?.description,
            emoji: item?.emoji,
            name: item?.title || `Carte ${index + 1}`,
            title: item?.title,
          })));
          break;

        case 'footer:card':
          rows.push(...buildRowsFromSectionList(sectionKey, group, section.cards, (item, index) => ({
            description: item?.description,
            kicker: item?.kicker,
            name: item?.kicker || `Carte ${index + 1}`,
          })));
          break;

        case `${sectionKey}:field`:
          rows.push(...buildSectionFieldRows(sectionKey, section));
          break;

        default:
          break;
      }
    }
  }

  return rows;
}

export function buildNotionImportTables({
  publications = [],
  agenda = [],
  cantine = [],
  legacyPublicationDates = {},
  siteSections = {},
  timeZone = siteTimeZone,
} = {}) {
  const publicationLookups = createPublicationLookups(publications);

  return {
    agenda: {
      headers: agendaHeaders,
      rows: buildAgendaRows(agenda, publicationLookups, timeZone),
    },
    cantine: {
      headers: cantineHeaders,
      rows: buildCantineRows(cantine, publicationLookups, legacyPublicationDates, timeZone),
    },
    publications: {
      headers: publicationsHeaders,
      rows: buildPublicationsRows(publications, legacyPublicationDates, timeZone),
    },
    sections: {
      headers: siteSectionHeaders,
      rows: buildSiteSectionRows(siteSections),
    },
    sectionItems: {
      headers: siteSectionItemHeaders,
      rows: buildSiteSectionItemRows(siteSections),
    },
  };
}

export function serializeCsvTable(table) {
  const headers = ensureArray(table?.headers);
  const rows = ensureArray(table?.rows);
  const lines = [headers.map(escapeCsvValue).join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row?.[header] ?? '')).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized) || /^\s|\s$/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

export function buildNotionImportFiles(input) {
  const tables = buildNotionImportTables(input);

  return {
    'agenda.csv': serializeCsvTable(tables.agenda),
    'cantine_scolaire.csv': serializeCsvTable(tables.cantine),
    'publications.csv': serializeCsvTable(tables.publications),
    'sections-site.csv': serializeCsvTable(tables.sections),
    'sections-site-items.csv': serializeCsvTable(tables.sectionItems),
  };
}

export function extractLegacyPublicationDatesFromCsv(csvContent) {
  const rows = parseCsv(csvContent);
  if (rows.length === 0) {
    return {};
  }

  const headers = rows[0];
  const slugIndex = headers.indexOf('Slug');
  const startIndex = headers.indexOf('Date de début');
  const endIndex = headers.indexOf('Date de fin');

  if (slugIndex === -1 || startIndex === -1 || endIndex === -1) {
    return {};
  }

  return rows.slice(1).reduce((accumulator, row) => {
    const slug = asText(row[slugIndex]);
    const start = asText(row[startIndex]);
    const end = asText(row[endIndex]);

    if (!slug || (!start && !end)) {
      return accumulator;
    }

    accumulator[slug] = { end, start };
    return accumulator;
  }, {});
}

function parseCsv(csvContent) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  const normalized = String(csvContent ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (insideQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        insideQuotes = false;
        continue;
      }

      currentCell += char;
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentCell);
      currentCell = '';
      if (currentRow.some((value) => value !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((value) => value !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}
