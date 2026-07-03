import { cosineSimilarity } from './similarity';
import {
  contentTokens,
  hostnameFromUrl,
  normalizeWhitespace,
  tokenize,
  uniqueTokens,
} from './text';
import type { Note } from './types';

export interface SearchResult {
  note: Note;
  /** Combined ranking score used for ordering. */
  score: number;
  /** Full-text score, normalized to 0..1 across the result set. */
  textScore: number;
  /** Semantic cosine similarity (raw, -1..1) against the query embedding. */
  semanticScore: number;
  /** Which query terms matched this note. */
  matchedTerms: string[];
}

export interface RankOptions {
  /** Query embedding for semantic blending, if available. */
  queryEmbedding?: number[] | null;
  /** Blend semantic similarity into the score. Default: true. */
  enableSemantic?: boolean;
  /** 0 = full-text only, 1 = semantic only. Default: 0.5. */
  semanticWeight?: number;
  /** Max results to return. */
  limit?: number;
  /** Minimum cosine similarity for a semantic-only match to appear. Default: 0.35. */
  semanticFloor?: number;
}

interface TextMatch {
  score: number;
  matched: string[];
}

/** Combined lowercase text used for full-text matching. */
export function searchableText(note: Note): string {
  return [note.text, note.title, note.topics.join(' '), hostnameFromUrl(note.url)]
    .join(' ')
    .toLowerCase();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/** Score how well a note matches the query terms (higher is better). */
export function fullTextScore(note: Note, query: string): TextMatch {
  const terms = uniqueTokens(query);
  if (terms.length === 0) {
    return { score: 0, matched: [] };
  }

  const textTokens = new Set(tokenize(note.text));
  const titleTokens = new Set(tokenize(note.title));
  const topicTokens = new Set(note.topics.map((topic) => topic.toLowerCase()));
  const host = hostnameFromUrl(note.url).toLowerCase();
  const haystack = searchableText(note);
  const bodyLower = note.text.toLowerCase();

  const matched: string[] = [];
  let score = 0;

  for (const term of terms) {
    const exactBody = textTokens.has(term);
    const substring = !exactBody && haystack.includes(term);

    if (!exactBody && !substring) {
      continue;
    }

    matched.push(term);

    if (exactBody) {
      score += 1;
      score += Math.min(countOccurrences(bodyLower, term), 3) * 0.3;
    } else {
      score += 0.4;
    }

    if (titleTokens.has(term)) {
      score += 0.6;
    }
    if (topicTokens.has(term)) {
      score += 0.8;
    }
    if (host.includes(term)) {
      score += 0.3;
    }
  }

  // Exact phrase presence is a strong signal for multi-word queries.
  const phrase = normalizeWhitespace(query).toLowerCase();
  if (terms.length > 1 && phrase.length > 0 && bodyLower.includes(phrase)) {
    score += 1.5;
  }

  return { score, matched };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Rank notes for a query using a hybrid of full-text scoring and semantic
 * similarity. Full-text always works; semantic similarity layers on top for any
 * notes that already have an on-device embedding.
 */
export function rankNotes(
  notes: Note[],
  query: string,
  options: RankOptions = {},
): SearchResult[] {
  const {
    queryEmbedding = null,
    enableSemantic = true,
    semanticWeight = 0.5,
    limit,
    semanticFloor = 0.35,
  } = options;

  const trimmed = query.trim();
  const terms = uniqueTokens(trimmed);
  const useSemantic =
    enableSemantic && Array.isArray(queryEmbedding) && queryEmbedding.length > 0;

  if (terms.length === 0 && !useSemantic) {
    return [];
  }

  const weight = clamp01(semanticWeight);

  const scored = notes.map((note) => {
    const text = fullTextScore(note, trimmed);
    const semantic = useSemantic
      ? cosineSimilarity(queryEmbedding, note.embedding)
      : 0;
    return { note, text, semantic };
  });

  const maxText = scored.reduce((max, item) => Math.max(max, item.text.score), 0);

  const results: SearchResult[] = [];
  for (const item of scored) {
    const textNorm = maxText > 0 ? item.text.score / maxText : 0;
    const semNorm = clamp01(item.semantic);

    const hasTextMatch = item.text.matched.length > 0;
    const hasSemanticMatch = useSemantic && item.semantic >= semanticFloor;

    if (!hasTextMatch && !hasSemanticMatch) {
      continue;
    }

    const combined = useSemantic
      ? (1 - weight) * textNorm + weight * semNorm
      : textNorm;

    results.push({
      note: item.note,
      score: combined,
      textScore: textNorm,
      semanticScore: item.semantic,
      matchedTerms: item.text.matched,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.note.createdAt - a.note.createdAt;
  });

  return typeof limit === 'number' ? results.slice(0, limit) : results;
}

/**
 * Find notes similar to a reference note using its embedding (falls back to
 * shared topics/keywords when embeddings are missing).
 */
export function findSimilar(
  reference: Note,
  notes: Note[],
  limit = 3,
): SearchResult[] {
  const others = notes.filter((note) => note.id !== reference.id);
  const hasEmbedding = Array.isArray(reference.embedding);

  const scored = others.map((note) => {
    const semantic = hasEmbedding
      ? cosineSimilarity(reference.embedding, note.embedding)
      : 0;
    const textScore = hasEmbedding ? 0 : keywordOverlap(reference, note);
    return {
      note,
      score: hasEmbedding ? semantic : textScore,
      textScore,
      semanticScore: semantic,
      matchedTerms: [] as string[],
    };
  });

  return scored
    .filter((item) => item.score > (hasEmbedding ? 0.4 : 0.15))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function keywordOverlap(a: Note, b: Note): number {
  const setA = new Set(contentTokens(`${a.title} ${a.text}`));
  const setB = new Set(contentTokens(`${b.title} ${b.text}`));
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      shared += 1;
    }
  }
  return shared / Math.sqrt(setA.size * setB.size);
}
