import { createServer } from 'vite'
import importConfig from "./import-config";
import veslxPlugin from '../../plugin/src/plugin'
import path from 'path'
import { log } from './log'

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

function isAddressInUse(err: unknown) {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; message?: string };
  if (anyErr.code === 'EADDRINUSE') return true;
  return typeof anyErr.message === 'string' && anyErr.message.includes('already in use');
}

async function listenWithFallback(server: Awaited<ReturnType<typeof createServer>>) {
  const startPort = server.config.server.port ?? 3000;
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    try {
      await server.listen(port);
      const address = server.httpServer?.address();
      const resolvedPort = typeof address === 'object' && address ? address.port : port;
      log.success(`listening :${resolvedPort}`);
      return;
    } catch (err: any) {
      if (!isAddressInUse(err)) {
        throw err;
      }
      log.info(`busy :${port} → :${port + 1}`);
    }
  }

  log.error(`no available ports from ${startPort} to ${startPort + maxAttempts - 1}`);
  process.exit(1);
}

export default async function serve(dir?: string) {
  const cwd = process.cwd()

  // Resolve content directory - CLI arg takes precedence
  const contentDir = dir
    ? (path.isAbsolute(dir) ? dir : path.resolve(cwd, dir))
    : cwd;

  // Get defaults first, then merge with config file if it exists
  // Look for config in content directory first, then fall back to cwd
  const defaults = await getDefaultConfig(contentDir);

  // Track which config file was found for hot reload
  let configPath: string | undefined;
  const contentConfigPath = path.join(contentDir, 'veslx.yaml');
  const cwdConfigPath = path.join(cwd, 'veslx.yaml');

  let fileConfig = await importConfig(contentDir);
  if (fileConfig) {
    configPath = contentConfigPath;
  } else {
    fileConfig = await importConfig(cwd);
    if (fileConfig) {
      configPath = cwdConfigPath;
    }
  }

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

  // Final content directory: CLI arg already resolved, or resolve from config
  const finalContentDir = dir
    ? contentDir
    : (path.isAbsolute(config.dir) ? config.dir : path.resolve(cwd, config.dir));

  const server = await createServer({
    root: veslxRoot,
    configFile,
    server: {
      strictPort: true,
    },
    // Cache in user's project so it persists across bunx runs
    cacheDir: path.join(cwd, 'node_modules/.vite'),
    plugins: [
      veslxPlugin(finalContentDir, config, { configPath })
    ],
  })

  await listenWithFallback(server);

  const info = server.resolvedUrls
  if (info?.local[0]) {
    log.url(info.local[0])
  }

  server.bindCLIShortcuts({ print: false })
}
