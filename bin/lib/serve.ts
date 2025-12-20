import { createServer } from 'vite'
import { execSync } from 'child_process'
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

function getGitHubRepo(cwd: string): string {
  try {
    const remote = execSync('git remote get-url origin', { cwd, encoding: 'utf-8' }).trim();
    // Parse github URL: git@github.com:user/repo.git or https://github.com/user/repo.git
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
    // Cache in user's project so it persists across bunx runs
    cacheDir: path.join(cwd, 'node_modules/.vite'),
    plugins: [
      veslxPlugin(finalContentDir, config, { configPath })
    ],
  })

  try {
    await server.listen()
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      log.error(`port already in use`)
      process.exit(1)
    }
    throw err
  }

  const info = server.resolvedUrls
  if (info?.local[0]) {
    log.url(info.local[0])
  }

  server.bindCLIShortcuts({ print: false })
}
