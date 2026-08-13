<!-- App.vue -->
<template>
  <div class="todo-app" :class="`theme-${resolvedTheme}`">
    <FileTabBar
        :available-files="availableFiles"
        :selected-file="selectedFile"
        :view-mode="viewMode"
        :theme-preference="themePreference"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @file-selected="handleFileSelected"
        @set-view-mode="setViewMode"
        @cycle-theme="cycleTheme"
        @show-history="showHistory = true"
        @undo="undo"
        @redo="redo"
    />

    <HistoryPanel
        v-if="showHistory && selectedFile.path"
        :file-path="selectedFile.path"
        :file-label="selectedFile.name"
        :current-content="currentRenderedContent"
        @close="showHistory = false"
        @restored="handleHistoryRestored"
    />

    <div v-if="parsingError" class="error-message">
      {{ parsingError }}
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <FocusMode
        v-else-if="viewMode === 'focus'"
        :todo-data="todoData"
        :theme="resolvedTheme"
        @update="handleUpdate"
        @set-view-mode="setViewMode"
    />

    <KanbanBoard
        v-else
        :todo-data="todoData"
        :view-mode="viewMode"
        @update="handleUpdate"
        @set-view-mode="setViewMode"
        @clear-view-mode="clearViewMode"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue';
import FileTabBar from './components/FileTabBar.vue';
import KanbanBoard from './components/KanbanBoard.vue';
import FocusMode from './components/FocusMode.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import { useTodoData } from './composables/useTodoData';
import { useUndoRedo } from './composables/useUndoRedo';
import { renderTodoMdFile } from './utils/TodoMdParser';

const {
  todoData,
  loading,
  availableFiles,
  selectedFile,
  parsingError,
  loadAvailableFiles,
  loadTodoData,
  persistTodoData,
  handleFileChange,
  registerAfterPersist,
  registerAfterLoad
} = useTodoData();

// View mode state - load from localStorage ('normal', 'triage', 'plan', 'focus')
// 'plan' arranges the board drawers for planning; 'focus' is the full-screen execute-today view
const viewMode = ref(
  localStorage.getItem('viewMode') || 'normal'
);

const setViewMode = (mode) => {
  // If clicking the same mode, toggle back to normal (which resets all drawers)
  viewMode.value = (viewMode.value === mode) ? 'normal' : mode;
  localStorage.setItem('viewMode', viewMode.value);
};

// Clear view mode without resetting drawer states (used when manually toggling columns)
// The KanbanBoard sets a flag before emitting this, so the watcher knows to preserve drawers
const clearViewMode = () => {
  viewMode.value = 'normal';
  localStorage.setItem('viewMode', 'normal');
};

// Theme preference - 'auto' follows the system, resolved to 'dark' or 'light'
const themePreference = ref(localStorage.getItem('themePreference') || 'auto');

const cycleTheme = () => {
  const order = ['auto', 'dark', 'light'];
  themePreference.value = order[(order.indexOf(themePreference.value) + 1) % order.length];
  localStorage.setItem('themePreference', themePreference.value);
};

const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const systemPrefersDark = ref(darkMediaQuery.matches);
const handleSystemThemeChange = (event) => { systemPrefersDark.value = event.matches; };

const resolvedTheme = computed(() =>
  themePreference.value === 'auto' ? (systemPrefersDark.value ? 'dark' : 'light') : themePreference.value
);

const {
  canUndo,
  canRedo,
  resetHistory,
  recordPersistedContent,
  undo,
  redo
} = useUndoRedo(todoData, { persist: (options) => persistTodoData(options) });

const unregisterAfterPersist = registerAfterPersist(recordPersistedContent);
const unregisterAfterLoad = registerAfterLoad(resetHistory);

// Handle updates from KanbanBoard - the save layer records undo diffs after a successful write
const handleUpdate = async () => {
  await persistTodoData();
};

const showHistory = ref(false);

const currentRenderedContent = computed(() => {
  try { return renderTodoMdFile(todoData.value) || ''; }
  catch { return ''; }
});

const handleHistoryRestored = async () => {
  await loadTodoData();
};

const handleFileSelected = async (file) => {
  await handleFileChange(file);
};

const isEditableTarget = (target) => {
  return target?.closest?.('input, textarea, select, [contenteditable="true"]');
};

const handleUndoRedoShortcut = (event) => {
  const key = event.key.toLowerCase();
  const modifierPressed = event.metaKey || event.ctrlKey;

  if (!modifierPressed || isEditableTarget(event.target)) {
    return;
  }

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  } else if (key === 'y') {
    event.preventDefault();
    redo();
  }
};

onMounted(async () => {
  await loadAvailableFiles();
  await loadTodoData();
  window.addEventListener('keydown', handleUndoRedoShortcut);
  darkMediaQuery.addEventListener('change', handleSystemThemeChange);
});

onUnmounted(() => {
  unregisterAfterPersist();
  unregisterAfterLoad();
  window.removeEventListener('keydown', handleUndoRedoShortcut);
  darkMediaQuery.removeEventListener('change', handleSystemThemeChange);
});
</script>

