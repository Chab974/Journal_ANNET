import { normalizeExternalUrl } from '../../../lib/shared/urlSafety.js';
import { ensureArray, normalizeKey, splitListText } from '../utils.mjs';

function buildNormalizedPropertyMap(page) {
  const mapping = new Map();
  for (const [key, value] of Object.entries(page?.properties ?? {})) {
    mapping.set(normalizeKey(key), value);
  }
  return mapping;
}

function getPropertyMap(page) {
  if (!page.__normalizedPropertyMap) {
    page.__normalizedPropertyMap = buildNormalizedPropertyMap(page);
  }

  return page.__normalizedPropertyMap;
}

export function findProperty(page, candidates = []) {
  const properties = page?.properties ?? {};
  const propertyMap = getPropertyMap(page);

  for (const candidate of candidates) {
    if (properties[candidate]) {
      return properties[candidate];
    }

    const normalized = propertyMap.get(normalizeKey(candidate));
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getTitleProperty(page) {
  return Object.values(page?.properties ?? {}).find((property) => property?.type === 'title') ?? null;
}

export function notionRichTextToPlainText(richText = []) {
  return ensureArray(richText)
    .map((item) => item?.plain_text ?? item?.text?.content ?? '')
    .join('')
    .trim();
}

export function notionRichTextToHtml(richText = []) {
  return ensureArray(richText)
    .map((item) => {
      const annotations = item?.annotations ?? {};
      const href = item?.href || item?.text?.link?.url || null;
      let content = escapeHtml(item?.plain_text ?? item?.text?.content ?? '');

      if (!content) {
        return '';
      }

      if (annotations.code) {
        content = `<code>${content}</code>`;
      }
      if (annotations.bold) {
        content = `<strong>${content}</strong>`;
      }
      if (annotations.italic) {
        content = `<em>${content}</em>`;
      }
      if (annotations.strikethrough) {
        content = `<s>${content}</s>`;
      }
      if (annotations.underline) {
        content = `<u>${content}</u>`;
      }
      const safeHref = normalizeExternalUrl(href);
      if (safeHref) {
        content = `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
      }

      return content;
    })
    .join('');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function propertyToPlainText(property) {
  if (!property) {
    return '';
  }

  switch (property.type) {
    case 'title':
    case 'rich_text':
      return notionRichTextToPlainText(property[property.type]);
    case 'select':
    case 'status':
      return property[property.type]?.name ?? '';
    case 'multi_select':
      return ensureArray(property.multi_select)
        .map((item) => item?.name ?? '')
        .filter(Boolean)
        .join(', ');
    case 'url':
    case 'email':
    case 'phone_number':
      return property[property.type] ?? '';
    case 'number':
      return Number.isFinite(property.number) ? String(property.number) : '';
    case 'checkbox':
      return property.checkbox ? 'true' : 'false';
    case 'date':
      return property.date?.start ?? '';
    case 'files':
      return ensureArray(property.files)
        .map((file) => file?.name ?? '')
        .filter(Boolean)
        .join(', ');
    case 'formula':
      return formulaValueToPlainText(property.formula);
    default:
      return '';
  }
}

function formulaValueToPlainText(formula) {
  if (!formula) {
    return '';
  }

  switch (formula.type) {
    case 'string':
      return formula.string ?? '';
    case 'number':
      return Number.isFinite(formula.number) ? String(formula.number) : '';
    case 'boolean':
      return formula.boolean ? 'true' : 'false';
    case 'date':
      return formula.date?.start ?? '';
    default:
      return '';
  }
}

export function propertyToNumber(property) {
  if (!property) {
    return null;
  }

  if (property.type === 'number' && Number.isFinite(property.number)) {
    return property.number;
  }

  if (property.type === 'formula' && property.formula?.type === 'number' && Number.isFinite(property.formula.number)) {
    return property.formula.number;
  }

  const parsed = Number(propertyToPlainText(property));
  return Number.isFinite(parsed) ? parsed : null;
}

export function propertyToCheckbox(property) {
  if (!property) {
    return false;
  }

  if (property.type === 'checkbox') {
    return Boolean(property.checkbox);
  }

  return ['true', 'yes', '1', 'on'].includes(propertyToPlainText(property).toLowerCase());
}

export function propertyToDate(property) {
  if (!property) {
    return null;
  }

  if (property.type === 'date') {
    return property.date ?? null;
  }

  if (property.type === 'formula' && property.formula?.type === 'date') {
    return property.formula.date ?? null;
  }

  return null;
}

export function propertyToFiles(property) {
  if (!property) {
    return [];
  }

  if (property.type === 'files') {
    return ensureArray(property.files);
  }

  return [];
}

export function propertyToRelationIds(property) {
  if (!property || property.type !== 'relation') {
    return [];
  }

  return ensureArray(property.relation).map((entry) => entry?.id).filter(Boolean);
}

export function propertyToMultiSelect(property) {
  if (!property) {
    return [];
  }

  if (property.type === 'multi_select') {
    return ensureArray(property.multi_select).map((entry) => entry?.name).filter(Boolean);
  }

  return splitListText(propertyToPlainText(property));
}
