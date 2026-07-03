const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Escape a string for safe insertion into innerHTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape `text`, then wrap occurrences of any query term in <mark>. Returns an
 * HTML string safe to assign to innerHTML.
 */
export function highlight(text: string, terms: string[]): string {
  const escaped = escapeHtml(text);
  const usable = terms.filter((term) => term.length >= 2).map(escapeRegExp);
  if (usable.length === 0) {
    return escaped;
  }
  const pattern = new RegExp(`(${usable.join('|')})`, 'gi');
  return escaped.replace(pattern, '<mark>$1</mark>');
}

/** Compact, human-friendly relative/absolute date for a timestamp. */
export function formatRelativeDate(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'just now';
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}m ago`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}h ago`;
  }
  if (diff < 2 * day) {
    return 'yesterday';
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}d ago`;
  }

  const date = new Date(timestamp);
  const nowDate = new Date(now);
  const base = `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === nowDate.getFullYear()
    ? base
    : `${base}, ${date.getFullYear()}`;
}
