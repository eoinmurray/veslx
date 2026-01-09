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

        // Test directory listing (folder without index/README)
        await page.goto("http://localhost:3000/docs");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForFunction(
          () => document.body.textContent?.includes("External Link Post"),
          { timeout: 20000 }
        );
        let rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);
        expect(rootContent).toContain("External Link Post");
        const externalLinkCount = await page.locator('a[href="https://example.com"][target="_blank"]').count();
        expect(externalLinkCount).toBeGreaterThan(0);

        // Test README page (post)
        await page.goto("http://localhost:3000/README.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        // Wait for article element (MDX content is rendered within an article)
        await page.waitForSelector("article", { state: "attached", timeout: 10000 });
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Check frontmatter is displayed (title, description, date from YAML front matter)
        // Wait for the frontmatter description to be visible
        await page.waitForFunction(
          () => document.body.textContent?.includes("Integration test content"),
          { timeout: 10000 }
        );
        const pageContent = await page.content();
        expect(pageContent).toContain("Integration test content"); // description from frontmatter
        expect(pageContent).toContain("15 Jan, 24"); // date from frontmatter

        // Test SLIDES page (presentation)
        await page.goto("http://localhost:3000/SLIDES.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Test .slides.mdx format (alternative slides naming)
        await page.goto("http://localhost:3000/presentation.slides.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);
        expect(rootContent).toContain("Dot Slides Test");

        // Test hyphenated .slides.mdx filename (e.g., getting-started.slides.mdx)
        await page.goto("http://localhost:3000/getting-started.slides.mdx");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);
        expect(rootContent).toContain("Getting Started Slides");

        // Test FrontMatter component works in slides (should render description from frontmatter)
        expect(rootContent).toContain("Test hyphenated slides filename"); // description from frontmatter

        // Verify standalone .slides.mdx files appear in directory listing
        await page.goto("http://localhost:3000/docs");
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForFunction(
          () => document.querySelectorAll('a[href*=".slides.mdx"]').length > 0,
          { timeout: 20000 }
        );
        const slidesLinks = await page.locator('a[href*=".slides.mdx"]').count();
        expect(slidesLinks).toBeGreaterThan(0);

        // Verify no console errors across all pages
        expect(consoleErrors).toEqual([]);

        await page.close();
      } finally {
        serverProcess.kill();
        ctx.serverProcess = undefined;
      }
    }, 90000);

    test("renders root README.mdx as homepage even when content dir is not named 'content'", async () => {
      const veslxBin = path.join(ctx.testDir, "node_modules", ".bin", "veslx");

      // Create a second content directory with a different folder name and only a README.mdx
      const altContentDirName = "docs-root";
      const altContentDir = path.join(ctx.testDir, altContentDirName);
      fs.mkdirSync(altContentDir, { recursive: true });

      const readmeSource = fs.readFileSync(
        path.join(ctx.testDir, "content", "README.mdx"),
        "utf-8"
      );
      fs.writeFileSync(path.join(altContentDir, "README.mdx"), readmeSource);

      // Start the server pointing at the alternate directory
      const serverProcess = Bun.spawn([veslxBin, "serve", altContentDirName], {
        cwd: ctx.testDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      ctx.serverProcess = serverProcess;

      try {
        const ready = await waitForServer("http://localhost:3000", 30000);
        expect(ready).toBe(true);

        const page = await browser.newPage();
        const consoleErrors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        await page.goto("http://localhost:3000/");
        await page.waitForSelector("#root", { state: "attached" });

        // The homepage should render the README content, not the directory listing title.
        await page.waitForSelector("h1", { state: "attached", timeout: 20000 });
        const h1Text = await page.locator("h1").first().textContent();
        expect(h1Text).toContain("Test Page");

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
      const { process: staticServer, port } = await serveStatic(distPath);
      ctx.staticServerProcess = staticServer;
      ctx.staticServerPort = port;

      try {
        // Open browser and collect console errors
        const page = await browser.newPage();
        const consoleErrors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        // Test directory listing (folder without index/README)
        await page.goto(`http://localhost:${port}/docs`);
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForFunction(
          () => document.body.textContent?.includes("External Link Post"),
          { timeout: 60000 }
        );
        let rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);
        expect(rootContent).toContain("External Link Post");
        const externalLinkCount = await page.locator('a[href="https://example.com"][target="_blank"]').count();
        expect(externalLinkCount).toBeGreaterThan(0);

        // Test README page (post)
        await page.goto(`http://localhost:${port}/README.mdx`);
        await page.waitForSelector("#root", { state: "attached" });
        // Wait for article element (MDX content is rendered within an article)
        await page.waitForSelector("article", { state: "attached", timeout: 10000 });
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Check frontmatter is displayed (title, description, date from YAML front matter)
        // Wait for the frontmatter description to be visible
        await page.waitForFunction(
          () => document.body.textContent?.includes("Integration test content"),
          { timeout: 10000 }
        );
        const pageContent = await page.content();
        expect(pageContent).toContain("Integration test content"); // description from frontmatter
        expect(pageContent).toContain("15 Jan, 24"); // date from frontmatter

        // Test SLIDES page (presentation)
        await page.goto(`http://localhost:${port}/SLIDES.mdx`);
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);

        // Test .slides.mdx format (alternative slides naming)
        await page.goto(`http://localhost:${port}/presentation.slides.mdx`);
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);
        expect(rootContent).toContain("Dot Slides Test");

        // Test hyphenated .slides.mdx filename (e.g., getting-started.slides.mdx)
        await page.goto(`http://localhost:${port}/getting-started.slides.mdx`);
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForTimeout(1000);
        rootContent = await page.locator("#root").innerHTML();
        expect(rootContent.length).toBeGreaterThan(100);
        expect(rootContent).toContain("Getting Started Slides");

        // Test FrontMatter component works in slides (should render description from frontmatter)
        expect(rootContent).toContain("Test hyphenated slides filename"); // description from frontmatter

        // Verify standalone .slides.mdx files appear in directory listing
        await page.goto(`http://localhost:${port}/docs`);
        await page.waitForSelector("#root", { state: "attached" });
        await page.waitForFunction(
          () => document.querySelectorAll('a[href*=".slides.mdx"]').length > 0,
          { timeout: 60000 }
        );
        const slidesLinks = await page.locator('a[href*=".slides.mdx"]').count();
        expect(slidesLinks).toBeGreaterThan(0);

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
