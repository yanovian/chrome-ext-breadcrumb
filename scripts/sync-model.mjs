#!/usr/bin/env node
/**
 * Download the embedding model into public/models/ so it ships *inside* the
 * extension package. Combined with the bundled WASM runtime, this makes the
 * extension fully offline: no network request is ever made at runtime.
 *
 * Files are fetched once from the public model hub and cached locally (the
 * folder is git-ignored). Regenerate with `pnpm sync:model`.
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`;
const OUT = join(ROOT, 'public', 'models', MODEL_ID);

// Everything Transformers.js needs to run the model locally with dtype "q8".
const FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'onnx/model_quantized.onnx',
];

async function download(file) {
  const dest = join(OUT, file);
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`[sync-model] have ${file}`);
    return;
  }

  mkdirSync(dirname(dest), { recursive: true });
  const url = `${BASE}/${file}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const mb = (statSync(dest).size / 1_048_576).toFixed(1);
  console.log(`[sync-model] downloaded ${file} (${mb} MB)`);
}

for (const file of FILES) {
  await download(file);
}
console.log('[sync-model] model ready in public/models/');
