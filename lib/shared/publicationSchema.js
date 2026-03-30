const ALLOWED_POST_TYPES = ['cantine', 'alerte', 'evenement', 'info', 'coup_de_coeur'];
const LEGACY_POST_TYPE_ALIASES = {
  menu: 'cantine',
};
const ALLOWED_BADGES = ['bio', 'france', 'regional', 'msc', 'ce2', 'certifie', 'certifié'];
const UTC_DATE_PATTERN = /^\d{8}T\d{6}Z$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedString(value, { maxLength = 5000 } = {}) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function slugify(value) {
  return asTrimmedString(value, { maxLength: 120 })
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePostType(value) {
  return asTrimmedString(value, { maxLength: 80 })
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function createLocalId(prefix = 'post') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBadge(badge) {
  const normalized = slugify(badge);
  if (!normalized || !ALLOWED_BADGES.includes(normalized)) {
    return null;
  }

  return normalized === 'certifie' ? 'certifié' : normalized;
}

function normalizeCantineItem(item, dayLabel, index) {
  if (!isObject(item)) {
    return null;
  }

  const name = asTrimmedString(item.name, { maxLength: 180 });
  if (!name) {
    return null;
  }

  const description = asTrimmedString(item.description, { maxLength: 240 });
  const rawBadges = Array.isArray(item.badges) ? item.badges : [];
  const badges = rawBadges.map(normalizeBadge).filter(Boolean);

  return {
    id: `${slugify(dayLabel || 'jour')}-${slugify(name) || `item-${index + 1}`}-${index + 1}`,
    name,
    description,
    badges,
  };
}

function normalizeCantineDay(day, index) {
  if (!isObject(day)) {
    return null;
  }

  const label = asTrimmedString(day.day, { maxLength: 40 });
  if (!label) {
    return null;
  }

  const isSpecial = Boolean(day.isSpecial);
  const message = asTrimmedString(day.message, { maxLength: 400 });
  const rawItems = Array.isArray(day.items) ? day.items : [];
  const items = rawItems
    .map((item, itemIndex) => normalizeCantineItem(item, label, itemIndex))
    .filter(Boolean);

  if (!isSpecial && items.length === 0) {
    return null;
  }

  return {
    id: `day-${slugify(label) || index + 1}-${index + 1}`,
    day: label,
    isSpecial,
    message,
    items,
  };
}

function normalizeDateStamp(value) {
  const normalized = asTrimmedString(value, { maxLength: 16 });
  if (!normalized) {
    return '';
  }

  return UTC_DATE_PATTERN.test(normalized) ? normalized : '';
}

function buildSearchUrl(title, author) {
  const query = [title, author].filter(Boolean).join(' ');
  if (!query) {
    return '';
  }

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function normalizePublication(rawPublication, { fallbackId } = {}) {
  if (!isObject(rawPublication)) {
    throw new Error('Publication invalide : objet attendu.');
  }

  const rawType = normalizePostType(rawPublication.type);
  const canonicalType = LEGACY_POST_TYPE_ALIASES[rawType] ?? rawType;
  const type = ALLOWED_POST_TYPES.includes(canonicalType) ? canonicalType : 'info';
  const titre = asTrimmedString(rawPublication.titre, { maxLength: 180 });
  const resume = asTrimmedString(rawPublication.resume, { maxLength: 320 });

  if (!titre || !resume) {
    throw new Error('Publication invalide : titre et resume sont obligatoires.');
  }

  const publication = {
    id: asTrimmedString(rawPublication.id, { maxLength: 80 }) || fallbackId || createLocalId(),
    type,
    titre,
    resume,
    date: asTrimmedString(rawPublication.date, { maxLength: 120 }),
    lieu: asTrimmedString(rawPublication.lieu, { maxLength: 180 }),
    auteur: asTrimmedString(rawPublication.auteur, { maxLength: 120 }),
    edition: asTrimmedString(rawPublication.edition, { maxLength: 120 }),
    lien_externe: asTrimmedString(rawPublication.lien_externe, { maxLength: 2048 }),
    date_debut_iso: normalizeDateStamp(rawPublication.date_debut_iso),
    date_fin_iso: normalizeDateStamp(rawPublication.date_fin_iso),
    contenu_texte: asTrimmedString(rawPublication.contenu_texte, { maxLength: 12000 }),
    cantine_jours: [],
  };

  if (publication.type === 'cantine') {
    const rawDays = Array.isArray(rawPublication.cantine_jours)
      ? rawPublication.cantine_jours
      : Array.isArray(rawPublication.menu_jours)
        ? rawPublication.menu_jours
        : [];
    publication.cantine_jours = rawDays
      .map((day, index) => normalizeCantineDay(day, index))
      .filter(Boolean);

    if (publication.cantine_jours.length === 0) {
      throw new Error('Publication invalide : cantine_jours doit contenir au moins un jour exploitable.');
    }
  }

  if (publication.type === 'coup_de_coeur' && !publication.lien_externe) {
    publication.lien_externe = buildSearchUrl(publication.titre, publication.auteur);
  }

  if (publication.type !== 'cantine' && !publication.contenu_texte) {
    publication.contenu_texte = publication.resume;
  }

  if (publication.date_fin_iso && !publication.date_debut_iso) {
    publication.date_fin_iso = '';
  }

  return publication;
}

export function normalizePublicationList(publications) {
  if (!Array.isArray(publications)) {
    return [];
  }

  return publications.map((publication) => normalizePublication(publication)).filter(Boolean);
}

export function getGoogleCalendarUrl(post) {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const title = encodeURIComponent(post.titre || '');
  const details = encodeURIComponent(post.contenu_texte || post.resume || '');
  const location = encodeURIComponent(post.lieu || 'Annet-sur-Marne');
  const start = post.date_debut_iso || '';
  const end = post.date_fin_iso || start;
  const dates = start ? `&dates=${start}/${end}` : '';

  return `${baseUrl}&text=${title}&details=${details}&location=${location}${dates}`;
}

export const publicationPrompt = `
Tu es un assistant de la mairie d'Annet-sur-Marne. Analyse cette image avec une très grande précision.
1. Détermine son type: "cantine", "alerte", "evenement", "info", ou "coup_de_coeur".
2. Donne un "titre" court, un "resume" (1-2 phrases maximum), et la "date".
3. Extrais le lieu exact dans "lieu". Pour un événement, fournis "date_debut_iso" et "date_fin_iso" au format UTC YYYYMMDDTHHmmssZ.
4. Si c'est un "coup_de_coeur", extrais "auteur", "edition" et génère un "lien_externe" de recherche.
5. Si c'est une publication de cantine, remplis "cantine_jours" avec des jours, items, descriptions et badges.
6. "contenu_texte" doit retranscrire l'intégralité du texte présent sur l'image, sans résumé ni omission.
`.trim();
