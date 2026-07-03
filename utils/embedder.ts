import { notesMissingEmbedding, putNote } from './db';
import { embeddingInput } from './note';
import { EMBEDDING_MODEL } from './types';

/** Progress event emitted while the model downloads / initializes. */
export interface ModelProgress {
  status: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

type ProgressHandler = (progress: ModelProgress) => void;

const progressHandlers = new Set<ProgressHandler>();
let embedFn: Promise<(text: string) => Promise<number[]>> | null = null;

/** Subscribe to model download progress. Returns an unsubscribe function. */
export function onModelProgress(handler: ProgressHandler): () => void {
  progressHandlers.add(handler);
  return () => {
    progressHandlers.delete(handler);
  };
}

function emitProgress(progress: ModelProgress): void {
  for (const handler of progressHandlers) {
    handler(progress);
  }
}

/**
 * Resolve a packaged asset path to a runtime URL. Uses a loose signature because
 * these files (public/ort, public/models) are fetched at build time, so they
 * aren't part of WXT's statically-known public-path union.
 */
function assetUrl(path: string): string {
  return (browser.runtime.getURL as (p: string) => string)(path);
}

async function loadEmbedder(): Promise<(text: string) => Promise<number[]>> {
  const { pipeline, env } = await import('@huggingface/transformers');

  // The model ships inside the extension package, so it loads from disk and the
  // extension makes NO network request at runtime — fully offline, on-device.
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = assetUrl('/models/');
  env.useBrowserCache = true;

  // Serve the ONNX Runtime WebAssembly from the extension package instead of a
  // CDN, so NO remotely-hosted code is ever executed (required by Manifest V3
  // and the Chrome Web Store). Files are copied into public/ort/ at build time.
  (env as { useWasmCache?: boolean }).useWasmCache = false;
  const onnx = env.backends?.onnx as
    | { wasm?: { wasmPaths?: unknown; numThreads?: number } }
    | undefined;
  if (onnx?.wasm) {
    onnx.wasm.wasmPaths = {
      wasm: assetUrl('/ort/ort-wasm-simd-threaded.asyncify.wasm'),
      mjs: assetUrl('/ort/ort-wasm-simd-threaded.asyncify.mjs'),
    };
    onnx.wasm.numThreads = 1;
  }

  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (progress: unknown) => {
      emitProgress(progress as ModelProgress);
    },
  });

  return async (text: string): Promise<number[]> => {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  };
}

/** Lazily initialize (and cache) the embedding pipeline. */
export function getEmbedder(): Promise<(text: string) => Promise<number[]>> {
  if (!embedFn) {
    embedFn = loadEmbedder().catch((error) => {
      embedFn = null;
      throw error;
    });
  }
  return embedFn;
}

/** Compute a single embedding vector for arbitrary text. */
export async function embedText(text: string): Promise<number[]> {
  const embed = await getEmbedder();
  return embed(text);
}

export interface BackfillProgress {
  done: number;
  total: number;
}

/**
 * Compute embeddings for every note that is missing one. Runs in a DOM context
 * (popup / library) where WebAssembly inference is reliable. Safe to call on
 * every open — it no-ops when everything is already embedded.
 */
export async function backfillEmbeddings(
  onProgress?: (progress: BackfillProgress) => void,
  shouldContinue: () => boolean = () => true,
): Promise<number> {
  const pending = await notesMissingEmbedding(EMBEDDING_MODEL);
  if (pending.length === 0) {
    return 0;
  }

  let done = 0;
  for (const note of pending) {
    if (!shouldContinue()) {
      break;
    }

    try {
      const embedding = await embedText(embeddingInput(note));
      await putNote({ ...note, embedding, embeddingModel: EMBEDDING_MODEL });
      done += 1;
      onProgress?.({ done, total: pending.length });
    } catch (error) {
      console.error('[Breadcrumb] Failed to embed note', note.id, error);
      // A hard failure (model can't load) won't fix itself mid-loop — stop and
      // let full-text search carry the experience.
      break;
    }
  }

  return done;
}
