import { describe, expect, it } from 'vitest';
import {
  createNote,
  dedupeKey,
  embeddingInput,
  normalizeNote,
} from '../utils/note';

describe('createNote', () => {
  it('builds a normalized note with derived topics', () => {
    const result = createNote({
      text: '  Kubernetes  autoscaling  with HPA  ',
      url: 'https://kubernetes.io/docs',
      title: 'Autoscaling',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.note.text).toBe('Kubernetes autoscaling with HPA');
    expect(result.note.topics).toContain('Kubernetes');
    expect(result.note.embedding).toBeNull();
    expect(result.note.id).toBeTruthy();
  });

  it('rejects empty selections', () => {
    const result = createNote({ text: '   ', url: '', title: '' });
    expect(result.ok).toBe(false);
  });

  it('falls back to url then Untitled for the title', () => {
    const result = createNote({
      text: 'some content',
      url: 'https://example.com/x',
      title: '',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.note.title).toBe('https://example.com/x');
    }
  });
});

describe('embeddingInput', () => {
  it('prepends the title for extra context', () => {
    expect(
      embeddingInput({ title: 'Redis', text: 'connection pooling tips' }),
    ).toBe('Redis. connection pooling tips');
  });

  it('avoids duplicating a title already present in the text', () => {
    expect(
      embeddingInput({ title: 'Redis tips', text: 'Redis tips for scaling' }),
    ).toBe('Redis tips for scaling');
  });
});

describe('dedupeKey', () => {
  it('is stable for the same text and url regardless of case', () => {
    expect(dedupeKey({ text: 'Hello', url: 'https://a.com' })).toBe(
      dedupeKey({ text: 'hello', url: 'https://a.com' }),
    );
  });

  it('differs across pages', () => {
    expect(dedupeKey({ text: 'hi', url: 'https://a.com' })).not.toBe(
      dedupeKey({ text: 'hi', url: 'https://b.com' }),
    );
  });
});

describe('normalizeNote', () => {
  it('fills in defaults for partial records', () => {
    const note = normalizeNote({ id: 'x', text: 'AWS Lambda note' });
    expect(note.title).toBe('Untitled');
    expect(note.embedding).toBeNull();
    expect(note.createdAt).toBeTypeOf('number');
    expect(note.topics.length).toBeGreaterThan(0);
  });

  it('preserves existing embeddings', () => {
    const note = normalizeNote({
      id: 'x',
      text: 'note',
      embedding: [0.1, 0.2],
      embeddingModel: 'test-model',
    });
    expect(note.embedding).toEqual([0.1, 0.2]);
    expect(note.embeddingModel).toBe('test-model');
  });
});
