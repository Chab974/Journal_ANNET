import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  isProductionReconcileBlocked,
  normalizeProductionReconcileState,
} from './lib/content-reconcile-state.mjs';
import {
  loadProductionReconcileState,
  resolveProductionReconcileStateConfig,
  saveProductionReconcileState,
} from './lib/content-reconcile-github.mjs';
import { computePublicSnapshotHash } from './lib/public-snapshot-hash.mjs';
import { reconcileProduction } from './lib/production-reconcile.mjs';
import { fromRepo } from './lib/utils.mjs';
import { triggerVercelDeployHook } from './lib/vercel-deploy-hook.mjs';

const execFileAsync = promisify(execFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDebounceMinutes(env = process.env) {
  const parsed = Number.parseInt(String(env.CONTENT_RECONCILE_DEBOUNCE_MINUTES ?? '15'), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 15;
}

async function runSyncNotion() {
  await execFileAsync(process.execPath, [fromRepo('scripts', 'sync-notion.mjs')], {
    cwd: fromRepo(),
    env: process.env,
  });
}

const stateConfig = resolveProductionReconcileStateConfig();
const loadState = async () => (await loadProductionReconcileState(stateConfig)).state;

const initialState = normalizeProductionReconcileState(await loadState());
if (!initialState.dirty) {
  console.log('Réconciliation prod: aucun contenu en attente.');
  process.exit(0);
}

if (isProductionReconcileBlocked(initialState)) {
  console.log(`Réconciliation prod: Vercel bloqué jusqu’à ${initialState.blocked_until}.`);
  process.exit(0);
}

if (String(process.env.RECONCILE_TRIGGER_SOURCE || '') === 'webhook') {
  const debounceMinutes = resolveDebounceMinutes();
  if (debounceMinutes > 0) {
    console.log(`Réconciliation prod: attente de ${debounceMinutes} minute(s) avant tentative.`);
    await sleep(debounceMinutes * 60 * 1000);
  }
}

const result = await reconcileProduction({
  computePublicHash: () => computePublicSnapshotHash(),
  loadState,
  saveState: (state) => saveProductionReconcileState(stateConfig, { state }),
  syncNotion: runSyncNotion,
  triggerDeploy: () =>
    triggerVercelDeployHook({
      deployHookUrl: process.env.VERCEL_DEPLOY_HOOK_URL,
    }),
});

console.log(`Réconciliation prod: ${result.reason}.`);
