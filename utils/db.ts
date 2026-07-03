import { dedupeKey, normalizeNote } from './note';
import { DB } from './types';
import type { Note } from './types';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB.name, DB.version);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB.store)) {
        const store = db.createObjectStore(DB.store, { keyPath: 'id' });
        store.createIndex(DB.createdAtIndex, 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open Breadcrumb database.'));
  });

  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(DB.store, mode).objectStore(DB.store);
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** All notes, newest first. */
export async function getAllNotes(): Promise<Note[]> {
  const db = await openDb();
  const raw = await promisifyRequest(tx(db, 'readonly').getAll());
  return (raw as Note[])
    .map((note) => normalizeNote(note))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await openDb();
  const raw = await promisifyRequest(tx(db, 'readonly').get(id));
  return raw ? normalizeNote(raw as Note) : null;
}

/** Insert or overwrite a note. */
export async function putNote(note: Note): Promise<void> {
  const db = await openDb();
  await promisifyRequest(tx(db, 'readwrite').put(note));
}

/**
 * Save a note, skipping exact duplicates (same text on the same page).
 * Returns the stored note plus whether it was newly added.
 */
export async function saveNote(
  note: Note,
): Promise<{ note: Note; duplicate: boolean }> {
  const existing = await getAllNotes();
  const key = dedupeKey(note);
  const match = existing.find((candidate) => dedupeKey(candidate) === key);
  if (match) {
    return { note: match, duplicate: true };
  }

  await putNote(note);
  return { note, duplicate: false };
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openDb();
  await promisifyRequest(tx(db, 'readwrite').delete(id));
}

export async function clearAllNotes(): Promise<void> {
  const db = await openDb();
  await promisifyRequest(tx(db, 'readwrite').clear());
}

export async function countNotes(): Promise<number> {
  const db = await openDb();
  return promisifyRequest(tx(db, 'readonly').count());
}

/** Notes that still need an embedding from the given model. */
export async function notesMissingEmbedding(model: string): Promise<Note[]> {
  const notes = await getAllNotes();
  return notes.filter(
    (note) => !note.embedding || note.embeddingModel !== model,
  );
}
