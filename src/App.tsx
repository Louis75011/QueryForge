/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Copy, 
  ExternalLink, 
  Check, 
  Type, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Music, 
  Download,
  Languages,
  Wand2,
  Github,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ContentType = 'text' | 'image' | 'video' | 'pdf' | 'music' | 'file' | 'code' | 'social';
type DateFilter = 'all' | 'day' | 'week' | 'month' | 'year';
type Language = 'fr' | 'en';

interface Platform {
  id: string;
  name: string;
  emoji: string;
  generateQuery: (input: string, type: ContentType, date: DateFilter, lang: Language) => string;
  generateUrl: (query: string) => string;
}

const CONTENT_TYPES: { id: ContentType; label: string; icon: any }[] = [
  { id: 'text', label: 'Texte', icon: Type },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Vidéo', icon: Video },
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'code', label: 'Code', icon: Github },
  { id: 'social', label: 'Social', icon: Globe },
  { id: 'file', label: 'Fichier', icon: Download },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'all', label: 'Toute période' },
  { id: 'day', label: '24h' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'year', label: 'Année' },
];

const PLATFORMS: Platform[] = [
  {
    id: 'google',
    name: 'Google',
    emoji: '🔍',
    generateQuery: (input, type, date, lang) => {
      if (!input) return '';
      let q = `"${input}"`;
      if (type === 'pdf') q += ' filetype:pdf';
      if (type === 'text') q = `intitle:"${input}" OR "${input}"`;
      if (lang === 'en') q += ' lang:en';
      return q;
    },
    generateUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'google-images',
    name: 'Images',
    emoji: '🖼️',
    generateQuery: (input) => `"${input}" imagesize:1920x1080 filetype:jpg`,
    generateUrl: (query) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    emoji: '📺',
    generateQuery: (input) => `"${input}", long`,
    generateUrl: (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  },
  {
    id: 'github',
    name: 'GitHub',
    emoji: '💻',
    generateQuery: (input) => `${input} language:typescript`,
    generateUrl: (query) => `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`,
  },
  {
    id: 'stackoverflow',
    name: 'StackOverflow',
    emoji: '🥞',
    generateQuery: (input) => `[javascript] "${input}"`,
    generateUrl: (query) => `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    emoji: '🤖',
    generateQuery: (input) => `site:reddit.com "${input}"`,
    generateUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    emoji: '🐦',
    generateQuery: (input) => `"${input}" min_faves:10`,
    generateUrl: (query) => `https://twitter.com/search?q=${encodeURIComponent(query)}&f=top`,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    emoji: '📌',
    generateQuery: (input) => `"${input}" aesthetic`,
    generateUrl: (query) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    emoji: '📖',
    generateQuery: (input) => `intitle:"${input}"`,
    generateUrl: (query) => `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`,
  },
  {
    id: 'scholar',
    name: 'Scholar',
    emoji: '🎓',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query) => `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    emoji: '💼',
    generateQuery: (input) => `site:linkedin.com/posts "${input}"`,
    generateUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'archive',
    name: 'Archive',
    emoji: '🏛️',
    generateQuery: (input) => `"${input}"`,
    generateUrl: (query) => `https://archive.org/details/texts?query=${encodeURIComponent(query)}`,
  },
];

const IMAGE_TOOLS = [
  { name: 'Remove.bg', url: 'https://www.remove.bg/', desc: 'Suppression fond' },
  { name: 'Cleanup.pictures', url: 'https://cleanup.pictures/', desc: 'Suppression filigrane' },
  { name: 'Upscayl', url: 'https://www.upscayl.org/', desc: 'Amélioration qualité' },
  { name: 'Iloveimg', url: 'https://www.iloveimg.com/fr', desc: 'Édition complète' },
  { name: 'Palette.fm', url: 'https://palette.fm/', desc: 'Colorisation' },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [language, setLanguage] = useState<Language>('fr');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return PLATFORMS.map(p => {
      const generated = p.generateQuery(query, contentType, dateFilter, language);
      return {
        ...p,
        generated,
        url: p.generateUrl(generated)
      };
    });
  }, [query, contentType, dateFilter, language]);

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto px-8 py-8">
      {/* Header */}
      <header className="mb-6 flex items-baseline gap-3">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[28px] font-extrabold tracking-tight text-brand lowercase"
        >
          franzforge
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-500 font-medium"
        >
          la forge à requêtes par franz.
        </motion.p>
      </header>

      {/* Main Search Section */}
      <main className="flex-grow flex flex-col">
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-[11px] uppercase font-bold tracking-wider text-ink">
                Que cherchez-vous ?
              </label>
              <div className="flex gap-4">
                <div className="flex bg-surface p-1 rounded-lg">
                  {(['fr', 'en'] as Language[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${language === l ? 'bg-white shadow-sm' : 'text-gray-400'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Saisissez votre recherche..."
                className="w-full px-5 py-4 text-lg bg-white border-2 border-ink rounded-lg outline-none focus:ring-0 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  contentType === type.id 
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
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                  dateFilter === f.id 
                    ? 'bg-ink text-white' 
                    : 'bg-white text-gray-400 border border-border hover:border-gray-300'
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
                className="bg-surface p-4 rounded-xl flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{res.emoji}</span>
                    <h3 className="font-bold text-sm uppercase tracking-tight">{res.name}</h3>
                  </div>
                  <span className="accent-dot"></span>
                </div>
                
                <div className="bg-white p-3 rounded-lg mb-3 flex-grow font-mono text-[11px] text-gray-700 border border-border break-all min-h-[48px]">
                  {res.generated}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(res.generated, res.id)}
                    className={`flex-1 py-2 rounded-md text-[11px] font-bold transition-all ${
                      copiedId === res.id 
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
                    className="flex-1 py-2 bg-ink text-white rounded-md text-[11px] font-bold hover:bg-black transition-all text-center"
                  >
                    Ouvrir
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {!query && (
            <div className="col-span-full flex items-center justify-center py-20 bg-surface rounded-xl text-gray-400 italic text-sm">
              Saisissez quelque chose pour forger vos requêtes...
            </div>
          )}
        </div>
      </main>

      {/* Footer Sections - Bento Style */}
      <footer className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 pt-6 border-t border-border mt-auto">
        {/* Translation Section */}
        <section>
          <h3 className="text-[12px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
            Traduction rapide
          </h3>
          <div className="flex gap-2.5">
            <a
              href={`https://www.deepl.com/translator#fr/en/${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-surface py-2.5 rounded-lg border border-border text-[12px] font-bold text-center hover:bg-gray-200 transition-all"
            >
              DeepL
            </a>
            <a
              href={`https://chatgpt.com/?q=Traduis+ceci+en+anglais+et+optimise+pour+la+recherche+:+${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-surface py-2.5 rounded-lg border border-border text-[12px] font-bold text-center hover:bg-gray-200 transition-all"
            >
              ChatGPT
            </a>
          </div>
        </section>

        {/* Image Tools Section */}
        <section>
          <h3 className="text-[12px] uppercase font-bold text-gray-400 mb-3 tracking-wider">
            Outils Image
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {IMAGE_TOOLS.map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface py-2.5 rounded-lg border border-border text-[12px] font-bold text-center hover:bg-gray-200 transition-all"
              >
                {tool.name}
              </a>
            ))}
          </div>
        </section>
      </footer>
    </div>
  );
}

