import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { Readable } from 'node:stream';

import { parseProductionReconcileState, serializeProductionReconcileState } from '../scripts/lib/content-reconcile-state.mjs';
import { trackedPageIndexUrl } from '../scripts/lib/notion/page-index.mjs';
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

function offsetTimestamp(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function freshTimestamp() {
  return offsetTimestamp(-60 * 1000);
}

function staleTimestamp() {
  return offsetTimestamp(-(16 * 60 * 1000));
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

async function withTrackedPageIndex(index, run) {
  const previous = await readFile(trackedPageIndexUrl, 'utf8');
  await writeFile(trackedPageIndexUrl, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  try {
    return await run();
  } finally {
    await writeFile(trackedPageIndexUrl, previous, 'utf8');
  }
}

test('notionWebhook enregistre l’état durable et déclenche le workflow de réconciliation prod', { concurrency: false }, async () => {
  const issueNumber = 17;
  let patchedIssueBody = '';
  const calls = [];
  let dispatchBody = null;

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
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: '',
            number: issueNumber,
          });
        }

        if (url.endsWith('/pages/page-1') && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            id: 'page-1',
            parent: {
              data_source_id: 'ds-publications',
              type: 'data_source_id',
            },
            properties: {
              Statut: {
                status: {
                  name: 'Publication immédiate',
                },
                type: 'status',
              },
            },
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
          dispatchBody = JSON.parse(options.body);
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
          timestamp: eventTimestamp,
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 4);

        const persistedState = parseProductionReconcileState(patchedIssueBody);
        assert.equal(persistedState.dirty, true);
        assert.equal(persistedState.last_event_at, eventTimestamp);
        assert.equal(persistedState.last_entity_id, 'page-1');
        assert.equal(dispatchBody.inputs.run_mode, 'immediate');

        const payload = JSON.parse(response.body);
        assert.equal(payload.ok, true);
        assert.equal(payload.productionReconcile.issue_number, issueNumber);
        assert.equal(payload.productionReconcile.run_mode, 'immediate');
        assert.equal(payload.productionReconcile.workflow.dispatched, true);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook saute le dispatch prod immédiat si Vercel reste bloqué', { concurrency: false }, async () => {
  const issueNumber = 21;
  const blockedStateBody = serializeProductionReconcileState({
    blocked_until: '2099-04-09T08:00:00.000Z',
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
      const eventTimestamp = freshTimestamp();

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
          timestamp: eventTimestamp,
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

test('notionWebhook ignore un event_id déjà traité sans redispatcher la prod', { concurrency: false }, async () => {
  const issueNumber = 22;
  const existingStateBody = serializeProductionReconcileState({
    blocked_until: null,
    dirty: false,
    last_event_action: 'modification',
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_event_id: 'event-duplicate',
    last_event_type: 'page.properties_updated',
    pending_since: null,
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
      const notionWebhook = await importWebhookHandler(`duplicate-${Date.now()}`);
      const originalFetch = global.fetch;
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: existingStateBody,
            number: issueNumber,
          });
        }

        if (url.endsWith('/pages/page-duplicate') && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            id: 'page-duplicate',
            parent: {
              data_source_id: 'ds-publications',
              type: 'data_source_id',
            },
            properties: {
              Statut: {
                status: {
                  name: 'Publication immédiate',
                },
                type: 'status',
              },
            },
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
          entity: { id: 'page-duplicate', type: 'page' },
          id: 'event-duplicate',
          timestamp: eventTimestamp,
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 2);

        const payload = JSON.parse(response.body);
        assert.equal(payload.ignored, true);
        assert.equal(payload.queued, false);
        assert.equal(payload.productionReconcile.duplicate_event_id, true);
        assert.equal(payload.productionReconcile.run_mode, 'immediate');
        assert.equal(payload.productionReconcile.workflow.dispatched, false);
        assert.equal(payload.productionReconcile.workflow.reason, 'duplicate_event_id');
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook traite un page.deleted via l’index local quand Notion ne porte plus la data source', { concurrency: false }, async () => {
  const issueNumber = 23;
  let patchedIssueBody = '';
  const calls = [];
  let dispatchBody = null;

  await withTrackedPageIndex(
    {
      generated_at: '2026-04-08T17:50:00.000Z',
      page_sources: {
        'page-deleted': 'publications',
      },
      schema_version: 1,
    },
    async () => {
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
          const notionWebhook = await importWebhookHandler(`deleted-fallback-${Date.now()}`);
          const originalFetch = global.fetch;
          const eventTimestamp = freshTimestamp();

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
              dispatchBody = JSON.parse(options.body);
              return emptyResponse(204);
            }

            throw new Error(`Appel fetch inattendu: ${options.method || 'GET'} ${url}`);
          };

          try {
            const rawBody = JSON.stringify({
              data: {
                parent: {
                  id: 'workspace-1',
                  type: 'workspace',
                },
              },
              entity: { id: 'page-deleted', type: 'page' },
              id: 'event-deleted-fallback',
              timestamp: eventTimestamp,
              type: 'page.deleted',
            });

            const response = createResponse();
            await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

            assert.equal(response.statusCode, 202);
            assert.equal(calls.length, 3);

            const persistedState = parseProductionReconcileState(patchedIssueBody);
            assert.equal(persistedState.dirty, true);
            assert.equal(persistedState.last_event_type, 'page.deleted');
            assert.equal(dispatchBody.inputs.run_mode, 'webhook');

            const payload = JSON.parse(response.body);
            assert.equal(payload.ok, true);
            assert.equal(payload.productionReconcile.issue_number, issueNumber);
            assert.equal(payload.productionReconcile.workflow.dispatched, true);
          } finally {
            global.fetch = originalFetch;
          }
        },
      );
    },
  );
});

