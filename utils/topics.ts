import { contentTokens, hostnameFromUrl } from './text';

/**
 * Canonical topic → the tokens/aliases that map to it. Kept lightweight and
 * developer-flavoured to match Breadcrumb's core audience; unmatched notes fall
 * back to their most salient keyword so the timeline is never empty.
 */
const TOPIC_ALIASES: Record<string, string[]> = {
  AWS: ['aws', 'ec2', 's3', 'lambda', 'dynamodb', 'cloudformation', 'iam', 'cloudwatch'],
  GCP: ['gcp', 'bigquery', 'gke'],
  Azure: ['azure'],
  Kubernetes: ['kubernetes', 'k8s', 'kubectl', 'helm', 'kubelet', 'kube'],
  Docker: ['docker', 'dockerfile', 'compose', 'containerd', 'oci'],
  Terraform: ['terraform', 'hcl'],
  AI: ['ai', 'ml', 'llm', 'llms', 'gpt', 'chatgpt', 'claude', 'gemini', 'embedding', 'embeddings', 'transformer', 'transformers', 'rag', 'prompt', 'inference', 'neural'],
  Rust: ['rust', 'cargo', 'rustc', 'tokio', 'serde'],
  Go: ['golang', 'goroutine', 'goroutines'],
  Python: ['python', 'pip', 'pandas', 'numpy', 'pytorch', 'django', 'flask', 'fastapi'],
  TypeScript: ['typescript', 'tsc', 'tsconfig'],
  JavaScript: ['javascript', 'node', 'nodejs', 'npm', 'pnpm', 'deno', 'bun'],
  React: ['react', 'jsx', 'hooks', 'nextjs'],
  Redis: ['redis', 'valkey'],
  PostgreSQL: ['postgres', 'postgresql', 'psql', 'pgsql'],
  MySQL: ['mysql', 'mariadb'],
  MongoDB: ['mongodb', 'mongo'],
  Databases: ['database', 'sql', 'indexeddb', 'sqlite'],
  Networking: ['networking', 'tcp', 'dns', 'http', 'https', 'grpc', 'tls', 'proxy'],
  Security: ['security', 'auth', 'oauth', 'jwt', 'encryption', 'vulnerability', 'cve', 'xss', 'csrf'],
  Git: ['git', 'github', 'gitlab', 'rebase', 'merge'],
  Linux: ['linux', 'bash', 'kernel', 'systemd', 'ubuntu', 'debian'],
  MCP: ['mcp'],
  Serverless: ['serverless', 'faas'],
  GraphQL: ['graphql', 'apollo'],
  'API Design': ['api', 'rest', 'openapi', 'webhook', 'webhooks'],
};

const HOST_TOPICS: Record<string, string> = {
  'aws.amazon.com': 'AWS',
  'kubernetes.io': 'Kubernetes',
  'docker.com': 'Docker',
  'docs.docker.com': 'Docker',
  'stackoverflow.com': 'StackOverflow',
  'github.com': 'Git',
  'developer.mozilla.org': 'Web',
  'youtube.com': 'Video',
  'youtu.be': 'Video',
  'arxiv.org': 'Research',
  'openai.com': 'AI',
  'huggingface.co': 'AI',
  'anthropic.com': 'AI',
};

const ALIAS_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [topic, aliases] of Object.entries(TOPIC_ALIASES)) {
    for (const alias of aliases) {
      map.set(alias, topic);
    }
  }
  return map;
})();

/**
 * Derive up to `max` topic tags for a note from its text and source host.
 * Falls back to the most frequent content keyword when nothing is recognised.
 */
export function deriveTopics(text: string, url = '', max = 4): string[] {
  const tokens = contentTokens(text);
  const scores = new Map<string, number>();

  const bump = (topic: string, amount: number) => {
    scores.set(topic, (scores.get(topic) ?? 0) + amount);
  };

  for (const token of tokens) {
    const topic = ALIAS_LOOKUP.get(token);
    if (topic) {
      bump(topic, 1);
    }
  }

  const host = hostnameFromUrl(url);
  const hostTopic = HOST_TOPICS[host];
  if (hostTopic) {
    bump(hostTopic, 0.5);
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  if (ranked.length > 0) {
    return ranked.slice(0, max);
  }

  return topKeywords(tokens, 1);
}

/** Most frequent content keywords, Capitalized, as a last-resort topic. */
function topKeywords(tokens: string[], count: number): string[] {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([token]) => token.charAt(0).toUpperCase() + token.slice(1));
}
