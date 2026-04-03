import assert from 'node:assert/strict';
import test from 'node:test';

import { createNotionClient, queryDataSourcePages, retrievePage } from '../scripts/lib/notion/client.mjs';

test('queryDataSourcePages utilise le fallback HTTP data_sources avec pagination', async () => {
  const notion = createNotionClient('secret_test');
  const calls = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, options) => {
    calls.push({
      body: options?.body,
      headers: options?.headers,
      method: options?.method,
      url,
    });

    if (calls.length === 1) {
      return {
        ok: true,
        json: async () => ({
          has_more: true,
          next_cursor: 'cursor_2',
          results: [{ id: 'page-1' }],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        has_more: false,
        next_cursor: null,
        results: [{ id: 'page-2' }],
      }),
    };
  };

  try {
    const results = await queryDataSourcePages(notion, '33793acd-35b7-80e5-9956-000bdc7c8573', ['title']);

    assert.deepEqual(results, [{ id: 'page-1' }, { id: 'page-2' }]);
    assert.equal(calls.length, 2);
    assert.equal(
      calls[0].url,
      'https://api.notion.com/v1/data_sources/33793acd-35b7-80e5-9956-000bdc7c8573/query?filter_properties%5B%5D=title',
    );
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].headers.Authorization, 'Bearer secret_test');
    assert.equal(calls[0].headers['Notion-Version'], '2025-09-03');
    assert.equal(calls[0].body, JSON.stringify({ page_size: 100 }));
    assert.equal(calls[1].body, JSON.stringify({ page_size: 100, start_cursor: 'cursor_2' }));
  } finally {
    global.fetch = originalFetch;
  }
});

test('retrievePage utilise l’API HTTP pages avec la version data source', async () => {
  const notion = createNotionClient('secret_test');
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({
      headers: options?.headers,
      method: options?.method,
      url,
    });

    return {
      ok: true,
      json: async () => ({
        id: 'page-1',
        parent: {
          data_source_id: 'ds-publications',
          type: 'data_source_id',
        },
      }),
    };
  };

  try {
    const page = await retrievePage(notion, 'page-1');

    assert.equal(page.id, 'page-1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.notion.com/v1/pages/page-1');
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[0].headers.Authorization, 'Bearer secret_test');
    assert.equal(calls[0].headers['Notion-Version'], '2025-09-03');
  } finally {
    global.fetch = originalFetch;
  }
});
