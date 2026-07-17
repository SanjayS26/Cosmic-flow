import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const filename of await findJavaScriptFiles(serverDirectory)) {
  const result = spawnSync(process.execPath, ['--check', filename], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('Backend source syntax is valid.');
