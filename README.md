# Breadcrumb

**Never lose what you've learned online.**

Every page you read leaves a breadcrumb. Every idea you save becomes part of a
searchable trail. Highlight text on any page, right-click **Save to Breadcrumb**,
and months later find it again with a plain-language search — powered by on-device
AI, with zero data leaving your browser.

> Imagine six months from now you vaguely remember *"I read something about
> Kubernetes autoscaling"* — but not where, when, or which article. Open
> Breadcrumb, search `kubernetes autoscaling`, and it surfaces the AWS article
> from March, the YouTube tutorial from April, and your highlighted note — all in
> one place.

## Why Breadcrumb

Most productivity extensions try to change your behavior. Breadcrumb doesn't. It
simply **captures value from what you already do** — reading, researching,
learning, solving problems — and turns it into a memory you can search.

> "Save knowledge you'll need later" is a clearer, more enduring promise than
> "be more productive."

Built for the people who forget where they learned something:

- **Developers** — AWS docs, Kubernetes guides, GitHub issues, StackOverflow, blog posts
- **Students & researchers** — papers, courses, articles across many sources
- **AI power users** — insights from ChatGPT, Claude, and Gemini they'd otherwise lose

## Features

- **One-click capture** — highlight text, right-click **Save to Breadcrumb**. Stores the text, page URL, title, and timestamp.
- **Hybrid search** — full-text keyword matching *and* semantic (meaning-based) similarity, blended into one ranked list.
- **On-device AI** — embeddings are computed locally with [Transformers.js](https://huggingface.co/docs/transformers.js) (a small `all-MiniLM-L6-v2` model). No servers, no accounts.
- **Similar notes** — when you save something, Breadcrumb shows related things you saved before.
- **Learning timeline** — a month-by-month breakdown of what you've been learning ("May: 14 AWS notes, 8 Kubernetes notes").
- **Topic tags** — notes are auto-tagged (AWS, Kubernetes, AI, Rust…) for filtering and the timeline.
- **Export & delete** — export everything as JSON, or wipe it in one click. It's your data.

## Permissions

Breadcrumb requests only three permissions — and no host permissions:

```json
{
  "permissions": ["storage", "contextMenus", "activeTab"]
}
```

| Permission | Why |
|------------|-----|
| `contextMenus` | Add the **Save to Breadcrumb** right-click item on selected text |
| `storage` | Save your settings and the "just saved" hint locally |
| `activeTab` | Read the title/URL of the tab you save from — only when you invoke the menu |

Notes themselves are stored in **IndexedDB**, on your device.

**No browsing history. No reading every page. No backend. No scary permissions.**

Privacy policy: [PRIVACY.md](./PRIVACY.md)

## Quick start (development)

```bash
pnpm install
pnpm dev
```

1. Highlight text on any page → right-click → **Save to Breadcrumb**.
2. Click the Breadcrumb toolbar icon to search, or **Open library** for the full view.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build (Chrome) |
| `pnpm zip` | Create Chrome Web Store zip |
| `pnpm icons` | Regenerate icons from `scripts/generate-icons.py` |
| `pnpm test` | Run unit tests |
| `pnpm typecheck` | TypeScript check |

A `Makefile` wraps the same tasks (`make check`, `make package`, `make release-patch`, …).

## How it works

1. **Capture** — the background service worker saves your highlight to IndexedDB instantly (no model needed).
2. **Embed** — when you open the popup or library, Breadcrumb backfills embeddings for any new notes on-device. Capture never waits on AI.
3. **Search** — full-text results appear instantly; a semantic pass then blends in meaning-based matches so you find things even when you don't remember the exact words.
4. **Reflect** — the library shows your learning timeline and top topics.

See [`_doc/architecture.md`](./_doc/architecture.md) for the full technical design.

## On-device AI

Embeddings run entirely in your browser via WebAssembly — there is **no inference
server**. The small embedding model and the WASM runtime are fetched once from a
public CDN and cached; after that, everything works offline. Your notes and
searches are never uploaded anywhere.

## Tech stack

- [WXT](https://wxt.dev/) — Manifest V3 extension framework (TypeScript + Vite)
- [Transformers.js](https://huggingface.co/docs/transformers.js) — on-device embeddings (`all-MiniLM-L6-v2`)
- IndexedDB — local note storage
- [Vitest](https://vitest.dev/) — unit tests
- GitHub Actions — CI on PR/push, releases on version tags

## License

MIT
