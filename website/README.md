# Breadcrumb marketing site

Landing page for [Breadcrumb](https://github.com/yanovian/chrome-ext-breadcrumb). Vite + React + TypeScript.

**Live URL:** https://yanovian.github.io/chrome-ext-breadcrumb/

## Commands (from repo root)

| Command | Description |
|---------|-------------|
| `make website-dev` | Dev server with hot reload |
| `make website-build` | Production build for GitHub Pages |
| `make website-preview` | Build + preview at http://localhost:4173/chrome-ext-breadcrumb/ |
| `make website-lint-i18n` | Verify locale JSON keys match English |
| `make website-og-images` | Regenerate OG share images |

## From `website/`

```bash
pnpm install
pnpm dev          # localhost, base /
pnpm build        # lint-i18n, then uses .env.production → /chrome-ext-breadcrumb/
pnpm preview      # after build; pass --base /chrome-ext-breadcrumb/ for Pages paths
```

Locales live in `src/locales/` (one folder per language). Edit the JSON files directly; run `pnpm lint-i18n` to verify keys still match `en/`.
