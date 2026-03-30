import path from 'node:path';

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

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      output: '_site',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    templateFormats: ['njk'],
    pathPrefix: '/',
  };
}
