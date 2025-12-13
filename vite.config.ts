import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { remarkSlides } from './plugin/src/remark-slides'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Resolve React packages from veslx's node_modules for MDX files in user content
// This is needed when veslx runs via bunx from a temp directory
function reactResolverPlugin(): Plugin {
  const reactPackages = [
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-dom',
    'react-dom/client',
    '@mdx-js/react',
  ]

  const resolved = new Map<string, string>()
  for (const pkg of reactPackages) {
    try {
      resolved.set(pkg, require.resolve(pkg))
    } catch {}
  }

  return {
    name: 'veslx-react-resolver',
    // Only resolve for user content MDX files (outside veslx's own src)
    async resolveId(id, importer, options) {
      if (!resolved.has(id)) return null
      // Only intercept if importer is outside veslx (user content)
      if (!importer || importer.includes('/veslx/') || importer.includes('node_modules')) {
        return null
      }
      // Let Vite try first, only fallback to our resolution
      const resolution = await this.resolve(id, importer, { ...options, skipSelf: true })
      if (resolution) return null
      return resolved.get(id)
    },
  }
}

const distClientPath = path.join(__dirname, 'dist/client')
const srcPath = path.join(__dirname, 'src')
const hasPrebuilt = fs.existsSync(path.join(distClientPath, 'main.js'))

// Common remark plugins
const commonRemarkPlugins = [
  remarkGfm,
  remarkMath,
  remarkFrontmatter,
  [remarkMdxFrontmatter, { name: 'frontmatter' }],
]

export default defineConfig(({ command }) => {
  // Only use pre-built files for dev server, not production build
  // Pre-built files have externalized React which breaks production bundles
  // VESLX_DEV=1 forces using src for live reload during development
  const usePrebuilt = command === 'serve' && hasPrebuilt && !process.env.VESLX_DEV
  const clientPath = usePrebuilt ? distClientPath : srcPath

  return {
  clearScreen: false,
  cacheDir: path.join(__dirname, 'node_modules/.vite'),
  publicDir: path.join(__dirname, 'public'),
  plugins: [
    // Resolve React from veslx's dependencies for user MDX content (handles bunx installs)
    reactResolverPlugin(),
    tailwindcss(),
    // MDX for slides - splits at --- into <Slide> components
    {
      enforce: 'pre',
      ...mdx({
        include: /SLIDES\.mdx$/,
        remarkPlugins: [
          ...commonRemarkPlugins,
          remarkSlides, // Transform --- into <Slide> wrappers
        ],
        rehypePlugins: [rehypeKatex],
        providerImportSource: '@mdx-js/react',
      }),
    },
    // MDX for regular posts
    {
      enforce: 'pre',
      ...mdx({
        exclude: /SLIDES\.mdx$/,
        remarkPlugins: commonRemarkPlugins,
        rehypePlugins: [rehypeKatex],
        providerImportSource: '@mdx-js/react',
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  resolve: {
    alias: {
      '@': clientPath,
    },
    // Ensure single copies of React packages are used
    dedupe: ['react', 'react-dom', '@mdx-js/react'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
  },
  server: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    strictPort: true,
    fs: {
      allow: ['..', '../..'],
    },
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    strictPort: true,
    allowedHosts: true,
  },
  optimizeDeps: {
    entries: [path.join(clientPath, usePrebuilt ? 'main.js' : 'main.tsx')],
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@mdx-js/react',
      'react-router-dom',
      // Pre-bundle heavy UI deps
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'embla-carousel-react',
      'next-themes',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
    ],
  },
  }
})
