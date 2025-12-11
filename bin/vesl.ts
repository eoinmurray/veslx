#!/usr/bin/env bun

import { cac } from "cac";
import pkg from "../package.json" assert { type: "json" };
import init from "./lib/init";
import serve from "./lib/serve";
import start from "./lib/start";
import stop from "./lib/stop";

const cli = cac("vesl");

console.log(`▗▖  ▗▖▗▄▄▄▖ ▗▄▄▖▗▖   
▐▌  ▐▌▐▌   ▐▌   ▐▌   
▐▌  ▐▌▐▛▀▀▘ ▝▀▚▖▐▌   
 ▝▚▞▘ ▐▙▄▄▖▗▄▄▞▘▐▙▄▄▖
  `);

cli
  .command("init", "Initialize a new Vesl project")
  .action(init)

cli
  .command("serve", "Start the Vesl server")
  .action(serve);

cli
  .command("start", "Start the Vesl server as a deamon")
  .action(start);

cli
  .command("stop", "Stop the Vesl deamon")
  .action(stop);

cli.help();
cli.version(pkg.version);
cli.parse();

if (!cli.matchedCommand && process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}
