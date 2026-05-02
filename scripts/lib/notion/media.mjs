import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { fromRepo } from '../utils.mjs';

const optimizedImageMaxWidth = 1600;
const optimizedImageQuality = 78;
const optimizableImageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);
const extensionByContentType = new Map([
  ['image/avif', '.avif'],
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/tiff', '.tiff'],
  ['image/webp', '.webp'],
]);

function extensionFromUrl(url, fallback = '.bin') {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    return extension || fallback;
  } catch {
    const extension = path.extname(String(url || ''));
    return extension || fallback;
  }
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function extensionFromContentType(contentType, fallback = '.bin') {
  const normalized = String(contentType || '').split(';')[0].trim().toLowerCase();
  return extensionByContentType.get(normalized) || fallback;
}

function resolveSourceExtension({ contentType, fileName, sourceUrl }) {
  const nameExtension = extensionFromUrl(fileName, '');
  if (nameExtension) {
    return nameExtension;
  }

  const urlExtension = extensionFromUrl(sourceUrl, '');
  if (urlExtension) {
    return urlExtension;
  }

  return extensionFromContentType(contentType);
}

function isOptimizableImage(extension) {
  return optimizableImageExtensions.has(String(extension || '').toLowerCase());
}

async function optimizeImageBuffer(buffer) {
  const image = sharp(buffer, {
    animated: false,
    failOn: 'none',
  });
  const metadata = await image.metadata();
  const width = metadata.width && metadata.width > optimizedImageMaxWidth
    ? optimizedImageMaxWidth
    : undefined;

  return image
    .rotate()
    .resize({
      fit: 'inside',
      width,
      withoutEnlargement: true,
    })
    .webp({
      effort: 4,
      quality: optimizedImageQuality,
    })
    .toBuffer();
}

export async function resolveNotionFileAsset({
  fetchImpl = fetch,
  file,
  pageId,
  targetDir = fromRepo('assets', 'notion'),
}) {
  if (!file) {
    return null;
  }

  const sourceUrl = file.type === 'external'
    ? file.external?.url ?? null
    : file.file?.url ?? null;
  if (!sourceUrl) {
    return null;
  }

  const response = await fetchImpl(sourceUrl);
  if (!response.ok) {
    throw new Error(`Téléchargement média en échec (${response.status})`);
  }

  const contentType = response.headers?.get?.('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = resolveSourceExtension({
    contentType,
    fileName: file.name,
    sourceUrl,
  });
  const shouldOptimize = isOptimizableImage(extension);
  const outputBuffer = shouldOptimize ? await optimizeImageBuffer(buffer) : buffer;
  const outputExtension = shouldOptimize ? '.webp' : extension.toLowerCase();
  const hash = createHash('sha1')
    .update(pageId || '')
    .update(outputBuffer)
    .digest('hex')
    .slice(0, 20);
  const fileName = `${hash}${outputExtension}`;
  const filePath = path.join(targetDir, fileName);

  await mkdir(targetDir, { recursive: true });
  if (!(await fileExists(filePath))) {
    await writeFile(filePath, outputBuffer);
  }

  return path.posix.join('assets', 'notion', fileName);
}
