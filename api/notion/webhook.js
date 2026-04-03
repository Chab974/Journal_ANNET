import {
  isNotionVerificationPayload,
  isRelevantNotionEvent,
  isRelevantNotionEventWithResolver,
  toDispatchMetadata,
  verifyNotionSignature,
} from '../../scripts/lib/notion/webhook.mjs';
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

async function readRawBody(request) {
  if (typeof request.body === 'string') {
    return request.body;
  }

  if (Buffer.isBuffer(request.body)) {
    return request.body.toString('utf8');
  }

  if (request.body && typeof request.body === 'object') {
    return JSON.stringify(request.body);
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
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
    rawBody = await readRawBody(request);
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
    sendJson(response, 401, { error: 'Signature Notion invalide.' });
    return;
  }

  const notion = createNotionClient();
  const isRelevantEvent =
    isRelevantNotionEvent(payload, allowedDataSourceIds) ||
    (await isRelevantNotionEventWithResolver(
      payload,
      allowedDataSourceIds,
      async (pageId) => retrievePage(notion, pageId),
    ));

  if (!isRelevantEvent) {
    sendJson(response, 202, {
      ignored: true,
      ok: true,
      reason: 'Event Notion hors périmètre éditorial.',
    });
    return;
  }

  try {
    const metadata = toDispatchMetadata(payload);
    const [vercel, githubPagesDemo] = await Promise.all([
      triggerVercelDeploy(),
      triggerGitHubPagesDemo(metadata),
    ]);

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
    sendJson(response, 502, {
      error: error.message,
      ok: false,
    });
  }
}
