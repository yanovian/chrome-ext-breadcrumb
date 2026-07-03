import { describe, expect, it } from 'vitest';
import { buildTimeline, topicTotals } from '../utils/timeline';
import { makeNote } from './helpers';

const may = (day: number) => new Date(2026, 4, day).getTime();
const june = (day: number) => new Date(2026, 5, day).getTime();

describe('buildTimeline', () => {
  const notes = [
    makeNote({ text: 'a', topics: ['AWS'], createdAt: may(2) }),
    makeNote({ text: 'b', topics: ['AWS'], createdAt: may(9) }),
    makeNote({ text: 'c', topics: ['Kubernetes'], createdAt: may(20) }),
    makeNote({ text: 'd', topics: ['AI'], createdAt: june(4) }),
    makeNote({ text: 'e', topics: ['AI', 'Rust'], createdAt: june(11) }),
  ];

  it('groups notes into reverse-chronological months', () => {
    const timeline = buildTimeline(notes);
    expect(timeline.map((month) => month.key)).toEqual(['2026-06', '2026-05']);
    expect(timeline[0]!.label).toBe('June 2026');
  });

  it('counts totals and topic breakdowns per month', () => {
    const timeline = buildTimeline(notes);
    const may2026 = timeline.find((month) => month.key === '2026-05')!;
    expect(may2026.total).toBe(3);
    expect(may2026.topics).toEqual([
      { topic: 'AWS', count: 2 },
      { topic: 'Kubernetes', count: 1 },
    ]);

    const june2026 = timeline.find((month) => month.key === '2026-06')!;
    expect(june2026.total).toBe(2);
    expect(june2026.topics[0]).toEqual({ topic: 'AI', count: 2 });
  });

  it('limits topics per month when requested', () => {
    const timeline = buildTimeline(notes, { topicsPerMonth: 1 });
    const may2026 = timeline.find((month) => month.key === '2026-05')!;
    expect(may2026.topics).toHaveLength(1);
    expect(may2026.topics[0]!.topic).toBe('AWS');
  });
});

describe('topicTotals', () => {
  it('aggregates topic counts across all notes', () => {
    const notes = [
      makeNote({ text: 'a', topics: ['AWS', 'Security'] }),
      makeNote({ text: 'b', topics: ['AWS'] }),
      makeNote({ text: 'c', topics: ['Rust'] }),
    ];
    expect(topicTotals(notes)).toEqual([
      { topic: 'AWS', count: 2 },
      { topic: 'Rust', count: 1 },
      { topic: 'Security', count: 1 },
    ]);
  });

  it('respects the limit', () => {
    const notes = [makeNote({ text: 'a', topics: ['AWS', 'Rust', 'AI'] })];
    expect(topicTotals(notes, 2)).toHaveLength(2);
  });
});
