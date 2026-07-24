import { describe, expect, it } from 'vitest';
import {
  buildExportPayload,
  buildPrintableHtml,
  parseImportFile,
  prepareImport,
  toMarkdown,
  toPlainText,
} from '../utils/importExport';
import { makeNote } from './helpers';

describe('buildExportPayload', () => {
  it('wraps notes in a versioned, self-describing envelope', () => {
    const notes = [makeNote({ text: 'hello world' })];
    const payload = buildExportPayload(notes);
    expect(payload.app).toBe('breadcrumb');
    expect(payload.schema).toBe(1);
    expect(payload.notes).toBe(notes);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });
});

describe('toMarkdown', () => {
  it('renders one section per note, newest first', () => {
    const older = makeNote({ text: 'older note', title: 'Older', createdAt: 1 });
    const newer = makeNote({ text: 'newer note', title: 'Newer', createdAt: 2 });
    const md = toMarkdown([older, newer]);

    expect(md.indexOf('## Newer')).toBeLessThan(md.indexOf('## Older'));
    expect(md).toContain('> newer note');
  });

  it('quote-prefixes every line of multi-line text', () => {
    const note = makeNote({ text: 'line one\nline two' });
    const md = toMarkdown([note]);
    expect(md).toContain('> line one\n> line two');
  });
});

describe('toPlainText', () => {
  it('separates notes with a divider', () => {
    const a = makeNote({ text: 'first', title: 'A', createdAt: 2 });
    const b = makeNote({ text: 'second', title: 'B', createdAt: 1 });
    const txt = toPlainText([a, b]);
    const parts = txt.split('----------------------------------------');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('first');
    expect(parts[1]).toContain('second');
  });
});

describe('buildPrintableHtml', () => {
  it('escapes note text so it cannot inject markup', () => {
    const note = makeNote({ text: '<script>alert(1)</script>' });
    const html = buildPrintableHtml([note]);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('parseImportFile', () => {
  it('accepts the current envelope format', () => {
    const raw = JSON.stringify({ app: 'breadcrumb', schema: 1, notes: [{ text: 'x' }] });
    expect(parseImportFile(raw)).toEqual([{ text: 'x' }]);
  });

  it('accepts a bare array (the older export format)', () => {
    const raw = JSON.stringify([{ text: 'x' }]);
    expect(parseImportFile(raw)).toEqual([{ text: 'x' }]);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseImportFile('not json')).toThrow();
  });

  it('rejects JSON that is neither an array nor an envelope', () => {
    expect(() => parseImportFile('{"foo":"bar"}')).toThrow();
  });
});

describe('prepareImport', () => {
  it('normalizes valid entries into storable notes', () => {
    const { notes, summary } = prepareImport(
      [{ text: 'a fresh note', url: 'https://a.com', title: 'A' }],
      [],
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]!.id).toBeTruthy();
    expect(notes[0]!.embedding).toBeNull();
    expect(summary).toEqual({ imported: 1, duplicates: 0, invalid: 0 });
  });

  it('skips entries that are too short or malformed', () => {
    const { notes, summary } = prepareImport(['not an object', { text: 'x' }, {}], []);
    expect(notes).toHaveLength(0);
    expect(summary.invalid).toBe(3);
  });

  it('dedupes against existing notes by text + url', () => {
    const existing = [makeNote({ text: 'dup', url: 'https://a.com' })];
    const { notes, summary } = prepareImport(
      [{ text: 'dup', url: 'https://a.com' }],
      existing,
    );
    expect(notes).toHaveLength(0);
    expect(summary.duplicates).toBe(1);
  });

  it('dedupes within the imported batch itself', () => {
    const { notes, summary } = prepareImport(
      [
        { text: 'same', url: 'https://a.com' },
        { text: 'same', url: 'https://a.com' },
      ],
      [],
    );
    expect(notes).toHaveLength(1);
    expect(summary.imported).toBe(1);
    expect(summary.duplicates).toBe(1);
  });

  it('preserves a matching embedding but keeps id stable across re-import', () => {
    const { notes } = prepareImport(
      [
        {
          id: 'kept-id',
          text: 'has an embedding',
          embedding: [0.1, 0.2],
          embeddingModel: 'test-model',
        },
      ],
      [],
    );
    expect(notes[0]!.id).toBe('kept-id');
    expect(notes[0]!.embedding).toEqual([0.1, 0.2]);
    expect(notes[0]!.embeddingModel).toBe('test-model');
  });
});
