import { normalizePublication } from '../../../lib/shared/publicationSchema.js';
import { defaultSiteSections } from '../default-site-sections.mjs';
import {
  compareOptionalNumbers,
  ensureArray,
  formatLongDate,
  formatTimeRange,
  slugify,
  splitListText,
  toUtcStamp,
  unique,
} from '../utils.mjs';
import { renderBlocksToHtml } from './blocks.mjs';
import {
  findProperty,
  getTitleProperty,
  notionRichTextToPlainText,
  propertyToCheckbox,
  propertyToDate,
  propertyToFiles,
  propertyToMultiSelect,
  propertyToNumber,
  propertyToPlainText,
  propertyToRelationIds,
} from './property-helpers.mjs';

const publishedStatusSlugs = new Set(['publie', 'published', 'public']);
const publicationTypeDefaults = {
  alerte: 'Travaux et mobilité',
  cantine: 'Scolaire',
  coup_de_coeur: 'Coup de cœur littéraire',
  evenement: 'Événements',
  info: 'Vie locale',
};
const dayOrder = new Map([
  ['lundi', 1],
  ['mardi', 2],
  ['mercredi', 3],
  ['jeudi', 4],
  ['vendredi', 5],
  ['samedi', 6],
  ['dimanche', 7],
]);

const publicationFieldCandidates = {
  author: ['Auteur', 'Autrice'],
  coverImage: ['Couverture', 'Image', 'Visuel', 'Images', 'Cover image'],
  displayDate: ['Date affichée', 'Date', 'Publication'],
  edition: ['Édition', 'Edition', 'Éditeur', 'Editeur'],
  endDate: ['Date de fin', 'Fin', 'Ends at'],
  externalUrl: ['Lien externe', 'Lien', 'URL'],
  featured: ['Featured', 'Mis en avant', 'À la une', 'A la une'],
  highlights: ['Highlights', 'À retenir', 'A retenir', 'Points clés', 'Points cles'],
  imageCaption: ['Légende image', 'Legende image', 'Caption image'],
  location: ['Lieu', 'Adresse'],
  manualOrder: ['Ordre manuel', 'Ordre', 'Position'],
  resume: ['Résumé', 'Resume', 'Accroche', 'Summary'],
  rubrique: ['Rubrique', 'Catégorie', 'Categorie'],
  seoDescription: ['SEO Description', 'Meta description'],
  seoImage: ['SEO Image'],
  seoTitle: ['SEO Title', 'Titre SEO'],
  slug: ['Slug'],
  startDate: ['Date de début', 'Début', 'Starts at'],
  status: ['Statut', 'Status'],
  textFallback: ['Contenu texte', 'Texte'],
  title: ['Titre', 'Name', 'Nom'],
  type: ['Type'],
};

const agendaFieldCandidates = {
  dateLabel: ['Date affichée', 'Date agenda', 'Date'],
  description: ['Description', 'Résumé', 'Resume'],
  endDate: ['Date de fin', 'Fin', 'Ends at'],
  hoursLabel: ['Horaire affiché', 'Heure affichée', 'Horaire'],
  location: ['Lieu', 'Adresse'],
  publicationRelation: ['Publication liée', 'Publication liee', 'Publication', 'Article lié'],
  rubrique: ['Rubrique', 'Catégorie', 'Categorie'],
  startDate: ['Date de début', 'Début', 'Starts at'],
  status: ['Statut', 'Status'],
  title: ['Titre', 'Nom', 'Name'],
};

const cantineFieldCandidates = {
  badges: ['Badges', 'Labels'],
  day: ['Jour', 'Day'],
  dayOrder: ['Ordre jour', 'Ordre journée', 'Ordre journee'],
  description: ['Description'],
  name: ['Nom', 'Titre', 'Plat', 'Name'],
  order: ['Ordre', 'Order'],
  publicationRelation: ['Publication liée', 'Publication liee', 'Publication'],
  special: ['Spécial', 'Special'],
  specialMessage: ['Message spécial', 'Message special', 'Message'],
  status: ['Statut', 'Status'],
};

