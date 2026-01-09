<p align="center">
  <pre align="center">
▗▖  ▗▖▗▄▄▄▖ ▗▄▄▖▗▖   ▗▖  ▗▖
▐▌  ▐▌▐▌   ▐▌   ▐▌    ▝▚▞▘
▐▌  ▐▌▐▛▀▀▘ ▝▀▚▖▐▌     ▐▌
 ▝▚▞▘ ▐▙▄▄▖▗▄▄▞▘▐▙▄▄▖▗▞▘▝▚▖
  </pre>
</p>

<p align="center">
  <strong>Turn markdown directories into beautiful documentation sites and presentations</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#components">Components</a> •
  <a href="#slides">Slides</a> •
  <a href="#configuration">Config</a>
</p>

---

## Why veslx?

**veslx** is a zero-config CLI that transforms your markdown files into a polished documentation site. Write in MDX, import React components, render LaTeX equations, display image galleries, and create slide presentations—all from simple markdown files.

Built on Vite + React + Tailwind. Fast builds. Instant hot reload. Beautiful defaults.

```bash
bun install -g veslx
veslx serve
```

That's it. Your docs are live at `localhost:3000` (or the next available port).

---

## Quick Start

### Install

```bash
# Using bun (fast)
bun install -g veslx

# Or npm (Node 18+)
npm install -g veslx
```

Requires Node >= 18 or Bun >= 1.0.

### Create Your First Post

```bash
mkdir -p docs/hello-world
cat > docs/hello-world/README.mdx << 'EOF'
---
title: Hello World
date: 2025-01-15
description: My first veslx post
---

# Hello World

Welcome to **veslx**! This is MDX, so you can use React components:

$$
E = mc^2
$$

EOF
```

### Run

```bash
cd docs
veslx serve
```

Open the URL printed in the console (defaults to [localhost:3000](http://localhost:3000)). Done.

---

## Features

| Feature | Description |
|---------|-------------|
| **MDX** | Write markdown with embedded React components |
| **LaTeX** | Beautiful math rendering via KaTeX |
| **Syntax Highlighting** | Code blocks with Shiki (150+ languages) |
| **Image Galleries** | Built-in `<VeslxGallery>` component with lightbox |
| **Slides** | Create presentations from markdown |
| **Local Imports** | Import `.tsx` components from your content directory |
| **Parameter Tables** | Display YAML/JSON configs with collapsible sections |
| **Dark Mode** | Automatic theme switching |
| **Hot Reload** | Instant updates during development |

---

## Content Structure

veslx scans your directory for `README.mdx` or `index.mdx` (docs) and `SLIDES.mdx` or `*.slides.mdx` (presentations):

```
content/
├── my-post/
│   ├── README.mdx          # → /my-post
│   ├── Chart.tsx           # Local component (importable)
│   └── images/
│       └── figure1.png
├── my-slides/
│   └── SLIDES.mdx          # → /my-slides/slides
└── another-post/
    └── README.mdx
```

### Custom Homepage

Put `README.mdx` (or `index.mdx`) at the root to replace the default homepage. A common pattern is to use `<VeslxPostList />` with `globs` to group content:

```mdx
# Docs
<VeslxPostList globs={["00-*", "01-*"]} />

# Guides
<VeslxPostList globs={["guides/*"]} />
```

### Frontmatter

```yaml
---
title: My Post Title
date: 2025-01-15
description: A brief description
visibility: public          # or "hidden" to hide from listings
unstyled: true              # render MDX without Veslx layout/positioning
---
```

---

## Components

### VeslxGallery

Display images with titles, captions, and a fullscreen lightbox:

```mdx
<VeslxGallery
  path="my-post/images"
  globs={["*.png", "*.jpg"]}
  title="Experiment Results"
  subtitle="Phase 1 measurements"
  caption="Data collected over 30 days"
  captionLabel="Figure 1"
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `path` | `string` | Path to images directory |
| `globs` | `string[]` | Glob patterns to match files |
| `title` | `string` | VeslxGallery title |
| `subtitle` | `string` | Subtitle below title |
| `caption` | `string` | Caption below images |
| `captionLabel` | `string` | Label prefix (e.g., "Figure 1") |
| `limit` | `number` | Max images to show |

### VeslxParameterTable

Display YAML or JSON configuration files with collapsible sections:

```mdx
<VeslxParameterTable
  path="config.yaml"
  keys={[".simulation.timestep", ".model.layers"]}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `path` | `string` | Path to YAML/JSON file |
| `keys` | `string[]` | jq-like paths to filter (optional) |

### Local Imports

Import React components directly from your content directory:

```mdx
import Chart from './Chart.tsx'
import { DataTable } from './components/DataTable.tsx'

# My Analysis

<Chart data={[25, 50, 75, 40, 90]} />
<DataTable source="results.json" />
```

Components are compiled at build time by Vite—no runtime overhead.

---

## Slides

Create presentations in `SLIDES.mdx` files. Separate slides with `---`:

```mdx
---
title: My Presentation
date: 2025-01-15
---

<VeslxFrontMatter />

---

# Introduction

First slide content

---

# Methods

Second slide with an image gallery:

<VeslxGallery path="images" globs={["chart*.png"]} />

---

# Conclusion

Final thoughts
```

### Navigation

| Key | Action |
|-----|--------|
| `↓` `→` `j` | Next slide |
| `↑` `←` `k` | Previous slide |
| Scroll | Natural trackpad scrolling |

## CLI Commands

```bash
veslx init      # Create veslx.yaml
veslx serve     # Start dev server with hot reload
veslx build     # Build for production → dist/
veslx start     # Run as background daemon (PM2)
veslx stop      # Stop the daemon
```

---

## Configuration

Create `veslx.yaml` in your content root:

```yaml
dir: content  # Content directory (default: .)
site:
  name: My Project
  description: Project documentation
  github: myorg/myproject
```

Or run `veslx init` to generate it.

---

## Styling

veslx uses a clean, technical aesthetic out of the box:

- **Typography**: Inter + JetBrains Mono
- **Colors**: Neutral palette with cyan accents
- **Dark mode**: Automatic system detection + manual toggle

Built on [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components.

---

## Development

```bash
# Clone the repo
git clone https://github.com/eoinmurray/veslx.git
cd veslx

# Install dependencies
bun install

# Run in dev mode (with hot reload on src/)
bun run dev

# Build for production
bun run build
```

### Project Structure

```
veslx/
├── bin/              # CLI entry point
├── plugin/           # Vite plugins (MDX, content scanning)
├── src/
│   ├── components/   # React components (VeslxGallery, Slides, etc.)
│   ├── hooks/        # React hooks
│   ├── pages/        # Route pages
│   └── lib/          # Utilities
└── content/          # Docs and examples used for the site
```

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Build**: [Vite](https://vitejs.dev)
- **Framework**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Components**: [shadcn/ui](https://ui.shadcn.com) + [Radix](https://radix-ui.com)
- **MDX**: [@mdx-js/rollup](https://mdxjs.com)
- **Math**: [KaTeX](https://katex.org)
- **Syntax**: [Shiki](https://shiki.style)
- **Daemon**: [PM2](https://pm2.keymetrics.io)

---

## License

MIT

---

<p align="center">
  <sub>Built with care for researchers, engineers, and anyone who writes technical content.</sub>
</p>