test('notionWebhook traite une page existante via l’index local quand la lecture Notion échoue', { concurrency: false }, async () => {
  const issueNumber = 24;
  let patchedIssueBody = '';
  let pageReadAttempts = 0;
  const calls = [];
  let dispatchBody = null;

  await withTrackedPageIndex(
    {
      generated_at: '2026-04-08T18:05:00.000Z',
      page_sources: {
        'page-existing': 'publications',
      },
      schema_version: 1,
    },
    async () => {
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
          const notionWebhook = await importWebhookHandler(`tracked-page-fallback-${Date.now()}`);
          const originalFetch = global.fetch;
          const eventTimestamp = freshTimestamp();

          global.fetch = async (url, options = {}) => {
            calls.push({ method: options.method || 'GET', url });

            if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
              return jsonResponse({
                body: '',
                number: issueNumber,
              });
            }

            if (url.endsWith('/pages/page-existing') && (options.method || 'GET') === 'GET') {
              pageReadAttempts += 1;
              return {
                headers: { get: () => 'application/json; charset=utf-8' },
                json: async () => ({ code: 'object_not_found' }),
                ok: false,
                status: 404,
                text: async () => JSON.stringify({ code: 'object_not_found' }),
              };
            }

            if (url.endsWith(`/issues/${issueNumber}`) && options.method === 'PATCH') {
              patchedIssueBody = JSON.parse(options.body).body;
              return jsonResponse({
                body: patchedIssueBody,
                number: issueNumber,
              });
            }

            if (url.endsWith('/actions/workflows/reconcile-prod-deploy.yml/dispatches') && options.method === 'POST') {
              dispatchBody = JSON.parse(options.body);
              return emptyResponse(204);
            }

            throw new Error(`Appel fetch inattendu: ${options.method || 'GET'} ${url}`);
          };

          try {
            const rawBody = JSON.stringify({
              data: {
                parent: {
                  id: 'workspace-1',
                  type: 'workspace',
                },
              },
              entity: { id: 'page-existing', type: 'page' },
              id: 'event-existing-fallback',
              timestamp: eventTimestamp,
              type: 'page.properties_updated',
            });

            const response = createResponse();
            await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

            assert.equal(response.statusCode, 202);
            assert.equal(pageReadAttempts, 3);

            const persistedState = parseProductionReconcileState(patchedIssueBody);
            assert.equal(persistedState.dirty, true);
            assert.equal(persistedState.last_event_type, 'page.properties_updated');
            assert.equal(dispatchBody.inputs.run_mode, 'webhook');

            const payload = JSON.parse(response.body);
            assert.equal(payload.ok, true);
            assert.equal(payload.productionReconcile.issue_number, issueNumber);
            assert.equal(payload.productionReconcile.workflow.dispatched, true);
          } finally {
            global.fetch = originalFetch;
          }
        },
      );
    },
  );
});

