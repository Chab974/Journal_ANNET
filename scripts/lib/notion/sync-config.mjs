export const requiredSyncEnv = [
  'NOTION_TOKEN',
  'NOTION_PUBLICATIONS_DATA_SOURCE_ID',
  'NOTION_AGENDA_DATA_SOURCE_ID',
  'NOTION_MENU_ITEMS_DATA_SOURCE_ID',
];

const optionalSiteSectionsEnv = 'NOTION_SITE_SECTIONS_DATA_SOURCE_ID';
const optionalStructuredSectionsEnv = 'NOTION_SITE_SECTION_ITEMS_DATA_SOURCE_ID';

export function resolveSyncNotionConfig(env = process.env) {
  const missingEnv = requiredSyncEnv.filter((key) => !env[key]);

  if (missingEnv.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes pour la sync Notion: ${missingEnv.join(', ')}`,
    );
  }

  const warnings = [];
  if (!env[optionalStructuredSectionsEnv] && !env[optionalSiteSectionsEnv]) {
    warnings.push(
      `${optionalStructuredSectionsEnv} et ${optionalSiteSectionsEnv} absentes: les sections de site utiliseront uniquement les valeurs par défaut versionnées.`,
    );
  } else if (!env[optionalStructuredSectionsEnv]) {
    warnings.push(
      `${optionalStructuredSectionsEnv} absente: les sections de site utiliseront ${optionalSiteSectionsEnv} ou les valeurs par défaut versionnées.`,
    );
  } else if (!env[optionalSiteSectionsEnv]) {
    warnings.push(
      `${optionalSiteSectionsEnv} absente: mode sections-site-items uniquement activé. La colonne "Section" doit contenir une clé texte comme home-hero, home-editorial, home-rubriques, home-diffusion ou footer.`,
    );
  }

  return {
    dataSourceIds: {
      agenda: env.NOTION_AGENDA_DATA_SOURCE_ID,
      menuItems: env.NOTION_MENU_ITEMS_DATA_SOURCE_ID,
      publications: env.NOTION_PUBLICATIONS_DATA_SOURCE_ID,
      sectionItems: env[optionalStructuredSectionsEnv] || '',
      siteSections: env[optionalSiteSectionsEnv] || '',
    },
    warnings,
  };
}
