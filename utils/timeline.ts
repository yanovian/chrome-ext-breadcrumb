import type { Note } from './types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface TopicCount {
  topic: string;
  count: number;
}

export interface TimelineMonth {
  /** Sortable key, e.g. "2026-06". */
  key: string;
  /** Human label, e.g. "June 2026". */
  label: string;
  year: number;
  /** 0-indexed month. */
  month: number;
  /** Total notes captured this month. */
  total: number;
  /** Topic breakdown, most frequent first. */
  topics: TopicCount[];
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function rankTopics(counts: Map<string, number>, limit?: number): TopicCount[] {
  const ranked = [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}

/**
 * Group notes into a reverse-chronological learning timeline with per-month
 * topic breakdowns — "May: 14 AWS notes, 8 Kubernetes notes".
 */
export function buildTimeline(
  notes: Note[],
  options: { topicsPerMonth?: number } = {},
): TimelineMonth[] {
  const buckets = new Map<
    string,
    { year: number; month: number; total: number; topics: Map<string, number> }
  >();

  for (const note of notes) {
    const date = new Date(note.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = monthKey(year, month);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { year, month, total: 0, topics: new Map() };
      buckets.set(key, bucket);
    }

    bucket.total += 1;
    for (const topic of note.topics) {
      bucket.topics.set(topic, (bucket.topics.get(topic) ?? 0) + 1);
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, bucket]) => ({
      key,
      label: `${MONTH_NAMES[bucket.month]} ${bucket.year}`,
      year: bucket.year,
      month: bucket.month,
      total: bucket.total,
      topics: rankTopics(bucket.topics, options.topicsPerMonth),
    }));
}

/** Aggregate topic counts across every note, most frequent first. */
export function topicTotals(notes: Note[], limit?: number): TopicCount[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const topic of note.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return rankTopics(counts, limit);
}
