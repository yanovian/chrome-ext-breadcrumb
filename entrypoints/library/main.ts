import './style.css';
import { clearAllNotes, deleteNote, getAllNotes } from '../../utils/db';
import {
  backfillEmbeddings,
  embedText,
  onModelProgress,
} from '../../utils/embedder';
import { findSimilar, rankNotes } from '../../utils/search';
import { getSettings, saveSettings } from '../../utils/settings';
import { buildSnippet, hostnameFromUrl, truncate } from '../../utils/text';
import { buildTimeline, topicTotals } from '../../utils/timeline';
import { escapeHtml, formatRelativeDate, highlight } from '../../utils/ui';
import type { SearchResult } from '../../utils/search';
import type { ExtensionSettings, Note } from '../../utils/types';

const noteTotal = document.querySelector<HTMLElement>('#note-total')!;
const embedBtn = document.querySelector<HTMLButtonElement>('#embed-btn')!;
const embedStatus = document.querySelector<HTMLElement>('#embed-status')!;
const search = document.querySelector<HTMLInputElement>('#search')!;
const enableSemantic = document.querySelector<HTMLInputElement>('#enable-semantic')!;
const viewStatus = document.querySelector<HTMLElement>('#view-status')!;
const sortSelect = document.querySelector<HTMLSelectElement>('#sort')!;
const topicFilters = document.querySelector<HTMLElement>('#topic-filters')!;
const noteList = document.querySelector<HTMLUListElement>('#note-list')!;
const emptyEl = document.querySelector<HTMLElement>('#empty')!;
const timelineEl = document.querySelector<HTMLElement>('#timeline')!;
const topTopicsEl = document.querySelector<HTMLElement>('#top-topics')!;
const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!;
const clearBtn = document.querySelector<HTMLButtonElement>('#clear-btn')!;

const similarDialog = document.querySelector<HTMLDialogElement>('#similar-dialog')!;
const similarClose = document.querySelector<HTMLButtonElement>('#similar-close')!;
const similarSource = document.querySelector<HTMLElement>('#similar-source')!;
const similarList = document.querySelector<HTMLUListElement>('#similar-list')!;
const similarEmpty = document.querySelector<HTMLElement>('#similar-empty')!;

let notes: Note[] = [];
let settings: ExtensionSettings = {
  enableSemantic: true,
  semanticWeight: 0.5,
  autoEmbed: true,
};
let activeTopic: string | null = null;
let sort: 'newest' | 'oldest' = 'newest';
let searchToken = 0;
let backfillRunning = false;

interface Row {
  note: Note;
  matchedTerms: string[];
  semantic: boolean;
}

function pool(): Note[] {
  if (!activeTopic) {
    return notes;
  }
  return notes.filter((note) => note.topics.includes(activeTopic!));
}

function toRows(results: SearchResult[]): Row[] {
  return results.map((result) => ({
    note: result.note,
    matchedTerms: result.matchedTerms,
    semantic: result.matchedTerms.length === 0 && result.semanticScore >= 0.4,
  }));
}

function noteCard(row: Row, query: string): HTMLLIElement {
  const { note } = row;
  const li = document.createElement('li');
  li.className = 'note';
  li.dataset.id = note.id;

  const title = note.title || hostnameFromUrl(note.url) || 'Untitled';
  const snippet = query ? buildSnippet(note.text, query) : truncate(note.text, 320);
  const host = hostnameFromUrl(note.url);
  const url = escapeHtml(note.url);

  const topicTags = note.topics
    .map((topic) => `<span class="tag">${escapeHtml(topic)}</span>`)
    .join('');

  const titleHtml = note.url
    ? `<a href="${url}" target="_blank" rel="noreferrer noopener">${highlight(title, row.matchedTerms)}</a>`
    : highlight(title, row.matchedTerms);

  const hostHtml = host
    ? `<a href="${url}" target="_blank" rel="noreferrer noopener">${escapeHtml(host)}</a>`
    : '';

  li.innerHTML = `
    <p class="note-title">${titleHtml}</p>
    <p class="note-text">${highlight(snippet, row.matchedTerms)}</p>
    <div class="note-meta">
      ${hostHtml}
      <span>${formatRelativeDate(note.createdAt)}</span>
      ${topicTags}
      ${row.semantic ? '<span class="badge-sem">≈ semantic match</span>' : ''}
      <span class="note-actions">
        <button class="mini-btn" data-action="similar" type="button">Similar</button>
        <button class="mini-btn danger" data-action="delete" type="button">Delete</button>
      </span>
    </div>
  `;
  return li;
}

