import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarPlus,
  CalendarDays,
  ChevronRight,
  Clipboard,
  Clock,
  ExternalLink,
  Fish,
  Flag,
  Heart,
  Info,
  Leaf,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Sparkles,
  Trash2,
  UploadCloud,
  Utensils,
} from 'lucide-react';
import { initialPosts } from './mockData.js';
import { analyzePublicationImage } from './publicationApi.js';
import { getGoogleCalendarUrl } from '../shared/publicationSchema.js';

function Badge({ type }) {
  const badgeType = type?.toLowerCase();

  switch (badgeType) {
    case 'bio':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200/60 bg-gradient-to-r from-green-50 to-green-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-green-700 shadow-sm">
          <Leaf size={10} className="text-green-500" /> Bio
        </span>
      );
    case 'france':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/60 bg-gradient-to-r from-blue-50 to-blue-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-blue-700 shadow-sm">
          <Flag size={10} className="text-red-500" /> France
        </span>
      );
    case 'regional':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 shadow-sm">
          <MapPin size={10} className="text-amber-500" /> Regional
        </span>
      );
    case 'msc':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/60 bg-gradient-to-r from-cyan-50 to-cyan-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-cyan-800 shadow-sm">
          <Fish size={10} className="text-cyan-500" /> MSC
        </span>
      );
    case 'ce2':
    case 'certifié':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200/60 bg-gradient-to-r from-orange-50 to-orange-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-orange-800 shadow-sm">
          <Award size={10} className="text-orange-500" /> Qualite
        </span>
      );
    default:
      return null;
  }
}

function MenuItem({ item }) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="group relative mb-2 flex items-start justify-between overflow-hidden rounded-2xl border border-transparent p-4 transition-all duration-300 last:mb-0 hover:border-slate-100 hover:bg-slate-50/80">
      <div className="absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-blue-400 opacity-0 transition-all duration-300 group-hover:h-3/4 group-hover:opacity-100" />

      <div className="flex-1 pl-2 pr-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-base font-bold tracking-tight text-slate-800">{item.name}</span>
          <div className="flex gap-1">
            {item.badges.map((badge) => (
              <Badge key={`${item.id}-${badge}`} type={badge} />
            ))}
          </div>
        </div>

        {item.description ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Utensils size={12} className="text-slate-400" />
            {item.description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setIsFavorite((value) => !value)}
        className={`rounded-full p-3 transition-all duration-300 active:scale-90 ${
          isFavorite
            ? 'bg-rose-50 text-rose-500 shadow-inner'
            : 'border border-slate-100 bg-white text-slate-300 shadow-sm hover:bg-rose-50 hover:text-rose-400'
        }`}
        title="Marquer comme coup de coeur"
        aria-pressed={isFavorite}
      >
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'animate-pulse' : ''} />
      </button>
    </div>
  );
}

