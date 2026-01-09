#!/usr/bin/env node

import { cac } from "cac";
import { createRequire } from "module";
import init from "./lib/init.js";
import serve from "./lib/serve.js";
import start from "./lib/start.js";
import stop from "./lib/stop.js";
import build from "./lib/build.js";
import { banner } from "./lib/log.js";

const require = createRequire(import.meta.url);
function tryRequire<T>(id: string): T | null {
  try {
    return require(id) as T;
  } catch (err: any) {
    if (err?.code === "MODULE_NOT_FOUND") return null;
    throw err;
  }
}

const pkg =
  tryRequire<{ version?: string }>("../package.json") ??
  tryRequire<{ version?: string }>("../../package.json") ??
  {};

const cli = cac("veslx");

banner();

cli
  .command("init", "Initialize a new veslx project")
  .action(init)

cli
  .command("serve [dir]", "Start the veslx server")
  .action(serve);

cli
  .command("start [dir]", "Start the veslx server as a daemon")
  .action(start);

cli
  .command("stop [dir]", "Stop the veslx daemon")
  .action(stop);

cli
  .command("build [dir]", "Build the veslx app")
  .action(build)

cli.help();
cli.version(pkg.version ?? "0.0.0");
cli.parse();

if (!cli.matchedCommand && process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}
