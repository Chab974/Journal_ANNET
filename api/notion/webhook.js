import {
  getNotionEventActionLabel,
  isNotionVerificationPayload,
  isRelevantNotionEvent,
  isRelevantNotionEventWithResolver,
  toDispatchMetadata,
  verifyNotionSignature,
} from '../../scripts/lib/notion/webhook.mjs';
import {
  isProductionReconcileBlocked,
  mergeProductionReconcileEvent,
} from '../../scripts/lib/content-reconcile-state.mjs';
import {
  dispatchProductionReconcileWorkflow,
  loadProductionReconcileState,
  resolveProductionReconcileStateConfig,
  resolveProductionWorkflowDispatchConfig,
  saveProductionReconcileState,
} from '../../scripts/lib/content-reconcile-github.mjs';
import {
  dispatchGitHubWorkflow,
  resolveGitHubRepositoryConfig,
} from '../../scripts/lib/github-api.mjs';
import {
  getTrackedPageSource,
  readTrackedPageIndex,
} from '../../scripts/lib/notion/page-index.mjs';
import { readRawRequestBody } from '../../scripts/lib/request-body.mjs';
import { createNotionClient, retrievePage } from '../../scripts/lib/notion/client.mjs';
import { isImmediatePublicationPage } from '../../scripts/lib/notion/publication-status.mjs';

