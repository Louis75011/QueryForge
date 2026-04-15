import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ContentType = 'text' | 'image' | 'video' | 'pdf' | 'social' | 'file';
type DateFilter = 'all' | 'day' | 'week' | 'month' | 'year';
type Language = 'fr' | 'en' | 'es' | 'pt' | 'it' | 'de' | 'nl';

interface Platform {
  id: string;
  name: string;
  emoji: string;
  generateQuery: (input: string, type: ContentType, date: DateFilter, lang: Language) => string;
  generateUrl: (query: string, date: DateFilter, lang: Language) => string;
}

const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: 'text', label: 'Texte' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Vidéo' },
  { id: 'pdf', label: 'PDF' },
  { id: 'social', label: 'Social' },
  { id: 'file', label: 'Fichier' },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'all', label: 'Toute période' },
  { id: 'day', label: '24h' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'year', label: 'Année' },
];

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'fr', label: 'FR' },
  { id: 'en', label: 'EN' },
  { id: 'es', label: 'ES' },
  { id: 'pt', label: 'PT' },
  { id: 'it', label: 'IT' },
  { id: 'de', label: 'DE' },
  { id: 'nl', label: 'NL' },
];

const GOOGLE_DATE: Record<DateFilter, string> = {
  all: '', day: '&tbs=qdr:d', week: '&tbs=qdr:w', month: '&tbs=qdr:m', year: '&tbs=qdr:y',
};
const YOUTUBE_DATE: Record<DateFilter, string> = {
  all: '', day: '&sp=EgIIAQ%3D%3D', week: '&sp=EgIIAw%3D%3D', month: '&sp=EgIIBA%3D%3D', year: '',
};
const REDDIT_DATE: Record<DateFilter, string> = {
  all: '', day: '&t=day', week: '&t=week', month: '&t=month', year: '&t=year',
};

const TRANSLATION_TOOLS: { name: string; url?: string; getUrl?: (q: string, lang: Language) => string; desc: string; specs: string[] }[] = [
  {
    name: 'DeepL',
    getUrl: (q: string, lang: Language) =>
      `https://www.deepl.com/translator#${lang}/${lang === 'en' ? 'fr' : 'en'}/${encodeURIComponent(q)}`,
    desc: 'Traduction neurale haute précision, la référence professionnelle.',
    specs: ['50+ langues', 'Contexte préservé', 'Gratuit / Pro'],
  },
  {
    name: 'ChatGPT',
    getUrl: (q: string, lang: Language) =>
      `https://chatgpt.com/?q=Traduis+en+${lang === 'fr' ? 'anglais' : 'fran%C3%A7ais'}+et+optimise+pour+la+recherche+:+${encodeURIComponent(q)}`,
    desc: 'Traduction + optimisation de la requête en langage naturel.',
    specs: ['Toutes langues', 'Adaptatif', 'Compte requis'],
  },
  {
    name: 'Linguee',
    getUrl: (q: string, _lang: Language) =>
      `https://www.linguee.fr/francais-anglais/search?query=${encodeURIComponent(q)}`,
    desc: 'Traductions contextuelles avec exemples de phrases réelles.',
    specs: ['20+ langues', 'Exemples réels', 'Gratuit'],
  },
];

