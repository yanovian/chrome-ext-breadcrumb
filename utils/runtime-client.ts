import type { NoteInput, RuntimeMessage, RuntimeResponse } from './types';

async function sendMessage<T>(message: RuntimeMessage): Promise<T> {
  try {
    const response = (await browser.runtime.sendMessage(
      message,
    )) as RuntimeResponse<T>;

    if (!response || response.ok !== true) {
      throw new Error(
        response && 'error' in response
          ? response.error
          : 'Breadcrumb is unavailable. Try reloading the extension.',
      );
    }

    return response.data as T;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Breadcrumb is unavailable.',
    );
  }
}

/** Ask the background worker to save a captured selection. */
export function saveSelection(input: NoteInput) {
  return sendMessage<{ id: string; duplicate: boolean }>({
    type: 'saveSelection',
    input,
  });
}

/** Wake the background service worker (no-op response). */
export async function pingBackground(): Promise<void> {
  try {
    await browser.runtime.sendMessage({ type: 'ping' } satisfies RuntimeMessage);
  } catch {
    // Background may be asleep; nothing to do.
  }
}
