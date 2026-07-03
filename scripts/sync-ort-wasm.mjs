#!/usr/bin/env node
/**
 * Copy the ONNX Runtime Web WASM files into public/ort/ so they ship *inside*
 * the extension package. This keeps all executable code local (Manifest V3 /
 * Chrome Web Store forbid remotely-hosted code) — the embedding runtime is
 * loaded from the package, never a CDN.
 *
 * Run automatically before dev/build/zip. Regenerate with `pnpm sync:ort`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'ort');

// The variant Transformers.js uses for the wasm (CPU) execution provider.
const FILES = [
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
];

function findDist() {
  const direct = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
  if (existsSync(join(direct, FILES[0]))) {
    return direct;
  }

  const pnpm = join(ROOT, 'node_modules', '.pnpm');
  if (existsSync(pnpm)) {
    for (const name of readdirSync(pnpm)) {
      if (!name.startsWith('onnxruntime-web@')) {
        continue;
      }
      const dist = join(pnpm, name, 'node_modules', 'onnxruntime-web', 'dist');
      if (existsSync(join(dist, FILES[0]))) {
        return dist;
      }
    }
  }

  return null;
}

const dist = findDist();
if (!dist) {
  console.error(
    '[sync-ort-wasm] onnxruntime-web dist not found. Run `pnpm install` first.',
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const file of FILES) {
  copyFileSync(join(dist, file), join(OUT, file));
  console.log(`[sync-ort-wasm] copied ${file}`);
}
