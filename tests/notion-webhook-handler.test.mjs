import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';

import { parseProductionReconcileState, serializeProductionReconcileState } from '../scripts/lib/content-reconcile-state.mjs';
import { computeNotionSignature } from '../scripts/lib/notion/webhook.mjs';

function jsonResponse(body, status = 200) {
  return {
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : '';
      },
    },
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

function emptyResponse(status = 204) {
  return {
    headers: {
      get() {
        return '';
      },
    },
    ok: status >= 200 && status < 300,
    status,
    text: async () => '',
  };
}

function createRequest(rawBody, verificationToken) {
  const request = Readable.from([rawBody]);
  request.method = 'POST';
  request.headers = {
    'x-notion-signature': computeNotionSignature(rawBody, verificationToken),
  };

  return request;
}

function createResponse() {
  return {
    body: '',
    headers: {},
    statusCode: 200,
    end(chunk) {
      this.body = chunk ?? '';
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  };
}

async function withEnv(overrides, run) {
  const previousEntries = new Map(
    Object.keys(overrides).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previousEntries.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function importWebhookHandler(label) {
  const moduleUrl = new URL('../api/notion/webhook.js', import.meta.url);
  moduleUrl.searchParams.set('test', label);
  return (await import(moduleUrl.href)).default;
}

test('notionWebhook enregistre l’état durable et déclenche le workflow de réconciliation prod', async () => {
  const issueNumber = 17;
  let patchedIssueBody = '';
  const calls = [];

  await withEnv(
    {
      CONTENT_RECONCILE_STATE_ISSUE_NUMBER: String(issueNumber),
      GITHUB_PAGES_AUTO_DEPLOY_ENABLED: 'false',
      GITHUB_PRODUCTION_WORKFLOW_FILE: 'reconcile-prod-deploy.yml',
      GITHUB_REPOSITORY_NAME: 'Journal_ANNET',
      GITHUB_REPOSITORY_OWNER: 'Chab974',
      GITHUB_WEBHOOK_TOKEN: 'gh_secret',
      NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'ds-publications',
      NOTION_TOKEN: 'secret_notion',
      NOTION_WEBHOOK_VERIFICATION_TOKEN: 'secret_verify',
    },
    async () => {
      const notionWebhook = await importWebhookHandler(`reconcile-${Date.now()}`);
      const originalFetch = global.fetch;

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: '',
            number: issueNumber,
          });
        }

        if (url.endsWith(`/issues/${issueNumber}`) && options.method === 'PATCH') {
          patchedIssueBody = JSON.parse(options.body).body;
          return jsonResponse({
            body: patchedIssueBody,
            number: issueNumber,
          });
        }

        if (url.endsWith('/actions/workflows/reconcile-prod-deploy.yml/dispatches') && options.method === 'POST') {
          return emptyResponse(204);
        }

        throw new Error(`Appel fetch inattendu: ${options.method || 'GET'} ${url}`);
      };

      try {
        const rawBody = JSON.stringify({
          data: {
            parent: {
              data_source_id: 'ds-publications',
              type: 'workspace',
            },
          },
          entity: { id: 'page-1', type: 'page' },
          id: 'event-1',
          timestamp: '2026-04-08T08:00:00.000Z',
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 3);

        const persistedState = parseProductionReconcileState(patchedIssueBody);
        assert.equal(persistedState.dirty, true);
        assert.equal(persistedState.last_event_at, '2026-04-08T08:00:00.000Z');
        assert.equal(persistedState.last_entity_id, 'page-1');

        const payload = JSON.parse(response.body);
        assert.equal(payload.ok, true);
        assert.equal(payload.productionReconcile.issue_number, issueNumber);
        assert.equal(payload.productionReconcile.workflow.dispatched, true);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook saute le dispatch prod immédiat si Vercel reste bloqué', async () => {
  const issueNumber = 21;
  const blockedStateBody = serializeProductionReconcileState({
    blocked_until: '2026-04-09T08:00:00.000Z',
    dirty: true,
    last_event_at: '2026-04-08T08:00:00.000Z',
    pending_since: '2026-04-08T08:00:00.000Z',
  });
  const calls = [];

  await withEnv(
    {
      CONTENT_RECONCILE_STATE_ISSUE_NUMBER: String(issueNumber),
      GITHUB_PAGES_AUTO_DEPLOY_ENABLED: 'false',
      GITHUB_PRODUCTION_WORKFLOW_FILE: 'reconcile-prod-deploy.yml',
      GITHUB_REPOSITORY_NAME: 'Journal_ANNET',
      GITHUB_REPOSITORY_OWNER: 'Chab974',
      GITHUB_WEBHOOK_TOKEN: 'gh_secret',
      NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'ds-publications',
      NOTION_TOKEN: 'secret_notion',
      NOTION_WEBHOOK_VERIFICATION_TOKEN: 'secret_verify',
    },
    async () => {
      const notionWebhook = await importWebhookHandler(`blocked-${Date.now()}`);
      const originalFetch = global.fetch;

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: blockedStateBody,
            number: issueNumber,
          });
        }

        if (url.endsWith(`/issues/${issueNumber}`) && options.method === 'PATCH') {
          return jsonResponse({
            body: JSON.parse(options.body).body,
            number: issueNumber,
          });
        }

        throw new Error(`Appel fetch inattendu: ${options.method || 'GET'} ${url}`);
      };

      try {
        const rawBody = JSON.stringify({
          data: {
            parent: {
              data_source_id: 'ds-publications',
              type: 'workspace',
            },
          },
          entity: { id: 'page-2', type: 'page' },
          id: 'event-2',
          timestamp: '2026-04-08T08:30:00.000Z',
          type: 'page.deleted',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 2);

        const payload = JSON.parse(response.body);
        assert.equal(payload.productionReconcile.workflow.dispatched, false);
        assert.equal(payload.productionReconcile.workflow.reason, 'blocked_until');
        assert.equal(payload.productionReconcile.workflow.skipped, true);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});
