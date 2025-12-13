import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { chromium, type Browser } from "playwright";
import {
  packAndInstall,
  copyFixtures,
  waitForServer,
  serveStatic,
  cleanup,
  type TestContext,
} from "./utils/setup";

describe("veslx CLI integration", () => {
  let ctx: TestContext;
  let browser: Browser;

  beforeAll(async () => {
    // Pack and install veslx in a temp directory
    ctx = await packAndInstall();
    // Copy minimal test fixtures
    await copyFixtures(ctx.testDir);
    // Launch browser for Playwright tests
    browser = await chromium.launch();
  }, 120000); // 2 minute timeout for setup

  afterAll(async () => {
    await browser?.close();
    await cleanup(ctx);
  });

  describe("veslx serve", () => {
    test("starts dev server and responds with HTML", async () => {
      const veslxBin = path.join(ctx.testDir, "node_modules", ".bin", "veslx");

      // Start the server
      const serverProcess = Bun.spawn([veslxBin, "serve", "content"], {
        cwd: ctx.testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      ctx.serverProcess = serverProcess;

      try {
        // Wait for server to be ready
        const ready = await waitForServer("http://localhost:3000", 30000);
        expect(ready).toBe(true);

        // Fetch the homepage
        const response = await fetch("http://localhost:3000");
        expect(response.ok).toBe(true);

        const html = await response.text();
        expect(html.toLowerCase()).toContain("<!doctype html>");
        expect(html).toContain("<div id=\"root\">");
      } finally {
        serverProcess.kill();
        ctx.serverProcess = undefined;
      }
    }, 60000);

    test("renders correctly in browser (no import errors)", async () => {
      const veslxBin = path.join(ctx.testDir, "node_modules", ".bin", "veslx");

      // Start the server
      const serverProcess = Bun.spawn([veslxBin, "serve", "content"], {
        cwd: ctx.testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      ctx.serverProcess = serverProcess;

      try {
        // Wait for server to be ready
        const ready = await waitForServer("http://localhost:3000", 30000);
        expect(ready).toBe(true);

        // Open browser and collect console errors
        const page = await browser.newPage();
        const consoleErrors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        // Test home page (directory listing)
        await page.goto("http://localhost:3000");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        let rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Test README page (post)
        await page.goto("http://localhost:3000/README.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Test SLIDES page (presentation)
        await page.goto("http://localhost:3000/SLIDES.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Verify no console errors across all pages
        expect(consoleErrors).toEqual([]);

        await page.close();
      } finally {
        serverProcess.kill();
        ctx.serverProcess = undefined;
      }
    }, 90000);
  });

  describe("veslx build", () => {
    test("creates dist/ with expected structure", async () => {
      const veslxBin = path.join(ctx.testDir, "node_modules", ".bin", "veslx");

      // Run build command
      const result = Bun.spawnSync([veslxBin, "build", "content"], {
        cwd: ctx.testDir,
      });

      expect(result.exitCode).toBe(0);

      const distPath = path.join(ctx.testDir, "dist");

      // Check dist directory exists
      expect(fs.existsSync(distPath)).toBe(true);

      // Check index.html exists
      expect(fs.existsSync(path.join(distPath, "index.html"))).toBe(true);

      // Check raw/ directory with content copy
      expect(fs.existsSync(path.join(distPath, "raw"))).toBe(true);

      // Check assets directory exists
      expect(fs.existsSync(path.join(distPath, "assets"))).toBe(true);
    }, 120000);

    test("built site renders correctly in browser", async () => {
      const distPath = path.join(ctx.testDir, "dist");

      // Serve the built static files
      const staticServer = await serveStatic(distPath, 3001);
      ctx.staticServerProcess = staticServer;

      try {
        // Open browser and collect console errors
        const page = await browser.newPage();
        const consoleErrors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        // Test home page (directory listing)
        await page.goto("http://localhost:3001");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        let rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Test README page (post)
        await page.goto("http://localhost:3001/README.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Test SLIDES page (presentation)
        await page.goto("http://localhost:3001/SLIDES.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Verify no console errors across all pages
        expect(consoleErrors).toEqual([]);

        await page.close();
      } finally {
        staticServer.kill();
        ctx.staticServerProcess = undefined;
      }
    }, 90000);
  });
});
