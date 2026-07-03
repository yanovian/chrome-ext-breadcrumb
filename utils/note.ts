import { deriveTopics } from './topics';
import { normalizeWhitespace } from './text';
import type { Note, NoteInput } from './types';

export const MIN_NOTE_LENGTH = 2;
export const MAX_NOTE_LENGTH = 20_000;

export type CreateNoteResult =
  | { ok: true; note: Note }
  | { ok: false; error: string };

/** Turn a raw capture into a fully-formed, storable note (without an embedding). */
export function createNote(input: NoteInput): CreateNoteResult {
  const text = normalizeWhitespace(input.text ?? '').slice(0, MAX_NOTE_LENGTH);

  if (text.length < MIN_NOTE_LENGTH) {
    return { ok: false, error: 'Select some text before saving to Breadcrumb.' };
  }

  const url = (input.url ?? '').trim();
  const title = normalizeWhitespace(input.title ?? '') || url || 'Untitled';

  return {
    ok: true,
    note: {
      id: crypto.randomUUID(),
      text,
      url,
      title,
      createdAt: input.createdAt ?? Date.now(),
      topics: deriveTopics(text, url),
      embedding: null,
      embeddingModel: null,
    },
  };
}

/** Text used to compute a note's embedding — title gives helpful context. */
export function embeddingInput(note: Pick<Note, 'title' | 'text'>): string {
  const title = normalizeWhitespace(note.title ?? '');
  const text = normalizeWhitespace(note.text ?? '');
  return title && !text.toLowerCase().startsWith(title.toLowerCase())
    ? `${title}. ${text}`
    : text;
}

/** Stable key for detecting exact-duplicate captures (same text on same page). */
export function dedupeKey(note: Pick<Note, 'text' | 'url'>): string {
  return `${note.url}\u0000${note.text.toLowerCase()}`;
}

/** Repair notes written by older builds / partial writes. */
export function normalizeNote(raw: Partial<Note> & { id: string }): Note {
  const text = normalizeWhitespace(raw.text ?? '');
  const url = (raw.url ?? '').trim();
  return {
    id: raw.id,
    text,
    url,
    title: normalizeWhitespace(raw.title ?? '') || url || 'Untitled',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    topics:
      Array.isArray(raw.topics) && raw.topics.length > 0
        ? raw.topics
        : deriveTopics(text, url),
    embedding: Array.isArray(raw.embedding) ? raw.embedding : null,
    embeddingModel:
      typeof raw.embeddingModel === 'string' ? raw.embeddingModel : null,
  };
}
