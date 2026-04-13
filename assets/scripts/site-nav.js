(() => {
  const navRoot = document.querySelector('[data-site-nav]');
  if (!navRoot) {
    return;
  }

  const toggle = navRoot.querySelector('[data-nav-toggle]');
  const panel = navRoot.querySelector('[data-nav-panel]');

  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isExpanded));
      panel.classList.toggle('hidden', isExpanded);
    });

    panel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        panel.classList.add('hidden');
      });
    });
  }

  const currentUrl = new URL(window.location.href);
  const rubrique = currentUrl.searchParams.get('rubrique');
  const currentQuery = currentUrl.searchParams.get('q') || '';
  const lectureLinks = navRoot.querySelectorAll('[data-nav-key="lecture"]');
  const actualitesLinks = navRoot.querySelectorAll('[data-nav-key="actualites"]');
  const searchInputs = navRoot.querySelectorAll('[data-site-search-input]');

  searchInputs.forEach((input) => {
    input.value = currentQuery;
  });

  if (rubrique === 'Coup de cœur littéraire' && /portail\.html$/.test(currentUrl.pathname)) {
    actualitesLinks.forEach((link) => {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    });

    lectureLinks.forEach((link) => {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    });
  }
})();
