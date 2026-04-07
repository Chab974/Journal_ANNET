import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultProductionReconcileState } from '../scripts/lib/content-reconcile-state.mjs';
import { reconcileProduction } from '../scripts/lib/production-reconcile.mjs';

function createStore(initialState) {
  let state = structuredClone(initialState);

  return {
    getState() {
      return structuredClone(state);
    },
    async loadState() {
      return structuredClone(state);
    },
    async saveState(nextState) {
      state = structuredClone(nextState);
    },
    setState(nextState) {
      state = structuredClone(nextState);
    },
  };
}

test('reconcileProduction ignore un état propre', async () => {
  const store = createStore(createDefaultProductionReconcileState());
  let syncCalls = 0;

  const result = await reconcileProduction({
    computePublicHash: async () => 'hash-1',
    loadState: () => store.loadState(),
    saveState: (state) => store.saveState(state),
    syncNotion: async () => {
      syncCalls += 1;
    },
    triggerDeploy: async () => ({ ok: true, status: 201 }),
  });

  assert.equal(result.reason, 'clean');
  assert.equal(syncCalls, 0);
});

test('reconcileProduction nettoie l’état sans deploy si le hash public est inchangé', async () => {
  const store = createStore({
    ...createDefaultProductionReconcileState(),
    dirty: true,
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_public_hash_sent: 'hash-1',
    pending_since: '2026-04-08T08:00:00.000Z',
  });
  let deployCalls = 0;

  const result = await reconcileProduction({
    computePublicHash: async () => 'hash-1',
    loadState: () => store.loadState(),
    now: new Date('2026-04-08T08:15:00.000Z'),
    saveState: (state) => store.saveState(state),
    syncNotion: async () => {},
    triggerDeploy: async () => {
      deployCalls += 1;
      return { ok: true, status: 201 };
    },
  });

  assert.equal(result.reason, 'public_hash_unchanged');
  assert.equal(deployCalls, 0);

  const finalState = store.getState();
  assert.equal(finalState.dirty, false);
  assert.equal(finalState.pending_since, null);
  assert.equal(finalState.last_public_hash_computed, 'hash-1');
});

test('reconcileProduction conserve dirty=true quand Vercel bloque le deploy', async () => {
  const store = createStore({
    ...createDefaultProductionReconcileState(),
    dirty: true,
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_public_hash_sent: 'hash-old',
    pending_since: '2026-04-08T08:00:00.000Z',
  });

  const result = await reconcileProduction({
    computePublicHash: async () => 'hash-new',
    loadState: () => store.loadState(),
    now: new Date('2026-04-08T08:15:00.000Z'),
    saveState: (state) => store.saveState(state),
    syncNotion: async () => {},
    triggerDeploy: async () => ({
      code: 'api-deployments-free-per-day',
      rateLimited: true,
      retryAt: '2026-04-09T08:15:00.000Z',
    }),
  });

  assert.equal(result.reason, 'vercel_rate_limited');

  const finalState = store.getState();
  assert.equal(finalState.dirty, true);
  assert.equal(finalState.blocked_until, '2026-04-09T08:15:00.000Z');
  assert.equal(finalState.last_public_hash_computed, 'hash-new');
  assert.equal(finalState.last_error_code, 'api-deployments-free-per-day');
});

test('reconcileProduction garde un nouvel événement en attente après un deploy accepté', async () => {
  const store = createStore({
    ...createDefaultProductionReconcileState(),
    dirty: true,
    last_entity_id: 'page-1',
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_public_hash_sent: 'hash-old',
    pending_since: '2026-04-08T08:00:00.000Z',
  });

  const result = await reconcileProduction({
    computePublicHash: async () => 'hash-new',
    loadState: () => store.loadState(),
    now: new Date('2026-04-08T08:15:00.000Z'),
    saveState: (state) => store.saveState(state),
    syncNotion: async () => {
      store.setState({
        ...store.getState(),
        dirty: true,
        last_entity_id: 'page-2',
        last_event_at: '2026-04-08T08:05:00.000Z',
      });
    },
    triggerDeploy: async () => ({
      ok: true,
      status: 201,
    }),
  });

  assert.equal(result.reason, 'newer_event_pending');

  const finalState = store.getState();
  assert.equal(finalState.dirty, true);
  assert.equal(finalState.last_public_hash_sent, 'hash-new');
  assert.equal(finalState.last_entity_id, 'page-2');
  assert.equal(finalState.pending_since, '2026-04-08T08:00:00.000Z');
});
