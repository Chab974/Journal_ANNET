```
import React, { useState, useRef, useEffect } from 'react';
import { 
  Leaf, 
  
```
```
MapPin, 

```
```
  
```
```
Fish, 

```
```
  
```
```
Award, 

```
```
  Flag, 
  Heart, 
  
```
```
Info, 

```
```
  Calendar, 
  UploadCloud, 
  Loader2, 
  AlertCircle,
  
```
```
Clipboard,

```
```
  Image as ImageIcon,
  
```
```
Utensils,

```
```
  
```
```
Megaphone,

```
```
  
```
```
CalendarDays,

```
```
  
```
```
CalendarPlus,

```
```
  
```
```
Clock,

```
```
  Sparkles,
  
```
```
ChevronRight,

```
```
  
```
```
BookOpen,

```
```
  
```
```
ExternalLink,

```
```
  Phone,
  Mail,
  
```
```
Trash2

```
```
}
```
```
 from 'lucide-react';

```
```

// --- DONNÉES PRÉ-CHARGÉES ---
```
```


```
```
const
```
```
 initialMenuData = [

```
```
  
```
```
{

```
```
    day
```
```
: 'Lundi',

```
```
    items
```
```
: [

```
```
      { name: 'Paëlla végétarienne au riz', badges: ['bio'] },
      { name: 'Gouda', badges: ['bio'] },
      
```
```
{ name: 'Beignet chocolat noisette', badges: [] }

```
```
    
```
```
]

```
```
  
```
```
},

```
```
  
```
```
{

```
```
    day
```
```
: 'Mardi',

```
```
    items
```
```
: [

```
```
      { name: 'Nems de légumes', badges: [] },
      { name: 'Boulettes au boeuf / végétariennes', description: 'Sauce tomate', badges: ['france'] },
      
```
```
{ name: 'Haricots verts persillés', badges: ['bio'] },

```
```
      
```
```
{ name: 'Yaourt arôme', badges: ['regional'] }

```
```
    ]
  
```
```
},

```
```
  
```
```
{

```
```
    day
```
```
: 'Mercredi',

```
```
    isSpecial
```
```
: true,

```
```
    message
```
```
: "Les menus du mercredi seront affichés sur le panneau d'affichage de l'accueil de loisirs"

```
```
  
```
```
},

```
```
  
```
```
{

```
```
    day
```
```
: 'Jeudi',

```
```
    items
```
```
: [

```
```
      
```
```
{ name: 'Crêpe au fromage', badges: [] },

```
```
      
```
```
{ name: 'Galette végétale', description: 'Sauce aux épices', badges: [] },

```
```
      { name: 'Carottes Ce2 persillées', badges: ['ce2'] },
      
```
```
{ name: 'Yaourt aromatisé', badges: [] }

```
```
    
```
```
]

```
```
  
```
```
},

```
```
  {
    day
```
```
: 'Vendredi',

```
```
    items: [
      
```
```
{ name: 'Filet de saumon MSC', description: 'Sauce aneth', badges: ['msc'] },

```
```
      
```
```
{ name: 'Brocolis', badges: ['bio'] },

```
```
      
```
```
{ name: 'Mimolette', badges: ['bio'] },

```
```
      
```
```
{ name: 'Tarte au flan', badges: [] }

```
```
    ]
  
```
```
}

```
```
];
```
```


```
```

const
```
```
 initialPosts = [

```
```
  
```
```
{

```
```
    id: 'post-1',
    
```
```
type: 'menu',

```
```
    titre
```
```
: 'Menu de la cantine',

```
```
    date
```
```
: 'Cette semaine',

```
```
    resume
```
```
: 'Découvrez les plats servis à vos enfants à la cantine scolaire.',

```
```
    menu_jours: initialMenuData
  },
  
```
```
{

```
```
    id
```
```
: 'post-2',

```
```
    
```
```
type: 'evenement',

```
```
    titre
```
```
: 'Brocante de Printemps',

```
```
    date: 'Dimanche 24 Mai 2026',
    lieu
```
```
: 'Centre-ville, Annet-sur-Marne',

```
```
    date_debut_iso
```
```
: '20260524T060000Z',

```
```
    date_fin_iso: '20260524T180000Z',
    resume: 'Venez nombreux chiner à la brocante annuelle organisée par le comité des fêtes.',
    contenu_texte
```
```
: 'Le comité des fêtes d\'Annet-sur-Marne est heureux de vous annoncer le retour de sa grande brocante de printemps. Plus de 200 exposants sont attendus au centre-ville. Restauration sur place avec buvette et animations pour les enfants toute la journée.'

```
```
  },
  
```
```
{

```
```
    id
```
```
: 'post-3',

```
```
    
```
```
type: 'alerte',

```
```
    titre: 'Travaux Rue de la Marne',
    date
```
```
: 'Jusqu\'au 15 Avril',

```
```
    lieu
```
```
: 'Rue de la Marne',

```
```
    resume
```
```
: 'Circulation alternée en raison de travaux.',

```
```
    contenu_texte
```
```
: 'Des travaux d\'enfouissement des réseaux auront lieu rue de la Marne. La circulation se fera sur une seule voie avec des feux alternés. Le stationnement sera interdit sur la zone concernée de 8h à 17h. Merci de votre prudence et de votre compréhension.'

```
```
  },
  {
    id
```
```
: 'post-4',

```
```
    
```
```
type: 'coup_de_coeur',

```
```
    titre
```
```
: 'Qui se ressemble',

```
```
    date
```
```
: 'Cette semaine',

```
```
    auteur: 'Agnès Desarthe',
    edition: 'Ed La Résonnante',
    lien_externe
```
```
: 'https://www.google.com/search?q=Livre+Qui+se+ressemble+Agnès+Desarthe',

```
```
    resume: 'Découvrez le coup de cœur littéraire de la semaine proposé par Médi\'Annet.',
    contenu_texte
```
```
: 'Après avoir exploré ses origines familiales du côté de sa mère dans « Château des rentiers », Agnès Desarthe s\'intéresse maintenant à la branche paternelle.\n\nSa grand-mère, juive illettrée originaire de Libye s\'est installée à Orléansville en Algérie dans les années 20. Elle épouse sans amour un homme violent qui disparaît après la naissance de son dixième enfant et elle élève seule sa progéniture.\n\nLe petit dernier, père d\'Agnès, vient faire ses études de médecine en France et s\'installe en France.\n\nAgnès a 7 ans quand, un jour de shabbat en octobre elle apprend le déclenchement du conflit d\'Israel contre la Palestine. C\'est la guerre des Juifs contre les Arabes, mais comment comprendre pour un enfant qui est à la fois Juive et Arabe ?\n\nUn récit sensible, accompagné en filigrane par les chansons égyptiennes de l\'immense Oum Kalsoum qui avait l\'âge de cette grand-mère adorée à la forte personnalité.'

```
```
  }
];
```
```


```
```

// --- COMPOSANTS VISUELS & STYLES ---
```
```


```
```

const Badge = ({ type }) => {
  const badgeType = type?.toLowerCase();
  switch (badgeType) {
    case 'bio':
      
```
```
return (

```
```
        
```
```
<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm border border-green-200/50">

```
```
          <Leaf size={10} className="text-green-500" /> Bio
        
```
```
</span>

```
```
      
```
```
);

```
```
    
```
```
case 'france':

```
```
      
```
```
return (

```
```
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm border border-blue-200/50">
          
```
```
<Flag size={10} className="text-red-500" /> France

```
```
        
```
```
</span>

```
```
      
```
```
);

```
```
    
```
```
case 'regional':

```
```
      
```
```
return (

```
```
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm border border-amber-200/50">
          
```
```
<MapPin size={10} className="text-amber-500" /> Régional

```
```
        
```
```
</span>

```
```
      
```
```
);

```
```
    case 'msc':
      
```
```
return (

```
```
        
```
```
<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-800 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm border border-cyan-200/50">

```
```
          
```
```
<Fish size={10} className="text-cyan-500" /> MSC

```
```
        </span>
      );
    
```
```
case 'ce2':

```
```
    case 'certifié':
      
```
```
return (

```
```
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm border border-orange-200/50">
          
```
```
<Award size={10} className="text-orange-500" /> Qualité

```
```
        
```
```
</span>

```
```
      
```
```
);

```
```
    
```
```
default:

```
```
      return null;
  }
};
```
```


```
```

const
```
```
 MenuItem = ({ name, badges, description }) => {

```
```
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="group flex items-start justify-between p-4 hover:bg-slate-50/80 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100 mb-2 last:mb-0 relative overflow-hidden">
      
```
```
<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-blue-400 group-hover:h-3/4 transition-all duration-300 rounded-r-full opacity-0 group-hover:opacity-100"></div>

```
```
      
```
```


```
```
      
```
```
<div className="flex-1 pr-4 pl-2">

```
```
        
```
```
<div className="flex flex-wrap items-center gap-y-2 gap-x-2">

```
```
          
```
```
<span className="text-slate-800 font-bold text-base tracking-tight">{name}</span>

```
```
          <div className="flex gap-1">
            
```
```
{badges && badges.map((badge, idx) => <Badge key={idx} type={badge} />)}

```
```
          </div>
        
```
```
</div>

```
```
        
```
```
{description && (

```
```
          
```
```
<p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">

```
```
            
```
```
<Utensils size={12} className="text-slate-400" /> 

```
```
            
```
```
{description}

```
```
          </p>
        )}
      
```
```
</div>

```
```
      
```
```
<button 

```
```
        onClick={() => setIsFavorite(!isFavorite)}
        className={`p-3 rounded-full transition-all duration-300 transform active:scale-90 ${isFavorite ? 'text-rose-500 bg-rose-50 shadow-inner' : 'text-slate-300 hover:text-rose-400 hover:bg-rose-50 bg-white shadow-sm border border-slate-100'}`}
        title
```
```
="Coup de coeur"

```
```
      
```
```
>

```
```
        <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-pulse" : ""} />
      </button>
    
```
```
</div>

```
```
  
```
```
);

```
```
};
```
```


```
```

const getDayStyle = (dayName) => {
  
```
```
const normalized = dayName?.toLowerCase().trim() || '';

```
```
  
```
```
if (normalized.includes('lundi')) return { gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600', lightBg: 'bg-blue-50/30 border-blue-100/50' };

```
```
  if (normalized.includes('mardi')) return { gradient: 'bg-gradient-to-br from-lime-400 to-green-600', lightBg: 'bg-green-50/30 border-green-100/50' };
  if (normalized.includes('mercredi')) return { gradient: 'bg-gradient-to-br from-yellow-400 to-amber-500', lightBg: 'bg-amber-50/30 border-amber-100/50' };
  
```
```
if (normalized.includes('jeudi')) return { gradient: 'bg-gradient-to-br from-orange-400 to-red-500', lightBg: 'bg-orange-50/30 border-orange-100/50' };

```
```
  if (normalized.includes('vendredi')) return { gradient: 'bg-gradient-to-br from-rose-400 to-pink-600', lightBg: 'bg-pink-50/30 border-pink-100/50' };
  
```
```
return { gradient: 'bg-gradient-to-br from-slate-400 to-slate-600', lightBg: 'bg-slate-50 border-slate-100' };

```
```
};
```
```


```
```

const
```
```
 getTypeConfig = (type) => {

```
```
  
```
```
switch(type) {

```
```
    
```
```
case 'coup_de_coeur': return { 

```
```
      icon
```
```
: BookOpen, 

```
```
      color: 'text-pink-600', 
      bg: 'bg-pink-100/80', 
      label
```
```
: 'Médiathèque - Coup de ❤️',

```
```
      borderTop: 'border-t-pink-500',
      gradient
```
```
: 'from-pink-500/5 to-transparent'

```
```
    };
    case 'alerte': return { 
      icon: Megaphone, 
      color
```
```
: 'text-red-600', 

```
```
      bg
```
```
: 'bg-red-100/80', 

```
```
      label: 'Alerte / Travaux',
      borderTop
```
```
: 'border-t-red-500',

```
```
      gradient
```
```
: 'from-red-500/5 to-transparent'

```
```
    
```
```
};

```
```
    case 'evenement': return { 
      icon
```
```
: CalendarDays, 

```
```
      color: 'text-purple-600', 
      bg
```
```
: 'bg-purple-100/80', 

```
```
      label
```
```
: 'Événement',

```
```
      borderTop
```
```
: 'border-t-purple-500',

```
```
      gradient
```
```
: 'from-purple-500/5 to-transparent'

```
```
    
```
```
};

```
```
    case 'menu': return { 
      icon
```
```
: Utensils, 

```
```
      color
```
```
: 'text-orange-600', 

```
```
      bg
```
```
: 'bg-orange-100/80', 

```
```
      label: 'Menu Cantine',
      borderTop
```
```
: 'border-t-orange-500',

```
```
      gradient: 'from-orange-500/5 to-transparent'
    
```
```
};

```
```
    
```
```
default: return { 

```
```
      icon: Info, 
      color
```
```
: 'text-blue-600', 

```
```
      bg: 'bg-blue-100/80', 
      label
```
```
: 'Information',

```
```
      borderTop: 'border-t-blue-500',
      gradient
```
```
: 'from-blue-500/5 to-transparent'

```
```
    
```
```
};

```
```
  }
};
```
```


```
```

export default function App() {
  const [posts, setPosts] = useState(initialPosts);
  
```
```
const [isLoading, setIsLoading] = useState(false);

```
```
  
```
```
const [error, setError] = useState(null);

```
```
  
```
```
const [isDragging, setIsDragging] = useState(false);

```
```
  const fileInputRef = useRef(null);

  
```
```
const deletePost = (idToDelete) => {

```
```
    setPosts
```
```
(prevPosts => prevPosts.filter(post => post.id !== idToDelete));

```
```
  };

  
```
```
const processFile = (file) => {

```
```
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError("Format non supporté. Veuillez utiliser une image (JPG, PNG).");
      
```
```
return;

```
```
    }
    
```
```
const reader = new FileReader();

```
```
    reader.onload = (e) => {
      
```
```
const base64String = e.target.result.split(',')[1];

```
```
      processImageWithAI(base64String, file.type);
    
```
```
};

```
```
    reader
```
```
.onerror = () => setError("Erreur lors de la lecture.");

```
```
    reader.readAsDataURL(file);
  };

  const processImageWithAI = async (base64Data, mimeType) => {
    setIsLoading
```
```
(true); setError(null);

```
```
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    // NOUVELLES INSTRUCTIONS STRICTES POUR L'IA
    
```
```
const payload = {

```
```
      contents: [{
        role: "user",
        parts
```
```
: [

```
```
          
```
```
{ text: `Tu es un assistant de la mairie d'Annet-sur-Marne. Analyse cette image avec une très grande précision.

