import { describe, expect, it } from 'vitest';
import { cosineSimilarity, dot, magnitude, normalize } from '../utils/similarity';

describe('dot', () => {
  it('computes the dot product', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
});

describe('magnitude', () => {
  it('computes the L2 norm', () => {
    expect(magnitude([3, 4])).toBe(5);
  });
});

describe('normalize', () => {
  it('returns a unit vector', () => {
    expect(magnitude(normalize([3, 4]))).toBeCloseTo(1, 10);
  });

  it('leaves a zero vector unchanged', () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical direction', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns 0 when an embedding is missing', () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], undefined)).toBe(0);
  });
});
