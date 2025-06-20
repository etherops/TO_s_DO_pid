<!-- App.vue -->
<template>
  <div class="todo-app">
    <FileTabBar
        :available-files="availableFiles"
        :selected-file="selectedFile"
        :unparsed-line-count="unparsedLineCount"
        :show-raw-text="showRawText"
        :focus-mode="focusMode"
        @file-selected="handleFileChange"
        @toggle-raw-text="toggleRawText"
        @toggle-focus-mode="toggleFocusMode"
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
        :focus-mode="focusMode"
        @update="persistTodoData"
    />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import FileTabBar from './components/FileTabBar.vue';
import KanbanBoard from './components/KanbanBoard.vue';
import { useTodoData } from './composables/useTodoData';

const {
  todoData,
  loading,
  availableFiles,
  selectedFile,
  parsingError,
  showRawText,
  focusMode,
  loadAvailableFiles,
  loadTodoData,
  persistTodoData,
  handleFileChange
} = useTodoData();

const toggleRawText = () => {
  showRawText.value = !showRawText.value;
};

const toggleFocusMode = () => {
  focusMode.value = !focusMode.value;
  localStorage.setItem('focusMode', focusMode.value);
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