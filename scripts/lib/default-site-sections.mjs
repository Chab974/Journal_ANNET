const defaultSiteNavItems = [
  { key: 'home', label: 'Accueil' },
  { key: 'actualites', label: 'Actualités' },
  { key: 'lecture', label: 'Coup de cœur' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'about', label: 'À propos' },
];

const defaultHomeQuickLinkFallbacks = [
  {
    rubrique: 'Coup de cœur littéraire',
    title: 'Lecture et médiathèque',
    description: 'Sélection de lectures et recommandations culturelles locales.',
  },
  {
    rubrique: 'Scolaire',
    title: 'Cantine et familles',
    description: 'Cantine, portail famille et informations utiles pour les parents.',
  },
  {
    rubrique: 'Travaux et mobilité',
    title: 'Travaux et mobilité',
    description: 'Circulation, chantiers et alertes utiles au quotidien.',
  },
  {
    rubrique: 'Vie associative',
    title: 'Vie associative',
    description: 'Associations, bénévolat et rendez-vous collectifs à suivre.',
  },
  {
    rubrique: 'Vie locale',
    title: 'Vie locale',
    description: 'Vie du village, initiatives et infos de proximité.',
  },
  {
    rubrique: 'Événements',
    title: 'Événements à venir',
    description: 'Temps forts, sorties et rendez-vous à venir dans le village.',
  },
];

const defaultPortalIntroVariants = [
  {
    key: 'all',
    kicker: 'Actualités locales filtrables',
    title: 'Actualités',
    description:
      'Une lecture claire de la vie locale : événements, scolaire, travaux, vie associative et coups de cœur réunis dans une même page, avec filtres par rubrique et accès direct aux articles.',
  },
  {
    key: 'Coup de cœur littéraire',
    kicker: 'Sélection lecture',
    title: 'Coup de cœur',
    description:
      'Les recommandations de lecture et les sélections de Médi’Annet réunies dans une vue dédiée, avec accès direct aux résumés et aux ouvrages mis en avant.',
  },
  {
    key: 'Scolaire',
    kicker: 'Informations familles',
    title: 'Cantine & familles',
    description:
      'Les informations familles, la cantine et les repères utiles liés à la vie scolaire regroupés dans une même vue.',
  },
  {
    key: 'Travaux et mobilité',
    kicker: 'Infos pratiques',
    title: 'Travaux & mobilité',
    description:
      'Les alertes, chantiers et informations de circulation utiles au quotidien dans une vue plus ciblée.',
  },
  {
    key: 'Vie associative',
    kicker: 'Vie collective',
    title: 'Vie associative',
    description:
      'Les rendez-vous associatifs, appels à bénévoles et actualités des collectifs locaux dans une vue dédiée.',
  },
  {
    key: 'Vie locale',
    kicker: 'Vie du village',
    title: 'Vie locale',
    description:
      'Les informations de proximité, initiatives locales et rendez-vous du village rassemblés sur une même page.',
  },
  {
    key: 'Événements',
    kicker: 'Temps forts',
    title: 'Événements',
    description:
      'Les temps forts, sorties et rendez-vous publics du village avec accès direct aux articles détaillés.',
  },
];

const defaultPortalTypeMeta = [
  { key: 'cantine', label: 'Cantine', stamp: 'Restauration scolaire' },
  { key: 'evenement', label: 'Événement', stamp: 'Agenda' },
  { key: 'alerte', label: 'Alerte / Travaux', stamp: 'Vigilance' },
  { key: 'info', label: 'Information', stamp: 'Infos' },
  { key: 'coup_de_coeur', label: 'Médiathèque', stamp: 'Lecture' },
];

const defaultAgendaPhases = [
  {
    key: 'near',
    title: 'Prochainement',
    description:
      'Les dates prévues entre aujourd’hui et les 30 prochains jours, classées de la plus proche à la plus lointaine.',
  },
  {
    key: 'later',
    title: 'À venir plus loin',
    description: 'Les rendez-vous déjà publiés mais situés au-delà des 30 prochains jours.',
  },
  {
    key: 'past',
    title: 'Passés récemment',
    description: 'Les événements terminés dans les 30 derniers jours, classés du plus récent au plus ancien.',
  },
  {
    key: 'undated',
    title: 'Dates à préciser',
    description: 'Les entrées sans date exploitable restent visibles ici le temps de compléter la fiche agenda.',
  },
];

const defaultAgendaWeekdays = [
  { key: 'monday', label: 'Lun' },
  { key: 'tuesday', label: 'Mar' },
  { key: 'wednesday', label: 'Mer' },
  { key: 'thursday', label: 'Jeu' },
  { key: 'friday', label: 'Ven' },
  { key: 'saturday', label: 'Sam' },
  { key: 'sunday', label: 'Dim' },
];

