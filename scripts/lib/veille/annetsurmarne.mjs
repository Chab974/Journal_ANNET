import { createHash } from 'node:crypto';

const MAIRIE_BASE_URL = 'https://www.annetsurmarne.com/';
const PREFECTURE_BASE_URL = 'https://www.seine-et-marne.gouv.fr';
const PREFECTURE_RESULT_ERROR = "Impossible d'extraire les résultats du site de la Préfecture.";

const PREFECTURE_FORBIDDEN_WORDS = [
  'aller au contenu',
  'appliquer',
  'effacer',
  'filtrer',
  'navigation',
  'période',
  'periode',
  'rechercher',
  'valider',
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeWhitespace(value = '') {
  return decodeHtmlEntities(String(value))
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(value = '') {
  return normalizeWhitespace(
    String(value)
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function buildExcerpt(value = '', maxLength = 160) {
  const text = stripHtml(value);
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  const slice = text.slice(0, maxLength);
  const boundary = slice.lastIndexOf(' ');
  const truncated = slice.slice(0, boundary > 80 ? boundary : maxLength).trim();
  return `${truncated}...`;
}

function buildStableId(source, title, link) {
  return `${source}-${createHash('sha1').update(`${source}::${title}::${link}`).digest('hex').slice(0, 12)}`;
}

function normalizeQuery(query = '') {
  return String(query ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function extractXmlValue(xml, tagNames = []) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${escapeRegex(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegex(tagName)}>`, 'i');
    const match = xml.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return '';
}

function extractAttribute(tagSource, attributeName) {
  const pattern = new RegExp(`${escapeRegex(attributeName)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = String(tagSource).match(pattern);
  return match?.[1] || match?.[2] || match?.[3] || '';
}

function absolutizePrefectureUrl(href = '') {
  if (!href) {
    return '';
  }

  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  return new URL(href, `${PREFECTURE_BASE_URL}/`).href;
}

function cleanPrefectureDate(value = '') {
  return stripHtml(value)
    .replace(/^mis à jour le\s*/i, '')
    .trim();
}

function isForbiddenPrefectureTitle(value = '') {
  const normalized = stripHtml(value).toLowerCase();
  if (!normalized || normalized.length < 4) {
    return true;
  }

  return PREFECTURE_FORBIDDEN_WORDS.some((word) => normalized.includes(word));
}

function extractByClassTokens(block, classTokens = []) {
  if (!block || !classTokens.length) {
    return '';
  }

  const classes = classTokens.map((token) => escapeRegex(token)).join('|');
  const pattern = new RegExp(
    `<([a-z0-9]+)\\b[^>]*class\\s*=\\s*(["'])[^"']*(?:${classes})[^"']*\\2[^>]*>([\\s\\S]*?)<\\/\\1>`,
    'i',
  );
  return block.match(pattern)?.[3] || '';
}

function extractPrimaryAnchor(block) {
  const headingPattern = /<h[23]\b[^>]*>\s*<a\b([^>]*)>([\s\S]*?)<\/a>\s*<\/h[23]>/i;
  const headingMatch = block.match(headingPattern);

  if (headingMatch) {
    return {
      attrs: headingMatch[1] || '',
      href: extractAttribute(headingMatch[1] || '', 'href'),
      title: stripHtml(headingMatch[2] || ''),
    };
  }

  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const anchors = [];
  let match = anchorPattern.exec(block);

  while (match) {
    anchors.push({
      attrs: match[1] || '',
      href: extractAttribute(match[1] || '', 'href'),
      title: stripHtml(match[2] || ''),
    });
    match = anchorPattern.exec(block);
  }

  return anchors.find((anchor) => /fr-card__link/i.test(anchor.attrs) && anchor.href)
    || anchors.find((anchor) => anchor.href && !anchor.href.startsWith('#') && !/^javascript:/i.test(anchor.href))
    || { attrs: '', href: '', title: '' };
}

function collectListBlocks(html, containerClass) {
  const blocks = [];
  const pattern = new RegExp(
    `<(?:ul|ol|div|section)\\b[^>]*class\\s*=\\s*(["'])[^"']*${escapeRegex(containerClass)}[^"']*\\1[^>]*>([\\s\\S]*?)<\\/(?:ul|ol|div|section)>`,
    'gi',
  );

  let match = pattern.exec(html);
  while (match) {
    const items = match[2].match(/<li\b[\s\S]*?<\/li>/gi) || [];
    blocks.push(...items);
    match = pattern.exec(html);
  }

  return blocks;
}

function collectStructuredPrefectureBlocks(html) {
  const blocks = [
    ...collectListBlocks(html, 'ezsearch-results'),
    ...collectListBlocks(html, 'liste-resultats'),
  ];
  const patterns = [
    /<article\b[^>]*class\s*=\s*(["'])[^"']*\bfr-card\b[^"']*\1[^>]*>[\s\S]*?<\/article>/gi,
    /<(?:div|article|li|tr)\b[^>]*class\s*=\s*(["'])[^"']*\b(?:item-resultat|search-result|ezsearch-result)\b[^"']*\1[^>]*>[\s\S]*?<\/(?:div|article|li|tr)>/gi,
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    blocks.push(...matches);
  }

  const seen = new Set();
  return blocks.filter((block) => {
    const key = createHash('sha1').update(block).digest('hex');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizePrefectureItem(block) {
  const primaryAnchor = extractPrimaryAnchor(block);
  const title = stripHtml(primaryAnchor.title);

  if (!primaryAnchor.href || !title || isForbiddenPrefectureTitle(title)) {
    return null;
  }

  const link = absolutizePrefectureUrl(primaryAnchor.href);
  if (!/^https?:\/\//i.test(link)) {
    return null;
  }

  const description = extractByClassTokens(block, [
    'fr-card__desc',
    'description',
    'ezsearch-result-snippet',
    'attribute-short',
  ]) || block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';

  const date = extractByClassTokens(block, [
    'fr-card__detail',
    'date',
    'ezsearch-result-date',
  ]) || block.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i)?.[1] || '';

  return {
    excerpt: buildExcerpt(description),
    id: buildStableId('prefecture', title, link),
    link,
    pubDate: cleanPrefectureDate(date),
    source: 'prefecture',
    title,
  };
}

function fallbackPrefectureResults(html) {
  const results = [];
  const pattern = /<h[23]\b[^>]*>\s*<a\b([^>]*)>([\s\S]*?)<\/a>\s*<\/h[23]>/gi;
  let match = pattern.exec(html);

  while (match) {
    const href = extractAttribute(match[1] || '', 'href');
    const title = stripHtml(match[2] || '');

    if (href && title && !isForbiddenPrefectureTitle(title)) {
      results.push({
        excerpt: '',
        id: buildStableId('prefecture', title, href),
        link: absolutizePrefectureUrl(href),
        pubDate: '',
        source: 'prefecture',
        title,
      });
    }

    match = pattern.exec(html);
  }

  return results;
}

async function fetchText(url, {
  fetchImpl = fetch,
  headers = {},
  sourceLabel = 'source',
} = {}) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'text/plain, text/html, application/rss+xml, application/xml;q=0.9, */*;q=0.8',
      'user-agent': 'Journal-ANNET-Veille/1.0',
      ...headers,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Erreur réseau ${sourceLabel} (${response.status})`);
  }

  return response.text();
}

export function buildMairieRssUrl(query = '') {
  const normalizedQuery = normalizeQuery(query);
  const url = new URL(MAIRIE_BASE_URL);
  url.searchParams.set('feed', 'rss2');
  if (normalizedQuery) {
    url.searchParams.set('s', normalizedQuery);
  }
  return url.toString();
}

export function buildPrefectureSearchUrl(query = '') {
  const baseSearch = 'annet sur marne';
  const normalizedQuery = normalizeQuery(query);
  const searchText = normalizedQuery ? `${baseSearch} ${normalizedQuery}` : baseSearch;
  const encodedSearch = encodeURIComponent(searchText.trim()).replace(/%20/g, '+');
  return `${PREFECTURE_BASE_URL}/contenu/recherche/(searchtext)/${encodedSearch}/(change)/1222017655?SearchText=${encodedSearch}`;
}

export function parseMairieRss(xml = '') {
  const normalizedXml = String(xml || '');
  if (!/<rss[\s>]/i.test(normalizedXml) || !/<channel[\s>]/i.test(normalizedXml)) {
    throw new Error('Format RSS mairie invalide.');
  }

  const itemMatches = normalizedXml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return itemMatches
    .map((itemXml) => {
      const title = stripHtml(extractXmlValue(itemXml, ['title']));
      const link = stripHtml(extractXmlValue(itemXml, ['link']));
      const pubDate = stripHtml(extractXmlValue(itemXml, ['pubDate', 'dc:date']));
      const excerptSource = extractXmlValue(itemXml, ['content:encoded', 'description']);

      if (!title || !/^https?:\/\//i.test(link)) {
        return null;
      }

      return {
        excerpt: buildExcerpt(excerptSource),
        id: buildStableId('mairie', title, link),
        link,
        pubDate,
        source: 'mairie',
        title,
      };
    })
    .filter(Boolean);
}

export function parsePrefectureHtml(html = '') {
  const normalizedHtml = String(html || '');
  if (!/<html[\s>]/i.test(normalizedHtml) && !/<main[\s>]/i.test(normalizedHtml)) {
    throw new Error(PREFECTURE_RESULT_ERROR);
  }

  const results = collectStructuredPrefectureBlocks(normalizedHtml)
    .map((block) => normalizePrefectureItem(block))
    .filter(Boolean);

  if (results.length > 0) {
    return dedupeVeilleItems(results);
  }

  const fallbackResults = fallbackPrefectureResults(normalizedHtml);
  if (fallbackResults.length > 0) {
    return dedupeVeilleItems(fallbackResults);
  }

  if (/aucun(?:e)?\s+r[ée]sultat/i.test(normalizedHtml)) {
    return [];
  }

  throw new Error(PREFECTURE_RESULT_ERROR);
}

export function dedupeVeilleItems(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.source}::${item.link}`;
    if (!item?.link || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function fetchMairieItems(query = '', { fetchImpl = fetch } = {}) {
  const xml = await fetchText(buildMairieRssUrl(query), {
    fetchImpl,
    sourceLabel: 'mairie',
  });
  return parseMairieRss(xml);
}

export async function fetchPrefectureItems(query = '', { fetchImpl = fetch } = {}) {
  const html = await fetchText(buildPrefectureSearchUrl(query), {
    fetchImpl,
    sourceLabel: 'préfecture',
  });
  return parsePrefectureHtml(html);
}

export async function fetchAnnetSurMarneVeille(query = '', {
  fetchImpl = fetch,
} = {}) {
  const normalizedQuery = normalizeQuery(query);
  const [mairie, prefecture] = await Promise.all([
    fetchMairieItems(normalizedQuery, { fetchImpl })
      .then((items) => ({ error: null, items }))
      .catch((error) => ({ error: error.message, items: [] })),
    fetchPrefectureItems(normalizedQuery, { fetchImpl })
      .then((items) => ({ error: null, items }))
      .catch((error) => ({ error: error.message, items: [] })),
  ]);

  return {
    lastUpdated: new Date().toISOString(),
    mairie,
    prefecture,
    query: normalizedQuery,
  };
}

export {
  PREFECTURE_RESULT_ERROR,
  stripHtml,
};
