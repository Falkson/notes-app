'use strict';

// ── State ─────────────────────────────────────────────────────
let notesList_data = [];
let activeId       = null;
let isDirty        = false;

// ── DOM refs ──────────────────────────────────────────────────
const notesListEl  = document.getElementById('notesList');
const editorEmpty  = document.getElementById('editorEmpty');
const editorActive = document.getElementById('editorActive');
const noteDateEl   = document.getElementById('noteDate');
const noteTitleEl  = document.getElementById('noteTitle');
const noteBodyEl   = document.getElementById('noteBody');
const charCountEl  = document.getElementById('charCount');
const toastEl      = document.getElementById('toast');

// ── Init ──────────────────────────────────────────────────────
async function init() {
  if (!window.notes) { console.error('window.notes saknas'); return; }
  await loadNotes();
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveNote(); }
  });
  noteBodyEl.addEventListener('input',  () => { isDirty = true; });
  noteTitleEl.addEventListener('input', () => { isDirty = true; });
  noteDateEl.addEventListener('change', () => { isDirty = true; });
}

// ── Ladda anteckningar ────────────────────────────────────────
async function loadNotes() {
  notesList_data = await window.notes.list();
  renderList();
}

// ── Rendera listan ────────────────────────────────────────────
function renderList() {
  if (notesList_data.length === 0) {
    notesListEl.innerHTML = `
      <div class="notes-empty">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>Inga anteckningar ännu.<br/>Klicka <strong>+</strong> för att skapa en.</p>
      </div>`;
    return;
  }
  notesListEl.innerHTML = notesList_data.map((note, i) => {
    const isActive = note.id === activeId;
    const dateStr  = formatDate(note.dateTime);
    const preview  = note.body.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Tom anteckning';
    const titleHtml = note.title
      ? `<div class="note-card-title">${escapeHtml(note.title)}</div>`
      : '';
    return `
      <div class="note-card ${isActive ? 'active' : ''}" style="animation-delay:${i * 40}ms" onclick="selectNote('${note.id}')">
        <div class="note-card-date">${dateStr}</div>
        ${titleHtml}
        <div class="note-card-preview">${escapeHtml(preview)}</div>
      </div>`;
  }).join('');
}

// ── Välj anteckning ───────────────────────────────────────────
async function selectNote(id) {
  if (isDirty && activeId) {
    if (!confirm('Du har osparade ändringar. Fortsätta utan att spara?')) return;
  }
  const note = notesList_data.find(n => n.id === id);
  if (!note) return;
  activeId = id; isDirty = false;
  showEditor();
  noteDateEl.value  = toDatetimeLocal(note.dateTime);
  noteTitleEl.value = note.title || '';
  noteBodyEl.value  = note.body;
  updateCharCount();
  renderList();
}

// ── Ny anteckning ─────────────────────────────────────────────
function newNote() {
  if (isDirty && activeId) {
    if (!confirm('Du har osparade ändringar. Fortsätta utan att spara?')) return;
  }
  activeId = null; isDirty = false;
  showEditor();
  noteDateEl.value  = nowDatetimeLocal();
  noteTitleEl.value = '';
  noteBodyEl.value  = '';
  updateCharCount();
  noteTitleEl.focus();
  renderList();
}

// ── Spara anteckning ──────────────────────────────────────────
async function saveNote() {
  const dateTime = noteDateEl.value;
  const title    = noteTitleEl.value.trim();
  const body     = noteBodyEl.value;
  if (!dateTime) { showToast('Välj datum och tid.', 'error'); return; }
  if (!body.trim()) { showToast('Anteckningen är tom.', 'error'); return; }
  try {
    const filename = await window.notes.save({ id: activeId || null, dateTime, title, body });
    activeId = filename; isDirty = false;
    await loadNotes();
    showToast('Sparad!', 'success');
  } catch (err) {
    showToast('Kunde inte spara.', 'error');
    console.error(err);
  }
}

// ── Ta bort anteckning ────────────────────────────────────────
async function deleteNote() {
  if (!activeId) return;
  if (!confirm('Ta bort denna anteckning? Det går inte att ångra.')) return;
  try {
    await window.notes.delete(activeId);
    activeId = null; isDirty = false;
    await loadNotes(); hideEditor();
    showToast('Anteckning borttagen.', '');
  } catch (err) { showToast('Kunde inte ta bort.', 'error'); }
}

// ── PDF Export ────────────────────────────────────────────────
async function exportPDF() {
  if (!noteBodyEl.value.trim()) { showToast('Inget innehåll att exportera.', 'error'); return; }
  if (isDirty) await saveNote();
  showToast('Exporterar PDF…', '');
  const result = await window.notes.exportPDF({
    dateTime: noteDateEl.value,
    title: noteTitleEl.value,
    body: noteBodyEl.value
  });
  if (result.success) showToast('PDF sparad!', 'success');
  else if (result.reason !== 'canceled') showToast('Kunde inte exportera PDF.', 'error');
}

// ── Visa/dölj editor ──────────────────────────────────────────
function showEditor() { editorEmpty.style.display = 'none'; editorActive.style.display = 'flex'; }
function hideEditor()  { editorEmpty.style.display = 'flex'; editorActive.style.display = 'none'; }

// ── Teckenräknare ─────────────────────────────────────────────
function updateCharCount() {
  charCountEl.textContent = `${noteBodyEl.value.length.toLocaleString('sv-SE')} tecken`;
}

// ── View switcher ─────────────────────────────────────────────
function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${view}`)?.classList.add('active');
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type) {
  toastEl.textContent = msg;
  toastEl.className   = 'toast' + (type ? ' ' + type : '');
  toastEl.offsetHeight;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ── Hjälpfunktioner ───────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('sv-SE', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateStr; }
}
function nowDatetimeLocal() { const n = new Date(); n.setSeconds(0,0); return n.toISOString().slice(0,16); }
function toDatetimeLocal(d) {
  if (!d) return nowDatetimeLocal();
  try { const dt = new Date(d); dt.setSeconds(0,0); return dt.toISOString().slice(0,16); }
  catch { return nowDatetimeLocal(); }
}
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();