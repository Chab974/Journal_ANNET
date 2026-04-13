const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asTrimmedString(value, { maxLength = 2048 } = {}) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function containsUnsafeCharacters(value) {
  return CONTROL_CHARACTER_PATTERN.test(value);
}

export function normalizeExternalUrl(value, { maxLength = 2048 } = {}) {
  const normalized = asTrimmedString(value, { maxLength });
  if (!normalized || containsUnsafeCharacters(normalized)) {
    return '';
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    return parsed.toString();
  } catch {
    return '';
  }
}

export function normalizePublicHref(
  value,
  {
    allowHash = true,
    allowQuery = true,
    allowRelative = true,
    allowRootRelative = true,
    maxLength = 2048,
  } = {},
) {
  const normalized = asTrimmedString(value, { maxLength });
  if (!normalized || containsUnsafeCharacters(normalized)) {
    return '';
  }

  if (allowHash && normalized.startsWith('#')) {
    return normalized;
  }

  if (allowQuery && normalized.startsWith('?')) {
    return normalized;
  }

  if (URL_SCHEME_PATTERN.test(normalized)) {
    return normalizeExternalUrl(normalized, { maxLength });
  }

  if (normalized.startsWith('//')) {
    return '';
  }

  if (allowRootRelative && normalized.startsWith('/')) {
    return normalized;
  }

  if (allowRelative) {
    return normalized;
  }

  return '';
}

export function normalizeEmailAddress(value, { maxLength = 320 } = {}) {
  const normalized = asTrimmedString(value, { maxLength }).replace(/\s+/g, '');
  if (!normalized || containsUnsafeCharacters(normalized) || !EMAIL_PATTERN.test(normalized)) {
    return '';
  }

  return normalized;
}

export function normalizePhoneNumber(value, { maxLength = 64 } = {}) {
  const normalized = asTrimmedString(value, { maxLength });
  if (!normalized || containsUnsafeCharacters(normalized)) {
    return '';
  }

  const compact = normalized.replace(/[\s().-]+/g, '');
  const hasLeadingPlus = compact.startsWith('+');
  const digits = compact.replace(/\D+/g, '');

  if (digits.length < 3) {
    return '';
  }

  return hasLeadingPlus ? `+${digits}` : digits;
}

export function buildMailtoHref(value) {
  const normalized = normalizeEmailAddress(value);
  return normalized ? `mailto:${normalized}` : '';
}

export function buildTelHref(value) {
  const normalized = normalizePhoneNumber(value);
  return normalized ? `tel:${normalized}` : '';
}
