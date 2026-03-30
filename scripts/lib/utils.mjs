import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(currentDir, '../..');
export const siteTimeZone = process.env.SITE_TIME_ZONE || 'Europe/Paris';

export function fromRepo(...segments) {
  return path.resolve(repoRoot, ...segments);
}

export async function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw new Error(`Impossible de lire ${filePath}: ${error.message}`);
  }
}

export async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeKey(value) {
  return slugify(value).replaceAll('-', '');
}

export function unique(values) {
  return [...new Set(ensureArray(values).filter(Boolean))];
}

export function splitListText(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/\n|;/g)
    .map((entry) => entry.replace(/^[-*•\s]+/, '').trim())
    .filter(Boolean);
}

function asDate(value, { endOfDay = false } = {}) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
  }

  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    return new Date(raw.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toUtcStamp(value, options = {}) {
  const parsed = asDate(value, options);
  if (!parsed) {
    return '';
  }

  return parsed.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function formatLongDate(value, locale = 'fr-FR') {
  const parsed = asDate(value);
  if (!parsed) {
    return '';
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: siteTimeZone,
    weekday: 'long',
    year: 'numeric',
  }).format(parsed);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatHour(value, locale = 'fr-FR') {
  const parsed = asDate(value);
  if (!parsed) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: siteTimeZone,
  })
    .format(parsed)
    .replace(':', 'h');
}

export function formatTimeRange(start, end, locale = 'fr-FR') {
  const startLabel = formatHour(start, locale);
  const endLabel = formatHour(end || start, locale);

  if (!startLabel) {
    return '';
  }

  return `${startLabel} - ${endLabel}`;
}

export function compareOptionalNumbers(left, right) {
  if (Number.isFinite(left) && Number.isFinite(right)) {
    return left - right;
  }

  if (Number.isFinite(left)) {
    return -1;
  }

  if (Number.isFinite(right)) {
    return 1;
  }

  return 0;
}
