import {
  escapeHtml,
  notionRichTextToHtml,
  notionRichTextToPlainText,
} from './property-helpers.mjs';

function blockPayload(block) {
  return block?.[block?.type] ?? {};
}

function joinChildrenHtml(parentHtml, childrenHtml) {
  if (!childrenHtml) {
    return parentHtml;
  }

  return `${parentHtml}\n${childrenHtml}`;
}

async function renderImageBlock(block, options) {
  const image = blockPayload(block);
  const caption = notionRichTextToPlainText(image.caption);
  const alt = caption || `Illustration de ${options.pageTitle || 'la publication'}`;

  try {
    const source =
      image.type === 'external'
        ? image.external?.url
        : await options.mediaResolver?.({
            file: {
              name: block.id,
              type: 'file',
              file: {
                url: image.file?.url,
              },
            },
            pageId: options.pageId,
          });

    if (!source) {
      return { html: '', plainText: '', warnings: ['Bloc image ignoré faute de source exploitable.'], imageSources: [] };
    }

    const figure = [
      '<figure class="notion-figure">',
      `  <img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`,
      caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : '',
      '</figure>',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      html: figure,
      imageSources: [
        {
          alt,
          caption,
          src: source,
        },
      ],
      plainText: caption,
      warnings: [],
    };
  } catch (error) {
    return {
      html: '',
      imageSources: [],
      plainText: '',
      warnings: [`Bloc image ignoré: ${error.message}`],
    };
  }
}

async function renderSingleBlock(block, options) {
  const payload = blockPayload(block);
  const childrenResult = block.has_children
    ? await renderBlocksToHtml(block.children ?? [], options)
    : { html: '', imageSources: [], plainText: '', warnings: [] };

  switch (block.type) {
    case 'paragraph': {
      const html = `<p>${notionRichTextToHtml(payload.rich_text)}</p>`;
      return {
        html: joinChildrenHtml(html, childrenResult.html),
        imageSources: childrenResult.imageSources,
        plainText: [notionRichTextToPlainText(payload.rich_text), childrenResult.plainText].filter(Boolean).join('\n'),
        warnings: childrenResult.warnings,
      };
    }
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      const level = block.type.slice(-1);
      const html = `<h${level}>${notionRichTextToHtml(payload.rich_text)}</h${level}>`;
      return {
        html: joinChildrenHtml(html, childrenResult.html),
        imageSources: childrenResult.imageSources,
        plainText: [notionRichTextToPlainText(payload.rich_text), childrenResult.plainText].filter(Boolean).join('\n'),
        warnings: childrenResult.warnings,
      };
    }
    case 'quote': {
      const html = `<blockquote>${notionRichTextToHtml(payload.rich_text)}</blockquote>`;
      return {
        html: joinChildrenHtml(html, childrenResult.html),
        imageSources: childrenResult.imageSources,
        plainText: [notionRichTextToPlainText(payload.rich_text), childrenResult.plainText].filter(Boolean).join('\n'),
        warnings: childrenResult.warnings,
      };
    }
    case 'callout': {
      const emoji = payload.icon?.emoji ? `${escapeHtml(payload.icon.emoji)} ` : '';
      const html = `<aside class="notion-callout"><p>${emoji}${notionRichTextToHtml(payload.rich_text)}</p></aside>`;
      return {
        html: joinChildrenHtml(html, childrenResult.html),
        imageSources: childrenResult.imageSources,
        plainText: [notionRichTextToPlainText(payload.rich_text), childrenResult.plainText].filter(Boolean).join('\n'),
        warnings: childrenResult.warnings,
      };
    }
    case 'divider':
      return {
        html: '<hr>',
        imageSources: [],
        plainText: '',
        warnings: [],
      };
    case 'image':
      return renderImageBlock(block, options);
    default:
      return {
        html: childrenResult.html,
        imageSources: childrenResult.imageSources,
        plainText: childrenResult.plainText,
        warnings: [`Bloc Notion non supporté ignoré: ${block.type}`],
      };
  }
}

function collectListItems(blocks, startIndex, type) {
  const items = [];
  let cursor = startIndex;

  while (cursor < blocks.length && blocks[cursor]?.type === type) {
    items.push(blocks[cursor]);
    cursor += 1;
  }

  return {
    endIndex: cursor - 1,
    items,
  };
}

async function renderList(items, type, options) {
  const tag = type === 'bulleted_list_item' ? 'ul' : 'ol';
  const htmlParts = [];
  const plainTextParts = [];
  const warnings = [];
  const imageSources = [];

  for (const item of items) {
    const payload = blockPayload(item);
    const childrenResult = item.has_children
      ? await renderBlocksToHtml(item.children ?? [], options)
      : { html: '', imageSources: [], plainText: '', warnings: [] };
    const body = notionRichTextToHtml(payload.rich_text);
    htmlParts.push(`<li>${body}${childrenResult.html ? `\n${childrenResult.html}` : ''}</li>`);
    plainTextParts.push(notionRichTextToPlainText(payload.rich_text));
    if (childrenResult.plainText) {
      plainTextParts.push(childrenResult.plainText);
    }
    warnings.push(...childrenResult.warnings);
    imageSources.push(...childrenResult.imageSources);
  }

  return {
    html: `<${tag}>\n${htmlParts.join('\n')}\n</${tag}>`,
    imageSources,
    plainText: plainTextParts.filter(Boolean).join('\n'),
    warnings,
  };
}

export async function renderBlocksToHtml(blocks, options = {}) {
  const htmlParts = [];
  const plainTextParts = [];
  const warnings = [];
  const imageSources = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (!block?.type) {
      continue;
    }

    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const { endIndex, items } = collectListItems(blocks, index, block.type);
      const renderedList = await renderList(items, block.type, options);
      htmlParts.push(renderedList.html);
      if (renderedList.plainText) {
        plainTextParts.push(renderedList.plainText);
      }
      warnings.push(...renderedList.warnings);
      imageSources.push(...renderedList.imageSources);
      index = endIndex;
      continue;
    }

    const renderedBlock = await renderSingleBlock(block, options);
    if (renderedBlock.html) {
      htmlParts.push(renderedBlock.html);
    }
    if (renderedBlock.plainText) {
      plainTextParts.push(renderedBlock.plainText);
    }
    warnings.push(...renderedBlock.warnings);
    imageSources.push(...renderedBlock.imageSources);
  }

  return {
    html: htmlParts.join('\n'),
    imageSources,
    plainText: plainTextParts.filter(Boolean).join('\n\n').trim(),
    warnings,
  };
}
