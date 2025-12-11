import pm2 from "pm2";

export default async function start() {
  const cwd = process.cwd();
  const name = `veslx-${cwd.replace(/\//g, '-').replace(/^-/, '')}`.toLowerCase();

  pm2.connect((err) => {
    if (err) {
      console.error('PM2 connect error:', err);
      return;
    }

    pm2.stop(name, (err, apps) => {
      pm2.disconnect();   // Disconnects from PM2

      if (err) {
        console.error('Failed to stop daemon:', err);
        return;
      }

      console.log(`veslx daemon stopped as "${name}" in ${cwd}`);
    });
  })
}
