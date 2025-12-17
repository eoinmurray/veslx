import { createServer, type ViteDevServer } from 'vite'
import { chromium, type Browser } from 'playwright'
import { execSync } from 'child_process'
import importConfig from "./import-config"
import veslxPlugin from '../../plugin/src/plugin'
import path from 'path'
import fs from 'fs'
import { log } from './log'

interface PackageJson {
  name?: string;
  description?: string;
}

interface ExportOptions {
  timeout?: number;
}

async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  const file = Bun.file(path.join(cwd, 'package.json'));
  if (!await file.exists()) return null;
  try {
    return await file.json();
  } catch {
    return null;
  }
}

function getGitHubRepo(cwd: string): string {
  try {
    const remote = execSync('git remote get-url origin', { cwd, encoding: 'utf-8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

async function getDefaultConfig(cwd: string) {
  const pkg = await readPackageJson(cwd);
  const folderName = path.basename(cwd);
  const name = pkg?.name || folderName;

  return {
    dir: '.',
    site: {
      name,
      description: pkg?.description || '',
      github: getGitHubRepo(cwd),
    }
  };
}

/**
 * Detect if a path refers to slides based on file naming conventions
 */
function isSlides(filePath: string): boolean {
  const filename = path.basename(filePath).toLowerCase()
  return (
    filePath.endsWith('.slides.mdx') ||
    filePath.endsWith('.slides.md') ||
    filename === 'slides.mdx' ||
    filename === 'slides.md'
  )
}

/**
 * Generate default output filename from input path
 */
function getDefaultOutputPath(inputPath: string): string {
  const baseName = inputPath
    .replace(/\.(mdx|md)$/, '')
    .replace(/\//g, '-')
    .replace(/^-/, '')
  return `${baseName}.pdf`
}

export default async function exportToPdf(
  inputPath: string,
  outputPath?: string,
  options: ExportOptions = {}
): Promise<void> {
  const cwd = process.cwd()

  // Validate input file exists
  const fullInputPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(cwd, inputPath)

  if (!fs.existsSync(fullInputPath)) {
    log.error(`File not found: ${inputPath}`)
    process.exit(1)
  }

  // Validate it's an MDX or MD file
  if (!inputPath.endsWith('.mdx') && !inputPath.endsWith('.md')) {
    log.error('Only .mdx and .md files can be exported')
    process.exit(1)
  }

  // Determine output path
  const finalOutputPath = outputPath || getDefaultOutputPath(inputPath)
  const fullOutputPath = path.isAbsolute(finalOutputPath)
    ? finalOutputPath
    : path.resolve(cwd, finalOutputPath)

  // Determine content type
  const contentIsSlides = isSlides(inputPath)

  log.info(`Exporting ${contentIsSlides ? 'slides' : 'post'}: ${inputPath}`)

  let server: ViteDevServer | null = null
  let browser: Browser | null = null

  try {
    // Load config (same pattern as serve.ts)
    const defaults = await getDefaultConfig(cwd)
    let fileConfig = await importConfig(cwd)

    const config = {
      dir: fileConfig?.dir || defaults.dir,
      site: {
        ...defaults.site,
        ...fileConfig?.site,
      },
      slides: fileConfig?.slides,
      posts: fileConfig?.posts,
    }

    const veslxRoot = new URL('../..', import.meta.url).pathname
    const configFile = new URL('../../vite.config.ts', import.meta.url).pathname

    // Resolve content directory
    const contentDir = path.isAbsolute(config.dir)
      ? config.dir
      : path.resolve(cwd, config.dir)

    // Start dev server on random available port
    server = await createServer({
      root: veslxRoot,
      configFile,
      cacheDir: path.join(cwd, 'node_modules/.vite'),
      plugins: [veslxPlugin(contentDir, config)],
      server: {
        port: 0, // Auto-select available port
      },
      logLevel: 'silent',
    })

    await server.listen()

    const serverUrl = server.resolvedUrls?.local[0]
    if (!serverUrl) {
      throw new Error('Failed to get server URL')
    }

    // Build page URL from relative path
    const relativePath = path.relative(contentDir, fullInputPath)
    const pageUrl = `${serverUrl}${relativePath}`

    // Launch browser and navigate
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto(pageUrl, {
      waitUntil: 'networkidle',
      timeout: options.timeout || 30000
    })

    // Wait for content to render
    await page.waitForTimeout(500)
    try {
      await page.waitForSelector('article, .slides-container', { timeout: 5000 })
    } catch {
      // Content selector not found, continue anyway
    }

    // Export to PDF with appropriate settings
    const pdfOptions = contentIsSlides
      ? {
          path: fullOutputPath,
          landscape: true,
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        }
      : {
          path: fullOutputPath,
          landscape: false,
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        }

    await page.pdf(pdfOptions)

    log.success(finalOutputPath)

  } catch (error) {
    if (error instanceof Error) {
      log.error(error.message)
    } else {
      log.error('Export failed')
    }
    process.exit(1)

  } finally {
    if (browser) {
      await browser.close()
    }
    if (server) {
      await server.close()
    }
  }
}
