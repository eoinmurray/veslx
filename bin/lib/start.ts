import importConfig from "./import-config"
import pm2 from "pm2";
import { log } from './log'

export default async function start() {
  const config = await importConfig(process.cwd());

  if (!config) {
    log.error("veslx.yaml not found");
    return
  }

  const cwd = process.cwd();
  const name = `veslx-${cwd.replace(/\//g, '-').replace(/^-/, '')}`.toLowerCase();

  pm2.connect((err) => {
    if (err) {
      log.error('pm2 connection failed');
      return;
    }

    pm2.start({
      name: name,
      script: 'bunx',
      args: ['veslx', 'serve'],
      cwd: cwd,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    }, (err) => {
      pm2.disconnect();

      if (err) {
        log.error('daemon failed to start');
        return;
      }

      log.success('daemon started');
    });
  })
}