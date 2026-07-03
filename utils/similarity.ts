/** Dot product of two equal-length vectors. */
export function dot(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}

/** Euclidean (L2) norm of a vector. */
export function magnitude(vector: number[]): number {
  return Math.sqrt(dot(vector, vector));
}

/** Return a unit-length copy of the vector (or the original if it is all zeros). */
export function normalize(vector: number[]): number[] {
  const mag = magnitude(vector);
  if (mag === 0) {
    return vector.slice();
  }
  return vector.map((value) => value / mag);
}

/**
 * Cosine similarity in [-1, 1]. Returns 0 when either vector is missing or
 * degenerate, so callers can treat it as "no semantic signal".
 */
export function cosineSimilarity(
  a: number[] | null | undefined,
  b: number[] | null | undefined,
): number {
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }

  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot(a, b) / (magA * magB);
}
