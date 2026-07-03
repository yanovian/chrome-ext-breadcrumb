import { describe, expect, it } from 'vitest';
import {
  buildSnippet,
  contentTokens,
  hostnameFromUrl,
  normalizeWhitespace,
  tokenize,
  truncate,
  uniqueTokens,
} from '../utils/text';

describe('tokenize', () => {
  it('lowercases and keeps intra-word dots and dashes', () => {
    expect(tokenize('Use bge-small or e5-small (v1.2)')).toEqual([
      'use',
      'bge-small',
      'or',
      'e5-small',
      'v1.2',
    ]);
  });

  it('strips leading/trailing punctuation', () => {
    expect(tokenize('...hello-- world.')).toEqual(['hello', 'world']);
  });
});

describe('contentTokens', () => {
  it('drops stop words and single characters', () => {
    expect(contentTokens('The Docker security of a container')).toEqual([
      'docker',
      'security',
      'container',
    ]);
  });
});

describe('uniqueTokens', () => {
  it('deduplicates while preserving order', () => {
    expect(uniqueTokens('kubernetes kubernetes autoscaling')).toEqual([
      'kubernetes',
      'autoscaling',
    ]);
  });
});

describe('normalizeWhitespace', () => {
  it('collapses runs of whitespace', () => {
    expect(normalizeWhitespace('  a\n\t b   c ')).toBe('a b c');
  });
});

describe('truncate', () => {
  it('leaves short text untouched', () => {
    expect(truncate('short text', 100)).toBe('short text');
  });

  it('adds an ellipsis when over the limit', () => {
    const result = truncate('a'.repeat(300), 50);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(51);
  });
});

describe('hostnameFromUrl', () => {
  it('returns the bare hostname without www', () => {
    expect(hostnameFromUrl('https://www.aws.amazon.com/lambda')).toBe(
      'aws.amazon.com',
    );
  });

  it('falls back to the raw value for invalid urls', () => {
    expect(hostnameFromUrl('not a url')).toBe('not a url');
  });
});

describe('buildSnippet', () => {
  it('centers the snippet on the first match', () => {
    const text = `${'x'.repeat(300)} kubernetes autoscaling ${'y'.repeat(300)}`;
    const snippet = buildSnippet(text, 'autoscaling', 40);
    expect(snippet).toContain('autoscaling');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('falls back to a plain truncation without matches', () => {
    const snippet = buildSnippet('some unrelated content here', 'redis', 40);
    expect(snippet).toContain('some unrelated content');
  });
});
