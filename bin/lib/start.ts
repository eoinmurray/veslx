import pm2 from "pm2";
import path from "path";
import { log } from './log'

export default async function start(dir?: string) {
  const cwd = process.cwd();

  // Resolve content directory the same way as serve
  const contentDir = dir
    ? (path.isAbsolute(dir) ? dir : path.resolve(cwd, dir))
    : cwd;

  const name = `veslx-${contentDir.replace(/\//g, '-').replace(/^-/, '')}`.toLowerCase();

  // Build args for veslx serve
  const args = dir ? ['veslx', 'serve', dir] : ['veslx', 'serve'];

  pm2.connect((err) => {
    if (err) {
      log.error('pm2 connection failed');
      process.exit(1);
      return;
    }

    pm2.start({
      name: name,
      script: 'bunx',
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