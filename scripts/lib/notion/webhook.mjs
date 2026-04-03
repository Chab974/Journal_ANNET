import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeNotionSignature(rawBody, verificationToken) {
  return `sha256=${createHmac('sha256', verificationToken).update(rawBody).digest('hex')}`;
}

export function verifyNotionSignature({ rawBody, signature, verificationToken }) {
  if (!rawBody || !signature || !verificationToken) {
    return false;
  }

  const expected = Buffer.from(computeNotionSignature(rawBody, verificationToken));
  const received = Buffer.from(signature);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

export function isNotionVerificationPayload(payload) {
  return typeof payload?.verification_token === 'string' && payload.verification_token.length > 0;
}

const relevantEventTypes = new Set([
  'database.content_updated',
  'database.schema_updated',
  'page.created',
  'page.properties_updated',
  'page.content_updated',
  'data_source.content_updated',
  'data_source.schema_updated',
]);

function collectEventCandidateIds(event) {
  return [
    event?.entity?.id,
    event?.data?.parent?.id,
    event?.data?.parent?.data_source_id,
    event?.data?.parent?.database_id,
  ].filter(Boolean);
}

export function extractPageParentIds(page) {
  const parent = page?.parent ?? {};

  return [
    parent.id,
    parent.data_source_id,
    parent.database_id,
    parent.type === 'data_source_id' ? parent.data_source_id : null,
    parent.type === 'database_id' ? parent.database_id : null,
  ].filter(Boolean);
}

export function isRelevantNotionEvent(event, allowedDataSourceIds = []) {
  if (!event?.type || !relevantEventTypes.has(event.type)) {
    return false;
  }

  const allowedIds = new Set(allowedDataSourceIds.filter(Boolean));
  if (allowedIds.size === 0) {
    return true;
  }

  return collectEventCandidateIds(event).some((id) => allowedIds.has(id));
}

export async function isRelevantNotionEventWithResolver(
  event,
  allowedDataSourceIds = [],
  resolvePage = async () => null,
) {
  if (isRelevantNotionEvent(event, allowedDataSourceIds)) {
    return true;
  }

  if (!event?.type?.startsWith('page.')) {
    return false;
  }

  const allowedIds = new Set(allowedDataSourceIds.filter(Boolean));
  if (allowedIds.size === 0) {
    return true;
  }

  const pageId = event.entity?.id;
  if (!pageId) {
    return false;
  }

  const page = await resolvePage(pageId);
  return extractPageParentIds(page).some((id) => allowedIds.has(id));
}

export function toDispatchMetadata(event) {
  return {
    entity_id: String(event?.entity?.id ?? ''),
    event_id: String(event?.id ?? ''),
    event_timestamp: String(event?.timestamp ?? ''),
    event_type: String(event?.type ?? ''),
  };
}
