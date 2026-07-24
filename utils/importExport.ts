import { MIN_NOTE_LENGTH, dedupeKey, normalizeNote } from './note';
import { hostnameFromUrl } from './text';
import { escapeHtml } from './ui';
import type { Note } from './types';

const EXPORT_APP = 'breadcrumb';
const EXPORT_SCHEMA = 1;

/** Self-describing, versioned export shape: the format re-imported by Breadcrumb. */
export interface ExportPayload {
  app: typeof EXPORT_APP;
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  notes: Note[];
}

export function buildExportPayload(notes: Note[]): ExportPayload {
  return {
    app: EXPORT_APP,
    schema: EXPORT_SCHEMA,
    exportedAt: new Date().toISOString(),
    notes,
  };
}

function sortByNewest(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.createdAt - a.createdAt);
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function noteMeta(note: Note): string {
  return [hostnameFromUrl(note.url), isoDate(note.createdAt), note.topics.join(', ')]
    .filter(Boolean)
    .join(' · ');
}

/** Human-readable Markdown export, one section per note, newest first. */
export function toMarkdown(notes: Note[]): string {
  const sorted = sortByNewest(notes);
  const lines = [
    '# Breadcrumb export',
    '',
    `_${sorted.length} note${sorted.length === 1 ? '' : 's'} · exported ${isoDate(Date.now())}_`,
    '',
  ];

  for (const note of sorted) {
    lines.push(`## ${note.title || 'Untitled'}`);
    lines.push('');
    if (note.url) {
      lines.push(`${note.url}`);
      lines.push('');
    }
    lines.push(noteMeta(note));
    lines.push('');
    lines.push(`> ${note.text.replace(/\n/g, '\n> ')}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/** Plain-text export, one block per note, newest first. */
export function toPlainText(notes: Note[]): string {
  const sorted = sortByNewest(notes);
  const blocks = sorted.map((note) => {
    const header = note.title || 'Untitled';
    const meta = [note.url, noteMeta(note)].filter(Boolean).join('\n');
    return `${header}\n${meta}\n\n${note.text}`;
  });
  return blocks.join('\n\n----------------------------------------\n\n');
}

/** Self-contained HTML for "Print / Save as PDF", no external assets. */
export function buildPrintableHtml(notes: Note[]): string {
  const sorted = sortByNewest(notes);
  const articles = sorted
    .map((note) => {
      const meta = [hostnameFromUrl(note.url), isoDate(note.createdAt), note.topics.join(', ')]
        .filter(Boolean)
        .join(' · ');
      return `
        <article>
          <h2>${escapeHtml(note.title || 'Untitled')}</h2>
          <p class="meta">${escapeHtml(meta)}</p>
          <blockquote>${escapeHtml(note.text)}</blockquote>
        </article>
      `;
    })
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Breadcrumb export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .count { color: #666; font-size: 12px; margin: 0 0 24px; }
  article { margin-bottom: 26px; page-break-inside: avoid; }
  h2 { font-size: 15px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #666; margin: 0 0 8px; }
  blockquote { margin: 0; padding-left: 12px; border-left: 3px solid #ccc; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>Breadcrumb</h1>
<p class="count">${sorted.length} note${sorted.length === 1 ? '' : 's'} · exported ${isoDate(Date.now())}</p>
${articles}
</body>
</html>`;
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  invalid: number;
}

/**
 * Parse an imported file's JSON. Accepts both the current envelope format
 * (`{ notes: [...] }`) and the older bare-array export, so files exported
 * before this format existed still import cleanly.
 */
export function parseImportFile(raw: string): unknown[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }

  if (Array.isArray(data)) {
    return data;
  }
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { notes?: unknown }).notes)
  ) {
    return (data as { notes: unknown[] }).notes;
  }
  throw new Error('That doesn’t look like a Breadcrumb export file.');
}

/**
 * Normalize raw imported entries into storable notes, skipping anything
 * unusable and deduping against both the existing library and the batch
 * itself (same "same text on same page" rule as capturing a highlight).
 */
export function prepareImport(
  raw: unknown[],
  existing: Note[],
): { notes: Note[]; summary: ImportSummary } {
  const seen = new Set(existing.map((note) => dedupeKey(note)));
  const notes: Note[] = [];
  let duplicates = 0;
  let invalid = 0;

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      invalid += 1;
      continue;
    }

    const partial = entry as Partial<Note>;
    const id = typeof partial.id === 'string' && partial.id ? partial.id : crypto.randomUUID();
    const note = normalizeNote({ ...partial, id });

    if (note.text.length < MIN_NOTE_LENGTH) {
      invalid += 1;
      continue;
    }

    const key = dedupeKey(note);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }

    seen.add(key);
    notes.push(note);
  }

  return { notes, summary: { imported: notes.length, duplicates, invalid } };
}