test('notionWebhook réessaie la lecture d’une page créée avant de la classer hors périmètre', { concurrency: false }, async () => {
  const issueNumber = 25;
  let patchedIssueBody = '';
  let pageReadAttempts = 0;
  const calls = [];
  let dispatchBody = null;

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
      const notionWebhook = await importWebhookHandler(`page-created-retry-${Date.now()}`);
      const originalFetch = global.fetch;
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: '',
            number: issueNumber,
          });
        }

        if (url.endsWith('/pages/page-created') && (options.method || 'GET') === 'GET') {
          pageReadAttempts += 1;

          if (pageReadAttempts < 3) {
            return {
              headers: { get: () => 'application/json; charset=utf-8' },
              json: async () => ({ code: 'object_not_found' }),
              ok: false,
              status: 404,
              text: async () => JSON.stringify({ code: 'object_not_found' }),
            };
          }

          return jsonResponse({
            id: 'page-created',
            parent: {
              data_source_id: 'ds-publications',
              type: 'data_source_id',
            },
            properties: {
              Statut: {
                status: {
                  name: 'Publié',
                },
                type: 'status',
              },
            },
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
          dispatchBody = JSON.parse(options.body);
          return emptyResponse(204);
        }

        throw new Error(`Appel fetch inattendu: ${options.method || 'GET'} ${url}`);
      };

      try {
        const rawBody = JSON.stringify({
          data: {
            parent: {
              id: 'workspace-1',
              type: 'workspace',
            },
          },
          entity: { id: 'page-created', type: 'page' },
          id: 'event-created-retry',
          timestamp: eventTimestamp,
          type: 'page.created',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(pageReadAttempts, 3);

        const persistedState = parseProductionReconcileState(patchedIssueBody);
        assert.equal(persistedState.dirty, true);
        assert.equal(persistedState.last_event_type, 'page.created');
        assert.equal(dispatchBody.inputs.run_mode, 'webhook');

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

test('notionWebhook ignore un page.created irrésolvable après retry', { concurrency: false }, async () => {
  let pageReadAttempts = 0;
  const calls = [];

  await withEnv(
    {
      CONTENT_RECONCILE_STATE_ISSUE_NUMBER: '26',
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
      const notionWebhook = await importWebhookHandler(`page-created-fail-closed-${Date.now()}`);
      const originalFetch = global.fetch;
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith('/pages/page-created-unresolved') && (options.method || 'GET') === 'GET') {
          pageReadAttempts += 1;
          return {
            headers: { get: () => 'application/json; charset=utf-8' },
            json: async () => ({ code: 'object_not_found' }),
            ok: false,
            status: 404,
            text: async () => JSON.stringify({ code: 'object_not_found' }),
          };
        }

        throw new Error(`Appel fetch inattendu: ${options.method || 'GET'} ${url}`);
      };

      try {
        const rawBody = JSON.stringify({
          data: {
            parent: {
              id: 'workspace-1',
              type: 'workspace',
            },
          },
          entity: { id: 'page-created-unresolved', type: 'page' },
          id: 'event-created-fail-open',
          timestamp: eventTimestamp,
          type: 'page.created',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(pageReadAttempts, 3);
        assert.equal(calls.length, 3);

        const payload = JSON.parse(response.body);
        assert.equal(payload.ok, true);
        assert.equal(payload.ignored, true);
        assert.equal(payload.reason, 'page_parent_unresolved');
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook ignore un event_id déjà vu dans recent_event_ids sans redispatcher la prod', { concurrency: false }, async () => {
  const issueNumber = 27;
  const existingStateBody = serializeProductionReconcileState({
    blocked_until: null,
    dirty: false,
    last_event_action: 'modification',
    last_event_at: '2026-04-08T08:00:00.000Z',
    last_event_id: 'event-current',
    last_event_type: 'page.properties_updated',
    pending_since: null,
    recent_event_ids: [
      {
        id: 'event-replayed',
        seen_at: new Date().toISOString(),
      },
    ],
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
      const notionWebhook = await importWebhookHandler(`duplicate-recent-${Date.now()}`);
      const originalFetch = global.fetch;
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: existingStateBody,
            number: issueNumber,
          });
        }

        if (url.endsWith('/pages/page-replayed') && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            id: 'page-replayed',
            parent: {
              data_source_id: 'ds-publications',
              type: 'data_source_id',
            },
            properties: {},
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
          entity: { id: 'page-replayed', type: 'page' },
          id: 'event-replayed',
          timestamp: eventTimestamp,
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 2);

        const payload = JSON.parse(response.body);
        assert.equal(payload.ignored, true);
        assert.equal(payload.queued, false);
        assert.equal(payload.productionReconcile.duplicate_event_id, true);
        assert.equal(payload.productionReconcile.workflow.dispatched, false);
        assert.equal(payload.productionReconcile.workflow.reason, 'duplicate_event_id');
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook ignore un événement signé mais périmé', { concurrency: false }, async () => {
  await withEnv(
    {
      NOTION_WEBHOOK_VERIFICATION_TOKEN: 'secret_verify',
    },
    async () => {
      const notionWebhook = await importWebhookHandler(`stale-event-${Date.now()}`);
      const originalFetch = global.fetch;
      const calls = [];

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });
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
          entity: { id: 'page-stale', type: 'page' },
          id: 'event-stale',
          timestamp: staleTimestamp(),
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 0);

        const payload = JSON.parse(response.body);
        assert.equal(payload.ignored, true);
        assert.equal(payload.reason, 'replay_or_stale_event');
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook répond 400 sur un payload structurellement invalide', { concurrency: false }, async () => {
  const notionWebhook = await importWebhookHandler(`invalid-payload-${Date.now()}`);
  const rawBody = JSON.stringify({
    entity: { id: '', type: 'page' },
    id: 'event-invalid',
    timestamp: freshTimestamp(),
    type: 'page.properties_updated',
  });
  const response = createResponse();

  await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'Payload Notion invalide.',
  });
});

test('notionWebhook répond 413 quand le payload dépasse la limite autorisée', { concurrency: false }, async () => {
  const notionWebhook = await importWebhookHandler(`oversized-payload-${Date.now()}`);
  const rawBody = JSON.stringify({
    data: {
      padding: 'x'.repeat(70 * 1024),
    },
    entity: { id: 'page-big', type: 'page' },
    id: 'event-big',
    timestamp: freshTimestamp(),
    type: 'page.properties_updated',
  });
  const response = createResponse();

  await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

  assert.equal(response.statusCode, 413);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'Payload trop volumineux.',
  });
});

test('notionWebhook ne journalise pas le verification_token du challenge Notion', { concurrency: false }, async () => {
  const notionWebhook = await importWebhookHandler(`verification-challenge-${Date.now()}`);
  const logs = [];
  const originalInfo = console.info;

  console.info = (...args) => {
    logs.push(args);
  };

  try {
    const rawBody = JSON.stringify({
      verification_token: 'secret_verification_token_from_notion',
    });
    const response = createResponse();

    await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

    assert.equal(response.statusCode, 200);
    assert.equal(logs.length, 0);
    assert.deepEqual(JSON.parse(response.body), {
      ok: true,
      verification_token: 'secret_verification_token_from_notion',
    });
  } finally {
    console.info = originalInfo;
  }
});

test('notionWebhook utilise les variables de dépôt fournies par Vercel quand les variables GitHub explicites sont absentes', { concurrency: false }, async () => {
  const issueNumber = 31;
  const calls = [];
  let dispatchUrl = null;

  await withEnv(
    {
      CONTENT_RECONCILE_STATE_ISSUE_NUMBER: String(issueNumber),
      GITHUB_PAGES_AUTO_DEPLOY_ENABLED: 'false',
      GITHUB_PRODUCTION_WORKFLOW_FILE: 'reconcile-prod-deploy.yml',
      GITHUB_REPOSITORY_NAME: undefined,
      GITHUB_REPOSITORY_OWNER: undefined,
      GITHUB_WEBHOOK_TOKEN: 'gh_secret',
      NOTION_PUBLICATIONS_DATA_SOURCE_ID: 'ds-publications',
      NOTION_TOKEN: 'secret_notion',
      NOTION_WEBHOOK_VERIFICATION_TOKEN: 'secret_verify',
      VERCEL_GIT_REPO_OWNER: 'Chab974',
      VERCEL_GIT_REPO_SLUG: 'Journal_ANNET',
    },
    async () => {
      const notionWebhook = await importWebhookHandler(`vercel-fallback-${Date.now()}`);
      const originalFetch = global.fetch;
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith(`/issues/${issueNumber}`) && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            body: '',
            number: issueNumber,
          });
        }

        if (url.endsWith('/pages/page-3') && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            id: 'page-3',
            parent: {
              data_source_id: 'ds-publications',
              type: 'data_source_id',
            },
            properties: {},
          });
        }

        if (url.endsWith(`/issues/${issueNumber}`) && options.method === 'PATCH') {
          return jsonResponse({
            body: JSON.parse(options.body).body,
            number: issueNumber,
          });
        }

        if (url.endsWith('/actions/workflows/reconcile-prod-deploy.yml/dispatches') && options.method === 'POST') {
          dispatchUrl = url;
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
          entity: { id: 'page-3', type: 'page' },
          id: 'event-3',
          timestamp: eventTimestamp,
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(
          dispatchUrl,
          'https://api.github.com/repos/Chab974/Journal_ANNET/actions/workflows/reconcile-prod-deploy.yml/dispatches',
        );
        assert.equal(calls.length, 4);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});

