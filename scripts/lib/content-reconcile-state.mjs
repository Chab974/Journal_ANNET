export const productionReconcileIssueTitle = 'Journal ANNET production reconcile state';
export const productionReconcileScope = 'production';
export const productionReconcileSchemaVersion = 1;

const stateMarkerStart = '<!-- journal-annet-production-reconcile-state:start -->';
const stateMarkerEnd = '<!-- journal-annet-production-reconcile-state:end -->';

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeHash(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function compareIsoTimestamp(left, right) {
  const leftValue = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightValue = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;

  if (leftValue > rightValue) {
    return 1;
  }

  if (leftValue < rightValue) {
    return -1;
  }

  return 0;
}

export function isIsoAfter(left, right) {
  return compareIsoTimestamp(left, right) > 0;
}

export function createDefaultProductionReconcileState() {
  return {
    blocked_until: null,
    dirty: false,
    last_attempt_at: null,
    last_entity_id: null,
    last_error_code: null,
    last_event_action: null,
    last_event_at: null,
    last_event_type: null,
    last_public_hash_computed: null,
    last_public_hash_sent: null,
    pending_since: null,
    schema_version: productionReconcileSchemaVersion,
    scope: productionReconcileScope,
  };
}

export function normalizeProductionReconcileState(value = {}) {
  const defaults = createDefaultProductionReconcileState();

  return {
    ...defaults,
    blocked_until: toIsoTimestamp(value.blocked_until),
    dirty: Boolean(value.dirty),
    last_attempt_at: toIsoTimestamp(value.last_attempt_at),
    last_entity_id: value.last_entity_id ? String(value.last_entity_id) : null,
    last_error_code: value.last_error_code ? String(value.last_error_code) : null,
    last_event_action: value.last_event_action ? String(value.last_event_action) : null,
    last_event_at: toIsoTimestamp(value.last_event_at),
    last_event_type: value.last_event_type ? String(value.last_event_type) : null,
    last_public_hash_computed: normalizeHash(value.last_public_hash_computed),
    last_public_hash_sent: normalizeHash(value.last_public_hash_sent),
    pending_since: toIsoTimestamp(value.pending_since),
    schema_version: productionReconcileSchemaVersion,
    scope: productionReconcileScope,
  };
}

export function parseProductionReconcileState(body) {
  const start = String(body ?? '').indexOf(stateMarkerStart);
  const end = String(body ?? '').indexOf(stateMarkerEnd);

  if (start === -1 || end === -1 || end <= start) {
    return createDefaultProductionReconcileState();
  }

  const segment = String(body ?? '').slice(start + stateMarkerStart.length, end);
  const jsonBlock = segment.match(/```json\s*([\s\S]*?)```/i);
  if (!jsonBlock) {
    throw new Error('État de réconciliation GitHub introuvable dans l’issue technique.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonBlock[1]);
  } catch (error) {
    throw new Error(`JSON de réconciliation GitHub invalide: ${error.message}`);
  }

  return normalizeProductionReconcileState(parsed);
}

export function serializeProductionReconcileState(state) {
  const normalized = normalizeProductionReconcileState(state);

  return [
    '# Journal ANNET production reconcile state',
    '',
    'Issue technique mise a jour automatiquement.',
    '',
    stateMarkerStart,
    '```json',
    JSON.stringify(normalized, null, 2),
    '```',
    stateMarkerEnd,
    '',
  ].join('\n');
}

export function isProductionReconcileBlocked(state, now = Date.now()) {
  const normalized = normalizeProductionReconcileState(state);
  return normalized.blocked_until ? Date.parse(normalized.blocked_until) > now : false;
}

export function mergeProductionReconcileEvent(state, event, now = new Date()) {
  const normalized = normalizeProductionReconcileState(state);
  const nowIso = toIsoTimestamp(now) || new Date().toISOString();
  const eventTimestamp = toIsoTimestamp(event?.event_timestamp) || nowIso;
  const next = {
    ...normalized,
    dirty: true,
    pending_since: normalized.pending_since || eventTimestamp,
  };

  if (!normalized.last_event_at || compareIsoTimestamp(eventTimestamp, normalized.last_event_at) >= 0) {
    next.last_entity_id = event?.entity_id ? String(event.entity_id) : normalized.last_entity_id;
    next.last_event_action = event?.event_action ? String(event.event_action) : normalized.last_event_action;
    next.last_event_at = eventTimestamp;
    next.last_event_type = event?.event_type ? String(event.event_type) : normalized.last_event_type;
    return next;
  }

  next.last_event_at = normalized.last_event_at;
  return next;
}

export function markProductionReconcileHashNoop(state, { now = new Date(), publicHash } = {}) {
  const normalized = normalizeProductionReconcileState(state);
  const nowIso = toIsoTimestamp(now) || new Date().toISOString();

  return {
    ...normalized,
    blocked_until: null,
    dirty: false,
    last_attempt_at: nowIso,
    last_error_code: null,
    last_public_hash_computed: normalizeHash(publicHash),
    pending_since: null,
  };
}

export function markProductionReconcileDispatchAccepted(state, { now = new Date(), publicHash } = {}) {
  const normalized = normalizeProductionReconcileState(state);
  const nowIso = toIsoTimestamp(now) || new Date().toISOString();
  const normalizedHash = normalizeHash(publicHash);

  return {
    ...normalized,
    blocked_until: null,
    dirty: false,
    last_attempt_at: nowIso,
    last_error_code: null,
    last_public_hash_computed: normalizedHash,
    last_public_hash_sent: normalizedHash,
    pending_since: null,
  };
}

export function markProductionReconcileDeferred(state, {
  blockedUntil = null,
  clearBlocked = false,
  errorCode = null,
  now = new Date(),
  publicHash = null,
  sentPublicHash = null,
} = {}) {
  const normalized = normalizeProductionReconcileState(state);
  const nowIso = toIsoTimestamp(now) || new Date().toISOString();

  return {
    ...normalized,
    blocked_until: clearBlocked ? null : toIsoTimestamp(blockedUntil) || normalized.blocked_until,
    dirty: true,
    last_attempt_at: nowIso,
    last_error_code: errorCode ? String(errorCode) : null,
    last_public_hash_computed: normalizeHash(publicHash) || normalized.last_public_hash_computed,
    last_public_hash_sent: normalizeHash(sentPublicHash) || normalized.last_public_hash_sent,
    pending_since: normalized.pending_since || nowIso,
  };
}
