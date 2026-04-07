import {
  isIsoAfter,
  isProductionReconcileBlocked,
  markProductionReconcileDeferred,
  markProductionReconcileDispatchAccepted,
  markProductionReconcileHashNoop,
  normalizeProductionReconcileState,
} from './content-reconcile-state.mjs';

function buildConcurrentPendingState(latestState, {
  clearBlocked = false,
  errorCode = null,
  now = new Date(),
  publicHash = null,
  sentPublicHash = null,
} = {}) {
  return markProductionReconcileDeferred(latestState, {
    blockedUntil: latestState.blocked_until,
    clearBlocked,
    errorCode,
    now,
    publicHash,
    sentPublicHash,
  });
}

export async function reconcileProduction({
  computePublicHash,
  loadState,
  now = new Date(),
  saveState,
  syncNotion,
  triggerDeploy,
}) {
  const initialState = normalizeProductionReconcileState(await loadState());

  if (!initialState.dirty) {
    return {
      outcome: 'noop',
      reason: 'clean',
      state: initialState,
    };
  }

  if (isProductionReconcileBlocked(initialState, now instanceof Date ? now.getTime() : now)) {
    return {
      outcome: 'noop',
      reason: 'blocked',
      state: initialState,
    };
  }

  let publicHash = null;

  try {
    await syncNotion();
    publicHash = await computePublicHash();

    const stateBeforeDecision = normalizeProductionReconcileState(await loadState());
    const hasConcurrentEventBeforeDecision = isIsoAfter(
      stateBeforeDecision.last_event_at,
      initialState.last_event_at,
    );

    if (publicHash === stateBeforeDecision.last_public_hash_sent) {
      const nextState = hasConcurrentEventBeforeDecision
        ? buildConcurrentPendingState(stateBeforeDecision, {
            now,
            publicHash,
          })
        : markProductionReconcileHashNoop(stateBeforeDecision, {
            now,
            publicHash,
          });

      await saveState(nextState);

      return {
        outcome: 'noop',
        publicHash,
        reason: hasConcurrentEventBeforeDecision ? 'newer_event_pending' : 'public_hash_unchanged',
        state: nextState,
      };
    }

    const deploy = await triggerDeploy();
    const stateAfterAttempt = normalizeProductionReconcileState(await loadState());
    const hasConcurrentEventAfterAttempt = isIsoAfter(
      stateAfterAttempt.last_event_at,
      initialState.last_event_at,
    );

    if (deploy?.rateLimited) {
      const nextState = markProductionReconcileDeferred(stateAfterAttempt, {
        blockedUntil: deploy.retryAt,
        errorCode: deploy.code || 'vercel_rate_limited',
        now,
        publicHash,
      });

      await saveState(nextState);

      return {
        deploy,
        outcome: 'deferred',
        publicHash,
        reason: 'vercel_rate_limited',
        state: nextState,
      };
    }

    if (!deploy?.ok) {
      const error = new Error('Le deploy hook Vercel n’a pas renvoyé un statut exploitable.');
      error.code = 'vercel_dispatch_failed';
      throw error;
    }

    const nextState = hasConcurrentEventAfterAttempt
      ? buildConcurrentPendingState(stateAfterAttempt, {
          clearBlocked: true,
          now,
          publicHash,
          sentPublicHash: publicHash,
        })
      : markProductionReconcileDispatchAccepted(stateAfterAttempt, {
          now,
          publicHash,
        });

    await saveState(nextState);

    return {
      deploy,
      outcome: hasConcurrentEventAfterAttempt ? 'partial' : 'dispatched',
      publicHash,
      reason: hasConcurrentEventAfterAttempt ? 'newer_event_pending' : 'deploy_dispatched',
      state: nextState,
    };
  } catch (error) {
    const stateAfterFailure = normalizeProductionReconcileState(await loadState());
    const nextState = markProductionReconcileDeferred(stateAfterFailure, {
      errorCode: error.code || 'reconcile_failed',
      now,
      publicHash,
    });

    await saveState(nextState);
    throw error;
  }
}
