import { build } from 'vite'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import importConfig from "./import-config";
import veslxPlugin from '../../plugin/src/plugin'
import { log } from './log'

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

interface PackageJson {
  name?: string;
  description?: string;
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

export default async function buildApp(dir?: string) {
  const cwd = process.cwd()

  // Resolve content directory from CLI arg
  const contentDir = dir
    ? (path.isAbsolute(dir) ? dir : path.resolve(cwd, dir))
    : cwd;

  // Get defaults first, then merge with config file if it exists
  // Look for config in content directory first, then fall back to cwd
  const defaults = await getDefaultConfig(contentDir);
  const fileConfig = await importConfig(contentDir) || await importConfig(cwd);

  // CLI argument takes precedence over config file
  const config = {
    dir: dir || fileConfig?.dir || defaults.dir,
    site: {
      ...defaults.site,
      ...fileConfig?.site,
    },
    slides: fileConfig?.slides,
    posts: fileConfig?.posts,
  };

  const veslxRoot = new URL('../..', import.meta.url).pathname;
  const configFile = new URL('../../vite.config.ts', import.meta.url).pathname;

  // Build inside veslxRoot first (Vite requires outDir to be within or relative to root)
  const tempOutDir = path.join(veslxRoot, '.veslx-build')
  const finalOutDir = path.join(cwd, 'dist')

  // Final content directory: CLI arg already resolved, or resolve from config
  const finalContentDir = dir
    ? contentDir
    : (path.isAbsolute(config.dir) ? config.dir : path.resolve(cwd, config.dir));

  await build({
    root: veslxRoot,
    configFile,
    mode: 'production',
    // Cache in user's project so it persists across bunx runs
    cacheDir: path.join(cwd, 'node_modules/.vite'),
    build: {
      outDir: tempOutDir,
      emptyOutDir: true,
      watch: null, // Explicitly disable watch mode
      rollupOptions: {
        input: path.join(veslxRoot, 'index.html'),
      },
    },
    plugins: [
      veslxPlugin(finalContentDir, config)
    ],
    logLevel: 'info',
  })

  // Copy built files to user's dist directory
  if (fs.existsSync(finalOutDir)) {
    fs.rmSync(finalOutDir, { recursive: true })
  }
  copyDirSync(tempOutDir, finalOutDir)

  // Copy index.html to 404.html for SPA fallback routing
  // This works with GitHub Pages, Netlify, and many static servers
  fs.copyFileSync(
    path.join(finalOutDir, 'index.html'),
    path.join(finalOutDir, '404.html')
  )

  // Clean up temp build directory
  fs.rmSync(tempOutDir, { recursive: true })

  log.success(`dist/`)
}
