import { normalizePublicationList } from '../shared/publicationSchema.js';

const rawPublications = [
  {
    id: 'post-1',
    type: 'menu',
    titre: 'Menu de la cantine',
    date: 'Cette semaine',
    resume: 'Découvrez les plats servis à vos enfants à la cantine scolaire.',
    menu_jours: [
      {
        day: 'Lundi',
        items: [
          { name: 'Paella végétarienne au riz', badges: ['bio'] },
          { name: 'Gouda', badges: ['bio'] },
          { name: 'Beignet chocolat noisette', badges: [] },
        ],
      },
      {
        day: 'Mardi',
        items: [
          { name: 'Nems de légumes', badges: [] },
          { name: 'Boulettes au boeuf / végétariennes', description: 'Sauce tomate', badges: ['france'] },
          { name: 'Haricots verts persillés', badges: ['bio'] },
          { name: 'Yaourt arôme', badges: ['regional'] },
        ],
      },
      {
        day: 'Mercredi',
        isSpecial: true,
        message: "Les menus du mercredi seront affichés sur le panneau d'affichage de l'accueil de loisirs",
      },
      {
        day: 'Jeudi',
        items: [
          { name: 'Crêpe au fromage', badges: [] },
          { name: 'Galette végétale', description: 'Sauce aux épices', badges: [] },
          { name: 'Carottes CE2 persillées', badges: ['ce2'] },
          { name: 'Yaourt aromatisé', badges: [] },
        ],
      },
      {
        day: 'Vendredi',
        items: [
          { name: 'Filet de saumon MSC', description: 'Sauce aneth', badges: ['msc'] },
          { name: 'Brocolis', badges: ['bio'] },
          { name: 'Mimolette', badges: ['bio'] },
          { name: 'Tarte au flan', badges: [] },
        ],
      },
    ],
  },
  {
    id: 'post-2',
    type: 'evenement',
    titre: 'Brocante de Printemps',
    date: 'Dimanche 24 mai 2026',
    lieu: 'Centre-ville, Annet-sur-Marne',
    date_debut_iso: '20260524T060000Z',
    date_fin_iso: '20260524T180000Z',
    resume: 'Venez nombreux chiner à la brocante annuelle organisée par le comité des fêtes.',
    contenu_texte:
      "Le comité des fêtes d'Annet-sur-Marne est heureux de vous annoncer le retour de sa grande brocante de printemps. Plus de 200 exposants sont attendus au centre-ville. Restauration sur place avec buvette et animations pour les enfants toute la journée.",
  },
  {
    id: 'post-3',
    type: 'alerte',
    titre: 'Travaux rue de la Marne',
    date: "Jusqu'au 15 avril",
    lieu: 'Rue de la Marne',
    resume: 'Circulation alternée en raison de travaux.',
    contenu_texte:
      "Des travaux d'enfouissement des réseaux auront lieu rue de la Marne. La circulation se fera sur une seule voie avec des feux alternés. Le stationnement sera interdit sur la zone concernée de 8h à 17h. Merci de votre prudence et de votre compréhension.",
  },
  {
    id: 'post-4',
    type: 'coup_de_coeur',
    titre: 'Qui se ressemble',
    date: 'Cette semaine',
    auteur: 'Agnès Desarthe',
    edition: 'La Résonnante',
    lien_externe: 'https://www.google.com/search?q=Qui+se+ressemble+Agn%C3%A8s+Desarthe',
    resume: "Découvrez le coup de coeur littéraire de la semaine proposé par Médi'Annet.",
    contenu_texte:
      "Après avoir exploré ses origines familiales du côté de sa mère dans « Château des rentiers », Agnès Desarthe s'intéresse maintenant à la branche paternelle.\n\nSa grand-mère, juive illettrée originaire de Libye, s'est installée à Orléansville en Algérie dans les années 20. Elle épouse sans amour un homme violent qui disparaît après la naissance de son dixième enfant et elle élève seule sa progéniture.\n\nLe petit dernier, père d'Agnès, vient faire ses études de médecine en France et s'y installe.\n\nUn récit sensible, accompagné en filigrane par les chansons égyptiennes d'Oum Kalsoum.",
  },
];

export const initialPosts = normalizePublicationList(rawPublications);
