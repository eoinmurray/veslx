import fs from "fs";
import nodePath from "path";
import yaml from "js-yaml";
import readline from "node:readline/promises";
import process from "node:process";

export default async function createNewConfig() {
  const configPath = "veslx.yaml";

  if (fs.existsSync(configPath)) {
    console.error(`Configuration file '${configPath}' already exists.`);
    return;
  }

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
      const homepage = `---\ntitle: "${safeTitle}"\n---\n\n<VeslxFrontMatter />\n\n# ${folderName}\n\n<VeslxPostList />\n`;
      await fs.promises.writeFile(indexPath, homepage, "utf-8");
      console.log(`Created custom homepage: ${nodePath.relative(cwd, indexPath) || "index.mdx"}`);
    }
  }

  const config = {
    dir: contentDir,
    site: {
      name: folderName,
      github: "",
    },
  };

  const configStr = yaml.dump(config, { indent: 2, quotingType: '"' });

  await fs.promises.writeFile(configPath, configStr, "utf-8");

  console.log(`Created veslx.yaml`);
  console.log(`\nEdit the file to customize your site, then run:`);
  console.log(`  bunx veslx serve`);
}