const defaultAboutPillars = [
  {
    id: 'p1',
    title: 'Info & Politique Locale',
    principle: 'Rendre compte des décisions municipales et intercommunales de manière neutre, pédagogique et sourcée.',
    objective: 'Permettre à chaque citoyen de comprendre les enjeux sans filtre partisan ou animosité.',
  },
  {
    id: 'p2',
    title: 'Ouverture & Intercommunalité',
    principle: "Annet n'est pas une île. Donner la parole aux communes voisines et relayer leurs événements.",
    objective: 'Mutualiser les bonnes idées et encourager les échanges culturels et associatifs au-delà du village.',
  },
  {
    id: 'p3',
    title: 'Guide Citoyen',
    principle: 'Lutter contre les exclusions sociales, numériques et administratives avec des solutions concrètes.',
    objective: 'Aider dans les démarches, faire connaître les aides existantes et créer des ponts entre les générations.',
  },
  {
    id: 'p4',
    title: 'Lien Social',
    principle: 'Mettre en valeur les habitants, les initiatives locales et ouvrir le débat sur l’avenir.',
    objective: 'Donner envie de se parler, créer des moments de convivialité et réfléchir collectivement à l’évolution du village.',
  },
  {
    id: 'p5',
    title: 'Écologie & Cadre de Vie',
    principle: 'Traiter les sujets environnementaux locaux de façon concrète et non idéologique.',
    objective: 'Aider les habitants à comprendre les projets, à s’équiper et à participer aux initiatives locales.',
  },
  {
    id: 'p6',
    title: 'Vie Associative',
    principle: 'Mettre en lumière les associations, leurs bénévoles et leurs besoins, sans communication vitrine.',
    objective: 'Donner de la visibilité aux initiatives, faciliter le recrutement de bénévoles et renforcer les coopérations entre assos.',
  },
  {
    id: 'p7',
    title: 'Soloprenariat & Économie Locale',
    principle: 'Valoriser les artisans, indépendants, micro-entreprises et commerces de proximité sans publicité déguisée.',
    objective: 'Rendre ces activités identifiables, utiles et connectées aux habitants via des portraits, des services et des projets.',
  },
];

const defaultAboutMockupPages = [
  {
    key: 'page-1',
    kicker: 'Page 1',
    title: 'Édito & essentiel',
    description: 'Présenter la démarche, puis donner tout de suite les informations les plus utiles à retenir.',
  },
  {
    key: 'page-2',
    kicker: 'Page 2',
    title: 'Décryptage & voisins',
    description: 'Expliquer une décision locale et ouvrir sur la vie intercommunale ou un rendez-vous voisin.',
  },
  {
    key: 'page-3',
    kicker: 'Page 3',
    title: 'Guide citoyen',
    description: 'Apporter de l’aide concrète face aux démarches, à la dématérialisation et aux besoins du quotidien.',
  },
  {
    key: 'page-4',
    kicker: 'Page 4',
    title: 'Rencontre & agora',
    description: 'Donner de la place aux habitants, aux portraits et aux idées proposées pour le prochain numéro.',
  },
];

