# Release & Publishing Guide

This document covers local packaging, automated releases, and publishing to the
Chrome Web Store.

## Versioning

The extension version comes from `package.json` (`version` field). WXT copies it
into the generated manifest. Use [Semantic Versioning](https://semver.org/):

- **PATCH** — bug fixes
- **MINOR** — new features, backward compatible
- **MAJOR** — breaking changes

## Local build & zip

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm zip          # Chrome
pnpm zip:firefox  # Firefox (optional)
```

Artifacts appear in `.output/`:

- `breadcrumb-<version>-chrome.zip`
- `breadcrumb-<version>-firefox.zip`

Load unpacked for manual QA:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `.output/chrome-mv3`

> **Note on size.** The package bundles the ONNX Runtime WebAssembly binary, so
> the zip is larger than a typical extension. This keeps inference on-device.

## CI pipeline (`.github/workflows/ci.yml`)

Runs on push and PRs to `master` / `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. `pnpm zip`
6. Upload the Chrome zip as a build artifact

## Release pipeline (`.github/workflows/release.yml`)

Triggered by pushing a git tag matching `v*.*.*` (e.g. `v1.0.0`):

1. Install dependencies
2. Run tests
3. Build Chrome + Firefox zips
4. Create a GitHub Release with both zips attached and auto-generated notes

### Creating a release

```bash
git checkout master
git pull

pnpm version patch   # or minor / major
git push origin master --follow-tags
```

`make release-patch` / `release-minor` / `release-major` run the full check first.

## Chrome Web Store submission

### Prerequisites

1. [Chrome Web Store Developer account](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
2. A green CI build or local `pnpm zip` artifact
3. Store listing assets: 128×128 icon (`public/icon/128.png`), screenshots (1280×800), and descriptions (see README)

### Upload steps

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **New item** (first release) or select the existing item
3. Upload `.output/breadcrumb-<version>-chrome.zip`
4. Listing details:
   - **Name:** Breadcrumb
   - **Category:** Productivity
   - **Single purpose:** Save highlighted text and search it later
5. Permission justifications:
   - `contextMenus` — add the "Save to Breadcrumb" right-click item
   - `storage` — store settings and a temporary "just saved" hint
   - `activeTab` — read the current tab's title/URL when the user saves a highlight
6. Data-use disclosures: **no data collection**, **no remote code** (all JS *and*
   the WebAssembly runtime ship in the package; only the ML model weights — data,
   not code — download once from the model hub and are cached).
7. Submit for review

### Review tips

- Emphasize **local-only** storage (IndexedDB + `chrome.storage.local`).
- Note there are **no host permissions** and **no content scripts**.
- Explain the on-device AI: inference runs in WebAssembly; no inference server.

## Firefox Add-ons (optional)

`pnpm zip:firefox` produces a Firefox package. Submit at
[addons.mozilla.org](https://addons.mozilla.org/developers/) per their Manifest V3
guidelines.

## Post-release checklist

- [ ] GitHub Release contains both zips
- [ ] Smoke test: highlight → Save to Breadcrumb → popup shows it
- [ ] Search returns keyword and semantic matches
- [ ] Timeline and top topics populate
- [ ] Export JSON and Clear all behave as expected

## Rollback

Chrome Web Store: Developer Dashboard → item → **Package** → roll back to a
previous approved version. Prefer shipping a new patch tag over rewriting
published tags.
