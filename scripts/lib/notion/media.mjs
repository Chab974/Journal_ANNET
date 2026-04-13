import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fromRepo } from '../utils.mjs';

function extensionFromUrl(url, fallback = '.bin') {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    return extension || fallback;
  } catch {
    return fallback;
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

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = extensionFromUrl(file.name || sourceUrl, '.bin');
  const hash = createHash('sha1')
    .update(pageId || '')
    .update(buffer)
    .digest('hex')
    .slice(0, 20);
  const fileName = `${hash}${extension.toLowerCase()}`;
  const filePath = path.join(targetDir, fileName);

  await mkdir(targetDir, { recursive: true });
  if (!(await fileExists(filePath))) {
    await writeFile(filePath, buffer);
  }

  return path.posix.join('assets', 'notion', fileName);
}