export const defaultSiteSections = {
  'site-nav': {
    brandTitle: 'Le Bulletin',
    brandSubtitle: 'Annet-sur-Marne',
    browserTitleSuffix: "Le Journal d'Annet-sur-Marne",
    items: defaultSiteNavItems,
    mobileToggleLabel: 'Menu',
    skipLinkLabel: 'Aller au contenu',
  },
  'home-page': {
    cantineDaysLabel: 'jours',
    cantineDetailLabel: 'Voir le détail cantine',
    cantineIntroTemplate: '{title} rassemble les repères de la semaine pour la restauration scolaire.',
    cantineItemsPluralTemplate: '{count} plats annoncés.',
    cantineItemsSingularTemplate: '{count} plat annoncé.',
    cantineLinkLabel: 'Ouvrir la rubrique',
    cantineSpecialTemplate: '{day} : note spéciale',
    cantineTitle: 'Cantine & familles',
    emptyCantineDescription: 'La rubrique scolaire reste accessible pour les informations familles.',
    emptyCantineTitle: 'Aucune publication cantine disponible.',
    emptyPublicationsTitle: "Aucune publication n'est disponible pour le moment.",
    emptyUpcomingDescription: "L'agenda complet reste accessible dès qu'un événement est publié.",
    emptyUpcomingTitle: 'Aucune date disponible pour le moment.',
    eventAgendaLabel: "Voir l'agenda",
    fallbackDescription:
      'Ouvre les actualités, consulte l’agenda ou retrouve les informations familles sans passer par une page manifeste longue.',
    fallbackKicker: 'Accueil utile',
    fallbackTitle: 'Toutes les infos locales au même endroit',
    featuredLabel: 'À la une',
    heroAgendaLabel: 'Agenda',
    heroCantineLabel: 'Cantine & familles',
    heroHelper: 'Trois parcours immédiats pour trouver une info utile en moins de cinq secondes.',
    heroPrimaryLabel: 'Actualités',
    nextEventLabel: 'Prochain rendez-vous',
    openLabel: 'Ouvrir',
    pageTitle: "Le Journal d'Annet-sur-Marne",
    quickLinksEmptyLabel: 'Rubrique prête à accueillir du contenu',
    quickLinksKicker: 'Accès rapide',
    quickLinksOpenLabel: 'Ouvrir la rubrique',
    quickLinksTitle: 'Retrouver une rubrique en un clic',
    quickLinkFallbacks: defaultHomeQuickLinkFallbacks,
    readArticleLabel: "Lire l'article",
    searchAriaLabel: 'Rechercher dans les actualités locales',
    searchButtonLabel: 'Rechercher',
    searchCaption: 'La recherche ouvre le portail avec la requête déjà appliquée.',
    searchKicker: 'Recherche rapide',
    searchPlaceholder: 'Rechercher un titre, une rubrique, un lieu, un auteur...',
    searchTitle: 'Trouver un titre, une rubrique ou un lieu',
    spotlightDescription:
      'Une carte principale pour le sujet à lire tout de suite, puis quelques raccourcis utiles pour continuer.',
    spotlightKicker: 'En ce moment',
    spotlightTitle: "L'essentiel du village",
    upcomingLinkLabel: 'Agenda complet',
    upcomingTitle: 'Prochains événements',
    viewAllAgendaLabel: "Voir tout l'agenda",
    viewAllLabel: 'Voir toutes les actualités',
    viewArticleLabel: "Voir l'article",
    viewRubriqueLabel: 'Voir la rubrique',
    weeklyDescription:
      "Les prochains événements d'un côté, la cantine de la semaine de l'autre, pour ne pas changer de page à chaque besoin.",
    weeklyKicker: 'Cette semaine',
    weeklyTitle: 'Agenda commun et repères familles',
  },
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
  'portal-page': {
    addToCalendarLabel: "Ajouter à l'agenda",
    agendaCtaLabel: "Voir l'agenda commun",
    agendaDatesTitle: "Dates à l'agenda",
    agendaLinkLabel: 'Agenda',
    allFilterLabel: 'Toutes',
    briefLabel: 'En bref',
    calendarTitle: 'Calendrier',
    cantineMicrocopy: {
      emptyMessage: 'Aucune information cantine communiquée.',
      favoriteAria: 'Marquer comme coup de cœur',
      favoriteTitle: 'Coup de cœur',
      noteLabel: 'Note',
      serviceLabel: 'Service',
    },
    contact: {
      email: 'mediatheque@annetsurmarne.fr',
      name: 'Rose',
      phone: '01 60 03 85 96',
    },
    countPlural: 'publications',
    countSingular: 'publication',
    dateFallbackLabel: 'Publication',
    defaultHoursLabel: 'Horaire communiqué',
    description:
      'Une lecture claire de la vie locale : événements, scolaire, travaux, vie associative et coups de cœur réunis dans une même page, avec filtres par rubrique et accès direct aux articles.',
    emptyDescription: 'Essayez un autre filtre ou une autre recherche.',
    emptyTitle: 'Aucune publication disponible.',
    filteredRubriqueDescriptionTemplate:
      'Les publications de la rubrique {rubrique} regroupées dans une seule vue avec filtres et accès direct aux articles.',
    filteredRubriqueKicker: 'Rubrique filtrée',
    highlightsTitle: 'À retenir',
    introVariants: defaultPortalIntroVariants,
    kicker: 'Actualités locales filtrables',
    learnMoreLabel: 'En savoir plus',
    loadErrorStatus: 'Le portail n’a pas pu charger les contenus.',
    loadErrorTitle: 'Impossible de charger les publications.',
    loadingTitle: 'Chargement des publications...',
    locationTitle: 'Localisation',
    mediathequeContactTitle: 'Contactez Rose',
    mediathequeTitle: "Médi'Annet",
    missingCoverLabel: 'Couverture indisponible',
    pageTitle: 'Actualités',
    resourceTitle: 'Ressource',
    searchPlaceholder: 'Rechercher un titre, une rubrique, un lieu, un auteur...',
    snapshotErrorMessage: 'Le snapshot de publications est introuvable.',
    summaryLabel: 'Résumé rapide',
    summaryNote: 'Le détail complet est visible dans l’article ci-dessous.',
    title: 'Actualités',
    typeMeta: defaultPortalTypeMeta,
  },
  'agenda-page': {
    addToCalendarLabel: "Ajouter à l'agenda",
    allFilterLabel: 'Toutes',
    calendarDescription:
      'Retrouve les rendez-vous du mois, avec accès direct aux articles et aux ajouts Google Calendar.',
    calendarKicker: 'Vue calendrier',
    countPlural: 'dates',
    countSingular: 'date',
    defaultRubriqueLabel: 'Agenda',
    defaultTimeLabel: 'Horaire communiqué',
    description:
      'Toutes les dates utiles au même endroit, avec filtres par rubrique et accès direct à l’article concerné.',
    detailLaterLabel: 'plus loin',
    detailNearLabel: 'proches',
    detailPastLabel: 'passées',
    detailUndatedLabel: 'à préciser',
    emptyFilterDescription: 'Essaie une autre rubrique ou élargis la recherche.',
    emptyFilterTitle: 'Aucune date pour ce filtre.',
    kicker: 'Calendrier commun',
    loadErrorTitle: "Impossible de charger l'agenda.",
    loadingTitle: 'Chargement des dates...',
    monthEmptyDescription: 'Change de mois ou ajuste les filtres pour afficher d’autres rendez-vous.',
    monthEmptyTitle: 'Aucune date ce mois-ci.',
    monthEventsTitle: 'Rendez-vous du mois',
    nextMonthLabel: 'Mois suivant',
    pageTitle: 'Agenda',
    phases: defaultAgendaPhases,
    prevMonthLabel: 'Mois précédent',
    searchPlaceholder: 'Rechercher un événement, une rubrique ou un lieu...',
    snapshotErrorMessage: 'Le snapshot agenda est invalide.',
    summaryLabel: 'Résumé rapide',
    summaryNote: 'La suite est détaillée dans l’article.',
    title: 'Agenda du village',
    todayLabel: 'Aujourd’hui',
    undatedMonthLabel: 'Autres dates',
    viewArticleLabel: "Voir l'article",
    viewCalendarLabel: 'Vue calendrier',
    viewListLabel: 'Vue liste',
    viewSwitchLabel: "Choisir la vue de l'agenda",
    weekdays: defaultAgendaWeekdays,
  },
  'about-page': {
    description:
      "Cette page rassemble la vision éditoriale, la méthode de publication, la maquette du premier numéro et la stratégie de diffusion du Journal d'Annet.",
    heroSideLabel: 'Promesse éditoriale',
    homeFocusBody:
      'La home se concentre désormais sur l’accès rapide aux contenus utiles. Le récit éditorial, la méthode et la maquette sont regroupés ici pour garder une page d’accueil plus courte et plus utile.',
    homeFocusLabel: "Ce que la page d'accueil ne porte plus",
    kicker: 'À propos du projet',
    mockupPages: defaultAboutMockupPages,
    objectiveLabel: "L'Objectif",
    originBody:
      'La dynamique citoyenne née à Annet-sur-Marne a montré un besoin d’information locale mieux structurée, plus pédagogique et plus calme. Le journal cherche à rendre les décisions, les initiatives et les rendez-vous compréhensibles sans filtre partisan.',
    originLabel: 'Le point de départ',
    pageTitle: 'À propos',
    pillars: defaultAboutPillars,
    pillarsDescription: 'Découvrez l’ADN du journal en parcourant les piliers ci-dessous.',
    pillarsKicker: 'Architecture éditoriale',
    pillarsTitle: 'Nos 7 piliers éditoriaux',
    principleLabel: 'Le Principe',
    prototypeDescription:
      'La maquette papier sert de référence narrative : un édito, des décryptages, un guide citoyen et une partie plus participative.',
    prototypeKicker: 'Prototype éditorial',
    prototypeTitle: 'La maquette du premier numéro',
    title: 'Une édition locale claire, utile et constructive',
    visionDescription:
      'Le projet part d’une volonté simple : informer sérieusement sur la vie du village, relier les habitants et éviter les polémiques inutiles.',
    visionKicker: 'Vision éditoriale',
    visionQuote:
      'Refuser la polémique et les attaques inutiles pour privilégier la compréhension des enjeux locaux, l’entraide et l’imagination d’un avenir commun.',
    visionTitle: 'Pourquoi ce journal existe',
  },
};

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function mergeSiteSections(base = {}, override = {}) {
  const result = structuredClone(base ?? {});

  for (const [key, value] of Object.entries(override ?? {})) {
    if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = mergeSiteSections(result[key], value);
      continue;
    }

    result[key] = structuredClone(value);
  }

  return result;
}
