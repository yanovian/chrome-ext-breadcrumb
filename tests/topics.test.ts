import { describe, expect, it } from 'vitest';
import { deriveTopics } from '../utils/topics';

describe('deriveTopics', () => {
  it('recognizes known technologies from the text', () => {
    expect(
      deriveTopics('Kubernetes HPA autoscaling with kubectl', ''),
    ).toContain('Kubernetes');
  });

  it('uses the source host as a topic signal', () => {
    const topics = deriveTopics(
      'Configuring Lambda functions',
      'https://aws.amazon.com/lambda',
    );
    expect(topics).toContain('AWS');
  });

  it('maps aliases to a canonical topic', () => {
    expect(deriveTopics('Tuning an LLM prompt for RAG', '')).toContain('AI');
  });

  it('falls back to the most frequent keyword', () => {
    const topics = deriveTopics('widget widget gizmo', '');
    expect(topics).toEqual(['Widget']);
  });

  it('caps the number of topics', () => {
    const topics = deriveTopics(
      'AWS Kubernetes Docker Rust Python Redis Postgres',
      '',
      3,
    );
    expect(topics.length).toBeLessThanOrEqual(3);
  });
});
