export async function readRawRequestBody(request, { maxBytes = 64 * 1024 } = {}) {
  if (!request) {
    return '';
  }

  const parseContentLength = (value) => {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  };

  const headerContentLength =
    typeof request.headers?.get === 'function'
      ? request.headers.get('content-length')
      : request.headers?.['content-length'];
  const contentLength = parseContentLength(headerContentLength);

  if (contentLength !== null && contentLength > maxBytes) {
    const error = new Error('Payload trop volumineux.');
    error.statusCode = 413;
    throw error;
  }

  if (
    typeof request.text === 'function' &&
    typeof request.arrayBuffer === 'function' &&
    typeof request.headers?.get === 'function'
  ) {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
      const error = new Error('Payload trop volumineux.');
      error.statusCode = 413;
      throw error;
    }
    return rawBody;
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      const error = new Error('Payload trop volumineux.');
      error.statusCode = 413;
      throw error;
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}
