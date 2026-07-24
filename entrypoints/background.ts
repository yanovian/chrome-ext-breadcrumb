import { readBackup, writeBackup } from '../utils/backup';
import { countNotes, getAllNotes, putNotes, saveNote } from '../utils/db';
import { createNote, normalizeNote } from '../utils/note';
import { ensureSettingsExist, setLastSave } from '../utils/settings';
import { CONTEXT_MENU_ID } from '../utils/types';
import type { NoteInput, RuntimeMessage, RuntimeResponse } from '../utils/types';

const SAVED_COLOR = '#0D9488';
const DUPLICATE_COLOR = '#A16207';

async function ensureContextMenu(): Promise<void> {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Save to Breadcrumb',
    contexts: ['selection'],
  });
}

async function resetBadge(): Promise<void> {
  await browser.action.setBadgeText({ text: '' });
  await browser.action.setTitle({ title: 'Breadcrumb — your learning trail' });
}

async function flashBadge(duplicate: boolean): Promise<void> {
  await browser.action.setBadgeBackgroundColor({
    color: duplicate ? DUPLICATE_COLOR : SAVED_COLOR,
  });
  await browser.action.setBadgeText({ text: duplicate ? '=' : '+1' });
  await browser.action.setTitle({
    title: duplicate
      ? 'Breadcrumb — already in your trail'
      : 'Breadcrumb — saved to your trail',
  });

  setTimeout(() => {
    void resetBadge();
  }, 3000);
}

/** Persist a captured selection to IndexedDB and surface it to the popup. */
async function capture(
  input: NoteInput,
): Promise<{ id: string; duplicate: boolean }> {
  const created = createNote(input);
  if (!created.ok) {
    throw new Error(created.error);
  }

  const { note, duplicate } = await saveNote(created.note);
  await setLastSave({ noteId: note.id, savedAt: Date.now() });
  await flashBadge(duplicate);
  // Keep the storage.local safety-net backup current. Awaited, not fired and
  // forgotten, since the service worker can be torn down right after this call.
  await writeBackup(await getAllNotes());

  return { id: note.id, duplicate };
}

/**
 * If IndexedDB comes up empty right after an update (the exact symptom of the
 * data loss this guards against), restore from the storage.local backup.
 * IndexedDB and storage.local are separate storage areas, so a problem
 * affecting one (eviction, corruption) very likely leaves the other intact.
 * Never touches IndexedDB when it already has notes, so it can't clobber a
 * deliberate "Clear all" (which also empties the backup; see the
 * clearAllNotes call sites).
 */
async function restoreFromBackupIfEmpty(): Promise<number> {
  const existing = await countNotes();
  if (existing > 0) {
    return 0;
  }
  const backupNotes = await readBackup();
  if (!backupNotes) {
    return 0;
  }
  await putNotes(backupNotes.map((note) => normalizeNote(note)));
  return backupNotes.length;
}

async function restoreAndNotify(): Promise<void> {
  const restored = await restoreFromBackupIfEmpty();
  if (restored === 0) {
    return;
  }
  await browser.action.setBadgeBackgroundColor({ color: SAVED_COLOR });
  await browser.action.setBadgeText({ text: '↺' });
  await browser.action.setTitle({
    title: `Breadcrumb: restored ${restored} note${restored === 1 ? '' : 's'} from backup`,
  });
  setTimeout(() => {
    void resetBadge();
  }, 8000);
}

export default defineBackground(() => {
  void ensureSettingsExist();

  browser.runtime.onInstalled.addListener(async (details) => {
    await ensureSettingsExist();
    await ensureContextMenu();
    await resetBadge();
    if (details.reason === 'update') {
      await restoreAndNotify();
    }
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureContextMenu();
    await resetBadge();
    await restoreAndNotify();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) {
      return;
    }

    const text = info.selectionText ?? '';
    const url = info.pageUrl ?? tab?.url ?? '';
    const title = tab?.title ?? '';

    void capture({ text, url, title }).catch((error) => {
      console.error('[Breadcrumb] Failed to save selection', error);
    });
  });

  browser.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    void (async () => {
      try {
        switch (message?.type) {
          case 'saveSelection': {
            const data = await capture(message.input);
            sendResponse({ ok: true, data } satisfies RuntimeResponse);
            return;
          }
          case 'ping': {
            sendResponse({ ok: true } satisfies RuntimeResponse);
            return;
          }
          default:
            sendResponse({
              ok: false,
              error: 'Unknown message type',
            } satisfies RuntimeResponse);
        }
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Unexpected error',
        } satisfies RuntimeResponse);
      }
    })();

    return true;
  });
});
