import { createLocalId, normalizePublication } from '../shared/publicationSchema.js';

export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ANALYZE_PUBLICATION_ENDPOINT = '/api/publications/analyze-image';

export function validateSelectedFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Aucun fichier image fourni.');
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('Format non supporté. Utilisez un fichier JPG, PNG ou WEBP.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image trop volumineuse. Taille maximale : 8 Mo.');
  }
}

async function readJsonSafely(response) {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error('Réponse serveur invalide.');
  }
}

export async function analyzePublicationImage(file, { signal } = {}) {
  validateSelectedFile(file);

  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await fetch(ANALYZE_PUBLICATION_ENDPOINT, {
    method: 'POST',
    body: formData,
    signal,
  });

  const payload = await readJsonSafely(response);

  if (!response.ok) {
    const message = payload?.error || payload?.message || "L'analyse a échoué côté serveur.";
    throw new Error(message);
  }

  return normalizePublication(payload?.publication ?? payload, {
    fallbackId: createLocalId(),
  });
}