function getDayStyle(dayName) {
  const normalized = dayName?.toLowerCase().trim() || '';

  if (normalized.includes('lundi')) return { gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600', lightBg: 'border-blue-100/50 bg-blue-50/30' };
  if (normalized.includes('mardi')) return { gradient: 'bg-gradient-to-br from-lime-400 to-green-600', lightBg: 'border-green-100/50 bg-green-50/30' };
  if (normalized.includes('mercredi')) return { gradient: 'bg-gradient-to-br from-yellow-400 to-amber-500', lightBg: 'border-amber-100/50 bg-amber-50/30' };
  if (normalized.includes('jeudi')) return { gradient: 'bg-gradient-to-br from-orange-400 to-red-500', lightBg: 'border-orange-100/50 bg-orange-50/30' };
  if (normalized.includes('vendredi')) return { gradient: 'bg-gradient-to-br from-rose-400 to-pink-600', lightBg: 'border-pink-100/50 bg-pink-50/30' };

  return { gradient: 'bg-gradient-to-br from-slate-400 to-slate-600', lightBg: 'border-slate-100 bg-slate-50' };
}

function getTypeConfig(type) {
  switch (type) {
    case 'coup_de_coeur':
      return {
        icon: BookOpen,
        color: 'text-pink-600',
        bg: 'bg-pink-100/80',
        label: 'Mediatheque - Coup de coeur',
        borderTop: 'border-t-pink-500',
        gradient: 'from-pink-500/5 to-transparent',
      };
    case 'alerte':
      return {
        icon: Megaphone,
        color: 'text-red-600',
        bg: 'bg-red-100/80',
        label: 'Alerte / Travaux',
        borderTop: 'border-t-red-500',
        gradient: 'from-red-500/5 to-transparent',
      };
    case 'evenement':
      return {
        icon: CalendarDays,
        color: 'text-purple-600',
        bg: 'bg-purple-100/80',
        label: 'Evenement',
        borderTop: 'border-t-purple-500',
        gradient: 'from-purple-500/5 to-transparent',
      };
    case 'menu':
      return {
        icon: Utensils,
        color: 'text-orange-600',
        bg: 'bg-orange-100/80',
        label: 'Menu cantine',
        borderTop: 'border-t-orange-500',
        gradient: 'from-orange-500/5 to-transparent',
      };
    default:
      return {
        icon: Info,
        color: 'text-blue-600',
        bg: 'bg-blue-100/80',
        label: 'Information',
        borderTop: 'border-t-blue-500',
        gradient: 'from-blue-500/5 to-transparent',
      };
  }
}

function UploadOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-md transition-all duration-300">
      <div className="flex animate-bounce flex-col items-center rounded-[3rem] border-4 border-dashed border-indigo-400 bg-white/90 p-12 shadow-2xl">
        <div className="mb-6 rounded-full bg-indigo-100 p-6">
          <UploadCloud size={64} className="text-indigo-600" />
        </div>
        <h2 className="text-4xl font-black tracking-tight text-slate-800">Relachez l'image</h2>
        <p className="mt-3 text-lg font-medium text-slate-500">L'analyse sera envoyee au serveur securise.</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="mb-10 flex items-center justify-between rounded-3xl border-2 border-red-100 bg-red-50 p-5 text-red-700 shadow-lg shadow-red-500/10" role="alert">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-red-100 p-2">
          <AlertCircle size={24} className="text-red-600" />
        </div>
        <p className="text-lg font-bold">{message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="rounded-full bg-white p-2 text-red-400 shadow-sm transition-colors hover:text-red-700">
        ×
      </button>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="relative my-10 flex flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-slate-50 bg-white p-12 text-center shadow-xl shadow-indigo-900/5">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent" />
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping" />
        <div className="relative rounded-full border-4 border-white bg-indigo-50 p-5 shadow-lg">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      </div>
      <h3 className="relative z-10 mb-3 text-3xl font-black text-slate-800">Analyse en cours...</h3>
      <p className="relative z-10 text-lg font-medium text-slate-500">Extraction, validation et normalisation des informations.</p>
    </div>
  );
}

