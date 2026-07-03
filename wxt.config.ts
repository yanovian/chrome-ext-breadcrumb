import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'wxt';

/**
 * The embedding runtime loads its WASM from `/ort/` (see utils/embedder.ts).
 * Vite also emits an unused copy under `assets/` while bundling Transformers.js;
 * drop it so the package doesn't ship the 23 MB binary twice.
 */
function removeRedundantWasm(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      removeRedundantWasm(full);
    } else if (/[/\\]assets[/\\]ort-wasm-.*\.wasm$/.test(full)) {
      rmSync(full);
      console.log(`ℹ Removed redundant bundled copy: ${entry}`);
    }
  }
}

export default defineConfig({
  hooks: {
    'build:done'(wxt) {
      removeRedundantWasm(wxt.config.outDir);
    },
  },
  manifest: {
    name: 'Breadcrumb',
    short_name: 'Breadcrumb',
    description:
      'Never lose what you learn online. Highlight text, save it to Breadcrumb, and search your knowledge with on-device AI.',
    permissions: ['storage', 'contextMenus', 'activeTab'],
    action: {
      default_title: 'Breadcrumb — your learning trail',
    },
    // On-device embeddings run through ONNX Runtime Web (WebAssembly), which
    // needs 'wasm-unsafe-eval' on extension pages. No remote code is executed.
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
  zip: {
    name: 'breadcrumb',
  },
});
