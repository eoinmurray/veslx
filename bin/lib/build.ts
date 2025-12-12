
import { build } from 'vite'
import path from 'path'
import fs from 'fs'
import importConfig from "./import-config";
import veslxPlugin from '../../plugin/src/plugin'

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

export default async function buildApp() {
  const cwd = process.cwd()

  console.log(`Building veslx app in ${cwd}`);

  const config = await importConfig(cwd);

  if (!config) {
    console.error("Configuration file 'veslx.config.ts' not found in the current directory.");
    return
  }

  const veslxRoot = new URL('../..', import.meta.url).pathname;
  const configFile = new URL('../../vite.config.ts', import.meta.url).pathname;

  // Build inside veslxRoot first (Vite requires outDir to be within or relative to root)
  const tempOutDir = path.join(veslxRoot, '.veslx-build')
  const finalOutDir = path.join(cwd, 'dist')

  // Resolve content directory relative to user's cwd (where config lives)
  const contentDir = path.isAbsolute(config.dir)
    ? config.dir
    : path.resolve(cwd, config.dir);

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
      veslxPlugin(contentDir)
    ],
    logLevel: 'info',
  })

  // Copy built files to user's dist directory
  if (fs.existsSync(finalOutDir)) {
    fs.rmSync(finalOutDir, { recursive: true })
  }
  copyDirSync(tempOutDir, finalOutDir)

  // Clean up temp build directory
  fs.rmSync(tempOutDir, { recursive: true })

  console.log(`\nBuild complete: ${finalOutDir}`)
}