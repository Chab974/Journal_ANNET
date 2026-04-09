import { fetchAnnetSurMarneVeille } from '../../scripts/lib/veille/annetsurmarne.mjs';

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function readQueryParam(request, key) {
  if (request?.query && typeof request.query[key] === 'string') {
    return request.query[key];
  }

  const requestUrl = request?.url || '/';
  const url = new URL(requestUrl, 'https://journal-annet.local');
  return url.searchParams.get(key) || '';
}

export default async function annetSurMarneVeille(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const query = readQueryParam(request, 'q');
    const payload = await fetchAnnetSurMarneVeille(query);

    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || 'Impossible de récupérer la veille Annet-sur-Marne.',
    });
  }
}
