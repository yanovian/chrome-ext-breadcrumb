import './style.css';
import { getAllNotes } from '../../utils/db';
import {
  backfillEmbeddings,
  embedText,
  onModelProgress,
} from '../../utils/embedder';
import { findSimilar, rankNotes } from '../../utils/search';
import {
  getLastSave,
  getSettings,
  saveSettings,
} from '../../utils/settings';
import { buildSnippet, hostnameFromUrl, truncate } from '../../utils/text';
import { formatRelativeDate, highlight } from '../../utils/ui';
import type { SearchResult } from '../../utils/search';
import type { ExtensionSettings, Note } from '../../utils/types';

const savedBanner = document.querySelector<HTMLElement>('#saved-banner')!;
const savedText = document.querySelector<HTMLElement>('#saved-text')!;
const savedMeta = document.querySelector<HTMLElement>('#saved-meta')!;
const savedSimilar = document.querySelector<HTMLElement>('#saved-similar')!;
const savedSimilarList = document.querySelector<HTMLUListElement>('#saved-similar-list')!;

const searchInput = document.querySelector<HTMLInputElement>('#search-input')!;
const searchStatus = document.querySelector<HTMLElement>('#search-status')!;
const results = document.querySelector<HTMLUListElement>('#results')!;
const emptyState = document.querySelector<HTMLElement>('#empty-state')!;

const settingsToggle = document.querySelector<HTMLButtonElement>('#settings-toggle')!;
const settingsSection = document.querySelector<HTMLElement>('#settings-section')!;
const settingEnableSemantic = document.querySelector<HTMLInputElement>('#setting-enable-semantic')!;
const settingAutoEmbed = document.querySelector<HTMLInputElement>('#setting-auto-embed')!;
const settingSemanticWeight = document.querySelector<HTMLInputElement>('#setting-semantic-weight')!;

const noteCount = document.querySelector<HTMLElement>('#note-count')!;
const modelStatus = document.querySelector<HTMLElement>('#model-status')!;
const openLibrary = document.querySelector<HTMLButtonElement>('#open-library')!;

let notes: Note[] = [];
let settings: ExtensionSettings = {
  enableSemantic: true,
  semanticWeight: 0.5,
  autoEmbed: true,
};
let searchToken = 0;
let backfillRunning = false;
let savedNoteId: string | null = null;

function openUrl(url: string): void {
  if (!url) {
    return;
  }
  void browser.tabs.create({ url });
}

