import pm2 from "pm2";
import { log } from './log'

export default async function stop() {
  const cwd = process.cwd();
  const name = `veslx-${cwd.replace(/\//g, '-').replace(/^-/, '')}`.toLowerCase();

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
