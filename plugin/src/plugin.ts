import { type Plugin, type Connect, type ViteDevServer } from 'vite'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
import type { IncomingMessage, ServerResponse } from 'http'
import { type VeslxConfig, type ResolvedSiteConfig, type ResolvedSlidesConfig, type ResolvedPostsConfig, type ResolvedConfig, DEFAULT_SITE_CONFIG, DEFAULT_SLIDES_CONFIG, DEFAULT_POSTS_CONFIG } from './types'
import matter from 'gray-matter'

/**
 * Extract frontmatter from all MDX files in a directory
 */
function extractFrontmatters(dir: string): Record<string, { title?: string; description?: string; date?: string }> {
  const frontmatters: Record<string, { title?: string; description?: string; date?: string }> = {};

  function scanDir(currentDir: string, relativePath: string = '') {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDir(fullPath, relPath);
        }
      } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const { data } = matter(content);
          // Use @content prefix to match glob keys
          const key = `@content/${relPath}`;
          frontmatters[key] = {
            title: data.title,
            description: data.description,
            date: data.date instanceof Date ? data.date.toISOString() : data.date,
          };
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  }

  scanDir(dir);
  return frontmatters;
}

const VIRTUAL_MODULE_ID = 'virtual:content-modules'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

const VIRTUAL_CONFIG_ID = 'virtual:veslx-config'
const RESOLVED_VIRTUAL_CONFIG_ID = '\0' + VIRTUAL_CONFIG_ID

/**
 * Recursively copy a directory
 */
function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

interface PluginOptions {
  configPath?: string
}

