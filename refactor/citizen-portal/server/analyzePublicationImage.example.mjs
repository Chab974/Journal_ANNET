import { publicationPrompt } from '../shared/publicationSchema.js';
import { buildCanonicalContent, toNotionDraft, toSiteEntry, toUiPublication } from '../shared/contentModel.js';

const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', enum: ['menu', 'alerte', 'evenement', 'info', 'coup_de_coeur'] },
    titre: { type: 'STRING' },
    resume: { type: 'STRING' },
    date: { type: 'STRING' },
    lieu: { type: 'STRING' },
    auteur: { type: 'STRING' },
    edition: { type: 'STRING' },
    lien_externe: { type: 'STRING' },
    date_debut_iso: { type: 'STRING' },
    date_fin_iso: { type: 'STRING' },
    contenu_texte: { type: 'STRING' },
    menu_jours: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'STRING' },
          isSpecial: { type: 'BOOLEAN' },
          message: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                description: { type: 'STRING' },
                badges: { type: 'ARRAY', items: { type: 'STRING' } },
              },
            },
          },
        },
        required: ['day'],
      },
    },
  },
  required: ['type', 'titre', 'resume'],
};

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function createHttpError(message, statusCode, { retriable = false } = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.retriable = retriable;
  return error;
}

async function extractErrorMessage(response) {
  const rawBody = await response.text();
  if (!rawBody) {
    return `Erreur Gemini ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(rawBody);
    return parsed?.error?.message || `Erreur Gemini ${response.status}.`;
  } catch {
    return `Erreur Gemini ${response.status}.`;
  }
}

function parseCandidateText(result) {
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini n'a retourne aucun contenu exploitable.");
  }

  return rawText.replace(/```json/g, '').replace(/```/g, '').trim();
}

function buildGeminiPayload({ base64Data, mimeType }) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: publicationPrompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

export async function analyzePublicationImageOnServer({ base64Data, mimeType, fetchImpl = fetch }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Variable GEMINI_API_KEY manquante.');
  }

  if (!base64Data || !mimeType) {
    throw new Error('Image invalide : donnees manquantes.');
  }

  const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const payload = buildGeminiPayload({ base64Data, mimeType });

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        const canRetry = response.status >= 500 || response.status === 429;
        if (canRetry && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }

        throw createHttpError(message, 502);
      }

      const result = await response.json();
      const parsedPublication = JSON.parse(parseCandidateText(result));
      return buildCanonicalContent(parsedPublication);
    } catch (error) {
      if (error.retriable === false) {
        throw error;
      }

      const isLastAttempt = attempt >= RETRY_DELAYS_MS.length;
      if (isLastAttempt) {
        throw error;
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error("L'analyse de l'image a echoue.");
}

export async function handleAnalyzePublicationImageRequest(req, res) {
  try {
    const uploadedFile = req.file;
    if (!uploadedFile?.buffer || !uploadedFile.mimetype) {
      res.status(400).json({ error: 'Aucune image recue.' });
      return;
    }

    const publication = await analyzePublicationImageOnServer({
      base64Data: uploadedFile.buffer.toString('base64'),
      mimeType: uploadedFile.mimetype,
    });

    res.status(200).json({
      document: publication,
      publication: toUiPublication(publication),
      exports: {
        notion: toNotionDraft(publication),
        site: toSiteEntry(publication),
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || "L'analyse a echoue." });
  }
}