<style>
.todo-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px 15px;
  margin: 10px 20px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 14px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 20px;
  color: #555;
}

/* ============================================================= */
/* Dark theme - global overrides for the board and chrome        */
/* (Focus mode themes itself via its own theme prop)             */
/* ============================================================= */
.todo-app.theme-dark {
  background-color: #14171c;
  color: #dfe3e8;
}

.todo-app.theme-dark .loading {
  color: #9aa4b2;
}

/* --- Tab bar chrome --- */
.todo-app.theme-dark .file-tabs-container {
  background-color: #1a1f26;
  border-bottom-color: #232a35;
}

.todo-app.theme-dark .app-title {
  color: #9aa4b2;
}

.todo-app.theme-dark .file-tab {
  background-color: #20262f;
  color: #9aa4b2;
  border-color: #2a3240;
}

.todo-app.theme-dark .file-tab:hover {
  background-color: #242b36;
}

.todo-app.theme-dark .file-tab.active {
  background-color: #1a1f26;
  color: #dfe3e8;
}

.todo-app.theme-dark .history-btn {
  color: #9aa4b2;
}

.todo-app.theme-dark .history-btn:hover:not(:disabled) {
  background-color: #262c36;
  border-color: #333c49;
  color: #e8eaed;
}

.todo-app.theme-dark .view-mode-buttons {
  border-color: #333c49;
}

.todo-app.theme-dark .view-mode-btn {
  background-color: #1a1f26;
  color: #9aa4b2;
}

.todo-app.theme-dark .view-mode-btn + .view-mode-btn {
  border-left-color: #333c49;
}

.todo-app.theme-dark .view-mode-btn:hover {
  background-color: #262c36;
}

.todo-app.theme-dark .view-mode-btn.active {
  background-color: #4caf50;
  color: white;
}

/* --- Columns and sections --- */
.todo-app.theme-dark .kanban-column {
  background-color: #1c2129;
}

.todo-app.theme-dark .column-header {
  background-color: #1c2129;
  color: #dfe3e8;
}

.todo-app.theme-dark .todo-column .column-header {
  background-color: #232838;
}

.todo-app.theme-dark .projects-column .column-header {
  background-color: #2e2822;
}

.todo-app.theme-dark .wip-column .column-header {
  background-color: #222e26;
}

.todo-app.theme-dark .done-column .column-header {
  background-color: #2e2229;
}

.todo-app.theme-dark .todo-count {
  background-color: #333c49;
  color: #b8c0cc;
}

.todo-app.theme-dark .cancelled-count {
  background-color: #2a2f38;
  color: #8a93a3;
}

.todo-app.theme-dark .section {
  background-color: rgba(255, 255, 255, 0.04);
}

.todo-app.theme-dark .section-header.large {
  background-color: rgba(255, 255, 255, 0.06);
}

.todo-app.theme-dark .section-title {
  color: #dfe3e8;
}

.todo-app.theme-dark .raw-text-section {
  background-color: rgba(255, 255, 255, 0.04);
}

.todo-app.theme-dark .add-task-btn,
.todo-app.theme-dark .add-section-btn {
  background-color: rgba(76, 175, 80, 0.14);
  color: #81c784;
}

.todo-app.theme-dark .add-task-btn:hover,
.todo-app.theme-dark .add-section-btn:hover {
  background-color: rgba(76, 175, 80, 0.26);
}

.todo-app.theme-dark .collapse-all-btn,
.todo-app.theme-dark .expand-all-btn,
.todo-app.theme-dark .hide-all-btn,
.todo-app.theme-dark .edit-section-btn,
.todo-app.theme-dark .sort-tasks-btn {
  background-color: rgba(255, 255, 255, 0.08);
  color: #9aa4b2;
}

.todo-app.theme-dark .collapse-all-btn:hover,
.todo-app.theme-dark .expand-all-btn:hover,
.todo-app.theme-dark .hide-all-btn:hover {
  background-color: rgba(255, 255, 255, 0.14);
}

.todo-app.theme-dark .section-name-edit {
  background-color: #1a1f26;
  color: #dfe3e8;
}

.todo-app.theme-dark .raw-text-column {
  background-color: #171b21;
}

.todo-app.theme-dark .raw-text-column-text {
  background-color: #1a1f26;
  color: #b8c0cc;
}

/* --- Task cards --- */
.todo-app.theme-dark .task-card {
  background-color: #262c36;
  color: #dfe3e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.todo-app.theme-dark .task-card.selected {
  background-color: rgba(33, 150, 243, 0.16);
  border-color: #2196f3;
}

.todo-app.theme-dark .task-card:has(.task-title.due-past),
.todo-app.theme-dark .task-card:has(.task-title.due-today) {
  background-color: rgba(244, 67, 54, 0.14);
  box-shadow: 0 2px 5px rgba(244, 67, 54, 0.2);
}

