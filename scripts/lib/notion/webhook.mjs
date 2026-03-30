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
  'page.created',
  'page.properties_updated',
  'page.content_updated',
  'data_source.content_updated',
  'data_source.schema_updated',
]);

export function isRelevantNotionEvent(event, allowedDataSourceIds = []) {
  if (!event?.type || !relevantEventTypes.has(event.type)) {
    return false;
  }

  const allowedIds = new Set(allowedDataSourceIds.filter(Boolean));
  if (allowedIds.size === 0) {
    return true;
  }

  const entityId = event.entity?.id;
  const parentId = event.data?.parent?.id;

  return allowedIds.has(entityId) || allowedIds.has(parentId);
}

export function toDispatchMetadata(event) {
  return {
    entity_id: String(event?.entity?.id ?? ''),
    event_id: String(event?.id ?? ''),
    event_timestamp: String(event?.timestamp ?? ''),
    event_type: String(event?.type ?? ''),
  };
}
