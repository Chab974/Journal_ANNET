import path from 'node:path';

import { buildCanonicalContent } from '../../../lib/shared/contentModel.js';
import { normalizePublication } from '../../../lib/shared/publicationSchema.js';
import { normalizeKey, slugify, splitListText } from '../utils.mjs';
import { createPageInDataSource, retrieveDataSource, uploadFileToNotion } from './client.mjs';
import { publicationFieldCandidates, publicationTypeDefaults } from './snapshot-builders.mjs';

const MAX_RICH_TEXT_CHUNK_LENGTH = 1800;
const draftStatusCandidates = ['brouillon', 'draft', 'a rediger', 'a relire', 'en attente'];

const imageMimeTypesByExtension = new Map([
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function buildSchemaPropertyMap(properties = {}) {
  return new Map(
    Object.entries(properties).map(([name, property]) => [normalizeKey(name), { name, property }]),
  );
}

function findSchemaProperty(properties = {}, candidates = []) {
  const propertyMap = buildSchemaPropertyMap(properties);

  for (const candidate of candidates) {
    if (properties[candidate]) {
      return { name: candidate, property: properties[candidate] };
    }

    const match = propertyMap.get(normalizeKey(candidate));
    if (match) {
      return match;
    }
  }

  return null;
}

function getTitleSchemaProperty(properties = {}) {
  const entry = Object.entries(properties).find(([, property]) => property?.type === 'title');
  return entry ? { name: entry[0], property: entry[1] } : findSchemaProperty(properties, publicationFieldCandidates.title);
}

function splitIntoChunks(value, chunkLength = MAX_RICH_TEXT_CHUNK_LENGTH) {
  const text = String(value ?? '').trim();
  if (!text) {
    return [];
  }

  const chunks = [];
  let cursor = 0;

  while (cursor < text.length) {
    let sliceEnd = Math.min(cursor + chunkLength, text.length);
    if (sliceEnd < text.length) {
      const lastWhitespace = text.lastIndexOf(' ', sliceEnd);
      if (lastWhitespace > cursor + Math.floor(chunkLength / 2)) {
        sliceEnd = lastWhitespace;
      }
    }

    chunks.push(text.slice(cursor, sliceEnd).trim());
    cursor = sliceEnd;
  }

  return chunks.filter(Boolean);
}

function toRichTextItems(value, { linkUrl } = {}) {
  return splitIntoChunks(value).map((content) => ({
    text: {
      ...(linkUrl ? { link: { url: linkUrl } } : {}),
      content,
    },
    type: 'text',
  }));
}

function normalizeUtcStampToIso(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    return raw.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      '$1-$2-$3T$4:$5:$6.000Z',
    );
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function buildDateValue(start, end) {
  const normalizedStart = normalizeUtcStampToIso(start);
  if (!normalizedStart) {
    return null;
  }

  const normalizedEnd = normalizeUtcStampToIso(end);

  return normalizedEnd
    ? { end: normalizedEnd, start: normalizedStart }
    : { start: normalizedStart };
}

function normalizeOptionName(options = [], desiredValue) {
  const normalizedDesiredValue = normalizeKey(desiredValue);
  if (!normalizedDesiredValue) {
    return '';
  }

  for (const option of options) {
    if (normalizeKey(option?.name) === normalizedDesiredValue) {
      return option.name;
    }
  }

  return '';
}

function resolveStatusName(property, preferredStatus) {
  const options = property?.status?.options ?? [];
  if (options.length === 0) {
    return '';
  }

  const matchedPreferredStatus = normalizeOptionName(options, preferredStatus);
  if (matchedPreferredStatus) {
    return matchedPreferredStatus;
  }

  for (const candidate of draftStatusCandidates) {
    const matchedCandidate = normalizeOptionName(options, candidate);
    if (matchedCandidate) {
      return matchedCandidate;
    }
  }

  return '';
}

function buildPropertyValue(property, value, options = {}) {
  if (value == null) {
    return undefined;
  }

  switch (property?.type) {
    case 'title': {
      if (typeof value === 'object') {
        return undefined;
      }

      const title = toRichTextItems(value);
      return title.length > 0 ? { title } : undefined;
    }

    case 'rich_text': {
      if (typeof value === 'object') {
        return undefined;
      }

      const richText = toRichTextItems(value);
      return richText.length > 0 ? { rich_text: richText } : undefined;
    }

    case 'select': {
      if (typeof value === 'object') {
        return undefined;
      }

      const name = String(value).trim();
      return name ? { select: { name } } : undefined;
    }

    case 'status': {
      const name = resolveStatusName(property, value);
      return name ? { status: { name } } : undefined;
    }

    case 'url': {
      if (typeof value === 'object') {
        return undefined;
      }

      const url = String(value).trim();
      return url ? { url } : undefined;
    }

    case 'date': {
      const dateValue = typeof value === 'object'
        ? buildDateValue(value.start, value.end)
        : buildDateValue(value);
      return dateValue ? { date: dateValue } : undefined;
    }

    case 'files': {
      if (!options.fileUploadId) {
        return undefined;
      }

      return {
        files: [
          {
            file_upload: { id: options.fileUploadId },
            name: options.filename || 'image-importee',
            type: 'file_upload',
          },
        ],
      };
    }

    case 'multi_select': {
      const values = Array.isArray(value) ? value : splitListText(value);
      const multiSelect = values
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean)
        .map((name) => ({ name }));
      return multiSelect.length > 0 ? { multi_select: multiSelect } : undefined;
    }

    case 'checkbox':
      return { checkbox: Boolean(value) };

    case 'number':
      return Number.isFinite(value) ? { number: value } : undefined;

    default:
      return undefined;
  }
}

function addPropertyAssignment(target, properties, candidates, value, options) {
  const match = findSchemaProperty(properties, candidates);
  if (!match) {
    return;
  }

  const propertyValue = buildPropertyValue(match.property, value, options);
  if (propertyValue) {
    target[match.name] = propertyValue;
  }
}

function buildSourceBlock(sourceUrl) {
  const url = String(sourceUrl ?? '').trim();
  if (!url) {
    return null;
  }

  return {
    object: 'block',
    paragraph: {
      rich_text: [
        ...toRichTextItems('Source Gemini share : '),
        ...toRichTextItems(url, { linkUrl: url }),
      ],
    },
    type: 'paragraph',
  };
}

function blockParagraph(text) {
  return splitIntoChunks(text).map((content) => ({
    object: 'block',
    paragraph: {
      rich_text: toRichTextItems(content),
    },
    type: 'paragraph',
  }));
}

function blockHeading(level, text) {
  const type = `heading_${level}`;
  return {
    object: 'block',
    [type]: {
      rich_text: toRichTextItems(text),
    },
    type,
  };
}

function blockBulletedItem(text) {
  return {
    bulleted_list_item: {
      rich_text: toRichTextItems(text),
    },
    object: 'block',
    type: 'bulleted_list_item',
  };
}

export function sanitizeTranscriptionText(markdown = '') {
  return String(markdown ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```[a-zA-Z0-9_-]*\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function detectImageContentType(filePath) {
  const extension = path.extname(String(filePath ?? '')).toLowerCase();
  return imageMimeTypesByExtension.get(extension) ?? '';
}

export function derivePublicationDraft({
  author = '',
  displayDate = '',
  edition = '',
  externalUrl = '',
  location = '',
  ocrText,
  resume = '',
  startsAt = '',
  title = '',
  type = 'info',
  endsAt = '',
} = {}) {
  const normalizedText = sanitizeTranscriptionText(ocrText);
  const firstLine = normalizedText.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  const fallbackTitle = firstLine.slice(0, 160) || 'Brouillon importé';
  const compactText = normalizedText.replace(/\s+/g, ' ').trim();
  const fallbackResume = compactText.slice(0, 280) || fallbackTitle;

  return normalizePublication({
    auteur: author,
    contenu_texte: normalizedText,
    date: displayDate,
    date_debut_iso: startsAt,
    date_fin_iso: endsAt,
    edition,
    lien_externe: externalUrl,
    lieu: location,
    resume: resume || fallbackResume,
    titre: title || fallbackTitle,
    type,
  });
}

export function buildPublicationProperties({
  filename,
  fileUploadId,
  imageCaption = '',
  publication,
  schemaProperties = {},
  status = 'Brouillon',
} = {}) {
  const properties = {};
  const rubrique = publicationTypeDefaults[publication.type] || 'Vie locale';
  const titleProperty = getTitleSchemaProperty(schemaProperties);

  if (titleProperty) {
    properties[titleProperty.name] = { title: toRichTextItems(publication.titre) };
  }

  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.type, publication.type);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.status, status);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.rubrique, rubrique);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.resume, publication.resume);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.displayDate, publication.date);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.location, publication.lieu);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.author, publication.auteur);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.edition, publication.edition);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.externalUrl, publication.lien_externe);
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.slug, slugify(publication.titre));
  addPropertyAssignment(properties, schemaProperties, publicationFieldCandidates.textFallback, publication.contenu_texte);
  addPropertyAssignment(
    properties,
    schemaProperties,
    publicationFieldCandidates.startDate,
    { end: publication.date_fin_iso, start: publication.date_debut_iso },
  );
  addPropertyAssignment(
    properties,
    schemaProperties,
    publicationFieldCandidates.endDate,
    publication.date_fin_iso,
  );
  addPropertyAssignment(
    properties,
    schemaProperties,
    publicationFieldCandidates.coverImage,
    filename,
    { fileUploadId, filename },
  );
  addPropertyAssignment(
    properties,
    schemaProperties,
    publicationFieldCandidates.imageCaption,
    imageCaption,
  );

  return properties;
}

export function buildPublicationBlocks({
  document,
  fileUploadId,
  imageCaption = '',
  imageFilename = '',
  sourceUrl = '',
} = {}) {
  const children = [];

  if (fileUploadId) {
    children.push({
      image: {
        caption: toRichTextItems(imageCaption || imageFilename || document?.title || 'Image source'),
        file_upload: { id: fileUploadId },
        type: 'file_upload',
      },
      object: 'block',
      type: 'image',
    });
  }

  const sourceBlock = buildSourceBlock(sourceUrl);
  if (sourceBlock) {
    children.push(sourceBlock);
  }

  for (const block of document?.blocks ?? []) {
    if (block.type === 'paragraph') {
      children.push(...blockParagraph(block.body));
      continue;
    }

    if (block.type === 'callout') {
      children.push({
        callout: {
          icon: { emoji: 'ℹ️', type: 'emoji' },
          rich_text: toRichTextItems(`${block.heading}\n${block.body}`.trim()),
        },
        object: 'block',
        type: 'callout',
      });
      continue;
    }

    if (block.type === 'section') {
      children.push(blockHeading(2, block.heading));
      for (const item of block.items ?? []) {
        children.push(blockBulletedItem(item));
      }
    }
  }

  return children;
}

export async function importPublicationToNotion({
  imageCaption = '',
  imagePath,
  notion,
  ocrText,
  publicationsDataSourceId,
  sourceUrl = '',
  status = 'Brouillon',
  ...draftOverrides
} = {}) {
  if (!notion) {
    throw new Error('Client Notion manquant.');
  }

  if (!publicationsDataSourceId) {
    throw new Error('NOTION_PUBLICATIONS_DATA_SOURCE_ID manquant.');
  }

  if (!ocrText) {
    throw new Error('Texte OCR manquant.');
  }

  if (!imagePath) {
    throw new Error('imagePath manquant. Fournis une image locale à importer dans Notion.');
  }

  const contentType = detectImageContentType(imagePath);
  if (!contentType) {
    throw new Error(`Type d'image non supporté pour ${imagePath}. Utilise JPG, PNG, WEBP, GIF ou SVG.`);
  }

  const publication = derivePublicationDraft({
    ocrText,
    ...draftOverrides,
  });
  const document = buildCanonicalContent(publication, {
    fallbackId: publication.id,
  });
  const dataSource = await retrieveDataSource(notion, publicationsDataSourceId);
  const uploadResult = await uploadFileToNotion(notion, {
    contentType,
    filePath: imagePath,
  });
  const imageFilename = path.basename(imagePath);
  const fileUploadId = uploadResult.completed?.id || uploadResult.upload?.id;
  const properties = buildPublicationProperties({
    filename: imageFilename,
    fileUploadId,
    imageCaption,
    publication,
    schemaProperties: dataSource.properties,
    status,
  });
  const children = buildPublicationBlocks({
    document,
    fileUploadId,
    imageCaption,
    imageFilename,
    sourceUrl,
  });
  const page = await createPageInDataSource(notion, {
    children,
    cover: fileUploadId ? { file_upload: { id: fileUploadId }, type: 'file_upload' } : undefined,
    dataSourceId: publicationsDataSourceId,
    properties,
  });

  return {
    dataSource,
    document,
    fileUploadId,
    page,
    properties,
    publication,
  };
}
