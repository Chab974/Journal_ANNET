import { normalizePublication } from '../../lib/shared/publicationSchema.js';

const requiredSectionKeys = ['home-hero', 'home-editorial', 'home-rubriques', 'home-diffusion', 'footer'];

export function validateAgendaCrossLinks(agenda, publications) {
  const errors = [];
  const publicationSlugs = new Set(publications.map((publication) => publication.slug).filter(Boolean));

  for (const event of agenda) {
    if (!publicationSlugs.has(event.post_slug)) {
      errors.push(`Agenda orphelin: "${event.id}" pointe vers "${event.post_slug}".`);
    }
  }

  return errors;
}

export function validateSnapshots({ agenda, cantine, publications, siteSections }) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(publications)) {
    errors.push('publications.json doit contenir un tableau.');
  } else {
    for (const publication of publications) {
      try {
        normalizePublication(publication, { fallbackId: publication.id || 'publication' });
      } catch (error) {
        errors.push(`Publication invalide "${publication?.id ?? 'sans id'}": ${error.message}`);
      }

      if (!publication.slug) {
        warnings.push(`Publication sans slug: "${publication?.titre ?? publication?.id ?? 'sans titre'}".`);
      }
    }
  }

  if (!Array.isArray(agenda)) {
    errors.push('agenda.json doit contenir un tableau.');
  } else if (Array.isArray(publications)) {
    errors.push(...validateAgendaCrossLinks(agenda, publications));
  }

  if (!Array.isArray(cantine)) {
    errors.push('cantine.json doit contenir un tableau.');
  } else if (Array.isArray(publications)) {
    const publicationIds = new Set(publications.map((publication) => publication.id));
    for (const entry of cantine) {
      if (!publicationIds.has(entry.publication_id)) {
        warnings.push(`Entrée cantine "${entry.publication_id}" sans publication correspondante.`);
      }
    }
  }

  if (!siteSections || typeof siteSections !== 'object' || Array.isArray(siteSections)) {
    errors.push('site-sections.json doit contenir un objet indexé par clé.');
  } else {
    for (const key of requiredSectionKeys) {
      if (!siteSections[key]) {
        errors.push(`Section de site manquante: "${key}".`);
      }
    }
  }

  return { errors, warnings };
}
