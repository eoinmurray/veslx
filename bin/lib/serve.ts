
import { createServer } from 'vite'
import importConfig from "./import-config";
import veslxPlugin from '../../plugin/src/plugin'

export default async function startServer() {
  const cwd = process.cwd()

  console.log(`Starting veslx server in ${cwd}`);

  const config = await importConfig(cwd);

  if (!config) {
    console.error("Configuration file 'veslx.config.ts' not found in the current directory.");
    return
  }

  const veslxRoot = new URL('../..', import.meta.url).pathname;

  const server = await createServer({
    root: veslxRoot,
    configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
    plugins: [
      veslxPlugin(config.dir)
    ],
    env: {
      cwd,
    }
  })

  await server.listen()

  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}