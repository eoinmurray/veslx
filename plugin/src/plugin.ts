import { type Plugin, type Connect, type ViteDevServer } from 'vite'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
import type { IncomingMessage, ServerResponse } from 'http'
import { type VeslxConfig, type ResolvedSiteConfig, DEFAULT_SITE_CONFIG } from './types'
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

  // Mutable site config that can be updated on hot reload
  let siteConfig: ResolvedSiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    ...config?.site,
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
      return true
    } catch (e) {
      console.error('[veslx] Failed to reload config:', e)
      return false
    }
  }

  // Server middleware for serving content files
  const urlToDir = new Map<string, string>()

  urlToDir.set('/raw', dir)

  const middleware: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
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

  return {
    name: 'content',

    // Inject @content alias and fs.allow into Vite config
    config() {
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

    // Virtual modules for content MDX imports and site config
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_VIRTUAL_CONFIG_ID
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        // Extract frontmatter from MDX files at build time (avoids MDX hook issues)
        const frontmatterData = extractFrontmatters(dir);

        // Generate virtual module with import.meta.glob for MDX files
        return `
export const posts = import.meta.glob('@content/**/*.mdx', {
  import: 'default',
  query: { skipSlides: true }
});
export const allMdx = import.meta.glob('@content/**/*.mdx');
export const slides = import.meta.glob(['@content/**/SLIDES.mdx', '@content/**/*.slides.mdx']);

// All files for directory tree building (web-compatible files only)
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
], { eager: false });

// Frontmatter extracted at build time (no MDX execution required)
export const frontmatters = ${JSON.stringify(frontmatterData)};

// Legacy aliases for backwards compatibility
export const modules = import.meta.glob('@content/**/*.mdx');
`
      }
      if (id === RESOLVED_VIRTUAL_CONFIG_ID) {
        // Generate virtual module with site config
        return `export default ${JSON.stringify(siteConfig)};`
      }
    },

    configureServer(server) {
      // Add middleware for serving content files
      server.middlewares.use(middleware)

      // Watch config file for hot reload
      if (configPath && fs.existsSync(configPath)) {
        server.watcher.add(configPath)
      }
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
      } else {
        console.warn(`Content directory not found: ${dir}`)
      }
    },
  }
}
