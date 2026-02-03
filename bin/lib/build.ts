import { build } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import importConfig from "./import-config.js";
import veslxPlugin from '../../plugin/src/plugin.js'
import { log } from './log.js'

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

function resolveVeslxRoot() {
  const candidates = [
    new URL('../..', import.meta.url),
    new URL('../../..', import.meta.url),
  ];

  for (const candidate of candidates) {
    const candidatePath = fileURLToPath(candidate);
    if (fs.existsSync(path.join(candidatePath, 'vite.config.ts'))) {
      return candidatePath;
    }
  }

  return fileURLToPath(new URL('../..', import.meta.url));
}

interface PackageJson {
  name?: string;
  description?: string;
}

async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  const packagePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packagePath)) return null;
  try {
    const content = await fs.promises.readFile(packagePath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
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

  const veslxRoot = resolveVeslxRoot();
  const configFile = path.join(veslxRoot, 'vite.config.ts');

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
    // Load .env files from the user's repo (cwd), not the veslx install root
    envDir: cwd,
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
