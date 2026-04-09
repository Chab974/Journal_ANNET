import { rm } from 'node:fs/promises';

import { fromRepo } from './lib/utils.mjs';

await rm(fromRepo('_site'), {
  force: true,
  recursive: true,
});
