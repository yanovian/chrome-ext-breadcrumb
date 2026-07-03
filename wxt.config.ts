import { defineConfig } from 'wxt';

export default defineConfig({
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
