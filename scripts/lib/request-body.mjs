export async function readRawRequestBody(request) {
  if (!request) {
    return '';
  }

  if (
    typeof request.text === 'function' &&
    typeof request.arrayBuffer === 'function' &&
    typeof request.headers?.get === 'function'
  ) {
    return request.text();
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}
