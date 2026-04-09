const fs = require('node:fs/promises');
const path = require('node:path');

const dataDir = path.resolve(__dirname, '../../data');
const rubriqueOrder = [
  'Événements',
  'Scolaire',
  'Travaux et mobilité',
  'Vie associative',
  'Coup de cœur littéraire',
  'Vie locale',
];

const quickLinkThemes = {
  'Coup de cœur littéraire': {
    accentClass: 'quick-link-accent--brown',
    chipClass: 'quick-link-chip--brown',
  },
  'Scolaire': {
    accentClass: 'quick-link-accent--brown',
    chipClass: 'quick-link-chip--brown',
  },
  'Travaux et mobilité': {
    accentClass: 'quick-link-accent--blue',
    chipClass: 'quick-link-chip--blue',
  },
  'Vie associative': {
    accentClass: 'quick-link-accent--blue',
    chipClass: 'quick-link-chip--blue',
  },
  'Vie locale': {
    accentClass: 'quick-link-accent--brown',
    chipClass: 'quick-link-chip--brown',
  },
  'Événements': {
    accentClass: 'quick-link-accent--green',
    chipClass: 'quick-link-chip--green',
  },
};

function normalizePathPrefix(value) {
  if (!value || value === '/') {
    return '/';
  }

  const trimmed = String(value).trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

async function readJson(fileName, fallback) {
  const filePath = path.join(dataDir, fileName);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

function normalizePublicationEntry(entry = {}) {
  const cantineDays = Array.isArray(entry.cantine_jours) ? entry.cantine_jours : [];

  return {
    ...entry,
    cantine_jours: cantineDays,
  };
}

function normalizeCantineEntry(entry = {}) {
  const cantineDays = Array.isArray(entry.cantine_jours) ? entry.cantine_jours : [];

  return {
    ...entry,
    cantine_jours: cantineDays,
  };
}

function buildPortalUrl({ rubrique, slug } = {}) {
  const params = new URLSearchParams();

  if (rubrique) {
    params.set('rubrique', rubrique);
  }

  if (slug) {
    params.set('slug', slug);
  }

  const query = params.toString();
  return query ? `portail.html?${query}` : 'portail.html';
}

function parseIsoDate(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    '$1-$2-$3T$4:$5:$6Z',
  );
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sortAgendaEntries(a = {}, b = {}) {
  return String(a.start_iso || '').localeCompare(String(b.start_iso || ''));
}

function interpolateTemplate(template, replacements = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(replacements[key] ?? ''));
}

function createPublicationTypeLabelMap(portalPage = {}) {
  const labels = {
    alerte: 'Alerte',
    cantine: 'Cantine',
    coup_de_coeur: 'Lecture',
    evenement: 'Événement',
    info: 'Information',
  };

  for (const item of portalPage.typeMeta || []) {
    if (!item?.key || !item?.label) {
      continue;
    }

    labels[item.key] = item.label;
  }

  return labels;
}

function decoratePublication(entry = {}, publicationTypeLabels = {}) {
  return {
    ...entry,
    href: buildPortalUrl({ rubrique: entry.rubrique, slug: entry.slug }),
    rubriqueHref: buildPortalUrl({ rubrique: entry.rubrique }),
    typeLabel: publicationTypeLabels[entry.type] || 'Publication',
  };
}

function createQuickLinkFallbackMap(homePage = {}) {
  const map = new Map();

  for (const item of homePage.quickLinkFallbacks || []) {
    if (!item?.rubrique) {
      continue;
    }

    map.set(item.rubrique, {
      description: item.description || '',
      headline: item.title || item.rubrique,
    });
  }

  return map;
}

function buildQuickLinks(publications = [], homePage = {}) {
  const fallbackMap = createQuickLinkFallbackMap(homePage);

  return rubriqueOrder.map((rubrique) => {
    const publication = publications.find((entry) => entry.rubrique === rubrique);
    const fallback = fallbackMap.get(rubrique) || {
      description: 'Retrouver les informations de cette rubrique dans le portail.',
      headline: rubrique,
    };

    return {
      ...(quickLinkThemes[rubrique] || {
        accentClass: 'quick-link-accent--brown',
        chipClass: 'quick-link-chip--brown',
      }),
      description: publication?.resume || fallback.description,
      hasContent: Boolean(publication),
      headline: publication?.titre || fallback.headline,
      href: buildPortalUrl({ rubrique, slug: publication?.slug }),
      rubrique,
    };
  });
}

function buildCantineSummary(entry) {
  if (!entry) {
    return null;
  }

  const days = (entry.cantine_jours || []).map((day) => ({
    day: day.day || '',
    isSpecial: Boolean(day.isSpecial),
    itemsCount: Array.isArray(day.items) ? day.items.length : 0,
    message: day.message || '',
  }));
  const totalItems = days.reduce((sum, day) => sum + day.itemsCount, 0);
  const specialDay = days.find((day) => day.isSpecial);

  return {
    ...entry,
    days,
    href: buildPortalUrl({ rubrique: 'Scolaire', slug: entry.publication_slug }),
    specialMessage: specialDay?.message || '',
    specialTitle: specialDay?.day || '',
    totalItems,
  };
}

function buildUpcomingEvents(agenda = [], referenceDate = new Date()) {
  const sortedEvents = agenda
    .slice()
    .sort(sortAgendaEntries)
    .map((eventItem) => ({
      ...eventItem,
      articleHref: buildPortalUrl({ rubrique: eventItem.rubrique, slug: eventItem.post_slug }),
    }));

  const upcoming = sortedEvents.filter((eventItem) => {
    const eventDate = parseIsoDate(eventItem.start_iso);
    return eventDate && eventDate >= referenceDate;
  });

  return (upcoming.length ? upcoming : sortedEvents).slice(0, 3);
}

function buildHomeData({
  agenda = [],
  cantine = [],
  publications = [],
  referenceDate = new Date(),
  siteSections = {},
} = {}) {
  const homePage = siteSections['home-page'] || {};
  const portalPage = siteSections['portal-page'] || {};
  const publicationTypeLabels = createPublicationTypeLabelMap(portalPage);
  const featuredPublication = publications.find((entry) => entry.featured) || null;
  const featuredPublicationId = featuredPublication?.id || null;
  const secondaryPublications = featuredPublicationId
    ? publications.filter((entry) => entry.id !== featuredPublicationId)
    : publications;

  return {
    cantineEntry: buildCantineSummary(cantine[0]),
    featuredPublication: featuredPublication ? decoratePublication(featuredPublication, publicationTypeLabels) : null,
    quickLinks: buildQuickLinks(publications, homePage),
    secondaryPublications: secondaryPublications
      .slice(0, 3)
      .map((entry) => decoratePublication(entry, publicationTypeLabels)),
    upcomingEvents: buildUpcomingEvents(agenda, referenceDate),
  };
}

function buildNavigation(siteNav = {}, { isDemo = false } = {}) {
  const defaults = new Map([
    ['home', 'Accueil'],
    ['actualites', 'Actualités'],
    ['lecture', 'Coup de cœur'],
    ['agenda', 'Agenda'],
    ['veille', 'Veille'],
    ['about', 'À propos'],
  ]);
  const labels = new Map(
    (siteNav.items || [])
      .filter((item) => item?.key)
      .map((item) => [item.key, item.label || defaults.get(item.key) || item.key]),
  );

  const items = [
    { href: 'index.html', key: 'home', label: labels.get('home') || defaults.get('home') },
    { href: 'portail.html', key: 'actualites', label: labels.get('actualites') || defaults.get('actualites') },
    {
      href: buildPortalUrl({ rubrique: 'Coup de cœur littéraire' }),
      key: 'lecture',
      label: labels.get('lecture') || defaults.get('lecture'),
      rubrique: 'Coup de cœur littéraire',
    },
    { href: 'agenda.html', key: 'agenda', label: labels.get('agenda') || defaults.get('agenda') },
    { href: 'a-propos.html', key: 'about', label: labels.get('about') || defaults.get('about') },
  ];

  if (!isDemo) {
    items.splice(4, 0, {
      href: 'veille.html',
      key: 'veille',
      label: labels.get('veille') || defaults.get('veille'),
    });
  }

  return items;
}

async function loadJournalData() {
  const [
    { defaultSiteSections, mergeSiteSections },
    rawPublications,
    rawAgenda,
    rawCantine,
    rawSiteSections,
  ] = await Promise.all([
    import('../../scripts/lib/default-site-sections.mjs'),
    readJson('publications.json', []),
    readJson('agenda.json', []),
    readJson('cantine.json', []),
    readJson('site-sections.json', {}),
  ]);
  const publications = rawPublications.map(normalizePublicationEntry);
  const agenda = rawAgenda;
  const cantine = rawCantine.map(normalizeCantineEntry);
  const siteSections = mergeSiteSections(defaultSiteSections, rawSiteSections);
  const pathPrefix = normalizePathPrefix(process.env.SITE_PATH_PREFIX);
  const deployTarget = process.env.SITE_DEPLOY_TARGET || 'vercel';
  const buildTime = new Date();
  const siteNav = siteSections['site-nav'] || {};

  return {
    agenda,
    buildTimeIso: buildTime.toISOString(),
    cantine,
    home: buildHomeData({
      agenda,
      cantine,
      publications,
      referenceDate: buildTime,
      siteSections,
    }),
    publications,
    site: {
      deployTarget,
      isDemo: deployTarget === 'github-pages-demo',
      navigation: buildNavigation(siteNav, {
        isDemo: deployTarget === 'github-pages-demo',
      }),
      pathPrefix,
    },
    siteSections,
  };
}

module.exports = loadJournalData;
module.exports.__private__ = {
  buildCantineSummary,
  buildHomeData,
  buildNavigation,
  buildPortalUrl,
  buildQuickLinks,
  buildUpcomingEvents,
  buildNavigation,
  createPublicationTypeLabelMap,
  decoratePublication,
  interpolateTemplate,
  parseIsoDate,
  sortAgendaEntries,
};