const sectionFieldCandidates = {
  contentHtml: ['Contenu HTML'],
  ctaHref: ['CTA href', 'CTA URL', 'Lien'],
  ctaLabel: ['CTA label', 'CTA'],
  description: ['Description', 'Résumé', 'Resume'],
  json: ['JSON', 'Payload', 'Configuration JSON'],
  key: ['Clé', 'Cle', 'Key'],
  kicker: ['Kicker', 'Eyebrow', 'Section kicker'],
  status: ['Statut', 'Status'],
  subtitle: ['Sous-titre', 'Subtitle'],
  title: ['Titre', 'Name', 'Nom'],
};

function readFirstText(page, candidates) {
  const property = findProperty(page, candidates);
  return propertyToPlainText(property).trim();
}

function readTitle(page, candidates) {
  const candidate = readFirstText(page, candidates);
  if (candidate) {
    return candidate;
  }

  return propertyToPlainText(getTitleProperty(page)).trim();
}

function normalizePublicationType(value) {
  const normalized = slugify(value).replaceAll('-', '_') || 'info';
  return normalized === 'menu' ? 'cantine' : normalized;
}

function readDateValue(page, candidates) {
  const property = findProperty(page, candidates);
  const date = propertyToDate(property);
  return date?.start ?? '';
}

function readRelationId(page, candidates) {
  return propertyToRelationIds(findProperty(page, candidates))[0] ?? '';
}

function isPublished(page, candidates) {
  const status = readFirstText(page, candidates);
  if (!status) {
    return true;
  }

  return publishedStatusSlugs.has(slugify(status));
}

async function resolveFiles(files, { mediaResolver, pageId, title, warnings }) {
  const resolved = [];

  for (const file of files) {
    try {
      const src =
        file.type === 'external'
          ? file.external?.url
          : await mediaResolver({
              file,
              pageId,
            });

      if (!src) {
        continue;
      }

      resolved.push({
        alt: title ? `Illustration de ${title}` : 'Illustration',
        caption: '',
        src,
      });
    } catch (error) {
      warnings.push(`Média ignoré pour ${pageId}: ${error.message}`);
    }
  }

  return resolved;
}

export function buildCantineSnapshot(cantinePages, { publishedPublicationIds, warnings }) {
  const groups = new Map();

  for (const page of ensureArray(cantinePages)) {
    if (!isPublished(page, cantineFieldCandidates.status)) {
      continue;
    }

    const publicationId = readRelationId(page, cantineFieldCandidates.publicationRelation);
    if (!publicationId || !publishedPublicationIds.has(publicationId)) {
      warnings.push(`Entrée cantine ${page.id} ignorée: publication liée absente ou non publiée.`);
      continue;
    }

    const dayLabel = readFirstText(page, cantineFieldCandidates.day);
    if (!dayLabel) {
      warnings.push(`Entrée cantine ${page.id} ignorée: jour absent.`);
      continue;
    }

    if (!groups.has(publicationId)) {
      groups.set(publicationId, {
        days: new Map(),
        publication_id: publicationId,
      });
    }

    const currentGroup = groups.get(publicationId);
    if (!currentGroup.days.has(dayLabel)) {
      currentGroup.days.set(dayLabel, {
        day: dayLabel,
        dayOrder: propertyToNumber(findProperty(page, cantineFieldCandidates.dayOrder)) ?? dayOrder.get(slugify(dayLabel)) ?? 99,
        isSpecial: propertyToCheckbox(findProperty(page, cantineFieldCandidates.special)),
        items: [],
        message: readFirstText(page, cantineFieldCandidates.specialMessage),
      });
    }

    const dayEntry = currentGroup.days.get(dayLabel);
    const itemName = readFirstText(page, cantineFieldCandidates.name);

    if (dayEntry.isSpecial) {
      dayEntry.message ||= readFirstText(page, cantineFieldCandidates.specialMessage);
      continue;
    }

    if (!itemName) {
      warnings.push(`Entrée cantine ${page.id} ignorée: nom absent.`);
      continue;
    }

    dayEntry.items.push({
      badges: propertyToMultiSelect(findProperty(page, cantineFieldCandidates.badges)),
      description: readFirstText(page, cantineFieldCandidates.description),
      name: itemName,
      order: propertyToNumber(findProperty(page, cantineFieldCandidates.order)) ?? 999,
    });
  }

  return [...groups.values()]
    .map((group) => ({
      cantine_jours: [...group.days.values()]
        .sort((left, right) => compareOptionalNumbers(left.dayOrder, right.dayOrder))
        .map((day) => ({
          day: day.day,
          isSpecial: day.isSpecial,
          items: day.items
            .slice()
            .sort((left, right) => compareOptionalNumbers(left.order, right.order))
            .map(({ order, ...item }) => item),
          message: day.message,
        })),
      publication_id: group.publication_id,
    }))
    .sort((left, right) => String(left.publication_id).localeCompare(String(right.publication_id)));
}

