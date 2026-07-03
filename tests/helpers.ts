import type { Note } from '../utils/types';

let counter = 0;

/** Build a Note for tests with sensible defaults. */
export function makeNote(partial: Partial<Note> & { text: string }): Note {
  counter += 1;
  return {
    id: partial.id ?? `note-${counter}`,
    text: partial.text,
    url: partial.url ?? 'https://example.com/article',
    title: partial.title ?? 'Example Article',
    createdAt: partial.createdAt ?? new Date(2026, 5, 15).getTime(),
    topics: partial.topics ?? [],
    embedding: partial.embedding ?? null,
    embeddingModel: partial.embeddingModel ?? null,
  };
}
