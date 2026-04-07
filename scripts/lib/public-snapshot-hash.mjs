import { createHash } from 'node:crypto';
import path from 'node:path';

import { fromRepo, readJsonFile } from './utils.mjs';

export const publicSnapshotFiles = [
  'publications.json',
  'agenda.json',
  'cantine.json',
  'site-sections.json',
];

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }

  return value;
}

export function hashPublicSnapshotPayload(payload) {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

export async function computePublicSnapshotHash({
  baseDir = fromRepo('data'),
  readJson = readJsonFile,
} = {}) {
  const payload = {};

  for (const filename of publicSnapshotFiles) {
    payload[filename] = await readJson(
      path.resolve(baseDir, filename),
      filename === 'site-sections.json' ? {} : [],
    );
  }

  return hashPublicSnapshotPayload(payload);
}
