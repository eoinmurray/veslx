#!/usr/bin/env bun

import { cac } from "cac";
import pkg from "../package.json" assert { type: "json" };
import init from "./lib/init";
import serve from "./lib/serve";
import start from "./lib/start";
import stop from "./lib/stop";

const cli = cac("veslx");

console.log(`▗▖  ▗▖▗▄▄▄▖ ▗▄▄▖▗▖   
▐▌  ▐▌▐▌   ▐▌   ▐▌   
▐▌  ▐▌▐▛▀▀▘ ▝▀▚▖▐▌   
 ▝▚▞▘ ▐▙▄▄▖▗▄▄▞▘▐▙▄▄▖
  `);

cli
  .command("init", "Initialize a new veslx project")
  .action(init)

cli
  .command("serve", "Start the veslx server")
  .action(serve);

cli
  .command("start", "Start the veslx server as a deamon")
  .action(start);

cli
  .command("stop", "Stop the veslx deamon")
  .action(stop);

cli.help();
cli.version(pkg.version);
cli.parse();

if (!cli.matchedCommand && process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}