export default function contentPlugin(contentDir: string, config?: VeslxConfig, options?: PluginOptions): Plugin {

  if (!contentDir) {
    throw new Error('Content directory must be specified.')
  }

  if (!path.isAbsolute(contentDir)) {
    throw new Error(`Content directory must be an absolute path, got: ${contentDir}`)
  }

  const dir = contentDir
  const configPath = options?.configPath

  // Mutable config that can be updated on hot reload
  let siteConfig: ResolvedSiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    ...config?.site,
  }

  let slidesConfig: ResolvedSlidesConfig = {
    ...DEFAULT_SLIDES_CONFIG,
    ...config?.slides,
  }

  let postsConfig: ResolvedPostsConfig = {
    ...DEFAULT_POSTS_CONFIG,
    ...config?.posts,
  }

  // Helper to reload config from file
  function reloadConfig(): boolean {
    if (!configPath || !fs.existsSync(configPath)) return false
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      const parsed = yaml.load(content) as VeslxConfig
      siteConfig = {
        ...DEFAULT_SITE_CONFIG,
        ...parsed?.site,
      }
      slidesConfig = {
        ...DEFAULT_SLIDES_CONFIG,
        ...parsed?.slides,
      }
      postsConfig = {
        ...DEFAULT_POSTS_CONFIG,
        ...parsed?.posts,
      }
      return true
    } catch (e) {
      console.error('[veslx] Failed to reload config:', e)
      return false
    }
  }

  // Server middleware for serving content files
  const urlToDir = new Map<string, string>()

  urlToDir.set('/raw', dir)

  // Get sorted entries for llms.txt generation
  function getLlmsEntries() {
    const frontmatters = extractFrontmatters(dir)
    const entries: { path: string; title?: string; description?: string; date?: string; isSlides: boolean }[] = []

    for (const [key, fm] of Object.entries(frontmatters)) {
      const relativePath = key.replace('@content/', '')
      const isSlides = relativePath.endsWith('SLIDES.mdx') || relativePath.endsWith('.slides.mdx')
      entries.push({
        path: relativePath,
        title: fm.title,
        description: fm.description,
        date: fm.date,
        isSlides,
      })
    }

    // Sort alphanumerically by path (0-foo before 1-bar before 10-baz)
    entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))

    return entries
  }

  // Generate llms.txt index (links to articles)
  function generateLlmsTxt(): string {
    const entries = getLlmsEntries()

    const lines: string[] = [`# ${siteConfig.name}`]
    if (siteConfig.description) {
      lines.push(`> ${siteConfig.description}`)
    }
    lines.push('')

    // Links section
    if (siteConfig.homepage) {
      lines.push(`- Homepage: ${siteConfig.homepage}`)
    }
    if (siteConfig.github) {
      lines.push(`- GitHub: https://github.com/${siteConfig.github}`)
    }
    lines.push('')

    lines.push('## Documentation')
    lines.push('')

    for (const entry of entries) {
      const title = entry.title || entry.path.replace(/\.mdx?$/, '').split('/').pop()
      const desc = entry.description ? `: ${entry.description}` : ''
      lines.push(`- [${title}](/raw/${entry.path})${desc}`)
    }
    lines.push('')
    return lines.join('\n')
  }

  // Generate llms-full.txt with all article content inline
  function generateLlmsFullTxt(): string {
    const entries = getLlmsEntries()

    const lines: string[] = [`# ${siteConfig.name}`]
    if (siteConfig.description) {
      lines.push(`> ${siteConfig.description}`)
    }
    lines.push('')

    for (const entry of entries) {
      const filePath = path.join(dir, entry.path)
      if (!fs.existsSync(filePath)) continue

      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        // Remove frontmatter
        let processed = content.replace(/^---[\s\S]*?---\n*/, '')

        // Extract code blocks to preserve them
        const codeBlocks: string[] = []
        processed = processed.replace(/```[\s\S]*?```/g, (match) => {
          codeBlocks.push(match)
          return `__CODE_BLOCK_${codeBlocks.length - 1}__`
        })

        // Also preserve inline code
        const inlineCode: string[] = []
        processed = processed.replace(/`[^`]+`/g, (match) => {
          inlineCode.push(match)
          return `__INLINE_CODE_${inlineCode.length - 1}__`
        })

        // Remove standalone JSX component usages at root level (no indentation)
        // This preserves JSX inside function definitions (which are indented)
        processed = processed
          .replace(/^<[A-Z][a-zA-Z]*\s[^]*?\/>$/gm, '') // Multi-line self-closing JSX at line start
          .replace(/^<([A-Z][a-zA-Z]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>$/gm, '') // Multi-line JSX with children at line start

        // Restore inline code
        inlineCode.forEach((code, i) => {
          processed = processed.replace(`__INLINE_CODE_${i}__`, code)
        })

        // Restore code blocks
        codeBlocks.forEach((block, i) => {
          processed = processed.replace(`__CODE_BLOCK_${i}__`, block)
        })

        // Collapse multiple newlines
        processed = processed.replace(/\n{3,}/g, '\n\n')

        const title = entry.title || entry.path.replace(/\.mdx?$/, '').split('/').pop()

        lines.push('---')
        lines.push('')
        lines.push(`## ${title}`)
        if (entry.description) {
          lines.push(`> ${entry.description}`)
        }
        lines.push('')
        lines.push(processed.trim())
        lines.push('')
      } catch {
        // Skip files that can't be read
      }
    }

    return lines.join('\n')
  }

  const middleware: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    // Serve llms.txt dynamically (only if enabled)
    if (req.url === '/llms.txt' && siteConfig.llmsTxt) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(generateLlmsTxt())
      return
    }

    // Serve llms-full.txt with all content inline (only if enabled)
    if (req.url === '/llms-full.txt' && siteConfig.llmsTxt) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(generateLlmsFullTxt())
      return
    }

    // Check if URL matches any registered content directory
    for (const [urlBase, contentDir] of urlToDir.entries()) {
      if (req.url?.startsWith(urlBase + '/')) {
        const relativePath = req.url.slice(urlBase.length + 1)
        const filePath = path.join(contentDir, relativePath)

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          const ext = path.extname(filePath).toLowerCase()

          // Set appropriate content types
          const contentTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.json': 'application/json',
            '.md': 'text/markdown',
            '.yaml': 'text/yaml',
            '.yml': 'text/yaml',
            '.npz': 'application/octet-stream',
          }

          if (contentTypes[ext]) {
            res.setHeader('Content-Type', contentTypes[ext])
          }

          return fs.createReadStream(filePath).pipe(res)
        }
      }
    }
    next()
  }

  // Virtual module ID for the modified CSS
  const VIRTUAL_CSS_MODULE = '\0veslx:index.css'

  return {
    name: 'content',
    enforce: 'pre',

    // Inject @content alias and fs.allow into Vite config
    config(config, { command }) {
      return {
        resolve: {
          alias: {
            '@content': dir,
          },
        },
        server: {
          fs: {
            allow: [dir],
          },
        },
        optimizeDeps: {
          exclude: ['virtual:content-modules', 'virtual:veslx-config'],
        },
      }
    },

    // Intercept CSS and virtual module imports
    resolveId(id, importer) {
      // Intercept index.css imported from main.tsx and redirect to our virtual module
      // This allows us to inject @source directive for Tailwind to scan user content
      if (id === './index.css' && importer?.endsWith('/src/main.tsx')) {
        return VIRTUAL_CSS_MODULE
      }
      // Also catch the resolved path
      if (id.endsWith('/src/index.css') && !id.startsWith('\0')) {
        return VIRTUAL_CSS_MODULE
      }
      // Virtual modules for content
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_VIRTUAL_CONFIG_ID
      }
    },

    load(id) {
      // Serve the modified CSS content with @source directive
      // This enables Tailwind v4 to scan the user's content directory for classes
      if (id === VIRTUAL_CSS_MODULE) {
        // Read the original CSS
        const veslxRoot = path.dirname(path.dirname(__dirname))
        const cssPath = path.join(veslxRoot, 'src/index.css')
        const cssContent = fs.readFileSync(cssPath, 'utf-8')

        // Use absolute path for @source directive
        const absoluteContentDir = dir.replace(/\\/g, '/')

        // Inject @source directive after the tailwindcss import
        const sourceDirective = `@source "${absoluteContentDir}";`
        const modified = cssContent.replace(
          /(@import\s+["']tailwindcss["'];?)/,
          `$1\n${sourceDirective}`
        )

        return modified
      }

      // Virtual module for content
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        // Extract frontmatter from MDX files at build time (avoids MDX hook issues)
        const frontmatterData = extractFrontmatters(dir);

        // Generate virtual module with import.meta.glob for MDX files
        return `
export const posts = import.meta.glob(['@content/**/*.mdx', '@content/**/*.md'], {
  import: 'default',
  query: { skipSlides: true }
});
export const allMdx = import.meta.glob(['@content/**/*.mdx', '@content/**/*.md']);
export const slides = import.meta.glob(['@content/**/SLIDES.mdx', '@content/**/SLIDES.md', '@content/**/*.slides.mdx', '@content/**/*.slides.md']);

// All files for directory tree building
export const files = import.meta.glob([
  '@content/**/*.mdx',
  '@content/**/*.md',
  '@content/**/*.tsx',
  '@content/**/*.ts',
  '@content/**/*.jsx',
  '@content/**/*.js',
  '@content/**/*.png',
  '@content/**/*.jpg',
  '@content/**/*.jpeg',
  '@content/**/*.gif',
  '@content/**/*.svg',
  '@content/**/*.webp',
  '@content/**/*.css',
  '@content/**/*.yaml',
  '@content/**/*.yml',
  '@content/**/*.json',
], { eager: false });

// Frontmatter extracted at build time (no MDX execution required)
export const frontmatters = ${JSON.stringify(frontmatterData)};

// Legacy aliases for backwards compatibility
export const modules = import.meta.glob(['@content/**/*.mdx', '@content/**/*.md']);
`
      }
      if (id === RESOLVED_VIRTUAL_CONFIG_ID) {
        // Generate virtual module with full config
        const fullConfig: ResolvedConfig = { site: siteConfig, slides: slidesConfig, posts: postsConfig }
        return `export default ${JSON.stringify(fullConfig)};`
      }
    },

    configureServer(server) {
      // Add middleware for serving content files
      server.middlewares.use(middleware)

      // Watch config file for hot reload
      if (configPath && fs.existsSync(configPath)) {
        server.watcher.add(configPath)
      }

      // Watch content directory for all file changes (add, delete, change)
      server.watcher.add(dir)

      // File extensions that should trigger a full reload
      const watchedExtensions = ['.mdx', '.md', '.yaml', '.yml', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tsx', '.ts', '.jsx', '.js', '.css']

      const handleContentChange = (filePath: string, event: 'add' | 'unlink' | 'change') => {
        // Check if the file is in the content directory
        if (!filePath.startsWith(dir)) return

        // Check if it's a watched file type
        const ext = path.extname(filePath).toLowerCase()
        if (!watchedExtensions.includes(ext)) return

        console.log(`[veslx] Content ${event}: ${path.relative(dir, filePath)}`)

        // Invalidate the virtual content module so frontmatters are re-extracted
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
        }

        // Full reload to pick up new/deleted files
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', (filePath) => handleContentChange(filePath, 'add'))
      server.watcher.on('unlink', (filePath) => handleContentChange(filePath, 'unlink'))
      server.watcher.on('change', (filePath) => handleContentChange(filePath, 'change'))
    },

    handleHotUpdate({ file, server }) {
      // Check if the changed file is our config
      if (configPath && file === configPath) {
        console.log('[veslx] Config changed, reloading...')
        if (reloadConfig()) {
          // Invalidate the virtual config module
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_CONFIG_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }
          // Full reload since config affects the entire app
          server.ws.send({ type: 'full-reload' })
          return [] // Prevent default HMR handling
        }
      }

      // Check if the changed file is in the content directory
      // Return empty array to prevent default HMR - we handle it in configureServer
      if (file.startsWith(dir)) {
        const watchedExtensions = ['.mdx', '.md', '.yaml', '.yml', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tsx', '.ts', '.jsx', '.js', '.css']
        const ext = path.extname(file).toLowerCase()
        if (watchedExtensions.includes(ext)) {
          return [] // Prevent default HMR, we already handle this via watcher events
        }
      }
    },
    configurePreviewServer(server) {
      // Add middleware for preview server too
      server.middlewares.use(middleware)
    },
    writeBundle(options) {
      // Copy content directory to dist/raw during production build
      const outDir = options.dir || 'dist'
      const destDir = path.join(outDir, 'raw')

      console.log(`Copying content from ${dir} to ${destDir}`)

      if (fs.existsSync(dir)) {
        copyDirSync(dir, destDir)
        console.log(`Content copied successfully`)

        // Generate llms.txt files if enabled
        if (siteConfig.llmsTxt) {
          const llmsTxtPath = path.join(outDir, 'llms.txt')
          fs.writeFileSync(llmsTxtPath, generateLlmsTxt())
          console.log(`Generated llms.txt`)

          const llmsFullTxtPath = path.join(outDir, 'llms-full.txt')
          fs.writeFileSync(llmsFullTxtPath, generateLlmsFullTxt())
          console.log(`Generated llms-full.txt`)
        }
      } else {
        console.warn(`Content directory not found: ${dir}`)
      }
    },
  }
}
