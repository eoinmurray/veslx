
import { createServer } from 'vite'
import importConfig from "./import-config";
import veslPlugin from '../../plugin/src/plugin'

export default async function startServer() {
  const cwd = process.cwd()

  console.log(`Starting Vesl server in ${cwd}`);

  const config = await importConfig(cwd);

  if (!config) {
    console.error("Configuration file 'vesl.config.ts' not found in the current directory.");
    return
  }

  const veslRoot = new URL('../..', import.meta.url).pathname;

  const server = await createServer({
    root: veslRoot,
    configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
    plugins: [
      veslPlugin(config.dir)
    ],
    env: {
      cwd,
    }
  })

  await server.listen()

  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}