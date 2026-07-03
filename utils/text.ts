/** Common English filler words ignored during tokenization and topic mining. */
export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'to', 'in',
  'on', 'at', 'by', 'for', 'with', 'about', 'as', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
  'you', 'he', 'she', 'we', 'they', 'them', 'his', 'her', 'our', 'your', 'my',
  'me', 'from', 'into', 'over', 'under', 'out', 'up', 'down', 'so', 'than',
  'too', 'very', 'can', 'will', 'just', 'not', 'no', 'do', 'does', 'did',
  'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'there',
  'here', 'all', 'any', 'some', 'more', 'most', 'other', 'such', 'only', 'own',
  'same', 'also', 'each', 'few', 'both', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'because', 'while', 'have', 'has', 'had', 'get',
]);

/**
 * Split text into lowercase word tokens (letters, numbers, `-` and `.` inside
 * words are kept so `bge-small` and `v1.2` stay intact).
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((token) => token.length > 0);
}

/** Tokenize and drop stop words / single characters — for scoring and topics. */
export function contentTokens(text: string): string[] {
  return tokenize(text).filter(
    (token) => token.length >= 2 && !STOP_WORDS.has(token),
  );
}

/** Unique content tokens, preserving first-seen order. */
export function uniqueTokens(text: string): string[] {
  return [...new Set(contentTokens(text))];
}

/** Collapse whitespace and trim — for storing tidy note text. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Truncate to a maximum length on a word boundary, adding an ellipsis. */
export function truncate(text: string, max = 240): string {
  const clean = normalizeWhitespace(text);
  if (clean.length <= max) {
    return clean;
  }
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 40 ? lastSpace : max).trimEnd()}…`;
}

/** Try to derive a readable hostname from a URL (falls back to the raw value). */
export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Build a snippet centered on the first query-term match, so search results
 * show *why* a note matched.
 */
export function buildSnippet(text: string, query: string, radius = 120): string {
  const clean = normalizeWhitespace(text);
  const terms = uniqueTokens(query);
  if (terms.length === 0) {
    return truncate(clean, radius * 2);
  }

  const lower = clean.toLowerCase();
  let matchIndex = -1;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
      matchIndex = index;
    }
  }

  if (matchIndex === -1) {
    return truncate(clean, radius * 2);
  }

  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(clean.length, matchIndex + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < clean.length ? '…' : '';
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}
