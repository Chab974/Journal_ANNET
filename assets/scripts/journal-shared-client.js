(() => {
  const DEFAULT_CALENDAR_LOCATION = 'Annet-sur-Marne';
  const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
  const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function escapeHtml(value = '') {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeEditorialText(text = '') {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function splitEditorialSegments(text) {
    return normalizeEditorialText(text)
      .split(/\n{2,}|\n+|\s[–—-]\s|\s•\s/g)
      .map((segment) => segment.replace(/^[•\-–—\s]+/, '').trim())
      .filter(Boolean);
  }

  function truncateEditorialText(text, { maxLength = 240, minBoundary = 120 } = {}) {
    const normalized = normalizeEditorialText(text);
    if (!normalized || normalized.length <= maxLength) {
      return normalized;
    }

    const slice = normalized.slice(0, maxLength);
    const boundary = slice.lastIndexOf(' ');
    return `${slice.slice(0, boundary > minBoundary ? boundary : maxLength).trim()}…`;
  }

  function isAdministrativeSegment(segment = '') {
    return /^(date de (début|fin)|début|fin|horaire|heure|lieu|adresse)\s*:/i.test(segment);
  }

  function buildReadableExcerpt(text, title = '', {
    maxLength = 240,
    maxSegments = 3,
    minBoundary = 120,
    separator = ' • ',
  } = {}) {
    const normalized = normalizeEditorialText(text);
    if (!normalized) {
      return '';
    }

    const lowerTitle = normalizeEditorialText(title).toLowerCase();
    const segments = splitEditorialSegments(normalized)
      .filter((segment) => segment.toLowerCase() !== lowerTitle);

    if (segments.length >= 2) {
      const preferredSegments = [
        ...segments.filter((segment) => !isAdministrativeSegment(segment)),
        ...segments.filter((segment) => isAdministrativeSegment(segment)),
      ];
      const selected = [];

      for (const segment of preferredSegments) {
        if (selected.includes(segment)) {
          continue;
        }

        const candidate = [...selected, segment].join(separator);
        if (candidate.length > maxLength && selected.length > 0) {
          break;
        }

        selected.push(segment);
        if (selected.length === maxSegments) {
          break;
        }
      }

      if (selected.length > 0) {
        return selected.join(separator);
      }
    }

    return truncateEditorialText(normalized, { maxLength, minBoundary });
  }

  function normalizeSearchTerm(value = '') {
    return String(value ?? '').trim().toLowerCase();
  }

  function sanitizeUrlValue(value = '', { maxLength = 2048 } = {}) {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  function normalizeExternalUrl(value = '') {
    const normalized = sanitizeUrlValue(value);
    if (!normalized || CONTROL_CHARACTER_PATTERN.test(normalized)) {
      return '';
    }

    try {
      const parsed = new URL(normalized);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
    } catch {
      return '';
    }
  }

  function normalizePublicHref(value = '') {
    const normalized = sanitizeUrlValue(value);
    if (!normalized || CONTROL_CHARACTER_PATTERN.test(normalized)) {
      return '';
    }

    if (normalized.startsWith('#') || normalized.startsWith('?')) {
      return normalized;
    }

    if (URL_SCHEME_PATTERN.test(normalized)) {
      return normalizeExternalUrl(normalized);
    }

    if (normalized.startsWith('//')) {
      return '';
    }

    return normalized;
  }

  function buildMailtoHref(value = '') {
    const normalized = sanitizeUrlValue(value, { maxLength: 320 }).replace(/\s+/g, '');
    return EMAIL_PATTERN.test(normalized) ? `mailto:${normalized}` : '';
  }

  function buildTelHref(value = '') {
    const normalized = sanitizeUrlValue(value, { maxLength: 64 });
    if (!normalized || CONTROL_CHARACTER_PATTERN.test(normalized)) {
      return '';
    }

    const compact = normalized.replace(/[\s().-]+/g, '');
    const hasLeadingPlus = compact.startsWith('+');
    const digits = compact.replace(/\D+/g, '');
    if (digits.length < 3) {
      return '';
    }

    return hasLeadingPlus ? `tel:+${digits}` : `tel:${digits}`;
  }

  async function loadJson(url, { fallback = null } = {}) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (fallback !== null) {
        return fallback;
      }

      throw new Error(`Chargement impossible (${response.status}).`);
    }

    return response.json();
  }

  function buildSearchText(parts = []) {
    return parts
      .flat(Infinity)
      .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
      .join(' ')
      .toLowerCase();
  }

  function matchesSearchText(parts, searchTerm) {
    const normalizedTerm = normalizeSearchTerm(searchTerm);
    if (!normalizedTerm) {
      return true;
    }

    return buildSearchText(parts).includes(normalizedTerm);
  }

  function renderFilterButtons({
    container,
    options = [],
    activeValue = '',
    className = '',
    onSelect,
  } = {}) {
    if (!container) {
      return;
    }

    container.replaceChildren();
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = option.label || option.value || '';
      button.setAttribute('aria-pressed', String(option.value === activeValue));
      button.addEventListener('click', () => {
        onSelect?.(option.value, option);
      });
      container.appendChild(button);
    });
  }

  function buildGoogleCalendarUrl({
    title = '',
    details = '',
    location = DEFAULT_CALENDAR_LOCATION,
    start = '',
    end = '',
  } = {}) {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const dates = start ? `&dates=${start}/${end || start}` : '';

    return `${baseUrl}&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}${dates}`;
  }

  window.JournalAnnetShared = Object.freeze({
    buildMailtoHref,
    buildTelHref,
    buildGoogleCalendarUrl,
    buildReadableExcerpt,
    escapeHtml,
    loadJson,
    matchesSearchText,
    normalizeExternalUrl,
    normalizeEditorialText,
    normalizePublicHref,
    normalizeSearchTerm,
    renderFilterButtons,
    splitEditorialSegments,
  });
})();