.todo-app.theme-dark .task-card:has(.task-title.due-soon) {
  background-color: rgba(255, 193, 7, 0.10);
  box-shadow: 0 2px 5px rgba(255, 193, 7, 0.15);
}

.todo-app.theme-dark .custom-checkbox.unchecked {
  background-color: #1a1f26;
  border-color: #4a5568;
}

.todo-app.theme-dark .inline-note-preview {
  background-color: #171b21;
  color: #9fb3c8;
}

.todo-app.theme-dark .raw-text-card {
  background-color: #171b21;
  border-color: #2a3240;
}

.todo-app.theme-dark .raw-text-text {
  color: #b8c0cc;
}

.todo-app.theme-dark .task-title.cancelled-task {
  color: #6f7a88;
}

.todo-app.theme-dark .new-task-input,
.todo-app.theme-dark .task-text-edit,
.todo-app.theme-dark .note-text-edit {
  background-color: #1a1f26;
  color: #dfe3e8;
}

.todo-app.theme-dark .hover-preview-container {
  background-color: #1e232b;
  border-color: #333c49;
}

.todo-app.theme-dark .full-title-text {
  background-color: #171b21;
  color: #dfe3e8;
}

.todo-app.theme-dark .note-display-text {
  background-color: #171b21;
  color: #b8c0cc;
}

.todo-app.theme-dark .note-display-text.empty-note {
  background-color: #171b21;
  color: #6f7a88;
}

.todo-app.theme-dark .mini-calendar {
  background-color: #1a1f26;
  border-color: #333c49;
}

.todo-app.theme-dark .calendar-day {
  color: #dfe3e8;
}

/* --- Collapsed-section fans and summary cards --- */
.todo-app.theme-dark .task-card-wrapper.collapsed-in-progress .task-card {
  background-color: #2e2a1e;
  border-color: rgba(255, 179, 71, 0.35);
}

.todo-app.theme-dark .task-card-wrapper.collapsed-completed .task-card {
  background-color: #20262f;
  border-color: #2a3240;
}

.todo-app.theme-dark .summary-card {
  background-color: rgba(255, 255, 255, 0.06);
  border-color: #2a3240;
}

.todo-app.theme-dark .summary-text {
  color: #9aa4b2;
}

.todo-app.theme-dark .separator {
  color: #6f7a88;
}

/* --- Ice columns and sections --- */
.todo-app.theme-dark .kanban-column.ice-column {
  background: linear-gradient(135deg, #1b2531 0%, #161f29 100%);
  border-color: #2c4258;
}

.todo-app.theme-dark .ice-task-card {
  background: rgba(144, 202, 249, 0.08);
  border-color: rgba(144, 202, 249, 0.3);
}

.todo-app.theme-dark .ice-task-card .task-title {
  color: #90caf9;
}

.todo-app.theme-dark .on-ice-section {
  background: rgba(144, 202, 249, 0.06);
}

.todo-app.theme-dark .on-ice-section .section-header {
  background: rgba(144, 202, 249, 0.08);
  color: #90caf9;
}

.todo-app.theme-dark .on-ice-label {
  background: #1a2733;
  color: #90caf9;
}

/* --- Context menu --- */
.todo-app.theme-dark .context-menu,
.todo-app.theme-dark .submenu {
  background: #1e232b;
  border-color: #333c49;
  color: #dfe3e8;
}

.todo-app.theme-dark .context-menu-header {
  background-color: #171b21;
  border-bottom-color: #333c49;
  color: #dfe3e8;
}

.todo-app.theme-dark .menu-section-header {
  background-color: #171b21;
  color: #9aa4b2;
}

.todo-app.theme-dark .menu-item:hover:not(.disabled) {
  background-color: rgba(33, 150, 243, 0.16);
}

/* --- History panel --- */
.todo-app.theme-dark .history-panel {
  background: #1a1f26;
  color: #dfe3e8;
}

.todo-app.theme-dark .history-header,
.todo-app.theme-dark .preview-toolbar {
  background: #171b21;
  border-color: #232a35;
}

.todo-app.theme-dark .title-main,
.todo-app.theme-dark .version-date {
  color: #dfe3e8;
}

.todo-app.theme-dark .version-list {
  background: #171b21;
}

.todo-app.theme-dark .version-item:hover {
  background: #242b36;
}

.todo-app.theme-dark .version-item.active {
  background: rgba(76, 175, 80, 0.16);
}

.todo-app.theme-dark .preview-content {
  background: #1a1f26;
  color: #dfe3e8;
}

.todo-app.theme-dark .icon-btn:hover {
  background: #262c36;
  color: #e8eaed;
}

.todo-app.theme-dark .preview-label {
  color: #9aa4b2;
}

/* --- Modals --- */
.todo-app.theme-dark .modal-content {
  background: #1e232b;
  color: #dfe3e8;
}

.todo-app.theme-dark .archive-details {
  background-color: #171b21;
}

.todo-app.theme-dark .incomplete-tasks-preview {
  background-color: rgba(33, 150, 243, 0.10);
}
</style>
