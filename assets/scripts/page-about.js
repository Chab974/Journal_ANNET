(() => {
  const { loadJson } = window.JournalAnnetShared || {};
  const buttonsContainer = document.getElementById('pillar-buttons');
  const contentContainer = document.getElementById('pillar-content');

  if (!buttonsContainer || !contentContainer || typeof loadJson !== 'function') {
    return;
  }

  const pillarVisuals = {
    p1: { borderClass: 'border-vintage-red', icon: '⚖️', titleClass: 'text-ink' },
    p2: { borderClass: 'border-vintage-red', icon: '🤝', titleClass: 'text-ink' },
    p3: { borderClass: 'border-vintage-red', icon: '🛡️', titleClass: 'text-ink' },
    p4: { borderClass: 'border-vintage-red', icon: '☕', titleClass: 'text-ink' },
    p5: { borderClass: 'border-vintage-green', icon: '🌱', titleClass: 'text-vintage-green' },
    p6: { borderClass: 'border-vintage-blue', icon: '🎗️', titleClass: 'text-vintage-blue' },
    p7: { borderClass: 'border-vintage-blue', icon: '🛍️', titleClass: 'text-vintage-blue' },
  };

  let aboutCopy = {};
  let pillarsData = [];
  let currentPillarId = 'p1';

  function createElement(tagName, { className = '', text = '' } = {}) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function renderPillars() {
    buttonsContainer.replaceChildren();

    pillarsData.forEach((pillar) => {
      const isActive = pillar.id === currentPillarId;
      const button = createElement('button', {
        className: [
          'about-pillar-button',
          'px-4',
          'py-3',
          'mx-1',
          'font-heading',
          'font-bold',
          'uppercase',
          'text-sm',
          'tracking-wider',
          'border',
          'rounded-full',
          'transition-all',
          isActive
            ? 'about-pillar-button--active border-ink/20 shadow-lg shadow-black/10 backdrop-blur-sm'
            : 'border-ink/10 bg-white/70 text-ink hover:bg-white hover:-translate-y-0.5',
        ].join(' '),
        text: pillar.title || '',
      });

      button.type = 'button';
      button.setAttribute('aria-pressed', String(isActive));
      button.addEventListener('click', () => {
        currentPillarId = pillar.id;
        renderPillars();
        renderPillarContent();
      });

      buttonsContainer.appendChild(button);
    });
  }

  function renderPillarContent() {
    const pillar = pillarsData.find((item) => item.id === currentPillarId);
    if (!pillar) {
      return;
    }

    const visuals = pillarVisuals[pillar.id] || pillarVisuals.p1;
    const wrapper = createElement('div', {
      className: 'w-full max-w-4xl fade-in flex flex-col md:flex-row gap-8 items-center',
    });
    const icon = createElement('div', {
      className: 'text-6xl md:text-8xl grayscale opacity-80',
      text: visuals.icon,
    });
    const body = createElement('div', {
      className: 'flex-1 space-y-4',
    });
    const title = createElement('h3', {
      className: `text-3xl font-heading font-black uppercase ${visuals.titleClass} mb-2 border-b-2 ${visuals.borderClass} pb-2 inline-block`,
      text: pillar.title || '',
    });
    const grid = createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mt-4',
    });
    const principle = createElement('div');
    const principleLabel = createElement('h4', {
      className: 'font-heading font-bold uppercase tracking-widest text-xs mb-1',
      text: aboutCopy.principleLabel || 'Le Principe',
    });
    const principleBody = createElement('p', {
      className: 'text-sm leading-relaxed text-justify',
      text: pillar.principle || '',
    });
    const objective = createElement('div');
    const objectiveLabel = createElement('h4', {
      className: 'font-heading font-bold uppercase tracking-widest text-xs mb-1',
      text: aboutCopy.objectiveLabel || "L'Objectif",
    });
    const objectiveBody = createElement('p', {
      className: 'text-sm leading-relaxed text-justify font-bold',
      text: pillar.objective || '',
    });

    principle.append(principleLabel, principleBody);
    objective.append(objectiveLabel, objectiveBody);
    grid.append(principle, objective);
    body.append(title, grid);
    wrapper.append(icon, body);

    contentContainer.replaceChildren(wrapper);
  }

  async function init() {
    aboutCopy = await loadJson('data/ui/about-page.json', { fallback: {} });
    pillarsData = Array.isArray(aboutCopy?.pillars) ? aboutCopy.pillars : [];
    currentPillarId = pillarsData[0]?.id || 'p1';

    renderPillars();
    renderPillarContent();
  }

  init().catch(() => {
    buttonsContainer.replaceChildren();
  });
})();
