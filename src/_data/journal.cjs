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

const publicationTypeLabels = {
  alerte: 'Alerte',
  cantine: 'Cantine',
  coup_de_coeur: 'Lecture',
  evenement: 'Événement',
  info: 'Information',
};

const rubriqueFallbacks = {
  'Coup de cœur littéraire': {
    description: 'Sélection de lectures et recommandations culturelles locales.',
    headline: 'Lecture et médiathèque',
  },
  'Scolaire': {
    description: 'Cantine, portail famille et informations utiles pour les parents.',
    headline: 'Cantine et familles',
  },
  'Travaux et mobilité': {
    description: 'Circulation, chantiers et alertes utiles au quotidien.',
    headline: 'Travaux et mobilité',
  },
  'Vie associative': {
    description: 'Associations, bénévolat et rendez-vous collectifs à suivre.',
    headline: 'Vie associative',
  },
  'Vie locale': {
    description: 'Vie du village, initiatives et infos de proximité.',
    headline: 'Vie locale',
  },
  'Événements': {
    description: 'Temps forts, sorties et rendez-vous à venir dans le village.',
    headline: 'Événements à venir',
  },
};

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

function decoratePublication(entry = {}) {
  return {
    ...entry,
    href: buildPortalUrl({ rubrique: entry.rubrique, slug: entry.slug }),
    rubriqueHref: buildPortalUrl({ rubrique: entry.rubrique }),
    typeLabel: publicationTypeLabels[entry.type] || 'Publication',
  };
}

function buildQuickLinks(publications = []) {
  return rubriqueOrder.map((rubrique) => {
    const publication = publications.find((entry) => entry.rubrique === rubrique);
    const fallback = rubriqueFallbacks[rubrique] || {
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

function buildHomeData({ agenda = [], cantine = [], publications = [], referenceDate = new Date() } = {}) {
  const featuredPublication = publications.find((entry) => entry.featured) || publications[0] || null;
  const featuredPublicationId = featuredPublication?.id || null;

  return {
    cantineEntry: buildCantineSummary(cantine[0]),
    featuredPublication: featuredPublication ? decoratePublication(featuredPublication) : null,
    quickLinks: buildQuickLinks(publications),
    secondaryPublications: publications
      .filter((entry) => entry.id !== featuredPublicationId)
      .slice(0, 3)
      .map(decoratePublication),
    upcomingEvents: buildUpcomingEvents(agenda, referenceDate),
  };
}

async function loadJournalData() {
  const publications = (await readJson('publications.json', [])).map(normalizePublicationEntry);
  const agenda = await readJson('agenda.json', []);
  const cantine = (await readJson('cantine.json', [])).map(normalizeCantineEntry);
  const siteSections = await readJson('site-sections.json', {});
  const pathPrefix = normalizePathPrefix(process.env.SITE_PATH_PREFIX);
  const deployTarget = process.env.SITE_DEPLOY_TARGET || 'vercel';
  const buildTime = new Date();

  return {
    agenda,
    buildTimeIso: buildTime.toISOString(),
    cantine,
    home: buildHomeData({
      agenda,
      cantine,
      publications,
      referenceDate: buildTime,
    }),
    publications,
    site: {
      deployTarget,
      isDemo: deployTarget === 'github-pages-demo',
      navigation: [
        { href: 'index.html', key: 'home', label: 'Accueil' },
        { href: 'portail.html', key: 'actualites', label: 'Actualités' },
        { href: 'agenda.html', key: 'agenda', label: 'Agenda' },
        { href: 'a-propos.html', key: 'about', label: 'À propos' },
      ],
      pathPrefix,
    },
    siteSections,
  };
}

module.exports = loadJournalData;
module.exports.__private__ = {
  buildCantineSummary,
  buildHomeData,
  buildPortalUrl,
  buildQuickLinks,
  buildUpcomingEvents,
  decoratePublication,
  parseIsoDate,
  sortAgendaEntries,
};
