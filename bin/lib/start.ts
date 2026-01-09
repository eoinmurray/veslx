import pm2 from "pm2";
import path from "path";
import { log } from './log.js'

function toDaemonName(contentDir: string) {
  const normalized = contentDir.replace(/[:\\/]+/g, '-').replace(/^-+/, '');
  return `veslx-${normalized}`.toLowerCase();
}

export default async function start(dir?: string) {
  const cwd = process.cwd();

  // Resolve content directory the same way as serve
  const contentDir = dir
    ? (path.isAbsolute(dir) ? dir : path.resolve(cwd, dir))
    : cwd;

  const name = toDaemonName(contentDir);

  // Build args for veslx serve
  const args = dir ? ['serve', dir] : ['serve'];
  const cliPath = process.argv[1];
  if (!cliPath) {
    log.error('unable to resolve veslx binary path');
    process.exit(1);
    return;
  }

  pm2.connect((err) => {
    if (err) {
      log.error('pm2 connection failed');
      process.exit(1);
      return;
    }

    pm2.start({
      name: name,
      script: cliPath,
      interpreter: process.execPath,
      args: args,
      cwd: cwd,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    }, (err) => {
      pm2.disconnect();

      if (err) {
        log.error('daemon failed to start');
        process.exit(1);
        return;
      }

      log.success('daemon started');
      process.exit(0);
    });
  })
}
