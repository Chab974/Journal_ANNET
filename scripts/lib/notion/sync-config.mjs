export const requiredSyncEnv = [
  'NOTION_TOKEN',
  'NOTION_PUBLICATIONS_DATA_SOURCE_ID',
  'NOTION_AGENDA_DATA_SOURCE_ID',
  'NOTION_MENU_ITEMS_DATA_SOURCE_ID',
  'NOTION_SITE_SECTIONS_DATA_SOURCE_ID',
];

const optionalStructuredSectionsEnv = 'NOTION_SITE_SECTION_ITEMS_DATA_SOURCE_ID';

export function resolveSyncNotionConfig(env = process.env) {
  const missingEnv = requiredSyncEnv.filter((key) => !env[key]);

  if (missingEnv.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes pour la sync Notion: ${missingEnv.join(', ')}`,
    );
  }

  const warnings = [];
  if (!env[optionalStructuredSectionsEnv]) {
    warnings.push(
      `${optionalStructuredSectionsEnv} absente: les éléments structurés des sections utiliseront les valeurs par défaut ou le JSON porté par chaque section.`,
    );
  }

  return {
    dataSourceIds: {
      agenda: env.NOTION_AGENDA_DATA_SOURCE_ID,
      menuItems: env.NOTION_MENU_ITEMS_DATA_SOURCE_ID,
      publications: env.NOTION_PUBLICATIONS_DATA_SOURCE_ID,
      sectionItems: env[optionalStructuredSectionsEnv] || '',
      siteSections: env.NOTION_SITE_SECTIONS_DATA_SOURCE_ID,
    },
    warnings,
  };
}
