import { readFile } from 'node:fs/promises';

import { ensureArray } from '../utils.mjs';

export const trackedPageIndexSchemaVersion = 1;
export const trackedPageIndexUrl = new URL('../../../data/notion-page-index.json', import.meta.url);

function collectPageIds(pageSources, pages, source) {
  for (const page of ensureArray(pages)) {
    const pageId = typeof page?.id === 'string' ? page.id.trim() : '';
    if (!pageId) {
      continue;
    }

    pageSources[pageId] = source;
  }
}

export function buildTrackedPageIndex({
  agendaPages = [],
  cantinePages = [],
  publicationPages = [],
  sectionItemPages = [],
  sectionPages = [],
} = {}) {
  const page_sources = {};

  collectPageIds(page_sources, publicationPages, 'publications');
  collectPageIds(page_sources, agendaPages, 'agenda');
  collectPageIds(page_sources, cantinePages, 'cantine');
  collectPageIds(page_sources, sectionPages, 'site-sections');
  collectPageIds(page_sources, sectionItemPages, 'site-section-items');

  return {
    generated_at: new Date().toISOString(),
    page_sources,
    schema_version: trackedPageIndexSchemaVersion,
  };
}

export function normalizeTrackedPageIndex(value = {}) {
  const pageSources = value?.page_sources && typeof value.page_sources === 'object'
    ? Object.fromEntries(
        Object.entries(value.page_sources).filter(
          ([pageId, source]) => String(pageId).trim() && typeof source === 'string' && source.trim(),
        ),
      )
    : {};

  return {
    generated_at:
      typeof value?.generated_at === 'string' && value.generated_at.trim()
        ? value.generated_at
        : null,
    page_sources: pageSources,
    schema_version: trackedPageIndexSchemaVersion,
  };
}

export async function readTrackedPageIndex({
  readText = (url) => readFile(url, 'utf8'),
} = {}) {
  try {
    const raw = await readText(trackedPageIndexUrl);
    return normalizeTrackedPageIndex(JSON.parse(raw));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return normalizeTrackedPageIndex();
    }

    throw error;
  }
}

export function getTrackedPageSource(index, pageId) {
  const normalizedPageId = String(pageId ?? '').trim();
  if (!normalizedPageId) {
    return '';
  }

  return normalizeTrackedPageIndex(index).page_sources[normalizedPageId] || '';
}
