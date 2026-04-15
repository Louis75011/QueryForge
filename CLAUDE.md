# CLAUDE.md — FranzForge

Application React/TypeScript de forge de requêtes de recherche web. Stack : Vite, Tailwind v4, motion/react.

## Ce que fait l'app

L'utilisateur saisit un terme → l'app génère une requête optimisée pour chaque plateforme → il peut copier la requête ou l'ouvrir directement.

## Fichiers importants

- `src/App.tsx` — tout le code applicatif (données + UI)
- `src/index.css` — tokens de design (couleurs brand/surface/ink/border)
- `index.html` — point d'entrée

## Architecture de App.tsx

### Types

- `ContentType` — nature du contenu cherché (text, image, video, pdf, social, file)
- `DateFilter` — filtre temporel (all, day, week, month, year)
- `Language` — langue cible (fr, en, es, pt, it, de, nl)

### Données statiques (hors composant)

- `PLATFORMS` — tableau de plateformes, chacune avec `generateQuery()` et `generateUrl()`
- `CONTENT_TYPES`, `DATE_FILTERS`, `LANGUAGES` — listes pour les sélecteurs UI
- `GOOGLE_DATE`, `YOUTUBE_DATE`, `REDDIT_DATE` — maps DateFilter → paramètre URL
- `TRANSLATION_TOOLS`, `IMAGE_TOOLS` — outils annexes dans le footer

### Interface Platform

```ts
{
  generateQuery: (input, type, date, lang) => string; // texte affiché dans la carte
  generateUrl: (query, date, lang) => string; // URL d'ouverture
}
```

### Logique de la langue

La langue **ne modifie pas le texte de la requête**. Elle agit uniquement sur l'URL :

- Google / Google Livres / Scholar → `lr=lang_xx`
- Wikipedia / Wikisource → sous-domaine `xx.wikipedia.org`
- Autres plateformes (Archive, Gallica, Gutenberg, Reddit…) → pas de filtre langue disponible

### Logique du filtre date

Actif sur Google, Google Livres, Scholar, YouTube, Reddit via paramètres URL dédiés.
Les autres plateformes ignorent silencieusement le filtre.

### État React

```ts
query; // texte saisi
contentType; // onglet actif
dateFilter; // filtre période actif
language; // langue cible active
copiedId; // id de la carte en cours de copie (feedback 2s)
```

`results` est un `useMemo` sur `[query, contentType, dateFilter, language]`.

## Design

Palette : blanc, noir (`#111`), rouge brand (`#E11D2A`). Aucune autre couleur d'accent.
Typographie : Inter. Tokens CSS dans `@theme` de index.css.

## Commandes

```bash
pnpm dev      # dev server sur :3000
pnpm build    # build prod
pnpm lint     # tsc --noEmit
```

## Plateformes actives

Profil littérature / documents / culture :
Google, Google Livres, Wikipédia, Wikisource, Archive.org, Gallica (BNF), Project Gutenberg, Open Library, Google Scholar, Persée, Babelio, YouTube, Reddit, X/Twitter, Google Images, Pinterest.
