import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve('dist/bin/veslx.js');
const shebang = '#!/usr/bin/env node\n';

const content = fs.readFileSync(targetPath, 'utf-8');
if (!content.startsWith(shebang)) {
  fs.writeFileSync(targetPath, shebang + content, 'utf-8');
}
