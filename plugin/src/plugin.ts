import { type Plugin, type Connect, type ViteDevServer } from 'vite'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
import type { IncomingMessage, ServerResponse } from 'http'
import { type VeslxConfig, type ResolvedSiteConfig, type ResolvedSlidesConfig, type ResolvedPostsConfig, type ResolvedConfig, DEFAULT_SITE_CONFIG, DEFAULT_SLIDES_CONFIG, DEFAULT_POSTS_CONFIG } from './types.js'
import matter from 'gray-matter'
import { parseExpressionAt } from 'acorn'
import { fileURLToPath } from 'url'

/**
 * Extract frontmatter from content files in a directory.
 */
function extractFrontmatters(dir: string): Record<string, { title?: string; description?: string; link?: string; date?: string; draft?: boolean; visibility?: string }> {
  const frontmatters: Record<string, { title?: string; description?: string; link?: string; date?: string; draft?: boolean; visibility?: string }> = {};

  function extractTsxFrontmatter(content: string) {
    const exportIndex = content.search(/export\s+const\s+frontmatter\b/);
    if (exportIndex === -1) return null;

    const assignmentIndex = content.indexOf('=', exportIndex);
    if (assignmentIndex === -1) return null;

    const objectStart = content.indexOf('{', assignmentIndex);
    if (objectStart === -1) return null;

    const objectSource = extractObjectLiteral(content, objectStart);
    if (!objectSource) return {};

    try {
      const node = parseExpressionAt(objectSource, 0, { ecmaVersion: 'latest' }) as any;
      if (!node || node.type !== 'ObjectExpression') return {};
      const data = expressionToValue(node);
      return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  function extractObjectLiteral(source: string, startIndex: number): string | null {
    let depth = 0;
    let inString: "'" | '"' | '`' | null = null;
    let inComment: "line" | "block" | null = null;
    let escaped = false;

    for (let i = startIndex; i < source.length; i++) {
      const char = source[i];
      const next = source[i + 1];

      if (inComment === "line") {
        if (char === '\n') inComment = null;
        continue;
      }
      if (inComment === "block") {
        if (char === '*' && next === '/') {
          inComment = null;
          i++;
        }
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === inString) {
          inString = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        inComment = "line";
        i++;
        continue;
      }
      if (char === '/' && next === '*') {
        inComment = "block";
        i++;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return source.slice(startIndex, i + 1);
        }
      }
    }

    return null;
  }

  function expressionToValue(node: any): unknown {
    if (!node) return undefined;
    switch (node.type) {
      case 'Literal':
        return node.value;
      case 'TemplateLiteral':
        if (node.expressions?.length === 0) {
          return node.quasis.map((q: any) => q.value?.cooked ?? '').join('');
        }
        return undefined;
      case 'UnaryExpression':
        if (node.operator === '-' && node.argument?.type === 'Literal' && typeof node.argument.value === 'number') {
          return -node.argument.value;
        }
        return undefined;
      case 'ArrayExpression':
        return node.elements.map((el: any) => {
          if (!el) return null;
          const value = expressionToValue(el);
          return value === undefined ? null : value;
        });
      case 'ObjectExpression': {
        const obj: Record<string, unknown> = {};
        for (const prop of node.properties) {
          if (!prop || prop.type !== 'Property' || prop.computed) continue;
          const key = prop.key?.type === 'Identifier'
            ? prop.key.name
            : prop.key?.type === 'Literal'
              ? String(prop.key.value)
              : null;
          if (!key) continue;
          const value = expressionToValue(prop.value);
          if (value !== undefined) {
            obj[key] = value;
          }
        }
        return obj;
      }
      default:
        return undefined;
    }
  }

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
            link: data.link,
            date: data.date instanceof Date ? data.date.toISOString() : data.date,
            draft: data.draft,
            visibility: data.visibility,
          };
        } catch {
          // Skip files that can't be parsed
        }
      } else if (entry.name.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const data = extractTsxFrontmatter(content);
          if (!data) {
            continue;
          }
          const key = `@content/${relPath}`;
          frontmatters[key] = {
            title: data.title as string | undefined,
            description: data.description as string | undefined,
            link: data.link as string | undefined,
            date: data.date instanceof Date ? data.date.toISOString() : (data.date as string | undefined),
            draft: data.draft as boolean | undefined,
            visibility: data.visibility as string | undefined,
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
      if (!relativePath.endsWith('.mdx') && !relativePath.endsWith('.md')) {
        continue
      }
      if (fm.draft === true || fm.visibility === 'hidden') {
        continue
      }
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

  function resolveContentPath(contentDir: string, requestPath: string): string | null {
    if (requestPath.includes('\0')) return null;
    const stripped = requestPath.replace(/^\/+/, '');
    const normalized = path.normalize(stripped);
    const resolved = path.resolve(contentDir, normalized);
    const relative = path.relative(contentDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return null;
    }
    return resolved;
  }

  const middleware: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    let pathname = '';
    try {
      pathname = new URL(req.url ?? '', 'http://localhost').pathname;
    } catch {
      next();
      return;
    }

    // Serve llms.txt dynamically (only if enabled)
    if (pathname === '/llms.txt' && siteConfig.llmsTxt) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(generateLlmsTxt())
      return
    }

    // Serve llms-full.txt with all content inline (only if enabled)
    if (pathname === '/llms-full.txt' && siteConfig.llmsTxt) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(generateLlmsFullTxt())
      return
    }

    // Check if URL matches any registered content directory
    for (const [urlBase, contentDir] of urlToDir.entries()) {
      if (pathname.startsWith(urlBase + '/')) {
        const relativePath = pathname.slice(urlBase.length + 1)
        const filePath = resolveContentPath(contentDir, relativePath)
        if (!filePath) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

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

    // Intercept virtual module imports
    resolveId(id) {
      // Virtual modules for content
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_VIRTUAL_CONFIG_ID
      }
    },

    load(id) {
      // Inject @source directive into index.css for Tailwind v4 content scanning
      // This must happen in load() before Tailwind processes the CSS
      if (id.endsWith('/src/index.css')) {
        const veslxRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
        const cssPath = path.join(veslxRoot, 'src/index.css')

        try {
          const code = fs.readFileSync(cssPath, 'utf-8')

          // Check if this CSS file has the tailwindcss import
          if (/\@import\s+["']tailwindcss["']/.test(code)) {
            // Use absolute path with glob pattern for @source directive
            // Must include all file types that may contain Tailwind classes
            const absoluteContentDir = dir.replace(/\\/g, '/')
            const sourceDirective = `@source "${absoluteContentDir}/**/*.{html,js,jsx,ts,tsx,mdx,md,vue,svelte}";`

            // Inject @source directive after the tailwindcss import
            const modified = code.replace(
              /(@import\s+["']tailwindcss["'];?)/,
              `$1\n${sourceDirective}`
            )

            return modified
          }
        } catch {
          // Fall through to default loading
        }
      }

      // Virtual module for content
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        // Extract frontmatter from MDX files at build time (avoids MDX hook issues)
        const frontmatterData = extractFrontmatters(dir);

        // Generate virtual module with import.meta.glob for MDX files
        return `
export const posts = import.meta.glob(['@content/*.mdx', '@content/*.md', '@content/**/*.mdx', '@content/**/*.md'], {
  import: 'default',
  query: { skipSlides: true }
});
export const allMdx = import.meta.glob(['@content/*.mdx', '@content/*.md', '@content/**/*.mdx', '@content/**/*.md']);
export const tsxPages = import.meta.glob(['@content/*.tsx', '@content/**/*.tsx']);
export const slides = import.meta.glob(['@content/SLIDES.mdx', '@content/SLIDES.md', '@content/*.slides.mdx', '@content/*.slides.md', '@content/**/SLIDES.mdx', '@content/**/SLIDES.md', '@content/**/*.slides.mdx', '@content/**/*.slides.md']);

// All files for directory tree building (using ?url to avoid parsing non-JS files)
// Exclude veslx.yaml config files from bundling
export const files = import.meta.glob([
  '@content/*.mdx',
  '@content/*.md',
  '@content/*.tsx',
  '@content/*.ts',
  '@content/*.jsx',
  '@content/*.js',
  '@content/*.png',
  '@content/*.jpg',
  '@content/*.jpeg',
  '@content/*.gif',
  '@content/*.svg',
  '@content/*.webp',
  '@content/*.css',
  '@content/*.yaml',
  '@content/*.yml',
  '@content/*.json',
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
  '!@content/veslx.yaml',
  '!@content/**/veslx.yaml',
], { eager: false, query: '?url', import: 'default' });

// Frontmatter extracted at build time (no MDX execution required)
export const frontmatters = ${JSON.stringify(frontmatterData)};

// Legacy aliases for backwards compatibility
export const modules = import.meta.glob(['@content/*.mdx', '@content/*.md', '@content/**/*.mdx', '@content/**/*.md']);
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

      // Debounce reload to avoid rapid-fire refreshes when multiple files change
      let reloadTimeout: ReturnType<typeof setTimeout> | null = null
      const pendingChanges: Array<{ filePath: string; event: 'add' | 'unlink' | 'change' }> = []
      const DEBOUNCE_MS = 1000

      const flushReload = () => {
        if (pendingChanges.length === 0) return

        // Log all pending changes
        for (const { filePath, event } of pendingChanges) {
          console.log(`[veslx] Content ${event}: ${path.relative(dir, filePath)}`)
        }

        // Clear pending changes
        pendingChanges.length = 0

        // Invalidate the virtual content module so frontmatters are re-extracted
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
        }

        // Full reload to pick up new/deleted files
        server.ws.send({ type: 'full-reload' })
      }

      const handleContentChange = (filePath: string, event: 'add' | 'unlink' | 'change') => {
        // Check if the file is in the content directory
        if (!filePath.startsWith(dir)) return

        // Check if it's a watched file type
        const ext = path.extname(filePath).toLowerCase()
        if (!watchedExtensions.includes(ext)) return

        // Queue this change
        pendingChanges.push({ filePath, event })

        // Debounce: clear existing timeout and set a new one
        if (reloadTimeout) {
          clearTimeout(reloadTimeout)
        }
        reloadTimeout = setTimeout(flushReload, DEBOUNCE_MS)
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
