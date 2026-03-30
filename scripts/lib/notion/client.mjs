import { Client } from '@notionhq/client';

export function createNotionClient(auth = process.env.NOTION_TOKEN) {
  if (!auth) {
    throw new Error('NOTION_TOKEN manquant.');
  }

  return new Client({ auth });
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
    notion.request({
      body: {
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      },
      method: 'post',
      path: `data_sources/${dataSourceId}/query`,
    }),
  );
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
