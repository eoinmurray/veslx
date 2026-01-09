import pm2 from "pm2";
import path from "path";
import { log } from './log.js'

function toDaemonName(contentDir: string) {
  const normalized = contentDir.replace(/[:\\/]+/g, '-').replace(/^-+/, '');
  return `veslx-${normalized}`.toLowerCase();
}

export default async function stop(dir?: string) {
  const cwd = process.cwd();
  const contentDir = dir
    ? (path.isAbsolute(dir) ? dir : path.resolve(cwd, dir))
    : cwd;
  const name = toDaemonName(contentDir);

  pm2.connect((err) => {
    if (err) {
      log.error('pm2 connection failed');
      return;
    }

    pm2.stop(name, (err) => {
      pm2.disconnect();

      if (err) {
        log.error('daemon failed to stop');
        return;
      }

      log.success('daemon stopped');
    });
  })
}