const PLATFORMS: Platform[] = [
  {
    id: 'google',
    name: 'Google',
    emoji: '🔍',
    generateQuery: (input, type) => {
      if (!input) return '';
      if (type === 'pdf') return `"${input}" filetype:pdf`;
      if (type === 'file') return `"${input}" filetype:pdf OR filetype:epub OR filetype:doc`;
      if (type === 'text') return `intitle:"${input}" OR "${input}"`;
      return `"${input}"`;
    },
    generateUrl: (query, date, lang) =>
      `https://www.google.com/search?q=${encodeURIComponent(query)}&lr=lang_${lang}${GOOGLE_DATE[date]}`,
  },
  {
    id: 'google-books',
    name: 'Google Livres',
    emoji: '📚',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query, date, lang) =>
      `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(query)}&lr=lang_${lang}${GOOGLE_DATE[date]}`,
  },
  {
    id: 'wikipedia',
    name: 'Wikip\u00e9dia',
    emoji: '📖',
    generateQuery: (input) => input,
    generateUrl: (query, _date, lang) =>
      `https://${lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`,
  },
  {
    id: 'wikisource',
    name: 'Wikisource',
    emoji: '📜',
    generateQuery: (input) => input,
    generateUrl: (query, _date, lang) =>
      `https://${lang}.wikisource.org/w/index.php?search=${encodeURIComponent(query)}`,
  },
  {
    id: 'archive',
    name: 'Archive.org',
    emoji: '🏛️',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query) =>
      `https://archive.org/search?query=${encodeURIComponent(query)}&mediatype=texts`,
  },
  {
    id: 'gallica',
    name: 'Gallica',
    emoji: '🗺️',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query) =>
      `https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&query=${encodeURIComponent(`(gallica all "${query}")`)}`,
  },
  {
    id: 'gutenberg',
    name: 'Gutenberg',
    emoji: '📕',
    generateQuery: (input) => input,
    generateUrl: (query) =>
      `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(query)}`,
  },
  {
    id: 'openlibrary',
    name: 'Open Library',
    emoji: '📗',
    generateQuery: (input) => input,
    generateUrl: (query) =>
      `https://openlibrary.org/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'scholar',
    name: 'Scholar',
    emoji: '🎓',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query, date, lang) =>
      `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}&lr=lang_${lang}${GOOGLE_DATE[date]}`,
  },
  {
    id: 'persee',
    name: 'Pers\u00e9e',
    emoji: '🏺',
    generateQuery: (input) => input,
    generateUrl: (query) =>
      `https://www.persee.fr/search#cas=1&q=${encodeURIComponent(query)}`,
  },
  {
    id: 'babelio',
    name: 'Babelio',
    emoji: '✍️',
    generateQuery: (input) => input,
    generateUrl: (query) =>
      `https://www.babelio.com/recherche.php?Recherche=${encodeURIComponent(query)}`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    emoji: '📺',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query, date) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}${YOUTUBE_DATE[date]}`,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    emoji: '🗨️',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query, date) =>
      `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=relevance${REDDIT_DATE[date]}`,
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    emoji: '🐦',
    generateQuery: (input) => `"${input}" min_faves:5`,
    generateUrl: (query) =>
      `https://twitter.com/search?q=${encodeURIComponent(query)}&f=top`,
  },
  {
    id: 'google-images',
    name: 'Google Images',
    emoji: '🖼️',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query) =>
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    emoji: '📌',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query) =>
      `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
  },
];

const IMAGE_TOOLS: { name: string; url: string; desc: string; specs: string[] }[] = [
  { name: 'Remove.bg', url: 'https://www.remove.bg/', desc: 'Supprime le fond d’une image en un clic.', specs: ['PNG / JPG', 'Résultat instant', 'Gratuit / Pro'] },
  { name: 'Cleanup.pictures', url: 'https://cleanup.pictures/', desc: 'Efface un objet ou une personne indésirable.', specs: ['Brush IA', 'PNG / JPG', 'Gratuit / Pro'] },
  { name: 'Upscayl', url: 'https://www.upscayl.org/', desc: 'Augmente la résolution sans perte de qualité.', specs: ['x2 à x8', 'Logiciel local', 'Gratuit'] },
  { name: 'Iloveimg', url: 'https://www.iloveimg.com/fr', desc: 'Suite complète d’édition d’images en ligne.', specs: ['15+ outils', 'Sans inscription', 'Gratuit / Pro'] },
  { name: 'Palette.fm', url: 'https://palette.fm/', desc: 'Colorise automatiquement les photos en noir & blanc.', specs: ['Photos NB', 'IA colorisation', 'Gratuit'] },
];

const TRANSCRIPTION_TOOLS: {
  name: string;
  url: string;
  desc: string;
  specs: string[];
}[] = [
    {
      name: 'Whisper Web',
      url: 'https://huggingface.co/spaces/Xenova/whisper-web',
      desc: 'Transcription locale dans le navigateur, aucune donnée envoyée.',
      specs: ['Audio & vidéo', '99 langues', '~1 min / 5 min audio', 'Gratuit'],
    },
    {
      name: 'VEED.io',
      url: 'https://www.veed.io/tools/auto-subtitle',
      desc: 'Sous-titrage automatique + traduction, export SRT/VTT/TXT.',
      specs: ['Vidéo jusqu\u2019à 2 Go', '100+ langues', '~2 min / 10 min', 'Filigrane gratuit'],
    },
    {
      name: 'Supertranslate',
      url: 'https://www.supertranslate.ai',
      desc: 'Sous-titres + traduction multlingue pour vidéos longues.',
      specs: ['Vidéo jusqu\u2019à 2 h', 'Export SRT', '~3 min / 10 min', 'Freemium'],
    },
    {
      name: 'Transkriptor',
      url: 'https://transkriptor.com',
      desc: 'Retranscription précise audio & vidéo, interface claire.',
      specs: ['MP3 / MP4 / WAV / M4A', '100+ langues', '~1 min / 5 min', '90 min gratuit'],
    },
    {
      name: 'Downsub',
      url: 'https://downsub.com',
      desc: 'Télécharge les sous-titres existants d\u2019une vidéo YouTube/Vimeo.',
      specs: ['Lien URL seulement', 'Toutes langues dispo', 'Instantané', 'Gratuit'],
    },
  ];


function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<ContentType>(() => loadPref('ff_contentType', 'text' as ContentType));
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => loadPref('ff_dateFilter', 'all' as DateFilter));
  const [language, setLanguage] = useState<Language>(() => loadPref('ff_language', 'fr' as Language));
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(loadPref<string[]>('ff_favorites', [])));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => { localStorage.setItem('ff_contentType', JSON.stringify(contentType)); }, [contentType]);
  useEffect(() => { localStorage.setItem('ff_dateFilter', JSON.stringify(dateFilter)); }, [dateFilter]);
  useEffect(() => { localStorage.setItem('ff_language', JSON.stringify(language)); }, [language]);
  useEffect(() => { localStorage.setItem('ff_favorites', JSON.stringify([...favorites])); }, [favorites]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') setShowHelp(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const mapped = PLATFORMS.map(p => {
      const generated = p.generateQuery(query, contentType, dateFilter, language);
      return { ...p, generated, url: p.generateUrl(generated, dateFilter, language) };
    });
    return [
      ...mapped.filter(r => favorites.has(r.id)),
      ...mapped.filter(r => !favorites.has(r.id)),
    ];
  }, [query, contentType, dateFilter, language, favorites]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      window.open(results[0].url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto px-4 sm:px-8">

      {/* Nav sticky */}
      <nav
        aria-label="Navigation principale"
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-8 px-4 sm:px-8 mb-8"
      >
        <div className="flex items-center justify-between h-14">
          <span className="font-extrabold text-[13px] text-brand tracking-widest uppercase">FranzForge</span>
          <div className="flex items-center gap-5">
            <a href="#forge" className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-ink transition-colors">Requête</a>
            <a href="#outils" className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-ink transition-colors">Outils</a>
            <button
              onClick={() => setShowHelp(true)}
              className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-ink transition-colors cursor-pointer"
              aria-label="Ouvrir l'aide"
            >
              Aide
            </button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="mb-10 flex items-center gap-5">
        <motion.img
          src="/images/ff-franz-forge-logo.jpg"
          alt="FranzForge logo"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-20 w-20 rounded-2xl object-cover flex-shrink-0 shadow-md"
        />
        <div className="flex flex-col">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[42px] font-extrabold tracking-tight text-brand leading-none"
          >
            FranzForge
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base text-gray-500 font-medium mt-1"
          >
            La forge à requêtes de Franz.
          </motion.p>
        </div>
      </header>

      {/* Main Search Section */}
      <main id="forge" className="flex-grow flex flex-col" aria-label="Forge de requêtes">
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-[11px] uppercase font-bold tracking-wider text-ink">
                Que cherchez-vous ?
              </label>
              <div className="flex bg-surface p-1 rounded-lg gap-0.5 flex-wrap">
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer transition-all ${language === l.id ? 'bg-white shadow-sm text-ink' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Saisissez votre recherche… (⏎ = ouvrir le 1er résultat)"
                className="w-full px-5 py-4 text-lg bg-white border-2 border-ink rounded-xl outline-none focus:border-brand transition-all placeholder:text-gray-300 shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${contentType === type.id
                  ? 'bg-brand text-white'
                  : 'bg-surface text-ink hover:bg-gray-200'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${dateFilter === f.id
                  ? 'bg-ink text-white'
                  : 'bg-white text-gray-400 border border-border hover:border-gray-400'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid - Bento Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-grow mb-6">
          <AnimatePresence mode="popLayout">
            {results.map((res, idx) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-surface p-4 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{res.emoji}</span>
                    <h3 className="font-bold text-sm uppercase tracking-tight">{res.name}</h3>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); toggleFavorite(res.id); }}
                    className="cursor-pointer text-base leading-none transition-opacity hover:opacity-70"
                    aria-label={favorites.has(res.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    title={favorites.has(res.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    {favorites.has(res.id) ? '⭐' : '☆'}
                  </button>
                </div>

                <div className="bg-white p-3 rounded-lg mb-3 flex-grow font-mono text-[11px] text-gray-700 border border-border break-all min-h-[48px]">
                  {res.generated}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(res.generated, res.id)}
                    className={`flex-1 py-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${copiedId === res.id
                      ? 'bg-green-500 text-white'
                      : 'bg-[#E5E5E5] text-ink hover:bg-gray-300'
                      }`}
                  >
                    {copiedId === res.id ? 'Copié !' : 'Copier'}
                  </button>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-ink text-white rounded-md text-[11px] font-bold hover:bg-black transition-all text-center cursor-pointer"
                  >
                    Ouvrir
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!query && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 bg-surface rounded-2xl gap-3">
              <span className="text-4xl" aria-hidden="true">⚒️</span>
              <p className="text-sm text-gray-400 font-medium">Saisissez quelque chose pour forger vos requêtes.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="flex flex-col gap-6 pt-6 border-t border-border mt-auto">
        {/* Traduction */}
        <section id="outils">
          <h2 className="text-[12px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
            Traduction rapide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TRANSLATION_TOOLS.map(tool => (
              <a
                key={tool.name}
                href={tool.getUrl ? tool.getUrl(query, language) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col bg-surface rounded-xl border border-border p-3.5 hover:bg-gray-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[13px] text-ink group-hover:text-brand transition-colors">{tool.name}</span>
                  <span className="accent-dot"></span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3 leading-snug flex-grow">{tool.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {tool.specs.map((s) => (
                    <span key={s} className="text-[10px] bg-white border border-border rounded px-1.5 py-0.5 text-gray-500 font-medium">{s}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Outils Image */}
        <section className="pt-6 border-t border-border">
          <h2 className="text-[12px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
            Outils Image
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {IMAGE_TOOLS.map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col bg-surface rounded-xl border border-border p-3.5 hover:bg-gray-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[13px] text-ink group-hover:text-brand transition-colors">{tool.name}</span>
                  <span className="accent-dot"></span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3 leading-snug flex-grow">{tool.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {tool.specs.map((s) => (
                    <span key={s} className="text-[10px] bg-white border border-border rounded px-1.5 py-0.5 text-gray-500 font-medium">{s}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </section>
      </footer>

      {/* Transcription audio / vidéo */}
      <section id="liens" className="pt-6 border-t border-border mt-6">
        <h2 className="text-[12px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
          Retranscription audio / vidéo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {TRANSCRIPTION_TOOLS.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col bg-surface rounded-xl border border-border p-3.5 hover:bg-gray-100 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[13px] text-ink group-hover:text-brand transition-colors">{tool.name}</span>
                <span className="accent-dot"></span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3 leading-snug flex-grow">{tool.desc}</p>
              <div className="flex flex-wrap gap-1">
                {tool.specs.map((s) => (
                  <span key={s} className="text-[10px] bg-white border border-border rounded px-1.5 py-0.5 text-gray-500 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Bannière */}
      <div className="mt-8 pt-6 border-t border-border">
        <img
          src="/images/site-banniere.jpg"
          alt="FranzForge — La forge à requêtes de recherche web par Arx Systema"
          className="w-full rounded-2xl object-cover"
        />
      </div>

      {/* Modal Aide */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-ink transition-colors cursor-pointer text-xl leading-none"
                aria-label="Fermer l'aide"
              >
                ✕
              </button>
              <h2 className="font-extrabold text-xl text-ink mb-6">Comment ça marche ?</h2>
              <div className="flex flex-col gap-5 text-sm text-gray-600 leading-relaxed">
                <div>
                  <p className="font-bold text-ink mb-1">1 — Saisissez votre terme</p>
                  <p>Entrez un mot, un auteur, un titre ou n'importe quelle expression dans le champ de recherche. FranzForge génère aussitôt une requête optimisée pour chaque plateforme.</p>
                </div>
                <div>
                  <p className="font-bold text-ink mb-1">2 — Type de contenu</p>
                  <p><strong>Texte</strong> — recherche dans les pages web. <strong>PDF</strong> — ajoute <code className="bg-surface px-1 rounded text-[11px] font-mono">filetype:pdf</code>. <strong>Image</strong> — oriente vers Google Images. <strong>Social</strong> et <strong>Fichier</strong> adaptent la syntaxe selon la plateforme.</p>
                </div>
                <div>
                  <p className="font-bold text-ink mb-1">3 — Filtre par période</p>
                  <p>Les filtres 24h / Semaine / Mois / Année agissent sur Google, Google Scholar, YouTube et Reddit via des paramètres URL dédiés. Les autres plateformes ignorent ce filtre.</p>
                </div>
                <div>
                  <p className="font-bold text-ink mb-1">4 — Langue</p>
                  <p>La langue ne modifie <em>pas</em> votre texte. Elle restreint les résultats côté plateforme : paramètre <code className="bg-surface px-1 rounded text-[11px] font-mono">lr=lang_fr</code> pour Google / Scholar, sous-domaine pour Wikipédia / Wikisource.</p>
                </div>
                <div>
                  <p className="font-bold text-ink mb-1">5 — Favoris ⭐</p>
                  <p>Cliquez sur l'étoile ☆ d'une plateforme pour l'épingler en haut de la liste. Vos favoris sont mémorisés entre les visites.</p>
                </div>
                <div>
                  <p className="font-bold text-ink mb-1">6 — Raccourcis clavier</p>
                  <p>
                    <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">Ctrl+K</kbd>
                    {' '}ou{' '}
                    <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">⌘K</kbd>
                    {' '}— remet le focus sur la recherche.<br />
                    <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">⏎ Entrée</kbd>
                    {' '}— ouvre directement le premier résultat (ou votre favori épinglé).<br />
                    <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">Echap</kbd>
                    {' '}— ferme ce panneau.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Arx Systema */}
      <footer role="contentinfo" className="mt-10 py-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-gray-400 tracking-wide">
          Propulsé par{' '}
          <a
            href="https://arx-systema.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-ink hover:text-brand transition-colors"
          >
            Arx Systema
          </a>
        </p>
        <p className="text-[11px] text-gray-300 tracking-wide">FranzForge · © 2026 · Tous droits réservés</p>
      </footer>
    </div>
  );
}