function parseJsonPayload(rawValue, warnings, label) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    warnings.push(`JSON invalide pour ${label}: ${error.message}`);
    return null;
  }
}

async function buildPublicationSnapshot(page, context) {
  const title = readTitle(page, publicationFieldCandidates.title);
  const type = normalizePublicationType(readFirstText(page, publicationFieldCandidates.type) || 'info');
  const rubrique = readFirstText(page, publicationFieldCandidates.rubrique) || publicationTypeDefaults[type] || 'Vie locale';
  const slug = readFirstText(page, publicationFieldCandidates.slug) || slugify(title) || page.id;
  const warnings = [];
  const cantineGroup = context.cantineGroupsByPublicationId.get(page.id);
  const blockTree = await context.fetchBlocks(page.id);
  const blockContent = await renderBlocksToHtml(blockTree, {
    mediaResolver: context.mediaResolver,
    pageId: page.id,
    pageTitle: title,
  });
  warnings.push(...blockContent.warnings);

  const fileImages = await resolveFiles(propertyToFiles(findProperty(page, publicationFieldCandidates.coverImage)), {
    mediaResolver: context.mediaResolver,
    pageId: page.id,
    title,
    warnings,
  });
  const images = unique(
    [...fileImages, ...blockContent.imageSources].map((image) => JSON.stringify(image)),
  ).map((image) => JSON.parse(image));
  const primaryImage = images[0] ?? null;

  const rawPublication = {
    auteur: readFirstText(page, publicationFieldCandidates.author),
    contenu_texte:
      readFirstText(page, publicationFieldCandidates.textFallback) ||
      blockContent.plainText ||
      readFirstText(page, publicationFieldCandidates.resume),
    date:
      readFirstText(page, publicationFieldCandidates.displayDate) ||
      formatLongDate(readDateValue(page, publicationFieldCandidates.startDate)),
    date_debut_iso: toUtcStamp(readDateValue(page, publicationFieldCandidates.startDate)),
    date_fin_iso: toUtcStamp(readDateValue(page, publicationFieldCandidates.endDate), { endOfDay: true }),
    edition: readFirstText(page, publicationFieldCandidates.edition),
    id: page.id,
    lien_externe: readFirstText(page, publicationFieldCandidates.externalUrl),
    lieu: readFirstText(page, publicationFieldCandidates.location),
    cantine_jours: cantineGroup?.cantine_jours ?? [],
    resume: readFirstText(page, publicationFieldCandidates.resume) || blockContent.plainText || title,
    titre: title,
    type,
  };

  const normalized = normalizePublication(rawPublication, { fallbackId: page.id });
  const sortDate = readDateValue(page, publicationFieldCandidates.startDate) || page.last_edited_time;

  return {
    publication: {
      ...normalized,
      contenu_html: blockContent.html,
      cover_image: primaryImage?.src || '',
      featured: propertyToCheckbox(findProperty(page, publicationFieldCandidates.featured)),
      highlights: splitListText(readFirstText(page, publicationFieldCandidates.highlights)),
      image: primaryImage?.src || '',
      image_caption: readFirstText(page, publicationFieldCandidates.imageCaption) || primaryImage?.caption || '',
      images,
      notion_last_edited_time: page.last_edited_time,
      notion_page_id: page.id,
      notion_url: page.url,
      ordre_manuel: propertyToNumber(findProperty(page, publicationFieldCandidates.manualOrder)),
      rubrique,
      seo_description: readFirstText(page, publicationFieldCandidates.seoDescription),
      seo_image: readFirstText(page, publicationFieldCandidates.seoImage),
      seo_title: readFirstText(page, publicationFieldCandidates.seoTitle),
      slug,
      sort_date: sortDate,
      statut: readFirstText(page, publicationFieldCandidates.status) || 'Publié',
      warnings,
    },
    warnings,
  };
}

