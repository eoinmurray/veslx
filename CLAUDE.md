# CLAUDE.md - Project Guide for veslx

## Project Overview

**veslx** is a zero-config documentation and presentation tool that turns markdown directories into beautiful sites. It's built with Vite, React, and MDX, designed for scientific/technical documentation with support for interactive components, math rendering, and slide presentations.

### Key Features
- Zero-config: Just run `veslx serve` in any directory with MDX files
- MDX support with local imports (React components, npm packages)
- Slide presentations (SLIDES.mdx files with `---` separators)
- KaTeX math rendering
- Image galleries with lightbox
- Dark/light theme
- Print-optimized (portrait for posts, landscape for slides)

## Architecture

```
veslx/
├── bin/                    # CLI entry points
│   ├── veslx.ts           # Main CLI (cac-based)
│   └── lib/
│       ├── init.ts        # `veslx init` - generate config
│       ├── serve.ts       # `veslx serve` - dev server
│       ├── build.ts       # `veslx build` - production build
│       ├── start.ts       # `veslx start` - daemon mode (pm2)
│       └── stop.ts        # `veslx stop` - stop daemon
├── plugin/                 # Vite plugin & core logic
│   └── src/
│       ├── plugin.ts      # Main Vite plugin (content, virtual modules)
│       ├── lib.ts         # Content indexing (builds .veslx.json)
│       ├── client.tsx     # React hooks (useDirectory, useFileContent)
│       ├── types.ts       # TypeScript types for config
│       └── remark-slides.ts # Remark plugin for slide splitting
├── src/                    # React frontend
│   ├── App.tsx            # Router setup
│   ├── main.tsx           # Entry point
│   ├── pages/
│   │   ├── home.tsx       # Directory listing
│   │   ├── post.tsx       # README.mdx renderer
│   │   └── slides.tsx     # SLIDES.mdx renderer
│   ├── components/
│   │   ├── gallery/       # Image gallery with lightbox
│   │   ├── ui/            # shadcn/ui components
│   │   ├── mdx-components.tsx  # MDX component overrides
│   │   ├── header.tsx     # Site header
│   │   └── ...
│   └── hooks/
│       └── use-mdx-content.ts  # Dynamic MDX loading
├── test-content/           # Example content for development
└── veslx.config.ts        # Project config (optional)
```

## Key Concepts

### Virtual Modules

The plugin creates two virtual modules:

1. **`virtual:content-modules`** - Provides glob imports for MDX files:
   ```ts
   export const modules = import.meta.glob('@content/**/README.mdx');
   export const slides = import.meta.glob('@content/**/SLIDES.mdx');
   export const index = import.meta.glob('@content/.veslx.json', { eager: true });
   ```

2. **`virtual:veslx-config`** - Provides site configuration:
   ```ts
   import siteConfig from "virtual:veslx-config";
   // { name, shortName, description, github }
   ```

### Content Index (.veslx.json)

The plugin scans the content directory and generates `.veslx.json` with:
- Directory tree structure
- File metadata (size, path)
- Frontmatter from MDX files (title, description, date)

This index is served at `/raw/.veslx.json` and used by the client to navigate content.

### Content Serving

Files in the content directory are served at `/raw/{path}`. This is used for:
- Images in galleries
- The `.veslx.json` index
- Any other static content

### MDX Processing

Two separate MDX configurations in `vite.config.ts`:

1. **Posts** (`README.mdx`): Standard MDX with remark-gfm, remark-math, rehype-katex
2. **Slides** (`SLIDES.mdx`): Same + `remarkSlides` plugin that splits content at `---` into `<Slide>` components

### Routing

```
/:path/SLIDES.mdx  → SlidesPage (slide presentation)
/:path/README.mdx  → Post (documentation page)
/*                 → Home (directory listing)
```

## Configuration

### veslx.config.ts (optional)

```typescript
export default {
  dir: './content',  // Content directory (default: '.')
  site: {
    name: 'My Project',      // Site name (default: folder name)
    shortName: 'mp',         // Header logo (default: first 2 chars)
    description: 'A description',  // Homepage subtitle
    github: 'user/repo',     // GitHub link in header
  }
}
```

Without a config file, veslx uses smart defaults based on the folder name.

## Common Tasks

### Adding a New Component

1. Create component in `src/components/`
2. If it should be available in MDX, add to `src/components/mdx-components.tsx`
3. Components can import from npm packages or local files

### Modifying the Gallery

Gallery lives in `src/components/gallery/`:
- `index.tsx` - Main component with carousel
- `hooks/use-gallery-images.ts` - Image discovery and glob matching
- `components/lightbox.tsx` - Fullscreen image viewer

Gallery props: `path`, `globs`, `title`, `subtitle`, `caption`, `captionLabel`, `limit`, `page`

### Adding Print Styles

Print styles are in `src/index.css` under `@media print`:
- Default `@page` is portrait for posts
- Named `@page slides` is landscape for presentations
- Slides use `page: slides` CSS property

### Modifying Slide Rendering

- Slide splitting: `plugin/src/remark-slides.ts`
- Slide display: `src/pages/slides.tsx`
- Slide wrapper: `src/components/slide.tsx`

## CLI Commands

```bash
veslx init      # Generate veslx.config.ts
veslx serve     # Start dev server (port 3000)
veslx build     # Production build to ./dist
veslx start     # Start as daemon (pm2)
veslx stop      # Stop daemon
```

## Development

```bash
bun install
bun run dev     # Start dev server with test-content
```

The `VESLX_DEV=1` env var forces using source files instead of pre-built dist.

## Important Files to Know

| File | Purpose |
|------|---------|
| `plugin/src/plugin.ts` | Vite plugin - virtual modules, content serving, file watching |
| `plugin/src/lib.ts` | Content indexing - scans directories, builds .veslx.json |
| `plugin/src/client.tsx` | React hooks - useDirectory, useFileContent |
| `src/components/mdx-components.tsx` | MDX component overrides (Gallery, FrontMatter, etc.) |
| `src/pages/slides.tsx` | Slide presentation page |
| `src/index.css` | Global styles including print styles |
| `vite.config.ts` | Vite config with MDX plugins |

## TypeScript

- Type declarations for virtual modules in `src/vite-env.d.ts`
- Config types in `plugin/src/types.ts`
- Content types (FileEntry, DirectoryEntry) in `plugin/src/lib.ts`

## Styling

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- shadcn/ui components in `src/components/ui/`
- CSS variables for theming in `src/index.css`
- Dark mode via `next-themes`

## Dependencies Worth Knowing

- **@mdx-js/rollup** - MDX compilation
- **gray-matter** - Frontmatter parsing
- **katex** / **rehype-katex** - Math rendering
- **shiki** - Syntax highlighting
- **embla-carousel-react** - Gallery carousel
- **@visx/** - Data visualization (optional, for demos)
- **minimatch** - Glob pattern matching for galleries
