import {
  isNotionVerificationPayload,
  isRelevantNotionEvent,
  isRelevantNotionEventWithResolver,
  toDispatchMetadata,
  verifyNotionSignature,
} from '../../scripts/lib/notion/webhook.mjs';
import { readRawRequestBody } from '../../scripts/lib/request-body.mjs';
import { createNotionClient, retrievePage } from '../../scripts/lib/notion/client.mjs';

const allowedDataSourceIds = [
  process.env.NOTION_PUBLICATIONS_DATA_SOURCE_ID,
  process.env.NOTION_AGENDA_DATA_SOURCE_ID,
  process.env.NOTION_MENU_ITEMS_DATA_SOURCE_ID,
  process.env.NOTION_SITE_SECTIONS_DATA_SOURCE_ID,
].filter(Boolean);

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

async function triggerVercelDeploy() {
  const { VERCEL_DEPLOY_HOOK_URL } = process.env;

  if (!VERCEL_DEPLOY_HOOK_URL) {
    throw new Error('Variable VERCEL_DEPLOY_HOOK_URL manquante pour relancer le déploiement Vercel.');
  }

  const response = await fetch(VERCEL_DEPLOY_HOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'journal-annet-webhook',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec du deploy hook Vercel (${response.status}): ${details}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return {
    ok: true,
    status: response.status,
  };
}

async function triggerGitHubPagesDemo(metadata) {
  const {
    GITHUB_REPOSITORY_NAME,
    GITHUB_REPOSITORY_OWNER,
    GITHUB_WEBHOOK_TOKEN,
    GITHUB_WORKFLOW_FILE,
    GITHUB_WORKFLOW_REF = 'main',
  } = process.env;

  const isConfigured =
    GITHUB_REPOSITORY_NAME &&
    GITHUB_REPOSITORY_OWNER &&
    GITHUB_WEBHOOK_TOKEN &&
    GITHUB_WORKFLOW_FILE;

  if (!isConfigured) {
    return {
      configured: false,
      skipped: true,
    };
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY_OWNER}/${GITHUB_REPOSITORY_NAME}/actions/workflows/${GITHUB_WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_WEBHOOK_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'journal-annet-webhook',
      },
      body: JSON.stringify({
        inputs: metadata,
        ref: GITHUB_WORKFLOW_REF,
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec du workflow GitHub Pages démo (${response.status}): ${details}`);
  }

  return {
    configured: true,
    dispatched: true,
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

  console.info('Notion webhook event received', {
    attempt_number: payload?.attempt_number ?? null,
    entity_id: payload?.entity?.id ?? null,
    event_type: payload?.type ?? null,
    parent_data_source_id: payload?.data?.parent?.data_source_id ?? null,
    parent_id: payload?.data?.parent?.id ?? null,
    parent_type: payload?.data?.parent?.type ?? null,
  });

  const notion = createNotionClient();
  const isRelevantEvent =
    isRelevantNotionEvent(payload, allowedDataSourceIds) ||
    (await isRelevantNotionEventWithResolver(
      payload,
      allowedDataSourceIds,
      async (pageId) => retrievePage(notion, pageId),
    ));

  if (!isRelevantEvent) {
    console.info('Notion webhook ignored', {
      entity_id: payload?.entity?.id ?? null,
      event_type: payload?.type ?? null,
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
    console.info('Notion webhook dispatching deploy', metadata);
    const [vercel, githubPagesDemo] = await Promise.all([
      triggerVercelDeploy(),
      triggerGitHubPagesDemo(metadata),
    ]);

    console.info('Notion webhook deploy dispatched', {
      event_type: payload?.type ?? null,
      github_pages_configured: Boolean(githubPagesDemo?.configured),
      vercel_ok: Boolean(vercel),
    });

    sendJson(response, 202, {
      deploy: {
        githubPagesDemo,
        vercel,
      },
      dispatched: true,
      event: metadata,
      event_type: payload.type,
      ok: true,
    });
  } catch (error) {
    console.error('Notion webhook dispatch failed', {
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
