import { describe, expect, it } from 'vitest';
import { findSimilar, fullTextScore, rankNotes } from '../utils/search';
import { makeNote } from './helpers';

describe('fullTextScore', () => {
  it('scores notes that contain the query terms', () => {
    const note = makeNote({
      text: 'Docker security best practices for containers',
      title: 'Docker security',
    });
    const result = fullTextScore(note, 'docker security');
    expect(result.matched.sort()).toEqual(['docker', 'security']);
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns zero for unrelated notes', () => {
    const note = makeNote({ text: 'A gallery of cat photos' });
    expect(fullTextScore(note, 'docker security').score).toBe(0);
  });
});

describe('rankNotes', () => {
  const docker = makeNote({
    text: 'Docker security scanning for container images',
    title: 'Container security',
    topics: ['Docker', 'Security'],
  });
  const cats = makeNote({ text: 'Adorable cat photos and videos' });

  it('orders relevant notes first and drops non-matches', () => {
    const results = rankNotes([cats, docker], 'docker security', {
      enableSemantic: false,
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe(docker.id);
  });

  it('returns nothing for an empty query without an embedding', () => {
    expect(rankNotes([docker], '   ', { enableSemantic: false })).toEqual([]);
  });

  it('surfaces semantic-only matches above the floor', () => {
    const near = makeNote({
      text: 'Message broker throughput tuning',
      embedding: [1, 0, 0],
    });
    const far = makeNote({
      text: 'Frontend animation techniques',
      embedding: [0, 1, 0],
    });

    const results = rankNotes([near, far], 'redis performance', {
      queryEmbedding: [0.95, 0.05, 0],
      enableSemantic: true,
      semanticWeight: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe(near.id);
    expect(results[0]!.matchedTerms).toEqual([]);
  });

  it('blends keyword and semantic signals', () => {
    const keywordHit = makeNote({
      text: 'redis connection pooling guide',
      embedding: [0, 1, 0],
    });
    const semanticHit = makeNote({
      text: 'in-memory datastore tuning',
      embedding: [1, 0, 0],
    });

    const results = rankNotes([keywordHit, semanticHit], 'redis', {
      queryEmbedding: [1, 0, 0],
      enableSemantic: true,
      semanticWeight: 0.5,
    });

    const ids = results.map((result) => result.note.id);
    expect(ids).toContain(keywordHit.id);
    expect(ids).toContain(semanticHit.id);
  });
});

describe('findSimilar', () => {
  it('ranks by embedding cosine similarity', () => {
    const reference = makeNote({ text: 'reference', embedding: [1, 0, 0] });
    const close = makeNote({ text: 'close', embedding: [0.9, 0.1, 0] });
    const far = makeNote({ text: 'far', embedding: [0, 1, 0] });

    const results = findSimilar(reference, [reference, close, far]);
    expect(results).toHaveLength(1);
    expect(results[0]!.note.id).toBe(close.id);
  });

  it('falls back to keyword overlap without embeddings', () => {
    const reference = makeNote({
      text: 'kubernetes horizontal pod autoscaling',
    });
    const overlap = makeNote({ text: 'kubernetes autoscaling deep dive' });
    const unrelated = makeNote({ text: 'sourdough bread recipe' });

    const results = findSimilar(reference, [reference, overlap, unrelated]);
    expect(results[0]!.note.id).toBe(overlap.id);
  });
});