```
```
            1. Détermine son type: "menu", "alerte", "evenement", "info", ou "coup_de_coeur".
            2. Donne un 'titre' court, un 'resume' (1-2 phrases maximum), et la 'date'.
```
```


```
```
            3. Extrais le lieu exact dans 'lieu'. Pour un événement, fournis 'date_debut_iso' et 'date_fin_iso' au format YYYYMMDDTHHmmssZ.
```
```


```
```
            4. SI c'est un "coup_de_coeur", extrais le nom de l'auteur dans 'auteur' et l'édition dans 'edition'. Génère un 'lien_externe' de recherche Google.
            5. SI c'est un menu: remplis 'menu_jours' (day, items avec name, description, badges).
```
```


```
```
            6. RÈGLE ABSOLUE POUR 'contenu_texte' : Retranscris L'INTÉGRALITÉ du texte présent sur l'image mot pour mot. Ne fais AUCUN résumé. Copie absolument tout le texte, en conservant tous les détails, les paragraphes et les retours à la ligne originaux.`
```
```
 },

```
```
          
```
```
{ inlineData: { mimeType: mimeType, data: base64Data } }

```
```
        
```
```
]

```
```
      
```
```
}],

```
```
      generationConfig
```
```
: {

```
```
        responseMimeType
```
```
: "application/json",

```
```
        responseSchema
```
```
: {

```
```
          type: "OBJECT",
          properties
```
```
: {

```
```
            
```
```
type: { type: "STRING", enum: ["menu", "alerte", "evenement", "info", "coup_de_coeur"] },

```
```
            titre: { type: "STRING" },
            resume: { type: "STRING" },
            date
```
```
: { type: "STRING" },

```
```
            lieu: { type: "STRING" },
            auteur
```
```
: { type: "STRING" },

```
```
            edition
```
```
: { type: "STRING" },

```
```
            lien_externe: { type: "STRING" },
            date_debut_iso: { type: "STRING" },
            date_fin_iso
```
```
: { type: "STRING" },

```
```
            contenu_texte: { type: "STRING", description: "Le texte intégral et complet copié mot pour mot depuis l'image" },
            menu_jours
```
```
: {

```
```
              
```
```
type: "ARRAY",

```
```
              items
```
```
: {

```
```
                type: "OBJECT",
                properties
```
```
: {

```
```
                  day: { type: "STRING" },
                  isSpecial
```
```
: { type: "BOOLEAN" },

```
```
                  message: { type: "STRING" },
                  items: {
                    type: "ARRAY",
                    items
```
```
: {

```
```
                      
```
```
type: "OBJECT",

```
```
                      properties
```
```
: {

```
```
                        name: { type: "STRING" },
                        description
```
```
: { type: "STRING" },

```
```
                        badges
```
```
: { type: "ARRAY", items: { type: "STRING" } }

```
```
                      }
                    
```
```
}

```
```
                  
```
```
}

```
```
                
```
```
},

```
```
                required
```
```
: ["day"]

```
```
              }
            }
          
```
```
},

```
```
          required
```
```
: ["type", "titre", "resume"]

```
```
        }
      }
    
```
```
};

```
```

    try {
      let response;
      const delays = [1000, 2000, 4000, 8000];
      for (let i = 0; i < 4; i++) {
        try {
          response 
```
```
= await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

```
```
          if (response.ok) break;
        
```
```
} catch (err) {

```
```
          
```
```
if (i === 3) throw err;

```
```
          
```
```
await new Promise(r => setTimeout(r, delays[i]));

```
```
        
```
```
}

```
```
      }
      
```
```
if (!response.ok) throw new Error("Erreur IA.");

```
```
      
```
```
const result = await response.json();

```
```
      
```
```
let extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

```
```
      if (extractedText) {
        extractedText 
```
```
= extractedText.replace(/```json/g, '').replace(/```/g, '').trim();

```
```
        const newPost = JSON.parse(extractedText);
        newPost
```
```
.id = `post-${Date.now()}`;

```
```
        setPosts(prev => [newPost, ...prev]);
      } else throw new Error("Impossible d'extraire.");
    } catch (err) {
      setError
```
```
("Analyse échouée. Assurez-vous d'utiliser une image nette.");

```
```
    } finally {
      setIsLoading
```
```
(false);

```
```
    
```
```
}

```
```
  
```
```
};

```
```

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  
```
```
const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

```
```
  
```
```
const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]); };

```
```
  
```
```
const handlePaste = (e) => {

```
```
    
```
```
if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

```
```
    
```
```
const items = e.clipboardData?.items;

```
```
    if (!items) return;
    
```
```
for (let i = 0; i < items.length; i++) {

```
```
      if (items[i].type.indexOf('image') !== -1) {
        e
```
```
.preventDefault();

```
```
        processFile(items[i].getAsFile());
        break;
      
```
```
}

```
```
    
```
```
}

```
```
  };

  
```
```
const getGoogleCalendarUrl = (post) => {

```
```
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    
```
```
const title = encodeURIComponent(post.titre || '');

```
```
    const details = encodeURIComponent(post.contenu_texte || post.resume || '');
    
```
```
const location = encodeURIComponent(post.lieu || 'Annet-sur-Marne');

```
```
    let dates = '';
    
```
```
if (post.date_debut_iso) {

```
```
      const start = post.date_debut_iso.replace(/[-:]/g, ''); 
      
```
```
const end = post.date_fin_iso ? post.date_fin_iso.replace(/[-:]/g, '') : start;

```
```
      dates 
```
```
= `&dates=${start}/${end}`;

```
```
    }
    return `${baseUrl}&text=${title}&details=${details}&location=${location}${dates}`;
  
```
```
};

```
```

  
```
```
return (

```
```
    
```
```
<div 

```
```
      className={`min-h-screen font-sans text-slate-800 transition-colors duration-500 pb-20 outline-none ${isDragging ? 'bg-indigo-50/80' : 'bg-slate-50/50'}`}
      onDragOver
```
```
={handleDragOver}

```
```
      onDragLeave
```
```
={handleDragLeave}

```
```
      onDrop
```
```
={handleDrop}

```
```
      onPaste
```
```
={handlePaste}

```
```
      tabIndex
```
```
={0}

```
```
    
```
```
>

```
```
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-md pointer-events-none transition-all duration-300">
          
```
```
<div className="bg-white/90 p-12 rounded-[3rem] shadow-2xl border-4 border-dashed border-indigo-400 flex flex-col items-center animate-bounce">

```
```
            <div className="p-6 bg-indigo-100 rounded-full mb-6">
              <UploadCloud size={64} className="text-indigo-600" />
            
```
```
</div>

```
```
            
```
```
<h2 className="text-4xl font-black text-slate-800 tracking-tight">Relâchez l'image</h2>

```
```
            
```
```
<p className="text-slate-500 font-medium mt-3 text-lg">L'IA va tout formater magiquement ✨</p>

```
```
          
```
```
</div>

```
```
        
```
```
</div>

```
```
      
```
```
)}

```
```

      
```
```
<header className="bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-40 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">

```
```
        
```
```
<div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-5">

```
```
          
```
```
<div className="flex items-center gap-5 group cursor-pointer">

```
```
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform group-hover:rotate-12 transition-all duration-300">
              <MapPin className="text-white drop-shadow-sm" size={28} />
            </div>
            
```
```
<div>

```
```
              
```
```
<h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">Annet-sur-Marne</h1>

```
```
              <p className="text-sm font-bold text-indigo-500/80 uppercase tracking-[0.2em] mt-0.5">Portail Citoyen</p>
            </div>
          </div>

          
```
```
<div className="flex flex-col items-center md:items-end w-full md:w-auto">

```
```
            <label className={`w-full md:w-auto relative group flex items-center justify-center gap-2.5 px-8 py-3.5 text-white font-bold rounded-full transition-all duration-300 shadow-xl overflow-hidden ${isLoading ? 'bg-slate-700 opacity-50 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-0.5 cursor-pointer'}`}>
              <input 
                type="file" 
                onChange
```
```
={(e) => { 

```
```
                  
```
```
if(e.target.files[0]) { 

```
```
                    processFile(e.target.files[0]); 
                    e
```
```
.target.value = ''; // Permet de re-sélectionner le même fichier ensuite

```
```
                  } 
                
```
```
}} 

```
```
                accept="image/*" 
                className
```
```
="hidden" 

```
```
                disabled={isLoading} 
              />
```
```


```
```
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
```
```
{isLoading ? <Loader2 className="animate-spin relative z-10" size={20} /> : <Sparkles size={20} className="relative z-10 text-indigo-300 group-hover:text-white transition-colors" />}

```
```
              
```
```
<span className="relative z-10">{isLoading ? "Analyse IA..." : "Scanner une publication"}</span>

```
```
            
```
```
</label>

```
```
            
```
```
<div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-3 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">

```
```
              
```
```
<Clipboard size={12} />

```
```
              <span>Astuce : Appuyez sur <kbd className="font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-0.5">Ctrl+V</kbd></span>
            
```
```
</div>

```
```
          
```
```
</div>

```
```
        </div>
      </header>

      
```
```
<main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

```
```
        
```
```


```
```
        {error && (
          
```
```
<div className="mb-10 p-5 bg-red-50 text-red-700 border-2 border-red-100 rounded-3xl flex items-center justify-between shadow-lg shadow-red-500/10 animate-in slide-in-from-top-4">

```
```
            
```
```
<div className="flex items-center gap-4">

```
```
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle size={24} className="text-red-600" />
              
```
```
</div>

```
```
              
```
```
<p className="font-bold text-lg">{error}</p>

```
```
            
```
```
</div>

```
```
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 p-2 bg-white rounded-full transition-colors shadow-sm">✕</button>
          </div>
        )}

        
```
```
{isLoading && (

```
```
          <div className="my-10 p-12 bg-white rounded-[3rem] shadow-xl shadow-indigo-900/5 flex flex-col items-center justify-center text-center animate-in fade-in border border-slate-50 relative overflow-hidden">
            
```
```
<div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent"></div>

```
```
            
```
```
<div className="relative mb-8">

```
```
              <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"></div>
              
```
```
<div className="bg-indigo-50 p-5 rounded-full relative border-4 border-white shadow-lg">

```
```
                
```
```
<Loader2 className="text-indigo-600 animate-spin" size={48} />

```
```
              
```
```
</div>

```
```
            
```
```
</div>

```
```
            
```
```
<h3 className="text-3xl font-black text-slate-800 mb-3 relative z-10">Intelligence Artificielle en action...</h3>

```
```
            
```
```
<p className="text-slate-500 font-medium text-lg relative z-10">Extraction et retranscription intégrale de toutes les informations.</p>

```
```
          
```
```
</div>

```
```
        
```
```
)}

```
```

        <div className="space-y-12">
          
```
```
{posts.map((post) => {

```
```
            const config = getTypeConfig(post.type);
            
```
```
const Icon = config.icon;

```
```

            return (
              
```
```
<article key={post.id} className={`bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-700 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all relative border-t-4 ${config.borderTop}`}>

```
```
                
```
```


```
```
                
```
```
<div className={`p-8 md:p-10 relative overflow-hidden bg-gradient-to-b ${config.gradient}`}>

```
```
                  
```
```
<div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">

```
```
                    
```
```
<div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white">

```
```
                      <div className={`p-2 rounded-xl ${config.bg}`}>
                        
```
```
<Icon className={config.color} size={20} />

```
```
                      
```
```
</div>

```
```
                      
```
```
<span className={`text-sm font-black uppercase tracking-widest ${config.color}`}>

```
```
                        
```
```
{config.label}

```
```
                      
```
```
</span>

```
```
                    </div>

                    
```
```
<div className="flex items-center gap-3">

```
```
                      
```
```
{post.date && (

```
```
                        <span className="text-sm font-bold text-slate-600 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white flex items-center gap-2.5 shadow-sm">
                          
```
```
<Clock size={16} className={config.color} />

```
```
                          {post.date}
                        </span>
                      
```
```
)}

```
```
                      
```
```
<button 

```
```
                        onClick={() => deletePost(post.id)}
                        className
```
```
="p-2.5 bg-white/60 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-2xl backdrop-blur-md transition-all border border-white hover:border-red-200 shadow-sm"

```
```
                        title="Supprimer la publication"
                      
```
```
>

```
```
                        <Trash2 size={18} />
                      </button>
                    
```
```
</div>

```
```
                  
```
```
</div>

```
```
                  
```
```


```
```
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight tracking-tight relative z-10">
                    {post.titre}
                  </h2>
                  
```
```
<p className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed relative z-10 max-w-3xl">

```
```
                    {post.resume}
                  
```
```
</p>

```
```
                
```
```
</div>

```
```

                <div className="p-4 md:p-8 pt-0">
                  
```
```


```
```
                  {post.type === 'menu' && post.menu_jours && (
                    
```
```
<div className="grid grid-cols-1 gap-4">

```
```
                      {post.menu_jours.map((dayData, index) => {
                        const styles = getDayStyle(dayData.day);
                        
```
```
return (

```
```
                          
```
```
<div key={index} className={`flex flex-col sm:flex-row bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 ${styles.lightBg}`}>

```
```
                            <div className={`${styles.gradient} sm:w-24 p-4 sm:p-0 flex items-center justify-center shrink-0`}>
                              
```
```
<h3 className="text-white font-black text-xl tracking-[0.2em] uppercase sm:[writing-mode:vertical-rl] sm:-rotate-180 drop-shadow-md">

```
```
                                {dayData.day}
                              </h3>
                            
```
```
</div>

```
```
                            <div className="flex-1 p-5 md:p-6 bg-white/80 backdrop-blur-md">
                              {dayData.isSpecial ? (
                                
```
```
<div className="h-full min-h-[120px] flex items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">

```
```
                                  <p className="text-center text-slate-500 font-semibold flex flex-col items-center gap-3">
                                    <Info className="text-slate-300" size={32} />
                                    {dayData.message || "Aucun menu."}
                                  
```
```
</p>

```
```
                                
```
```
</div>

```
```
                              
```
```
) : (

```
```
                                <div className="flex flex-col justify-center">
                                  
```
```
{dayData.items && dayData.items.map((item, idx) => (

```
```
                                    <MenuItem key={idx} name={item.name} description={item.description} badges={item.badges} />
                                  
```
```
))}

```
```
                                
```
```
</div>

```
```
                              
```
```
)}

```
```
                            
```
```
</div>

```
```
                          
```
```
</div>

```
```
                        
```
```
);

```
```
                      })}
                    </div>
                  
```
```
)}

```
```

                  
```
```
{post.type === 'evenement' && (

```
```
                    <div className="flex flex-col lg:flex-row gap-6">
                      
```
```
<div className="flex-1 bg-slate-50/80 p-8 rounded-3xl border border-slate-100 text-slate-700 whitespace-pre-wrap leading-relaxed text-lg font-medium">

```
```
                        
```
```
{post.contenu_texte}

```
```
                      </div>
                      
                      
```
```
<div className="w-full lg:w-80 flex flex-col gap-4">

```
```
                        {post.lieu && (
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10"></div>
                            
```
```
<div className="flex items-start gap-4">

```
```
                              
```
```
<div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">

```
```
                                
```
```
<MapPin size={24} />

```
```
                              
```
```
</div>

```
```
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                                
```
```
<p className="text-base font-bold text-slate-800">{post.lieu}</p>

```
```
                              </div>
                            </div>
                          </div>
                        )}
                        
```
```


```
```
                        
```
```
<a 

```
```
                          href={getGoogleCalendarUrl(post)}
                          target="_blank"
                          rel
```
```
="noopener noreferrer"

```
```
                          className
```
```
="group w-full flex items-center justify-between p-6 bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-3xl transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:-translate-y-1"

```
```
                        
```
```
>

```
```
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                              
```
```
<CalendarPlus size={24} className="text-white" />

```
```
                            
```
```
</div>

```
```
                            
```
```
<span className="font-bold text-lg">Ajouter à l'agenda</span>

```
```
                          </div>
                          <ChevronRight size={24} className="text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        
```
```
</a>

```
```
                      
```
```
</div>

```
```
                    </div>
                  
```
```
)}

```
```

                  
```
```
{post.type === 'coup_de_coeur' && (

```
```
                    <div className="flex flex-col lg:flex-row gap-8">
                      <div className="flex-1 bg-white p-8 md:p-10 rounded-3xl border border-pink-100 shadow-sm relative overflow-hidden">
                        
```
```
<div className="absolute -top-6 -left-4 text-9xl text-pink-50 opacity-60 font-serif leading-none select-none pointer-events-none">"</div>

```
```
                        
```
```


```
```
                        
```
```
{(post.auteur || post.edition) && (

```
```
                          <div className="mb-8 flex flex-wrap gap-4 relative z-10">
                            {post.auteur && <span className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-pink-200 flex items-center gap-2">✍️ {post.auteur}</span>}
                            
```
```
{post.edition && <span className="px-5 py-2.5 bg-white text-slate-700 rounded-2xl font-semibold text-sm border border-slate-200 shadow-sm flex items-center gap-2">📚 {post.edition}</span>}

```
```
                          
```
```
</div>

```
```
                        
```
```
)}

```
```
                        <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg font-medium relative z-10 first-letter:text-6xl first-letter:font-black first-letter:text-pink-500 first-letter:mr-2 first-letter:float-left first-line:tracking-wide">
                          {post.contenu_texte}
                        
```
```
</div>

```
```
                      
```
```
</div>

```
```

                      
```
```
<div className="w-full lg:w-80 flex flex-col gap-4">

```
```
                        
```
```
{post.lien_externe && (

```
```
                          
```
```
<a 

```
```
                            href={post.lien_externe}
                            target
```
```
="_blank"

```
```
                            rel
```
```
="noopener noreferrer"

```
```
                            className
```
```
="group w-full flex items-center justify-between p-6 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-3xl transition-all shadow-xl shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-1"

```
```
                          >
                            <div className="flex items-center gap-4">
                              
```
```
<div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">

```
```
                                
```
```
<ExternalLink size={24} className="text-white" />

```
```
                              </div>
                              <span className="font-bold text-lg">En savoir plus</span>
                            </div>
                            
```
```
<ChevronRight size={24} className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />

```
```
                          
```
```
</a>

```
```
                        
```
```
)}

```
```
                        
```
```


```
```
                        
```
```
<div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">

```
```
                          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-bl-full -z-10 opacity-70"></div>
                          <div className="flex items-start gap-4 mb-3">
                            <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl">
                              
```
```
<Info size={24} />

```
```
                            </div>
                            <div>
                              
```
```
<p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Médi'Annet</p>

```
```
                              <p className="text-base font-bold text-slate-800">Contactez Rose</p>
                            
```
```
</div>

```
```
                          
```
```
</div>

```
```
                          
```
```
<p className="text-sm text-slate-500 font-medium mb-4">Pour réserver ce livre ou obtenir un conseil :</p>

```
```
                          
```
```


```
```
                          
```
```
<div className="flex flex-col gap-3">

```
```
                            <a href="tel:0160038596" className="flex items-center gap-3 text-slate-700 hover:text-pink-600 transition-colors font-semibold bg-slate-50 hover:bg-pink-50/60 p-3 rounded-2xl border border-transparent hover:border-pink-100">
                              
```
```
<div className="p-1.5 bg-white rounded-lg shadow-sm"><Phone size={16} className="text-pink-500" /></div>

```
```
                              
```
```
01 60 03 85 96

```
```
                            
```
```
</a>

```
```
                            
```
```
<a href="mailto:mediatheque@annetsurmarne.fr" className="flex items-center gap-3 text-slate-700 hover:text-pink-600 transition-colors font-semibold bg-slate-50 hover:bg-pink-50/60 p-3 rounded-2xl border border-transparent hover:border-pink-100">

```
```
                              
```
```
<div className="p-1.5 bg-white rounded-lg shadow-sm"><Mail size={16} className="text-pink-500 shrink-0" /></div>

```
```
                              <span className="text-[13px] break-all">mediatheque@annetsurmarne.fr</span>
                            </a>
                          
```
```
</div>

```
```
                        </div>
                      
```
```
</div>

```
```
                    
```
```
</div>

```
```
                  
```
```
)}

```
```

                  {(post.type === 'alerte' || post.type === 'info') && (
                    <div className="flex flex-col lg:flex-row gap-6">
                      
```
```
<div className="flex-1 bg-slate-50/80 p-8 rounded-3xl border border-slate-100 text-slate-700 whitespace-pre-wrap leading-relaxed text-lg font-medium">

```
```
                        
```
```
{post.contenu_texte}

```
```
                      
```
```
</div>

```
```
                      
```
```
{post.lieu && (

```
```
                        <div className="w-full lg:w-80 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] h-fit relative overflow-hidden">
                          
```
```
<div className={`absolute top-0 right-0 w-24 h-24 ${config.bg} rounded-bl-full -z-10 opacity-50`}></div>

```
```
                          
```
```
<div className="flex items-start gap-4">

```
```
                            <div className={`p-3 rounded-2xl ${config.bg} ${config.color}`}>
                              <MapPin size={24} />
                            </div>
                            
```
```
<div>

```
```
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                              <p className="text-base font-bold text-slate-800">{post.lieu}</p>
                            
```
```
</div>

```
```
                          
```
```
</div>

```
```
                        </div>
                      )}
                    </div>
                  
```
```
)}

```
```

                
```
```
</div>

```
```
              </article>
            
```
```
);

```
```
          })}
        
```
```
</div>

```
```

      
```
```
</main>

```
```
    
```
```
</div>

```
```
  
```
```
);

```
```
}
```
```


```
