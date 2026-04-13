import { readFile } from 'node:fs/promises';

import { assertLockfileIsValid } from './lib/lockfile-validation.mjs';
import { fromRepo } from './lib/utils.mjs';

const lockfilePath = fromRepo('package-lock.json');

async function main() {
  const rawLockfile = await readFile(lockfilePath, 'utf8');
  const lockfile = JSON.parse(rawLockfile);
  assertLockfileIsValid(lockfile);
  console.info('package-lock.json validé.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
