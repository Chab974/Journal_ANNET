export default {
  permalink: (data) => (data?.journal?.site?.isDemo ? false : 'veille.html'),
};
