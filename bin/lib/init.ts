import { createPrompt } from "bun-promptx";

export default async function createNewConfig() {

  const path = "veslx.config.ts"

  if (await Bun.file(path).exists()) {
    console.error(`Configuration file '${path}' already exists in the current directory.`);
    return
  }

  console.log("Initializing a new veslx project...");

  const dir = createPrompt("Enter dir: ");
  if (dir.error) {
    console.error("Failed to read dir");
    process.exit(1);
  }

  console.log("You entered:", dir.value);

  const configStr = `
export default {
  dir: '${dir.value}',
}`

  await Bun.write(path, configStr.trim());

  console.log("Created 'veslx.config.ts' in the current directory.");
  console.log("You can now run 'veslx serve' to start the development server.");
}