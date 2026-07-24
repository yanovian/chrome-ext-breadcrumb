import type { Note } from './types';

const BACKUP_KEY = 'notesBackup';
// Stay well under storage.local's 5MB quota, which is shared with settings/lastSave.
const MAX_BACKUP_BYTES = 4_000_000;

/**
 * Slim copy of a note kept in the safety-net backup. Embeddings are the
 * largest field and are fully regenerable, so they're left out to keep the
 * backup small and fast to write on every capture/delete.
 */
export type BackupNote = Pick<
  Note,
  'id' | 'text' | 'url' | 'title' | 'createdAt' | 'topics'
>;

interface BackupPayload {
  updatedAt: number;
  notes: BackupNote[];
}

function toBackupNote(note: Note): BackupNote {
  const { id, text, url, title, createdAt, topics } = note;
  return { id, text, url, title, createdAt, topics };
}

/**
 * Mirror notes into chrome.storage.local, a storage area separate from
 * IndexedDB, so there's a way back if IndexedDB ever comes up empty
 * unexpectedly (see `restoreFromBackupIfEmpty` in background.ts). Call this
 * after every mutation that adds or removes notes.
 */
export async function writeBackup(notes: Note[]): Promise<void> {
  const payload: BackupPayload = {
    updatedAt: Date.now(),
    notes: notes.map(toBackupNote),
  };

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_BACKUP_BYTES) {
    console.warn(
      '[Breadcrumb] Skipping local backup: notes are too large for storage.local.',
    );
    return;
  }

  try {
    await browser.storage.local.set({ [BACKUP_KEY]: payload });
  } catch (error) {
    console.warn('[Breadcrumb] Failed to write local backup', error);
  }
}

/** Read the safety-net backup, or null if there isn't one (or it's empty). */
export async function readBackup(): Promise<BackupNote[] | null> {
  const result = await browser.storage.local.get([BACKUP_KEY]);
  const payload = result[BACKUP_KEY] as BackupPayload | undefined;
  return payload && payload.notes.length > 0 ? payload.notes : null;
}
