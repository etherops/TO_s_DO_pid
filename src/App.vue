<!-- App.vue -->
<template>
  <div class="todo-app">
    <FileTabBar
        :available-files="availableFiles"
        :selected-file="selectedFile"
        :unparsed-line-count="unparsedLineCount"
        :show-raw-text="showRawText"
        :view-mode="viewMode"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @file-selected="handleFileSelected"
        @toggle-raw-text="toggleRawText"
        @set-view-mode="setViewMode"
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

    <KanbanBoard
        v-else
        :todo-data="todoData"
        :show-raw-text="showRawText"
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
  showRawText,
  loadAvailableFiles,
  loadTodoData,
  persistTodoData,
  handleFileChange,
  registerAfterPersist,
  registerAfterLoad
} = useTodoData();

const toggleRawText = () => {
  showRawText.value = !showRawText.value;
};

// View mode state - load from localStorage ('normal', 'triage', 'focus')
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

// Calculate unparsed line count in view layer
const unparsedLineCount = computed(() => {
  let count = 0;
  
  // Count raw-text column stacks
  todoData.value.columnOrder?.forEach(columnName => {
    const columnStackData = todoData.value.columnStacks[columnName];
    if (columnStackData?.type === 'raw-text') {
      count++;
    }
  });
  
  // Count raw-text sections and items within sections
  todoData.value.columnOrder?.forEach(columnName => {
    const columnStackData = todoData.value.columnStacks[columnName];
    if (columnStackData?.sections) {
      columnStackData.sections.forEach(section => {
        if (section.type === 'raw-text') {
          count++;
        } else if (section.items) {
          section.items.forEach(item => {
            if (item.type === 'raw-text') {
              count++;
            }
          });
        }
      });
    }
  });
  
  return count;
});

onMounted(async () => {
  await loadAvailableFiles();
  await loadTodoData();
  window.addEventListener('keydown', handleUndoRedoShortcut);
});

onUnmounted(() => {
  unregisterAfterPersist();
  unregisterAfterLoad();
  window.removeEventListener('keydown', handleUndoRedoShortcut);
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
</style>
