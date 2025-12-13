#!/usr/bin/env bun

import { cac } from "cac";
import pkg from "../package.json";
import init from "./lib/init";
import serve from "./lib/serve";
import start from "./lib/start";
import stop from "./lib/stop";
import build from "./lib/build";
import { banner } from "./lib/log";

const cli = cac("veslx");

banner();

cli
  .command("init", "Initialize a new veslx project")
  .action(init)

cli
  .command("serve [dir]", "Start the veslx server")
  .action(serve);

cli
  .command("start", "Start the veslx server as a deamon")
  .action(start);

cli
  .command("stop", "Stop the veslx deamon")
  .action(stop);

cli
  .command("build [dir]", "Build the veslx app")
  .action(build)

cli.help();
cli.version(pkg.version);
cli.parse();

if (!cli.matchedCommand && process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}