function rowHtml(note: Note, query: string, matchedTerms: string[], semantic: boolean): string {
  const title = note.title || hostnameFromUrl(note.url) || 'Untitled';
  const snippet = query
    ? buildSnippet(note.text, query)
    : truncate(note.text, 150);
  const host = hostnameFromUrl(note.url);
  const topic = note.topics[0];

  const meta = [
    host ? `<span>${highlight(host, [])}</span>` : '',
    `<span>${formatRelativeDate(note.createdAt)}</span>`,
    topic ? `<span class="tag">${highlight(topic, [])}</span>` : '',
    semantic ? '<span class="badge-sem">≈ similar</span>' : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <p class="result-title">${highlight(title, matchedTerms)}</p>
    <p class="result-snippet">${highlight(snippet, matchedTerms)}</p>
    <p class="result-meta">${meta}</p>
  `;
}

function renderList(
  container: HTMLUListElement,
  rows: Array<{ note: Note; matchedTerms: string[]; semantic: boolean }>,
  query: string,
): void {
  container.replaceChildren();
  for (const row of rows) {
    const li = document.createElement('li');
    li.className = 'result';
    li.innerHTML = rowHtml(row.note, query, row.matchedTerms, row.semantic);
    li.addEventListener('click', () => openUrl(row.note.url));
    container.append(li);
  }
}

function toRows(searchResults: SearchResult[]): Array<{
  note: Note;
  matchedTerms: string[];
  semantic: boolean;
}> {
  return searchResults.map((result) => ({
    note: result.note,
    matchedTerms: result.matchedTerms,
    semantic:
      result.matchedTerms.length === 0 && result.semanticScore >= 0.4,
  }));
}

function renderRecent(): void {
  emptyState.classList.add('hidden');
  if (notes.length === 0) {
    results.replaceChildren();
    emptyState.classList.remove('hidden');
    emptyState.innerHTML =
      'No breadcrumbs yet.<br />Highlight text on any page, right-click, and choose <strong>Save to Breadcrumb</strong>.';
    searchStatus.textContent = '';
    return;
  }

  searchStatus.textContent = 'Recent saves';
  const recent = notes.slice(0, 8).map((note) => ({
    note,
    matchedTerms: [] as string[],
    semantic: false,
  }));
  renderList(results, recent, '');
}

async function runSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  const token = ++searchToken;

  if (!trimmed) {
    renderRecent();
    return;
  }

  emptyState.classList.add('hidden');

  // Immediate full-text pass so results feel instant.
  const textResults = rankNotes(notes, trimmed, {
    enableSemantic: false,
    limit: 12,
  });
  renderList(results, toRows(textResults), trimmed);
  searchStatus.textContent = textResults.length
    ? `${textResults.length} result${textResults.length === 1 ? '' : 's'}`
    : 'No keyword matches — trying meaning…';

  if (!settings.enableSemantic) {
    if (textResults.length === 0) {
      showNoResults(trimmed);
    }
    return;
  }

  // Semantic pass layers meaning-based matches on top.
  try {
    const queryEmbedding = await embedText(trimmed);
    if (token !== searchToken) {
      return;
    }
    const hybrid = rankNotes(notes, trimmed, {
      queryEmbedding,
      enableSemantic: true,
      semanticWeight: settings.semanticWeight,
      limit: 12,
    });
    renderList(results, toRows(hybrid), trimmed);
    searchStatus.textContent = hybrid.length
      ? `${hybrid.length} result${hybrid.length === 1 ? '' : 's'} · keyword + AI`
      : '';
    if (hybrid.length === 0) {
      showNoResults(trimmed);
    }
  } catch {
    if (token === searchToken && textResults.length === 0) {
      showNoResults(trimmed);
    }
  }
}

function showNoResults(query: string): void {
  results.replaceChildren();
  emptyState.classList.remove('hidden');
  emptyState.textContent = `Nothing found for “${query}”.`;
  searchStatus.textContent = '';
}

function renderSavedSimilar(note: Note): void {
  const similar = findSimilar(note, notes, 2);
  if (similar.length === 0) {
    savedSimilar.classList.add('hidden');
    return;
  }
  savedSimilar.classList.remove('hidden');
  renderList(savedSimilarList, toRows(similar), '');
}

async function showSavedBanner(): Promise<void> {
  const lastSave = await getLastSave();
  if (!lastSave || Date.now() - lastSave.savedAt > 90_000) {
    savedBanner.classList.add('hidden');
    return;
  }

  const note = notes.find((candidate) => candidate.id === lastSave.noteId);
  if (!note) {
    savedBanner.classList.add('hidden');
    return;
  }

  savedNoteId = note.id;
  savedBanner.classList.remove('hidden');
  savedText.textContent = truncate(note.text, 180);
  const host = hostnameFromUrl(note.url);
  savedMeta.textContent = [host, note.topics.join(', ')]
    .filter(Boolean)
    .join(' · ');
  renderSavedSimilar(note);
}

function setModelStatus(text: string): void {
  modelStatus.textContent = text;
}

function updateCount(): void {
  noteCount.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
}

async function reloadNotes(): Promise<void> {
  notes = await getAllNotes();
  updateCount();
}

async function maybeBackfill(): Promise<void> {
  if (backfillRunning || !settings.enableSemantic || !settings.autoEmbed) {
    return;
  }
  const pending = notes.filter((note) => !note.embedding);
  if (pending.length === 0) {
    setModelStatus(notes.length ? 'AI ready' : '');
    return;
  }

  backfillRunning = true;
  const unsubscribe = onModelProgress((progress) => {
    if (progress.status === 'progress' && typeof progress.progress === 'number') {
      setModelStatus(`Loading model ${Math.round(progress.progress)}%`);
    } else if (progress.status === 'ready') {
      setModelStatus('Embedding…');
    }
  });

  try {
    await backfillEmbeddings((p) => {
      setModelStatus(`Embedding ${p.done}/${p.total}`);
    });
    await reloadNotes();
    setModelStatus('AI ready');
    if (savedNoteId) {
      const note = notes.find((candidate) => candidate.id === savedNoteId);
      if (note) {
        renderSavedSimilar(note);
      }
    }
    if (searchInput.value.trim()) {
      void runSearch(searchInput.value);
    }
  } catch {
    setModelStatus('AI unavailable');
  } finally {
    unsubscribe();
    backfillRunning = false;
  }
}

function applySettingsToInputs(): void {
  settingEnableSemantic.checked = settings.enableSemantic;
  settingAutoEmbed.checked = settings.autoEmbed;
  settingSemanticWeight.value = String(Math.round(settings.semanticWeight * 100));
}

async function persistSettings(): Promise<void> {
  settings = await saveSettings({
    enableSemantic: settingEnableSemantic.checked,
    autoEmbed: settingAutoEmbed.checked,
    semanticWeight: Number(settingSemanticWeight.value) / 100,
  });
  if (searchInput.value.trim()) {
    void runSearch(searchInput.value);
  } else {
    renderRecent();
  }
  void maybeBackfill();
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runSearch(searchInput.value);
  }, 160);
});

settingsToggle.addEventListener('click', () => {
  const open = settingsSection.classList.toggle('hidden');
  settingsToggle.classList.toggle('active', !open);
});

settingEnableSemantic.addEventListener('change', () => void persistSettings());
settingAutoEmbed.addEventListener('change', () => void persistSettings());
settingSemanticWeight.addEventListener('change', () => void persistSettings());

openLibrary.addEventListener('click', () => {
  void browser.tabs.create({ url: browser.runtime.getURL('/library.html') });
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'lastSave' in changes) {
    void (async () => {
      await reloadNotes();
      await showSavedBanner();
    })();
  }
});

void (async () => {
  void browser.action.setBadgeText({ text: '' }).catch(() => {});
  settings = await getSettings();
  applySettingsToInputs();
  await reloadNotes();
  await showSavedBanner();
  renderRecent();
  setModelStatus(
    settings.enableSemantic ? (notes.length ? 'AI ready' : '') : 'AI off',
  );
  searchInput.focus();
  void maybeBackfill();
})();
