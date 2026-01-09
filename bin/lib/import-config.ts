import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { VeslxConfig } from '../../plugin/src/types.js';

export default async function importConfig(root: string): Promise<VeslxConfig | undefined> {
  const configPath = path.join(root, 'veslx.yaml');

  if (!fs.existsSync(configPath)) {
    return undefined;
  }

  const content = await fs.promises.readFile(configPath, 'utf-8');
  return yaml.load(content) as VeslxConfig;
}
