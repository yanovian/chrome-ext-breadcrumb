import { saveNote } from '../utils/db';
import { createNote } from '../utils/note';
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

  return { id: note.id, duplicate };
}

export default defineBackground(() => {
  void ensureSettingsExist();

  browser.runtime.onInstalled.addListener(async () => {
    await ensureSettingsExist();
    await ensureContextMenu();
    await resetBadge();
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureContextMenu();
    await resetBadge();
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
