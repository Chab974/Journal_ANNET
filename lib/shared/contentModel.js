import { createLocalId, normalizePublication } from './publicationSchema.js';

const TYPE_TO_KIND = {
  cantine: 'cantine',
  alerte: 'alert',
  evenement: 'event',
  info: 'info',
  coup_de_coeur: 'recommendation',
};

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function serializeCantineItem(item) {
  const badges = item.badges.length > 0 ? ` [${item.badges.join(', ')}]` : '';
  const description = item.description ? ` - ${item.description}` : '';
  return `${item.name}${description}${badges}`;
}

function buildBlocksFromPublication(publication) {
  if (publication.type === 'cantine') {
    return publication.cantine_jours.map((day) => ({
      type: day.isSpecial ? 'callout' : 'section',
      heading: day.day,
      body: day.isSpecial ? day.message : '',
      items: day.isSpecial ? [] : day.items.map((item) => serializeCantineItem(item)),
    }));
  }

  return splitParagraphs(publication.contenu_texte).map((paragraph) => ({
    type: 'paragraph',
    body: paragraph,
  }));
}

export function buildCanonicalContent(rawContent, { fallbackId } = {}) {
  const publication = normalizePublication(rawContent, {
    fallbackId: fallbackId || createLocalId('content'),
  });

  return {
    id: publication.id,
    schemaVersion: 'municipal-content/v1',
    kind: TYPE_TO_KIND[publication.type] || 'info',
    sourceType: publication.type,
    title: publication.titre,
    summary: publication.resume,
    displayDate: publication.date,
    location: publication.lieu,
    startsAtUtc: publication.date_debut_iso,
    endsAtUtc: publication.date_fin_iso,
    author: publication.auteur,
    publisher: publication.edition,
    externalUrl: publication.lien_externe,
    plainText: publication.type === 'cantine' ? '' : publication.contenu_texte,
    cantineDays: publication.type === 'cantine' ? publication.cantine_jours : [],
    blocks: buildBlocksFromPublication(publication),
    presentation: publication,
  };
}

export function toUiPublication(document) {
  return document.presentation;
}

export function toSiteEntry(document) {
  return {
    id: document.id,
    type: document.kind,
    title: document.title,
    excerpt: document.summary,
    dateLabel: document.displayDate,
    location: document.location,
    startsAtUtc: document.startsAtUtc,
    endsAtUtc: document.endsAtUtc,
    externalUrl: document.externalUrl,
    author: document.author,
    publisher: document.publisher,
    blocks: document.blocks,
  };
}

export function toNotionDraft(document) {
  const metadataLines = [
    document.displayDate ? `- Date: ${document.displayDate}` : '',
    document.location ? `- Lieu: ${document.location}` : '',
    document.author ? `- Auteur: ${document.author}` : '',
    document.publisher ? `- Edition: ${document.publisher}` : '',
    document.externalUrl ? `- Lien: ${document.externalUrl}` : '',
  ].filter(Boolean);

  const blockMarkdown = document.blocks
    .map((block) => {
      if (block.type === 'paragraph') {
        return block.body;
      }

      if (block.type === 'callout') {
        return `## ${block.heading}\n\n${block.body}`;
      }

      const list = (block.items || []).map((item) => `- ${item}`).join('\n');
      return `## ${block.heading}\n\n${list}`;
    })
    .join('\n\n');

  return {
    properties: {
      title: document.title,
      Kind: document.kind,
      Summary: document.summary,
      'Display Date': document.displayDate,
      Location: document.location,
      'External URL': document.externalUrl,
    },
    contentMarkdown: [`# ${document.title}`, document.summary, metadataLines.join('\n'), blockMarkdown]
      .filter(Boolean)
      .join('\n\n'),
  };
}
