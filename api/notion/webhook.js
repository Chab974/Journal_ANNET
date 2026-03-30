import {
  isNotionVerificationPayload,
  isRelevantNotionEvent,
  toWorkflowInputs,
  verifyNotionSignature,
} from '../../scripts/lib/notion/webhook.mjs';

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

async function dispatchGitHubWorkflow(inputs) {
  const {
    GITHUB_REPOSITORY_NAME,
    GITHUB_REPOSITORY_OWNER,
    GITHUB_WEBHOOK_TOKEN,
    GITHUB_WORKFLOW_FILE,
    GITHUB_WORKFLOW_REF = 'main',
  } = process.env;

  if (!GITHUB_REPOSITORY_NAME || !GITHUB_REPOSITORY_OWNER || !GITHUB_WEBHOOK_TOKEN || !GITHUB_WORKFLOW_FILE) {
    throw new Error('Variables GitHub manquantes pour le dispatch du workflow.');
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
        inputs,
        ref: GITHUB_WORKFLOW_REF,
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec du workflow GitHub (${response.status}): ${details}`);
  }
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

  if (!isRelevantNotionEvent(payload, allowedDataSourceIds)) {
    sendJson(response, 202, {
      ignored: true,
      ok: true,
      reason: 'Event Notion hors périmètre éditorial.',
    });
    return;
  }

  try {
    await dispatchGitHubWorkflow(toWorkflowInputs(payload));
    sendJson(response, 202, {
      dispatched: true,
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
