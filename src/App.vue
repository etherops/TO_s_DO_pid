<!-- App.vue -->
<template>
  <div class="todo-app">
    <FileTabBar
        :available-files="availableFiles"
        :selected-file="selectedFile"
        @file-selected="handleFileChange"
    />

    <div v-if="parsingError" class="error-message">
      {{ parsingError }}
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <KanbanBoard
        v-else
        :sections="sections"
        @update="persistTodoData"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import FileTabBar from './components/FileTabBar.vue';
import KanbanBoard from './components/KanbanBoard.vue';
import { useTodoData } from './composables/useTodoData';

const {
  sections,
  loading,
  availableFiles,
  selectedFile,
  parsingError,
  loadAvailableFiles,
  loadTodoData,
  persistTodoData,
  handleFileChange
} = useTodoData();

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