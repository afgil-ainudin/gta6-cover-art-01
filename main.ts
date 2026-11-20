// Neon Coast Cover Studio — entry program.
//
// A Node 22 program using only the standard library. It hands the app in:
// it copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-app.ts library (the kit's copy, byte for byte).
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader it writes to /output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDossier, readAppTree } from './vendor/makefun-app.ts';

// The repository root is the directory this file lives in.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// The grader gives us /output; local runs use MAKEFUN_OUTPUT_DIR instead.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyDir(name: string): void {
  const from = join(repoRoot, name);
  if (!existsSync(from)) throw new Error(`main.ts: ${name}/ is missing from the repository`);
  cpSync(from, join(outputDir, name), { recursive: true });
}

// Start from a clean output directory so a stale run can never leak in.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

copyDir('app');
copyDir('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);

// Say what was handed in, so a run's log shows the entry at a glance
// instead of only a byte count: the app's file count and size, how many
// screenshots went in, and the dossier's size.
const tree = readAppTree(join(outputDir, 'app'), {
  app_max_files: 993,
  app_max_bytes: 50331648,
});
const shotCount = readdirSync(join(outputDir, 'screenshots'))
  .filter((name) => !name.startsWith('.')).length;
console.log(`Neon Coast Cover Studio: app ${tree.files.length} files (${tree.totalBytes} bytes), ${shotCount} screenshots, dossier ${dossier.length} bytes -> ${join(outputDir, 'dossier.json')}`);