function EventPanel({ post }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 rounded-3xl border border-slate-100 bg-slate-50/80 p-8 text-lg font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
        {post.contenu_texte}
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-80">
        {post.lieu ? (
          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="absolute right-0 top-0 -z-10 h-24 w-24 rounded-bl-full bg-purple-50" />
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-purple-100 p-3 text-purple-600">
                <MapPin size={24} />
              </div>
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">Localisation</p>
                <p className="text-base font-bold text-slate-800">{post.lieu}</p>
              </div>
            </div>
          </div>
        ) : null}

        {post.date_debut_iso ? (
          <a
            href={getGoogleCalendarUrl(post)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center justify-between rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-lg shadow-purple-600/30 transition-all hover:-translate-y-1 hover:from-purple-500 hover:to-indigo-600 hover:shadow-purple-600/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                <CalendarPlus size={24} className="text-white" />
              </div>
              <span className="text-lg font-bold">Ajouter a l'agenda</span>
            </div>
            <ChevronRight size={24} className="text-white/70 transition-all group-hover:translate-x-1 group-hover:text-white" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function RecommendationPanel({ post }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="relative flex-1 overflow-hidden rounded-3xl border border-pink-100 bg-white p-8 shadow-sm md:p-10">
        <div className="pointer-events-none absolute -left-4 -top-6 select-none font-serif text-9xl leading-none text-pink-50 opacity-60">"</div>

        {(post.auteur || post.edition) ? (
          <div className="relative z-10 mb-8 flex flex-wrap gap-4">
            {post.auteur ? <span className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-200">Auteur: {post.auteur}</span> : null}
            {post.edition ? <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">Edition: {post.edition}</span> : null}
          </div>
        ) : null}

        <div className="relative z-10 text-lg font-medium leading-relaxed text-slate-700 whitespace-pre-wrap first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:text-pink-500">
          {post.contenu_texte}
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-80">
        {post.lien_externe ? (
          <a
            href={post.lien_externe}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center justify-between rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 hover:from-slate-700 hover:to-slate-800 hover:shadow-slate-900/40"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <ExternalLink size={24} className="text-white" />
              </div>
              <span className="text-lg font-bold">En savoir plus</span>
            </div>
            <ChevronRight size={24} className="text-white/50 transition-all group-hover:translate-x-1 group-hover:text-white" />
          </a>
        ) : null}

        <div className="relative overflow-hidden rounded-3xl border border-pink-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
          <div className="absolute right-0 top-0 -z-10 h-24 w-24 rounded-bl-full bg-pink-50 opacity-70" />
          <div className="mb-3 flex items-start gap-4">
            <div className="rounded-2xl bg-pink-100 p-3 text-pink-600">
              <Info size={24} />
            </div>
            <div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">Medi'Annet</p>
              <p className="text-base font-bold text-slate-800">Contactez Rose</p>
            </div>
          </div>

          <p className="mb-4 text-sm font-medium text-slate-500">Pour reserver ce livre ou obtenir un conseil :</p>

          <div className="flex flex-col gap-3">
            <a href="tel:0160038596" className="flex items-center gap-3 rounded-2xl border border-transparent bg-slate-50 p-3 font-semibold text-slate-700 transition-colors hover:border-pink-100 hover:bg-pink-50/60 hover:text-pink-600">
              <div className="rounded-lg bg-white p-1.5 shadow-sm">
                <Phone size={16} className="text-pink-500" />
              </div>
              01 60 03 85 96
            </a>
            <a href="mailto:mediatheque@annetsurmarne.fr" className="flex items-center gap-3 rounded-2xl border border-transparent bg-slate-50 p-3 font-semibold text-slate-700 transition-colors hover:border-pink-100 hover:bg-pink-50/60 hover:text-pink-600">
              <div className="rounded-lg bg-white p-1.5 shadow-sm">
                <Mail size={16} className="text-pink-500" />
              </div>
              <span className="break-all text-[13px]">mediatheque@annetsurmarne.fr</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPanel({ post, config }) {
  if (post.type === 'menu') {
    return (
      <div className="grid grid-cols-1 gap-4">
        {post.menu_jours.map((dayData) => {
          const styles = getDayStyle(dayData.day);

          return (
            <div key={dayData.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg sm:flex-row ${styles.lightBg}`}>
              <div className={`${styles.gradient} flex shrink-0 items-center justify-center p-4 sm:w-24 sm:p-0`}>
                <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white drop-shadow-md sm:[writing-mode:vertical-rl] sm:-rotate-180">{dayData.day}</h3>
              </div>

              <div className="flex-1 bg-white/80 p-5 backdrop-blur-md md:p-6">
                {dayData.isSpecial ? (
                  <div className="flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6">
                    <p className="flex flex-col items-center gap-3 text-center font-semibold text-slate-500">
                      <Info className="text-slate-300" size={32} />
                      {dayData.message || 'Aucun menu.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center">
                    {dayData.items.map((item) => (
                      <MenuItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (post.type === 'evenement') {
    return <EventPanel post={post} />;
  }

  if (post.type === 'coup_de_coeur') {
    return <RecommendationPanel post={post} />;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 rounded-3xl border border-slate-100 bg-slate-50/80 p-8 text-lg font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
        {post.contenu_texte}
      </div>
      {post.lieu ? (
        <div className="relative h-fit w-full overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] lg:w-80">
          <div className={`absolute right-0 top-0 -z-10 h-24 w-24 rounded-bl-full opacity-50 ${config.bg}`} />
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-3 ${config.bg} ${config.color}`}>
              <MapPin size={24} />
            </div>
            <div>
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">Localisation</p>
              <p className="text-base font-bold text-slate-800">{post.lieu}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const requestAbortRef = useRef(null);

  useEffect(() => {
    function handleWindowPaste(event) {
      const targetTag = event.target?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || isLoading) {
        return;
      }

      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) {
        return;
      }

      event.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        void handleFile(file);
      }
    }

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
      requestAbortRef.current?.abort();
    };
  }, [isLoading]);

  async function handleFile(file) {
    if (!file || isLoading) {
      return;
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;

    setError('');
    setStatusMessage('');
    setIsLoading(true);

    try {
      const publication = await analyzePublicationImage(file, { signal: controller.signal });
      setPosts((currentPosts) => [publication, ...currentPosts]);
      setStatusMessage(`Publication "${publication.titre}" ajoutee.`);
    } catch (uploadError) {
      if (uploadError?.name !== 'AbortError') {
        setError(uploadError.message || "L'analyse de l'image a echoue.");
      }
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
        setIsLoading(false);
      }
    }
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }

    event.target.value = '';
  }

  function deletePost(idToDelete) {
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== idToDelete));
  }

  return (
    <div
      className={`min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-800 transition-colors duration-500 ${isDragging ? 'bg-indigo-50/80' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isLoading) {
          setIsDragging(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
          void handleFile(file);
        }
      }}
    >
      {isDragging ? <UploadOverlay /> : null}

      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>

      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 px-4 py-5 sm:px-6 md:flex-row">
          <div className="flex cursor-pointer items-center gap-5 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/30 transition-all duration-300 group-hover:rotate-12">
              <MapPin className="text-white drop-shadow-sm" size={28} />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-3xl font-black tracking-tight text-transparent">Annet-sur-Marne</h1>
              <p className="mt-0.5 text-sm font-bold uppercase tracking-[0.2em] text-indigo-500/80">Portail citoyen</p>
            </div>
          </div>

          <div className="flex w-full flex-col items-center md:w-auto md:items-end">
            <label className={`group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-8 py-3.5 font-bold text-white transition-all duration-300 md:w-auto ${isLoading ? 'cursor-not-allowed bg-slate-700 opacity-50 shadow-none' : 'cursor-pointer bg-slate-900 shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/40'}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isLoading}
                onChange={handleInputChange}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
              {isLoading ? <Loader2 className="relative z-10 animate-spin" size={20} /> : <Sparkles size={20} className="relative z-10 text-indigo-300 transition-colors group-hover:text-white" />}
              <span className="relative z-10">{isLoading ? 'Analyse en cours...' : 'Scanner une publication'}</span>
            </label>

            <div className="mt-3 flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
              <Clipboard size={12} />
              <span>Collez une image avec</span>
              <kbd className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-indigo-500">Ctrl+V</kbd>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}
        {isLoading ? <LoadingPanel /> : null}

        <div className="space-y-12">
          {posts.map((post) => {
            const config = getTypeConfig(post.type);
            const Icon = config.icon;

            return (
              <article key={post.id} className={`relative overflow-hidden rounded-[2.5rem] border border-slate-100 border-t-4 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] ${config.borderTop}`}>
                <div className={`relative overflow-hidden bg-gradient-to-b p-8 md:p-10 ${config.gradient}`}>
                  <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 px-4 py-2 shadow-sm backdrop-blur-md">
                      <div className={`rounded-xl p-2 ${config.bg}`}>
                        <Icon className={config.color} size={20} />
                      </div>
                      <span className={`text-sm font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {post.date ? (
                        <span className="flex items-center gap-2.5 rounded-2xl border border-white bg-white/80 px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-md">
                          <Clock size={16} className={config.color} />
                          {post.date}
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="rounded-2xl border border-white bg-white/60 p-2.5 text-slate-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-100 hover:text-red-600"
                        title="Supprimer la publication"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <h2 className="relative z-10 mb-4 text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-4xl">{post.titre}</h2>
                  <p className="relative z-10 max-w-3xl text-lg font-medium leading-relaxed text-slate-600 md:text-xl">{post.resume}</p>
                </div>

                <div className="p-4 pt-0 md:p-8">
                  <ContentPanel post={post} config={config} />
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