test('notionWebhook répond 202 même si l’état durable GitHub ne peut pas être enregistré', { concurrency: false }, async () => {
  const calls = [];
  let dispatchBody = null;

  await withEnv(
    {
      CONTENT_RECONCILE_STATE_ISSUE_NUMBER: undefined,
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
      const notionWebhook = await importWebhookHandler(`degraded-state-${Date.now()}`);
      const originalFetch = global.fetch;
      const eventTimestamp = freshTimestamp();

      global.fetch = async (url, options = {}) => {
        calls.push({ method: options.method || 'GET', url });

        if (url.endsWith('/pages/page-4') && (options.method || 'GET') === 'GET') {
          return jsonResponse({
            id: 'page-4',
            parent: {
              data_source_id: 'ds-publications',
              type: 'data_source_id',
            },
            properties: {},
          });
        }

        if (url.endsWith('/actions/workflows/reconcile-prod-deploy.yml/dispatches') && options.method === 'POST') {
          dispatchBody = JSON.parse(options.body);
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
          entity: { id: 'page-4', type: 'page' },
          id: 'event-4',
          timestamp: eventTimestamp,
          type: 'page.properties_updated',
        });

        const response = createResponse();
        await notionWebhook(createRequest(rawBody, 'secret_verify'), response);

        assert.equal(response.statusCode, 202);
        assert.equal(calls.length, 2);
        assert.equal(dispatchBody.inputs.run_mode, 'webhook');

        const payload = JSON.parse(response.body);
        assert.equal(payload.ok, true);
        assert.equal(payload.productionReconcile.state_persisted, false);
        assert.match(payload.productionReconcile.state_error, /CONTENT_RECONCILE_STATE_ISSUE_NUMBER invalide/);
        assert.equal(payload.productionReconcile.workflow.dispatched, true);
        assert.equal(payload.productionReconcile.workflow.degraded, true);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});
