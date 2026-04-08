import { readFile } from 'node:fs/promises';
import path from 'node:path';

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

export async function retrieveDataSource(notion, dataSourceId) {
  return retrieveDataSourceViaHttp({
    auth: notion.__journalAnnetAuth,
    dataSourceId,
  });
}

export async function retrievePage(notion, pageId) {
  return retrievePageViaHttp({
    auth: notion.__journalAnnetAuth,
    pageId,
  });
}

export async function createPageInDataSource(
  notion,
  {
    children = [],
    cover,
    dataSourceId,
    icon,
    properties = {},
  },
) {
  return createPageInDataSourceViaHttp({
    auth: notion.__journalAnnetAuth,
    children,
    cover,
    dataSourceId,
    icon,
    properties,
  });
}

export async function uploadFileToNotion(
  notion,
  {
    contentType,
    filePath,
    filename = path.basename(filePath),
  },
) {
  if (!filePath) {
    throw new Error('filePath manquant pour uploader un fichier dans Notion.');
  }

  if (!filename) {
    throw new Error('filename manquant pour uploader un fichier dans Notion.');
  }

  if (!contentType) {
    throw new Error('contentType manquant pour uploader un fichier dans Notion.');
  }

  const fileData = await readFile(filePath);
  const upload = await notion.fileUploads.create({
    content_type: contentType,
    filename,
    mode: 'single_part',
  });

  const uploaded = await notion.fileUploads.send({
    file: {
      data: new Blob([fileData], { type: contentType }),
      filename,
    },
    file_upload_id: upload.id,
  });

  const completed = (upload.number_of_parts?.total ?? 1) > 1
    ? await notion.fileUploads.complete({
        file_upload_id: upload.id,
      })
    : uploaded;

  return {
    completed,
    sent: uploaded,
    upload,
  };
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

async function retrieveDataSourceViaHttp({ auth, dataSourceId }) {
  if (!auth) {
    throw new Error('NOTION_TOKEN manquant pour récupérer une data source Notion.');
  }

  if (!dataSourceId) {
    throw new Error('dataSourceId manquant pour récupérer une data source Notion.');
  }

  const response = await fetch(`${notionApiBaseUrl}/data_sources/${encodeURIComponent(dataSourceId)}`, {
    headers: {
      Authorization: `Bearer ${auth}`,
      'Notion-Version': notionDataSourcesVersion,
    },
    method: 'GET',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Échec de récupération Notion data source ${dataSourceId} (${response.status}): ${details}`,
    );
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

async function createPageInDataSourceViaHttp({
  auth,
  children = [],
  cover,
  dataSourceId,
  icon,
  properties = {},
}) {
  if (!auth) {
    throw new Error('NOTION_TOKEN manquant pour créer une page Notion.');
  }

  if (!dataSourceId) {
    throw new Error('dataSourceId manquant pour créer une page Notion.');
  }

  const response = await fetch(`${notionApiBaseUrl}/pages`, {
    body: JSON.stringify({
      children,
      cover,
      icon,
      parent: {
        data_source_id: dataSourceId,
        type: 'data_source_id',
      },
      properties,
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
    throw new Error(
      `Échec de création de page Notion dans ${dataSourceId} (${response.status}): ${details}`,
    );
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
