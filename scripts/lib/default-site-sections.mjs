export const defaultSiteSections = {
  footer: {
    cards: [
      {
        description: 'Scolaire, événements, travaux, vie associative, culture.',
        kicker: 'Rubriques',
      },
      {
        description: 'Snapshots versionnés, Vercel en production et GitHub Pages en démonstration.',
        kicker: 'Publication',
      },
    ],
    description:
      'La page fonctionne comme une couverture éditoriale : des rubriques stables, des sujets mis en avant et un portail que l’on peut enrichir à chaque nouvelle publication.',
    kicker: "Le Journal d'Annet",
    legalLeft: '© 2026 - Le Petit Journal d’Annet',
    legalRight: 'Une initiative citoyenne pour renouer le dialogue',
    title: 'Une édition locale, lisible et évolutive',
  },
  'home-diffusion': {
    cards: [
      {
        description:
          'Une édition imprimée (A3 plié), essentielle contre l’exclusion. Distribuée dans les boîtes et chez les commerçants.',
        emoji: '🗞️',
        title: 'Le Papier',
      },
      {
        description:
          'Une version PDF envoyée par newsletter email et partagée sur Facebook, en complément du site.',
        emoji: '💻',
        title: 'Le Numérique',
      },
      {
        description:
          'Bimestriel ou trimestriel. Privilégier la profondeur et la qualité d’information à l’instantanéité.',
        emoji: '⏱️',
        title: 'La Fréquence',
      },
    ],
    kicker: 'Modèle de circulation',
    title: 'Stratégie de Diffusion',
  },
  'home-editorial': {
    actions: [
      {
        href: 'portail.html',
        label: 'Ouvrir le portail citoyen',
        variant: 'primary',
      },
      {
        href: 'portail.html?rubrique=%C3%89v%C3%A9nements&slug=brocante-printemps-centre-ville',
        label: 'Voir les événements',
        variant: 'secondary',
      },
    ],
    ctaLinks: [
      {
        href: 'portail.html?rubrique=Scolaire&slug=cantine-scolaire-semaine',
        label: 'Cantine & familles',
      },
      {
        href: 'portail.html?rubrique=%C3%89v%C3%A9nements&slug=brocante-printemps-centre-ville',
        label: 'Temps forts',
      },
      {
        href: 'portail.html?rubrique=Travaux%20et%20mobilit%C3%A9&slug=travaux-rue-de-la-marne',
        label: 'Travaux & mobilité',
      },
      {
        href: 'portail.html?rubrique=Coup%20de%20c%C5%93ur%20litt%C3%A9raire&slug=qui-se-ressemble-agnes-desarthe',
        label: 'Coup de cœur littéraire',
      },
      {
        href: 'agenda.html',
        label: 'Agenda du village',
      },
    ],
    description:
      'Les actualités du village sont désormais consultables dans une page à part, pensée pour filtrer les contenus par rubrique et accéder directement aux informations utiles.',
    eyebrow: 'Page dédiée',
    highlightDescription:
      'Cantine scolaire, événements, travaux, vie associative et coups de cœur littéraires sont réunis dans un espace unique, plus simple à parcourir depuis la navigation principale.',
    highlightEyebrow: 'Nouveau format',
    highlightTitle: 'Une page complète pour les infos locales',
    quickLinksEyebrow: 'Accès rapide',
    title: 'Portail Citoyen',
  },
  'home-hero': {
    actions: [
      {
        href: 'portail.html',
        label: 'Explorer le portail',
        theme: 'red',
      },
      {
        href: 'agenda.html',
        label: "Voir l'agenda",
        theme: 'blue',
      },
      {
        href: '#maquette',
        label: 'Voir la maquette',
        theme: 'light',
      },
    ],
    editorial: {
      description:
        'Le site devient un support éditorial blanc, structuré et rythmé, pensé pour faire ressortir les informations locales immédiatement.',
      eyebrow: 'Édito',
      title: 'Une direction plus newsletter que magazine rétro',
    },
    feature: {
      description:
        'Une esthétique inspirée des newsletters visuelles : fond clair, lignes franches, accent orange et rubriques qui se lisent d’un coup d’œil.',
      kicker: 'Édition locale',
      title: 'Une édition plus graphique, plus directe, plus pratique au quotidien',
    },
    masthead: ['Édition locale', 'Village newsletter', 'Annet-sur-Marne 2026'],
    quote: "L'actualité du village, claire, utile et bien envoyée.",
    stats: [
      {
        description: "Pour hiérarchiser l'information locale.",
        eyebrow: 'Rubriques',
        value: '6',
      },
      {
        description: 'Publié sur Vercel, avec une démo publique sur GitHub Pages.',
        eyebrow: 'Format',
        value: 'Web',
      },
    ],
    titleLines: ['Le Journal', "d'Annet-sur-Marne"],
  },
  'home-rubriques': {
    description:
      'Le site s’organise maintenant comme une édition locale : chaque rubrique a son ton, son rôle et son type d’actualité.',
    items: [
      {
        description: 'Cantine, portail famille et informations pratiques pour les parents.',
        href: 'portail.html?rubrique=Scolaire&slug=cantine-scolaire-semaine',
        kicker: 'Scolaire',
        theme: 'text-vintage-red',
        title: 'Cantine & familles',
      },
      {
        description: 'Brocante, agenda du week-end et rendez-vous fédérateurs.',
        href: 'portail.html?rubrique=%C3%89v%C3%A9nements&slug=brocante-printemps-centre-ville',
        kicker: 'Événements',
        theme: 'text-vintage-green',
        title: 'Temps forts',
      },
      {
        description: 'Chantiers, circulation, alertes utiles au quotidien.',
        href: 'portail.html?rubrique=Travaux%20et%20mobilit%C3%A9&slug=travaux-rue-de-la-marne',
        kicker: 'Travaux',
        theme: 'text-vintage-blue',
        title: 'Vigilance',
      },
      {
        description: 'Suggestions de lecture et mise en avant de la médiathèque.',
        href: 'portail.html?rubrique=Coup%20de%20c%C5%93ur%20litt%C3%A9raire&slug=qui-se-ressemble-agnes-desarthe',
        kicker: 'Culture',
        theme: 'text-vintage-red',
        title: 'Coup de cœur',
      },
    ],
    kicker: 'Rubriques de la semaine',
    title: 'Des grandes catégories pour suivre la vie locale',
  },
};