function renderRows(container: HTMLUListElement, rows: Row[], query: string): void {
  container.replaceChildren();
  for (const row of rows) {
    container.append(noteCard(row, query));
  }
}

function sortNotes(list: Note[]): Note[] {
  const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
  return sort === 'newest' ? sorted.reverse() : sorted;
}

function renderBrowse(): void {
  const list = sortNotes(pool());
  emptyEl.classList.toggle('hidden', list.length > 0);
  if (list.length === 0) {
    noteList.replaceChildren();
    emptyEl.innerHTML = notes.length
      ? 'No notes match this topic.'
      : 'No breadcrumbs yet.<br />Highlight text on any page, right-click, and choose <strong>Save to Breadcrumb</strong>.';
  }
  viewStatus.textContent = activeTopic ? `${activeTopic} notes` : 'All notes';
  renderRows(
    noteList,
    list.map((note) => ({ note, matchedTerms: [], semantic: false })),
    '',
  );
}

async function runSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  const token = ++searchToken;

  if (!trimmed) {
    renderBrowse();
    return;
  }

  const candidates = pool();
  const textResults = rankNotes(candidates, trimmed, {
    enableSemantic: false,
    limit: 40,
  });
  emptyEl.classList.add('hidden');
  viewStatus.textContent = `${textResults.length} result${textResults.length === 1 ? '' : 's'} for “${trimmed}”`;
  renderRows(noteList, toRows(textResults), trimmed);

  if (!settings.enableSemantic) {
    if (textResults.length === 0) {
      showNoResults(trimmed);
    }
    return;
  }

  try {
    const queryEmbedding = await embedText(trimmed);
    if (token !== searchToken) {
      return;
    }
    const hybrid = rankNotes(candidates, trimmed, {
      queryEmbedding,
      enableSemantic: true,
      semanticWeight: settings.semanticWeight,
      limit: 40,
    });
    viewStatus.textContent = `${hybrid.length} result${hybrid.length === 1 ? '' : 's'} for “${trimmed}” · keyword + AI`;
    renderRows(noteList, toRows(hybrid), trimmed);
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
  noteList.replaceChildren();
  emptyEl.classList.remove('hidden');
  emptyEl.textContent = `Nothing found for “${query}”.`;
}

function render(): void {
  if (search.value.trim()) {
    void runSearch(search.value);
  } else {
    renderBrowse();
  }
  renderTopicFilters();
  renderTimeline();
  renderTopTopics();
  noteTotal.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
}

function renderTopicFilters(): void {
  const topics = topicTotals(notes, 10);
  topicFilters.replaceChildren();
  if (topics.length === 0) {
    return;
  }

  const all = document.createElement('button');
  all.className = `chip${activeTopic === null ? ' active' : ''}`;
  all.textContent = 'All';
  all.addEventListener('click', () => {
    activeTopic = null;
    render();
  });
  topicFilters.append(all);

  for (const { topic, count } of topics) {
    const chip = document.createElement('button');
    chip.className = `chip${activeTopic === topic ? ' active' : ''}`;
    chip.textContent = `${topic} · ${count}`;
    chip.addEventListener('click', () => {
      activeTopic = activeTopic === topic ? null : topic;
      render();
    });
    topicFilters.append(chip);
  }
}

function renderTimeline(): void {
  const months = buildTimeline(notes, { topicsPerMonth: 5 });
  timelineEl.replaceChildren();

  if (months.length === 0) {
    timelineEl.innerHTML = '<p class="card-note">Your timeline fills in as you save.</p>';
    return;
  }

  for (const month of months) {
    const maxCount = month.topics.reduce((max, topic) => Math.max(max, topic.count), 1);
    const block = document.createElement('div');
    block.className = 'timeline-month';

    const topicsHtml = month.topics
      .map((topic) => {
        const width = Math.max(8, Math.round((topic.count / maxCount) * 100));
        return `
          <div class="timeline-topic">
            <span class="label">${escapeHtml(topic.topic)}</span>
            <span class="num">${topic.count}</span>
            <span class="bar" style="width: ${width}%"></span>
          </div>
        `;
      })
      .join('');

    block.innerHTML = `
      <div class="timeline-head">
        <span class="month">${escapeHtml(month.label)}</span>
        <span class="count">${month.total} note${month.total === 1 ? '' : 's'}</span>
      </div>
      ${topicsHtml}
    `;
    timelineEl.append(block);
  }
}

