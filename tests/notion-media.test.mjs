import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { resolveNotionFileAsset } from '../scripts/lib/notion/media.mjs';

test('resolveNotionFileAsset convertit une image Notion en WebP redimensionné', async () => {
  const targetDir = await mkdtemp(path.join(tmpdir(), 'journal-annet-media-'));
  const sourceBuffer = await sharp({
    create: {
      background: '#d24a2f',
      channels: 4,
      height: 1200,
      width: 2200,
    },
  })
    .png()
    .toBuffer();

  const assetPath = await resolveNotionFileAsset({
    fetchImpl: async () => ({
      ok: true,
      headers: new Map([['content-type', 'image/png']]),
      arrayBuffer: async () =>
        sourceBuffer.buffer.slice(
          sourceBuffer.byteOffset,
          sourceBuffer.byteOffset + sourceBuffer.byteLength,
        ),
    }),
    file: {
      external: {
        url: 'https://example.test/photo.png',
      },
      name: 'photo.png',
      type: 'external',
    },
    pageId: 'page-webp',
    targetDir,
  });

  assert.match(assetPath, /^assets\/notion\/[a-f0-9]{20}\.webp$/);

  const outputBuffer = await readFile(path.join(targetDir, path.basename(assetPath)));
  const metadata = await sharp(outputBuffer).metadata();

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
});

test('resolveNotionFileAsset détecte une image via content-type quand le nom Notion n’a pas d’extension', async () => {
  const targetDir = await mkdtemp(path.join(tmpdir(), 'journal-annet-media-'));
  const sourceBuffer = await sharp({
    create: {
      background: '#2e7d62',
      channels: 4,
      height: 640,
      width: 900,
    },
  })
    .png()
    .toBuffer();

  const assetPath = await resolveNotionFileAsset({
    fetchImpl: async () => ({
      ok: true,
      headers: new Map([['content-type', 'image/png; charset=utf-8']]),
      arrayBuffer: async () =>
        sourceBuffer.buffer.slice(
          sourceBuffer.byteOffset,
          sourceBuffer.byteOffset + sourceBuffer.byteLength,
        ),
    }),
    file: {
      external: {
        url: 'https://example.test/signed-notion-url',
      },
      name: 'notion-block-id-without-extension',
      type: 'external',
    },
    pageId: 'page-content-type',
    targetDir,
  });

  assert.match(assetPath, /^assets\/notion\/[a-f0-9]{20}\.webp$/);

  const outputBuffer = await readFile(path.join(targetDir, path.basename(assetPath)));
  const metadata = await sharp(outputBuffer).metadata();

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 900);
});
