import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultProductionReconcileState,
  mergeProductionReconcileEvent,
  parseProductionReconcileState,
  serializeProductionReconcileState,
} from '../scripts/lib/content-reconcile-state.mjs';

test('serializeProductionReconcileState et parseProductionReconcileState font un round-trip stable', () => {
  const state = {
    ...createDefaultProductionReconcileState(),
    dirty: true,
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_public_hash_sent: 'hash-1',
    pending_since: '2026-04-08T08:00:00.000Z',
  };

  const body = serializeProductionReconcileState(state);
  const parsed = parseProductionReconcileState(body);

  assert.deepEqual(parsed, state);
});

test('mergeProductionReconcileEvent conserve le dernier événement connu', () => {
  const current = {
    ...createDefaultProductionReconcileState(),
    dirty: true,
    last_entity_id: 'page-1',
    last_event_action: 'modification',
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_event_type: 'page.properties_updated',
    pending_since: '2026-04-08T08:00:00.000Z',
  };

  const merged = mergeProductionReconcileEvent(current, {
    entity_id: 'page-9',
    event_action: 'suppression',
    event_timestamp: '2026-04-08T08:05:00.000Z',
    event_type: 'page.deleted',
  });

  assert.equal(merged.dirty, true);
  assert.equal(merged.pending_since, '2026-04-08T08:00:00.000Z');
  assert.equal(merged.last_entity_id, 'page-9');
  assert.equal(merged.last_event_action, 'suppression');
  assert.equal(merged.last_event_at, '2026-04-08T08:05:00.000Z');
  assert.equal(merged.last_event_type, 'page.deleted');
});
