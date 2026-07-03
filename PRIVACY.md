# Privacy Policy — Breadcrumb

**Last updated:** July 3, 2026

**Privacy policy URL (for Chrome Web Store):**
https://github.com/yanovian/chrome-ext-breadcrumb/blob/master/PRIVACY.md

## Summary

**Breadcrumb does not collect your data.** There is no account, no analytics, and
no backend server that receives your notes or searches. Everything you save stays
**on your device**, in your browser. The only network activity is a one-time
download of the on-device AI model and runtime from a public CDN (described
below) — never your content.

## Who we are

Breadcrumb is an open-source Chrome extension that helps you save and re-find what
you learn online. The source code is public in this repository.

## What the extension stores locally

- **Your saved notes** — the highlighted text, the page URL and title, a
  timestamp, auto-derived topic tags, and an AI embedding vector. These live in
  your browser's **IndexedDB**.
- **Your settings** and a short-lived "just saved" hint, stored with Chrome's
  `storage` API (`chrome.storage.local`).

All of this stays on your computer. It is never transmitted to us or to any third
party.

## What the extension reads

When you choose **Save to Breadcrumb** from the right-click menu, the extension
reads:

- the **text you selected**, and
- the **title and URL of the current tab** (via the `activeTab` permission).

This happens **only when you invoke the menu item** — Breadcrumb does not read
pages in the background, does not use the browsing `history` API, and does not
inject scripts into the pages you visit.

## On-device AI and network use

Semantic search uses a small machine-learning model that runs **entirely in your
browser** with WebAssembly. There is no inference server.

- The WebAssembly runtime is bundled **inside the extension** — no code is loaded
  from remote servers.
- The model's weights (data, not code) are downloaded **once** from the public
  model hub and cached by your browser. After that, the feature works offline.
- Only those model files are fetched. **Your notes, searches, and browsing are
  never sent anywhere.**

You can turn semantic AI off entirely in the extension settings; full-text search
still works.

## What we do not do

- We do **not** collect, store, or receive your data on any server.
- We do **not** sell, rent, or share your data with third parties.
- We do **not** use your data for advertising or profiling.
- We do **not** use the Chrome `history` API or log the sites you visit.
- We do **not** request host permissions or inject content scripts.

## Permissions and why they are needed

| Permission | Purpose |
|------------|---------|
| `contextMenus` | Adds the "Save to Breadcrumb" item to the right-click menu on selected text |
| `storage` | Saves your settings and a temporary "just saved" hint on your device |
| `activeTab` | Reads the current tab's title and URL when you save a highlight |

## Data retention and deletion

Your data stays in your browser until you remove it. You can:

- **Delete a single note** or **Clear all** from the Breadcrumb library.
- **Export** everything as JSON for safekeeping.
- **Remove the extension**, which deletes its local storage and database.

## Children

This extension is not directed at children under 13, and we do not knowingly
collect personal information from anyone (we do not collect personal information
at all).

## Changes

If this policy changes, we will update this file in the public repository and
change the "Last updated" date above.

## Open source

Source code: https://github.com/yanovian/chrome-ext-breadcrumb

## Contact

For privacy questions, open an issue on the GitHub repository or contact the
publisher email listed on the Chrome Web Store listing.
