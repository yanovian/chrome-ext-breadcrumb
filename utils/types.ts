/** A saved highlight — the atomic unit of your learning trail. */
export interface Note {
  /** Stable UUID. */
  id: string;
  /** The highlighted text the user saved. */
  text: string;
  /** URL of the page the highlight came from. */
  url: string;
  /** Page title at capture time. */
  title: string;
  /** Capture timestamp (ms since epoch). */
  createdAt: number;
  /** Derived topic tags used for the learning timeline (e.g. "aws", "kubernetes"). */
  topics: string[];
  /** Semantic embedding vector, or null until computed on-device. */
  embedding: number[] | null;
  /** Which model produced `embedding`, or null. */
  embeddingModel: string | null;
}

/** Raw capture payload before it becomes a full {@link Note}. */
export interface NoteInput {
  text: string;
  url: string;
  title: string;
  createdAt?: number;
}

/** User-configurable settings (stored in chrome.storage.local). */
export interface ExtensionSettings {
  /** Blend semantic similarity into search results. Default: true */
  enableSemantic: boolean;
  /** 0 = full-text only, 1 = semantic only. Default: 0.5 */
  semanticWeight: number;
  /** Compute embeddings automatically when Breadcrumb is open. Default: true */
  autoEmbed: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enableSemantic: true,
  semanticWeight: 0.5,
  autoEmbed: true,
};

/** Snapshot of the most recent save, surfaced by the popup right after capture. */
export interface LastSave {
  noteId: string;
  savedAt: number;
}

/** IndexedDB configuration. */
export const DB = {
  name: 'breadcrumb',
  version: 1,
  store: 'notes',
  createdAtIndex: 'createdAt',
} as const;

export const STORAGE_KEYS = {
  settings: 'settings',
  lastSave: 'lastSave',
} as const;

export const CONTEXT_MENU_ID = 'breadcrumb-save-selection';

/** On-device embedding model — small, fast, 384-dim, runs entirely in the browser. */
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIM = 384;

/** Runtime messages between UI surfaces and the background service worker. */
export type RuntimeMessage =
  | { type: 'saveSelection'; input: NoteInput }
  | { type: 'ping' };

export interface RuntimeResponseOk<T = unknown> {
  ok: true;
  data?: T;
}

export interface RuntimeResponseError {
  ok: false;
  error: string;
}

export type RuntimeResponse<T = unknown> =
  | RuntimeResponseOk<T>
  | RuntimeResponseError;