const allowedDataSourceIds = [
  process.env.NOTION_PUBLICATIONS_DATA_SOURCE_ID,
  process.env.NOTION_AGENDA_DATA_SOURCE_ID,
  process.env.NOTION_MENU_ITEMS_DATA_SOURCE_ID,
  process.env.NOTION_SITE_SECTIONS_DATA_SOURCE_ID,
  process.env.NOTION_SITE_SECTION_ITEMS_DATA_SOURCE_ID,
].filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retrievePageWithRetry(notion, pageId, {
  attemptCount = 3,
  delayMs = 350,
} = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    try {
      return await retrievePage(notion, pageId);
    } catch (error) {
      lastError = error;

      if (attempt === attemptCount) {
        break;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

async function triggerGitHubPagesDemo(metadata) {
  const {
    GITHUB_PAGES_AUTO_DEPLOY_ENABLED,
    GITHUB_WORKFLOW_FILE,
    GITHUB_WORKFLOW_REF = 'main',
  } = process.env;

  if (String(GITHUB_PAGES_AUTO_DEPLOY_ENABLED || '').toLowerCase() !== 'true') {
    return {
      configured: false,
      reason: 'auto_deploy_disabled',
      skipped: true,
    };
  }

  if (!GITHUB_WORKFLOW_FILE) {
    return {
      configured: false,
      skipped: true,
    };
  }

  const githubConfig = resolveGitHubRepositoryConfig();
  await dispatchGitHubWorkflow(githubConfig, {
    inputs: metadata,
    ref: GITHUB_WORKFLOW_REF,
    workflowFile: GITHUB_WORKFLOW_FILE,
  });

  return {
    configured: true,
    dispatched: true,
  };
}

async function recordProductionReconcileState(metadata) {
  const stateConfig = resolveProductionReconcileStateConfig();
  const { state } = await loadProductionReconcileState(stateConfig);
  const nextState = mergeProductionReconcileEvent(state, metadata);

  await saveProductionReconcileState(stateConfig, {
    state: nextState,
  });

  return {
    issueNumber: stateConfig.issueNumber,
    state: nextState,
  };
}

async function triggerProductionReconcile(metadata, state, { runMode = 'webhook' } = {}) {
  if (isProductionReconcileBlocked(state)) {
    return {
      blocked_until: state.blocked_until,
      dispatched: false,
      reason: 'blocked_until',
      skipped: true,
    };
  }

  const workflowConfig = resolveProductionWorkflowDispatchConfig();
  const workflow = await dispatchProductionReconcileWorkflow(workflowConfig, {
    inputs: {
      run_mode: runMode,
      ...metadata,
    },
  });

  return {
    ...workflow,
    configured: true,
  };
}

async function triggerProductionReconcileWithoutState(metadata, { runMode = 'webhook' } = {}) {
  const workflowConfig = resolveProductionWorkflowDispatchConfig();
  const workflow = await dispatchProductionReconcileWorkflow(workflowConfig, {
    inputs: {
      run_mode: runMode,
      ...metadata,
    },
  });

  return {
    ...workflow,
    configured: true,
    degraded: true,
    reason: 'state_unavailable',
  };
}

export default async function notionWebhook(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  let rawBody;
  let payload;

  try {
    rawBody = await readRawRequestBody(request);
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    sendJson(response, 400, { error: `JSON invalide: ${error.message}` });
    return;
  }

  if (isNotionVerificationPayload(payload)) {
    console.info('Notion webhook verification_token:', payload.verification_token);
    sendJson(response, 200, {
      ok: true,
      verification_token: payload.verification_token,
    });
    return;
  }

  if (
    !verifyNotionSignature({
      rawBody,
      signature: request.headers['x-notion-signature'],
      verificationToken: process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN,
    })
  ) {
    console.warn('Notion webhook invalid signature', {
      entity_id: payload?.entity?.id ?? null,
      event_type: payload?.type ?? null,
      request_id: request.headers['x-vercel-id'] ?? null,
    });
    sendJson(response, 401, { error: 'Signature Notion invalide.' });
    return;
  }

  const notion = createNotionClient();
  let resolvedPagePromise = null;
  let trackedPageIndexPromise = null;
  const resolveEventPage = async () => {
    if (!payload?.type?.startsWith('page.') || payload?.type === 'page.deleted') {
      return null;
    }

    if (!resolvedPagePromise) {
      resolvedPagePromise = retrievePageWithRetry(notion, payload?.entity?.id).catch((error) => {
        console.warn('Notion webhook page resolution failed', {
          entity_id: payload?.entity?.id ?? null,
          error: error.message,
          event_type: payload?.type ?? null,
        });
        return null;
      });
    }

    return resolvedPagePromise;
  };
  const resolveTrackedPageSource = async () => {
    if (!payload?.type?.startsWith('page.')) {
      return '';
    }

    if (!trackedPageIndexPromise) {
      trackedPageIndexPromise = readTrackedPageIndex();
    }

    return getTrackedPageSource(await trackedPageIndexPromise, payload?.entity?.id);
  };
  const trackedPageSource = await resolveTrackedPageSource();
  const allowUnresolvedCreatedPage = payload?.type === 'page.created';

  console.info('Notion webhook event received', {
    event_action: getNotionEventActionLabel(payload?.type),
    attempt_number: payload?.attempt_number ?? null,
    entity_id: payload?.entity?.id ?? null,
    event_type: payload?.type ?? null,
    tracked_page_source: trackedPageSource || null,
    unresolved_page_created_fallback: allowUnresolvedCreatedPage,
    parent_data_source_id: payload?.data?.parent?.data_source_id ?? null,
    parent_id: payload?.data?.parent?.id ?? null,
    parent_type: payload?.data?.parent?.type ?? null,
  });
  const isRelevantEvent =
    Boolean(trackedPageSource) ||
    isRelevantNotionEvent(payload, allowedDataSourceIds) ||
    (await isRelevantNotionEventWithResolver(
      payload,
      allowedDataSourceIds,
      async () => resolveEventPage(),
    )) ||
    allowUnresolvedCreatedPage;

  if (!isRelevantEvent) {
    console.info('Notion webhook ignored', {
      event_action: getNotionEventActionLabel(payload?.type),
      entity_id: payload?.entity?.id ?? null,
      event_type: payload?.type ?? null,
      tracked_page_source: trackedPageSource || null,
      reason: 'event_out_of_scope',
    });
    sendJson(response, 202, {
      ignored: true,
      ok: true,
      reason: 'Event Notion hors périmètre éditorial.',
    });
    return;
  }

  try {
    const metadata = toDispatchMetadata(payload);
    const eventPage = await resolveEventPage();
    const runMode = isImmediatePublicationPage(eventPage) ? 'immediate' : 'webhook';
    console.info('Notion webhook enqueueing production reconcile', metadata);
    let reconcile = null;
    let reconcileError = null;

    try {
      reconcile = await recordProductionReconcileState(metadata);
    } catch (error) {
      reconcileError = error;
      console.warn('Notion webhook production reconcile state persistence failed', {
        entity_id: payload?.entity?.id ?? null,
        error: error.message,
        event_action: metadata.event_action,
        event_type: payload?.type ?? null,
      });
    }

    const [productionResult, githubPagesDemoResult] = await Promise.allSettled([
      reconcile?.state
        ? triggerProductionReconcile(metadata, reconcile.state, { runMode })
        : triggerProductionReconcileWithoutState(metadata, { runMode }),
      triggerGitHubPagesDemo(metadata),
    ]);
    let githubPagesDemo = null;
    let production = null;

    if (productionResult.status === 'fulfilled') {
      production = productionResult.value;
    } else {
      console.warn('Notion webhook production reconcile dispatch failed', {
        entity_id: payload?.entity?.id ?? null,
        error: productionResult.reason?.message ?? String(productionResult.reason),
        event_action: metadata.event_action,
        event_type: payload?.type ?? null,
      });

      production = {
        configured: true,
        dispatched: false,
        error: productionResult.reason?.message ?? String(productionResult.reason),
        failed: true,
      };
    }

    if (githubPagesDemoResult.status === 'fulfilled') {
      githubPagesDemo = githubPagesDemoResult.value;
    } else {
      console.warn('Notion webhook GitHub Pages dispatch failed', {
        entity_id: payload?.entity?.id ?? null,
        error: githubPagesDemoResult.reason?.message ?? String(githubPagesDemoResult.reason),
        event_action: metadata.event_action,
        event_type: payload?.type ?? null,
      });

      githubPagesDemo = {
        configured: true,
        error: githubPagesDemoResult.reason?.message ?? String(githubPagesDemoResult.reason),
        failed: true,
      };
    }

    console.info('Notion webhook reconcile queued', {
      event_action: metadata.event_action,
      event_type: payload?.type ?? null,
      production_blocked_until: reconcile?.state?.blocked_until ?? null,
      production_dirty: reconcile?.state?.dirty ?? null,
      production_failed: Boolean(production?.failed),
      production_run_mode: runMode,
      production_workflow_dispatched: Boolean(production?.dispatched),
      production_state_persisted: Boolean(reconcile),
      github_pages_configured: Boolean(githubPagesDemo?.configured),
      github_pages_failed: Boolean(githubPagesDemo?.failed),
    });

    sendJson(response, 202, {
      deploy: {
        githubPagesDemo,
      },
      event: metadata,
      event_type: payload.type,
      ok: true,
      productionReconcile: {
        blocked_until: reconcile?.state?.blocked_until ?? null,
        dirty: reconcile?.state?.dirty ?? null,
        issue_number: reconcile?.issueNumber ?? null,
        last_event_at: reconcile?.state?.last_event_at ?? null,
        run_mode: runMode,
        state_error: reconcileError?.message ?? null,
        state_persisted: Boolean(reconcile),
        workflow: production,
      },
      queued: true,
    });
  } catch (error) {
    console.error('Notion webhook dispatch failed', {
      event_action: getNotionEventActionLabel(payload?.type),
      entity_id: payload?.entity?.id ?? null,
      error: error.message,
      event_type: payload?.type ?? null,
    });
    sendJson(response, 502, {
      error: error.message,
      ok: false,
    });
  }
}
