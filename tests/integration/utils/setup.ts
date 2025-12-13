import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Subprocess } from "bun";

export interface TestContext {
  testDir: string;
  tarballPath: string;
  serverProcess?: Subprocess;
  staticServerProcess?: Subprocess;
}

const PROJECT_ROOT = path.resolve(import.meta.dir, "../../..");

export async function packAndInstall(): Promise<TestContext> {
  // Create unique temp directory
  const testDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "veslx-test-")
  );

  // Run npm pack in project root (bun doesn't have a pack command)
  const packResult = Bun.spawnSync(
    ["npm", "pack", "--pack-destination", testDir],
    {
      cwd: PROJECT_ROOT,
    }
  );

  if (packResult.exitCode !== 0) {
    throw new Error(`npm pack failed: ${packResult.stderr.toString()}`);
  }

  // Find the tarball
  const files = fs.readdirSync(testDir);
  const tarball = files.find((f) => f.endsWith(".tgz"));
  if (!tarball) {
    throw new Error("No tarball found after bun pack");
  }

  const tarballPath = path.join(testDir, tarball);

  // Create package.json for the test project
  fs.writeFileSync(
    path.join(testDir, "package.json"),
    JSON.stringify(
      { name: "veslx-test", version: "1.0.0", type: "module" },
      null,
      2
    )
  );

  // Install the tarball
  const installResult = Bun.spawnSync(["bun", "add", tarballPath], {
    cwd: testDir,
  });

  if (installResult.exitCode !== 0) {
    throw new Error(`bun add failed: ${installResult.stderr.toString()}`);
  }

  return { testDir, tarballPath };
}

export async function copyFixtures(testDir: string): Promise<void> {
  const fixturesDir = path.join(import.meta.dir, "../fixtures/minimal-content");
  const contentDir = path.join(testDir, "content");

  // Copy fixtures to content/
  fs.cpSync(fixturesDir, contentDir, { recursive: true });
}

export async function waitForServer(
  url: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(500);
  }

  return false;
}

export async function serveStatic(
  distPath: string,
  port: number = 3001
): Promise<Subprocess> {
  // -s enables single-page app mode (all routes fallback to index.html)
  const server = Bun.spawn(
    ["bunx", "serve", distPath, "-l", String(port), "-s"],
    {
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  // Wait for server to be ready
  const ready = await waitForServer(`http://localhost:${port}`, 30000);
  if (!ready) {
    server.kill();
    throw new Error(`Static server failed to start on port ${port}`);
  }

  return server;
}

export async function cleanup(ctx: TestContext | undefined): Promise<void> {
  if (!ctx) return;

  // Kill any running servers
  if (ctx.serverProcess) {
    ctx.serverProcess.kill();
  }
  if (ctx.staticServerProcess) {
    ctx.staticServerProcess.kill();
  }

  // Remove temp directory
  try {
    fs.rmSync(ctx.testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
