import { DEFAULT_SETTINGS, STORAGE_KEYS } from './types';
import type { ExtensionSettings, LastSave } from './types';

async function readLocal<T>(key: string): Promise<T | undefined> {
  const result = await browser.storage.local.get([key]);
  return result[key] as T | undefined;
}

async function writeLocal(key: string, value: unknown): Promise<void> {
  if (value === null || value === undefined) {
    await browser.storage.local.remove(key);
    return;
  }
  await browser.storage.local.set({ [key]: value });
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.semanticWeight;
  }
  return Math.max(0, Math.min(1, value));
}

/** Merge stored (possibly partial/legacy) settings with defaults. */
export function mergeSettings(
  partial: Partial<ExtensionSettings> | undefined,
): ExtensionSettings {
  const raw = partial ?? {};
  return {
    enableSemantic:
      typeof raw.enableSemantic === 'boolean'
        ? raw.enableSemantic
        : DEFAULT_SETTINGS.enableSemantic,
    semanticWeight: clamp01(
      Number(raw.semanticWeight ?? DEFAULT_SETTINGS.semanticWeight),
    ),
    autoEmbed:
      typeof raw.autoEmbed === 'boolean'
        ? raw.autoEmbed
        : DEFAULT_SETTINGS.autoEmbed,
  };
}

export async function getSettings(): Promise<ExtensionSettings> {
  return mergeSettings(
    await readLocal<Partial<ExtensionSettings>>(STORAGE_KEYS.settings),
  );
}

export async function saveSettings(
  settings: ExtensionSettings,
): Promise<ExtensionSettings> {
  const merged = mergeSettings(settings);
  await writeLocal(STORAGE_KEYS.settings, merged);
  return merged;
}

export async function ensureSettingsExist(): Promise<void> {
  const stored = await readLocal<Partial<ExtensionSettings>>(
    STORAGE_KEYS.settings,
  );
  if (stored === undefined) {
    await saveSettings(DEFAULT_SETTINGS);
  }
}

export async function getLastSave(): Promise<LastSave | null> {
  return (await readLocal<LastSave>(STORAGE_KEYS.lastSave)) ?? null;
}

export async function setLastSave(lastSave: LastSave | null): Promise<void> {
  await writeLocal(STORAGE_KEYS.lastSave, lastSave);
}
