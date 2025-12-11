
import { build } from 'vite'
import path from 'path'
import importConfig from "./import-config";
import veslxPlugin from '../../plugin/src/plugin'

export default async function buildApp() {
  const cwd = process.cwd()

  console.log(`Building veslx app in ${cwd}`);

  const config = await importConfig(cwd);

  if (!config) {
    console.error("Configuration file 'veslx.config.ts' not found in the current directory.");
    return
  }

  const veslxRoot = new URL('../..', import.meta.url).pathname;
  const outDir = path.join(cwd, 'dist')

  await build({
    root: veslxRoot,
    configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
    build: {
      outDir,
      emptyOutDir: true,
    },
    plugins: [
      veslxPlugin(config.dir)
    ],
  })

  console.log(`\nBuild complete: ${outDir}`)
}