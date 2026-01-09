import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as net from "net";
import type { Subprocess } from "bun";

export interface TestContext {
  testDir: string;
  tarballPath: string;
  serverProcess?: Subprocess;
  staticServerProcess?: Subprocess;
  staticServerPort?: number;
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

// Helper script for SPA static server
const SPA_SERVER_SCRIPT = `
import * as fs from "fs";
import * as path from "path";

const distPath = process.argv[2];
const port = parseInt(process.argv[3], 10);

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let filePath = path.join(distPath, url.pathname);

    // Check if file exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return new Response(Bun.file(filePath));
    }

    // Check if it's a directory and serve index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return new Response(Bun.file(indexPath));
      }
    }

    // SPA fallback - serve root index.html
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return new Response(Bun.file(indexPath));
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log('Server started on port ' + port);
`;

export async function serveStatic(
  distPath: string,
  port: number = 0
): Promise<{ process: Subprocess; port: number }> {
  async function getFreePort(): Promise<number> {
    return await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        const resolvedPort =
          typeof addr === "object" && addr ? addr.port : 0;
        server.close(() => resolve(resolvedPort));
      });
    });
  }

  const resolvedPort = port === 0 ? await getFreePort() : port;

  // Write the server script to a temp file
  const scriptPath = path.join(os.tmpdir(), 'spa-server-' + Date.now() + '.js');
  fs.writeFileSync(scriptPath, SPA_SERVER_SCRIPT);

  // Start the server using Bun
  const server = Bun.spawn(["bun", "run", scriptPath, distPath, String(resolvedPort)], {
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for server to be ready
  const ready = await waitForServer(`http://localhost:${resolvedPort}`, 30000);
  if (!ready) {
    let stderrText = "";
    let stdoutText = "";
    try {
      stderrText = await new Response(server.stderr).text();
    } catch {}
    try {
      stdoutText = await new Response(server.stdout).text();
    } catch {}
    server.kill();
    fs.unlinkSync(scriptPath);
    throw new Error(
      `Static server failed to start on port ${resolvedPort}\n\nstdout:\n${stdoutText}\n\nstderr:\n${stderrText}`
    );
  }

  // Clean up script file after server starts
  try {
    fs.unlinkSync(scriptPath);
  } catch {
    // Ignore cleanup errors
  }

  return { process: server, port: resolvedPort };
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
