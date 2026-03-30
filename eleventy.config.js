import path from 'node:path';

function normalizePathPrefix(value) {
  if (!value || value === '/') {
    return '/';
  }

  const trimmed = String(value).trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

export default function configureEleventy(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    assets: 'assets',
    data: 'data',
  });

  eleventyConfig.addFilter('inlineJson', (value) =>
    JSON.stringify(value ?? [])
      .replaceAll('<', '\\u003C')
      .replaceAll('>', '\\u003E')
      .replaceAll('&', '\\u0026'),
  );

  const pathPrefix = normalizePathPrefix(process.env.SITE_PATH_PREFIX);

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      output: '_site',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    templateFormats: ['njk'],
    pathPrefix,
  };
}