function renderTopTopics(): void {
  const topics = topicTotals(notes, 14);
  topTopicsEl.replaceChildren();
  if (topics.length === 0) {
    topTopicsEl.innerHTML = '<p class="card-note">No topics yet.</p>';
    return;
  }
  for (const { topic, count } of topics) {
    const chip = document.createElement('button');
    chip.className = `chip${activeTopic === topic ? ' active' : ''}`;
    chip.textContent = `${topic} · ${count}`;
    chip.addEventListener('click', () => {
      activeTopic = activeTopic === topic ? null : topic;
      search.value = '';
      render();
    });
    topTopicsEl.append(chip);
  }
}

function openSimilar(note: Note): void {
  similarSource.textContent = truncate(note.text, 160);
  const similar = findSimilar(note, notes, 6);
  similarEmpty.classList.toggle('hidden', similar.length > 0);
  renderRows(similarList, toRows(similar), '');
  similarDialog.showModal();
}

async function handleListClick(event: MouseEvent): Promise<void> {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('button[data-action]');
  if (!button) {
    return;
  }
  const li = button.closest<HTMLLIElement>('.note');
  const id = li?.dataset.id;
  if (!id) {
    return;
  }
  const note = notes.find((candidate) => candidate.id === id);
  if (!note) {
    return;
  }

  if (button.dataset.action === 'similar') {
    openSimilar(note);
  } else if (button.dataset.action === 'delete') {
    await deleteNote(id);
    notes = notes.filter((candidate) => candidate.id !== id);
    render();
  }
}

async function reloadNotes(): Promise<void> {
  notes = await getAllNotes();
}

function setEmbedStatus(text: string): void {
  embedStatus.textContent = text;
}

async function runBackfill(): Promise<void> {
  if (backfillRunning) {
    return;
  }
  const pending = notes.filter((note) => !note.embedding);
  if (pending.length === 0) {
    setEmbedStatus(notes.length ? 'All embedded' : '');
    return;
  }

  backfillRunning = true;
  embedBtn.disabled = true;
  const unsubscribe = onModelProgress((progress) => {
    if (progress.status === 'progress' && typeof progress.progress === 'number') {
      setEmbedStatus(`Loading model ${Math.round(progress.progress)}%`);
    }
  });

  try {
    await backfillEmbeddings((p) => setEmbedStatus(`Embedding ${p.done}/${p.total}`));
    await reloadNotes();
    setEmbedStatus('All embedded');
    render();
  } catch {
    setEmbedStatus('AI unavailable');
  } finally {
    unsubscribe();
    backfillRunning = false;
    embedBtn.disabled = false;
  }
}

function exportJson(): void {
  const blob = new Blob([JSON.stringify(notes, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `breadcrumb-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleClearAll(): Promise<void> {
  if (notes.length === 0) {
    return;
  }
  const confirmed = window.confirm(
    `Delete all ${notes.length} saved notes? This cannot be undone.`,
  );
  if (!confirmed) {
    return;
  }
  await clearAllNotes();
  notes = [];
  activeTopic = null;
  search.value = '';
  render();
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
search.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (search.value.trim()) {
      void runSearch(search.value);
    } else {
      renderBrowse();
    }
  }, 180);
});

sortSelect.addEventListener('change', () => {
  sort = sortSelect.value === 'oldest' ? 'oldest' : 'newest';
  if (!search.value.trim()) {
    renderBrowse();
  }
});

enableSemantic.addEventListener('change', () => {
  void (async () => {
    settings = await saveSettings({
      ...settings,
      enableSemantic: enableSemantic.checked,
    });
    render();
    if (settings.enableSemantic) {
      void runBackfill();
    }
  })();
});

noteList.addEventListener('click', (event) => void handleListClick(event));
similarList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('button[data-action]')) {
    void handleListClick(event);
  }
});

embedBtn.addEventListener('click', () => void runBackfill());
exportBtn.addEventListener('click', exportJson);
clearBtn.addEventListener('click', () => void handleClearAll());

similarClose.addEventListener('click', () => similarDialog.close());
similarDialog.addEventListener('click', (event) => {
  if (event.target === similarDialog) {
    similarDialog.close();
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'lastSave' in changes) {
    void (async () => {
      await reloadNotes();
      render();
    })();
  }
});

void (async () => {
  settings = await getSettings();
  enableSemantic.checked = settings.enableSemantic;
  await reloadNotes();
  render();
  setEmbedStatus(settings.enableSemantic ? '' : 'AI off');
  if (settings.enableSemantic && settings.autoEmbed) {
    void runBackfill();
  }
})();