function buildAgendaSnapshots(agendaPages, { publicationsByPageId, warnings }) {
  const agenda = [];

  for (const page of ensureArray(agendaPages)) {
    if (!isPublished(page, agendaFieldCandidates.status)) {
      continue;
    }

    const linkedPublicationId = readRelationId(page, agendaFieldCandidates.publicationRelation);
    const publication = publicationsByPageId.get(linkedPublicationId);
    if (!publication) {
      warnings.push(`Agenda ${page.id} ignoré: publication liée absente ou non publiée.`);
      continue;
    }

    const startSource = readDateValue(page, agendaFieldCandidates.startDate) || publication.date_debut_iso;
    const endSource = readDateValue(page, agendaFieldCandidates.endDate) || publication.date_fin_iso || startSource;
    const startIso = publication.date_debut_iso && !readDateValue(page, agendaFieldCandidates.startDate)
      ? publication.date_debut_iso
      : toUtcStamp(startSource);
    const endIso = publication.date_fin_iso && !readDateValue(page, agendaFieldCandidates.endDate)
      ? publication.date_fin_iso
      : toUtcStamp(endSource, { endOfDay: true });

    if (!startIso) {
      warnings.push(`Agenda ${page.id} ignoré: date de début manquante.`);
      continue;
    }

    agenda.push({
      date_label: readFirstText(page, agendaFieldCandidates.dateLabel) || formatLongDate(startSource),
      description:
        readFirstText(page, agendaFieldCandidates.description) ||
        publication.resume ||
        publication.titre,
      end_iso: endIso || startIso,
      id: page.id,
      location:
        readFirstText(page, agendaFieldCandidates.location) ||
        publication.lieu ||
        '',
      post_id: publication.id,
      post_slug: publication.slug,
      rubrique:
        readFirstText(page, agendaFieldCandidates.rubrique) ||
        publication.rubrique ||
        'Agenda',
      start_iso: startIso,
      time_label:
        readFirstText(page, agendaFieldCandidates.hoursLabel) ||
        formatTimeRange(startSource, endSource) ||
        'Horaire communiqué',
      title: readTitle(page, agendaFieldCandidates.title) || publication.titre,
    });
  }

  return agenda.sort((left, right) => String(left.start_iso).localeCompare(String(right.start_iso)));
}

function enrichPublicationsWithAgenda(publications, agenda) {
  const entriesByPostId = new Map();

  for (const event of agenda) {
    if (!entriesByPostId.has(event.post_id)) {
      entriesByPostId.set(event.post_id, []);
    }

    entriesByPostId.get(event.post_id).push({
      date_debut_iso: event.start_iso,
      date_fin_iso: event.end_iso,
      hours: event.time_label,
      label: event.date_label,
    });
  }

  return publications.map((publication) => ({
    ...publication,
    event_dates: entriesByPostId.get(publication.id) ?? publication.event_dates ?? [],
  }));
}

