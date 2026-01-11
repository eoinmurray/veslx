import fs from "fs";
import nodePath from "path";
import yaml from "js-yaml";
import readline from "node:readline/promises";
import process from "node:process";

export default async function createNewConfig() {
  const cwd = process.cwd();
  const folderName = nodePath.basename(cwd);

  let contentDir = ".";
  let wantsHomepage = false;

  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const dirAnswer = (await rl.question("Where is your content directory? (default: .) ")).trim();
    contentDir = dirAnswer || ".";

    const homepageAnswer = (await rl.question("Create a custom homepage? (y/N) ")).trim().toLowerCase();
    wantsHomepage = homepageAnswer === "y" || homepageAnswer === "yes";

    rl.close();
  }

  const resolvedContentDir = nodePath.isAbsolute(contentDir)
    ? contentDir
    : nodePath.resolve(cwd, contentDir);

  const configPath = nodePath.join(resolvedContentDir, "veslx.yaml");
  if (fs.existsSync(configPath)) {
    console.error(`Configuration file '${nodePath.relative(cwd, configPath) || "veslx.yaml"}' already exists.`);
    return;
  }

  if (!fs.existsSync(resolvedContentDir)) {
    await fs.promises.mkdir(resolvedContentDir, { recursive: true });
    console.log(`Created content directory: ${contentDir}`);
  }

  if (wantsHomepage) {
    const indexPath = nodePath.join(resolvedContentDir, "index.mdx");
    if (fs.existsSync(indexPath)) {
      console.log(`Skipped homepage: ${nodePath.relative(cwd, indexPath) || "index.mdx"} already exists.`);
    } else {
      const safeTitle = folderName.replace(/"/g, '\\"');
      const homepage = `---\ntitle: "Welcome to ${safeTitle}"\n---\n\n<VeslxFrontMatter />\n\n# Welcome to ${safeTitle}\n\nThis is your new veslx site. Start by editing posts or adding new folders.\n\n<VeslxPostList />\n`;
      await fs.promises.writeFile(indexPath, homepage, "utf-8");
      console.log(`Created custom homepage: ${nodePath.relative(cwd, indexPath) || "index.mdx"}`);
    }
  }

  const sampleDir = nodePath.join(resolvedContentDir, "getting-started");
  const samplePath = nodePath.join(sampleDir, "README.mdx");
  if (fs.existsSync(samplePath)) {
    console.log(`Skipped sample post: ${nodePath.relative(cwd, samplePath)}`);
  } else {
    await fs.promises.mkdir(sampleDir, { recursive: true });
    const safeTitle = folderName.replace(/"/g, '\\"');
    const samplePost = `---\ntitle: "Getting Started"\ndate: "${new Date().toISOString().slice(0, 10)}"\ndescription: "Your first veslx post"\n---\n\n# Getting Started\n\nWelcome to **${safeTitle}**. This is a sample post you can edit or delete.\n\n- Write in MDX\n- Add images under \`./images\`\n- Create slides with \`SLIDES.mdx\`\n\n`;
    await fs.promises.writeFile(samplePath, samplePost, "utf-8");
    console.log(`Created sample post: ${nodePath.relative(cwd, samplePath)}`);
  }

  const config = {
    dir: contentDir,
    site: {
      name: "veslx",
      description: "my new veslx site",
      github: "",
    },
  };

  const configStr = yaml.dump(config, { indent: 2, quotingType: '"' });

  await fs.promises.writeFile(configPath, configStr, "utf-8");

  console.log(`Created ${nodePath.relative(cwd, configPath) || "veslx.yaml"}`);
  console.log(`\nEdit the file to customize your site, then run:`);
  console.log(`  bunx veslx serve ${contentDir}`);
}
