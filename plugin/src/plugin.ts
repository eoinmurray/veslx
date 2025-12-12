import { type Plugin, type Connect } from 'vite'
import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import { type VeslxConfig, type ResolvedSiteConfig, DEFAULT_SITE_CONFIG } from './types'

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

export default function contentPlugin(contentDir: string, config?: VeslxConfig): Plugin {

  if (!contentDir) {
    throw new Error('Content directory must be specified.')
  }

  if (!path.isAbsolute(contentDir)) {
    throw new Error(`Content directory must be an absolute path, got: ${contentDir}`)
  }

  const dir = contentDir

  // Resolve site config with defaults
  const siteConfig: ResolvedSiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    ...config?.site,
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
        // Generate virtual module with import.meta.glob for MDX files
        // - posts: all .mdx files except slides
        // - slides: SLIDES.mdx and *.slides.mdx files
        // - files: all files for directory tree building
        // - frontmatters: eager-loaded frontmatter for all MDX files
        return `
export const posts = import.meta.glob('@content/**/*.mdx', {
  import: 'default',
  query: { skipSlides: true }
});
export const allMdx = import.meta.glob('@content/**/*.mdx');
export const slides = import.meta.glob(['@content/**/SLIDES.mdx', '@content/**/*.slides.mdx']);

// All files for directory tree building (web-compatible files only)
// Note: yaml/json excluded as they require plugins or are config files
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

// Frontmatter for all MDX files (eager loaded for directory listing)
export const frontmatters = import.meta.glob('@content/**/*.mdx', {
  import: 'frontmatter',
  eager: true
});

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
