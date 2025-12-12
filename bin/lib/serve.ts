import { createServer } from 'vite'
import importConfig from "./import-config";
import veslxPlugin from '../../plugin/src/plugin'
import path from 'path'

export default async function start() {
  const cwd = process.cwd()

  console.log(`Starting veslx dev server in ${cwd}`);

  const config = await importConfig(cwd);

  if (!config) {
    console.error("Configuration file 'veslx.config.ts' not found in the current directory.");
    return
  }

  const veslxRoot = new URL('../..', import.meta.url).pathname;
  const configFile = new URL('../../vite.config.ts', import.meta.url).pathname;

  // Resolve content directory relative to user's cwd (where config lives)
  const contentDir = path.isAbsolute(config.dir)
    ? config.dir
    : path.resolve(cwd, config.dir);

  const server = await createServer({
    root: veslxRoot,
    configFile,
    // Cache in user's project so it persists across bunx runs
    cacheDir: path.join(cwd, 'node_modules/.vite'),
    plugins: [
      veslxPlugin(contentDir)
    ],
  })

  await server.listen()
  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}