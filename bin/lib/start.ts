import importConfig from "./import-config"
import pm2 from "pm2";

export default async function start() {
  const config = await importConfig(process.cwd());

  if (!config) {
    console.error("Configuration file 'veslx.config.ts' not found in the current directory.");
    return
  }

  const cwd = process.cwd();
  const name = `veslx-${cwd.replace(/\//g, '-').replace(/^-/, '')}`.toLowerCase();

  pm2.connect((err) => {
    if (err) {
      console.error('PM2 connect error:', err);
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
    }, (err, apps) => {
      pm2.disconnect();   // Disconnects from PM2

      if (err) {
        console.error('Failed to start daemon:', err);
        return;
      }

      console.log(`veslx daemon started in ${cwd}`);
    });
  })
}