async function buildSiteSections(sectionPages, context) {
  const sections = structuredClone(defaultSiteSections);

  for (const page of ensureArray(sectionPages)) {
    if (!isPublished(page, sectionFieldCandidates.status)) {
      continue;
    }

    const key = readFirstText(page, sectionFieldCandidates.key) || slugify(readTitle(page, sectionFieldCandidates.title));
    if (!key) {
      context.warnings.push(`Section ${page.id} ignorée: clé absente.`);
      continue;
    }

    const blocks = await context.fetchBlocks(page.id);
    const content = await renderBlocksToHtml(blocks, {
      mediaResolver: context.mediaResolver,
      pageId: page.id,
      pageTitle: key,
    });
    context.warnings.push(...content.warnings.map((warning) => `Section ${key}: ${warning}`));

    const rawJson = readFirstText(page, sectionFieldCandidates.json);
    const payload = parseJsonPayload(rawJson, context.warnings, `section ${key}`) ?? {};

    sections[key] = {
      ...(sections[key] ?? {}),
      ...payload,
      content_html: readFirstText(page, sectionFieldCandidates.contentHtml) || content.html || sections[key]?.content_html || '',
      cta_href: readFirstText(page, sectionFieldCandidates.ctaHref) || payload.cta_href || sections[key]?.cta_href || '',
      cta_label: readFirstText(page, sectionFieldCandidates.ctaLabel) || payload.cta_label || sections[key]?.cta_label || '',
      description:
        readFirstText(page, sectionFieldCandidates.description) ||
        payload.description ||
        sections[key]?.description ||
        '',
      kicker: readFirstText(page, sectionFieldCandidates.kicker) || payload.kicker || sections[key]?.kicker || '',
      subtitle:
        readFirstText(page, sectionFieldCandidates.subtitle) ||
        payload.subtitle ||
        sections[key]?.subtitle ||
        '',
      title: readTitle(page, sectionFieldCandidates.title) || payload.title || sections[key]?.title || key,
    };
  }

  return sections;
}

export async function buildSnapshotsFromSources({
  agendaPages,
  cantinePages,
  fetchBlocks,
  mediaResolver,
  publicationPages,
  sectionPages,
}) {
  const warnings = [];
  const publishedPublicationPages = ensureArray(publicationPages).filter((page) =>
    isPublished(page, publicationFieldCandidates.status),
  );
  const publishedPublicationIds = new Set(publishedPublicationPages.map((page) => page.id));
  const cantine = buildCantineSnapshot(cantinePages, { publishedPublicationIds, warnings });
  const cantineGroupsByPublicationId = new Map(cantine.map((group) => [group.publication_id, group]));

  const builtPublications = [];
  for (const page of publishedPublicationPages) {
    const snapshot = await buildPublicationSnapshot(page, {
      fetchBlocks,
      mediaResolver,
      cantineGroupsByPublicationId,
    });
    builtPublications.push(snapshot.publication);
    warnings.push(...snapshot.warnings.map((warning) => `Publication ${page.id}: ${warning}`));
  }

  const sortedPublications = builtPublications
    .slice()
    .sort((left, right) => {
      const manualOrder = compareOptionalNumbers(left.ordre_manuel, right.ordre_manuel);
      if (manualOrder !== 0) {
        return manualOrder;
      }

      return String(right.sort_date || '').localeCompare(String(left.sort_date || ''));
    })
    .map(({ sort_date, warnings: publicationWarnings, ...publication }) => publication);
  const publicationsByPageId = new Map(sortedPublications.map((publication) => [publication.notion_page_id, publication]));
  const agenda = buildAgendaSnapshots(agendaPages, { publicationsByPageId, warnings });
  const publications = enrichPublicationsWithAgenda(sortedPublications, agenda);
  const siteSections = await buildSiteSections(sectionPages, {
    fetchBlocks,
    mediaResolver,
    warnings,
  });

  return {
    agenda,
    cantine,
    publications,
    siteSections,
    warnings,
  };
}
