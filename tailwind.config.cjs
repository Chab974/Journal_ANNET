const systemSansStack = [
  'Avenir Next',
  'Segoe UI',
  'Helvetica Neue',
  'Arial',
  'sans-serif',
];

module.exports = {
  content: [
    './src/**/*.njk',
    './src/**/*.md',
    './assets/scripts/**/*.js',
  ],
  safelist: [
    'border-vintage-red',
    'text-vintage-red',
    'border-vintage-green',
    'text-vintage-green',
    'border-vintage-blue',
    'text-vintage-blue',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#16314a',
        'vintage-red': '#f6a318',
        'vintage-green': '#7fbf25',
        'vintage-blue': '#2894e3',
      },
      fontFamily: {
        body: systemSansStack,
        heading: systemSansStack,
      },
    },
  },
};
