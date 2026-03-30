const fs = require('node:fs/promises');
const path = require('node:path');

const dataDir = path.resolve(__dirname, '../../data');

function normalizePathPrefix(value) {
  if (!value || value === '/') {
    return '/';
  }

  const trimmed = String(value).trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

async function readJson(fileName, fallback) {
  const filePath = path.join(dataDir, fileName);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

module.exports = async function loadJournalData() {
  const publications = await readJson('publications.json', []);
  const agenda = await readJson('agenda.json', []);
  const menus = await readJson('menus.json', []);
  const siteSections = await readJson('site-sections.json', {});
  const pathPrefix = normalizePathPrefix(process.env.SITE_PATH_PREFIX);
  const deployTarget = process.env.SITE_DEPLOY_TARGET || 'vercel';

  return {
    agenda,
    buildTimeIso: new Date().toISOString(),
    menus,
    publications,
    site: {
      deployTarget,
      isDemo: deployTarget === 'github-pages-demo',
      pathPrefix,
    },
    siteSections,
  };
};
