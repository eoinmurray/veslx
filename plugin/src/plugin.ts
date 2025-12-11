import { type Plugin, type Connect } from 'vite'
import path from 'path'
import fs from 'fs'
import { buildAll } from './lib'
import chokidar from 'chokidar'
import type { IncomingMessage, ServerResponse } from 'http'

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

export default function contentPlugin(inputDir: string): Plugin {

  if (!inputDir) {
    throw new Error('Content directory must be specified.')
  }

  // Resolve dir to absolute path from user's cwd
  const dir = path.isAbsolute(inputDir) ? inputDir : path.resolve(process.cwd(), inputDir)

  const buildFn = () => buildAll([dir])

  let watchers: chokidar.FSWatcher[] = []

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
    async buildStart() {
      await buildFn()
    },
    configureServer(server) {
      // Add middleware for serving content files
      server.middlewares.use(middleware)

      // Watch all content directories and rebuild on changes
      watchers = [dir].map(dir => {
        const watcher = chokidar.watch(dir, {
          ignored: (path: string) => path.endsWith('.veslx.json'),
          persistent: true,
        })

        watcher.on('change', async () => {
          const runningFilePath = path.join(dir, '.running')
          if (!fs.existsSync(runningFilePath)) {
            await buildFn()
            server.ws.send({
              type: 'full-reload',
              path: '*',
            })
          }
        })
        
        watcher.on('unlink', async (filePath) => {
          if (path.basename(filePath) === '.running') {
            await buildFn()
            server.ws.send({
              type: 'full-reload',
              path: '*',
            })
          }
        })

        return watcher
      })

    },
    configurePreviewServer(server) {
      // Add middleware for preview server too
      server.middlewares.use(middleware)
    },
    async buildEnd() {
      await Promise.all(watchers.map(w => w.close()))
      watchers = []
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
