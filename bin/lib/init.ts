import fs from "fs";
import nodePath from "path";
import yaml from "js-yaml";

export default async function createNewConfig() {
  const configPath = "veslx.yaml";

  if (fs.existsSync(configPath)) {
    console.error(`Configuration file '${configPath}' already exists.`);
    return;
  }

  const cwd = process.cwd();
  const folderName = nodePath.basename(cwd);

  const config = {
    dir: ".",
    site: {
      name: folderName,
      github: "",
    },
  };

  const configStr = yaml.dump(config, { indent: 2, quotingType: '"' });

  await fs.promises.writeFile(configPath, configStr, "utf-8");

  console.log(`Created veslx.yaml`);
  console.log(`\nEdit the file to customize your site, then run:`);
  console.log(`  veslx serve`);
}
