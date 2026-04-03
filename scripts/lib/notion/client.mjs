import { Client } from '@notionhq/client';

const notionApiBaseUrl = 'https://api.notion.com/v1';
const notionDataSourcesVersion = '2025-09-03';

export function createNotionClient(auth = process.env.NOTION_TOKEN) {
  if (!auth) {
    throw new Error('NOTION_TOKEN manquant.');
  }

  const client = new Client({ auth });
  client.__journalAnnetAuth = auth;
  return client;
}

async function paginate(fetchPage) {
  const results = [];
  let cursor;

  do {
    const response = await fetchPage(cursor);
    results.push(...(response.results ?? []));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

export async function queryDataSourcePages(notion, dataSourceId, filterProperties = []) {
  if (typeof notion.dataSources?.query === 'function') {
    return paginate((startCursor) =>
      notion.dataSources.query({
        data_source_id: dataSourceId,
        filter_properties: filterProperties,
        page_size: 100,
        start_cursor: startCursor,
      }),
    );
  }

  return paginate((startCursor) =>
    queryDataSourcePagesViaHttp({
      auth: notion.__journalAnnetAuth,
      dataSourceId,
      filterProperties,
      startCursor,
    }),
  );
}

export async function retrievePage(notion, pageId) {
  return retrievePageViaHttp({
    auth: notion.__journalAnnetAuth,
    pageId,
  });
}

async function queryDataSourcePagesViaHttp({
  auth,
  dataSourceId,
  filterProperties = [],
  startCursor,
}) {
  if (!auth) {
    throw new Error('NOTION_TOKEN manquant pour interroger les data sources.');
  }

  const query = new URLSearchParams();
  for (const property of filterProperties) {
    if (property) {
      query.append('filter_properties[]', property);
    }
  }

  const url = `${notionApiBaseUrl}/data_sources/${encodeURIComponent(dataSourceId)}/query${
    query.size > 0 ? `?${query.toString()}` : ''
  }`;
  const response = await fetch(url, {
    body: JSON.stringify({
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    }),
    headers: {
      Authorization: `Bearer ${auth}`,
      'Content-Type': 'application/json',
      'Notion-Version': notionDataSourcesVersion,
    },
    method: 'POST',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec de requête Notion data source ${dataSourceId} (${response.status}): ${details}`);
  }

  return response.json();
}

async function retrievePageViaHttp({ auth, pageId }) {
  if (!auth) {
    throw new Error('NOTION_TOKEN manquant pour récupérer une page Notion.');
  }

  if (!pageId) {
    throw new Error('pageId manquant pour récupérer une page Notion.');
  }

  const response = await fetch(`${notionApiBaseUrl}/pages/${encodeURIComponent(pageId)}`, {
    headers: {
      Authorization: `Bearer ${auth}`,
      'Notion-Version': notionDataSourcesVersion,
    },
    method: 'GET',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec de récupération Notion page ${pageId} (${response.status}): ${details}`);
  }

  return response.json();
}

export async function listBlockTree(notion, blockId) {
  const children = await paginate((startCursor) =>
    notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: startCursor,
    }),
  );

  const hydratedChildren = [];
  for (const block of children) {
    if (block.has_children) {
      hydratedChildren.push({
        ...block,
        children: await listBlockTree(notion, block.id),
      });
    } else {
      hydratedChildren.push(block);
    }
  }

  return hydratedChildren;
}
