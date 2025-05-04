<template>
  <div class="todo-app">
    <div class="app-header">
      <h1>Simple Todo Kanban</h1>
    </div>
    
    <div v-if="loading" class="loading">
      Loading...
    </div>
    
    <div v-else class="kanban-container">
      <!-- TODO Column -->
      <div class="kanban-column todo-column">
        <div class="column-header">TODO</div>
        <div class="column-content">
          <div 
            v-for="section in todoSections" 
            :key="section.name" 
            class="section"
          >
            <div 
              :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
            >
              {{ section.name }}
            </div>
            <div class="section-items">
              <div 
                v-for="item in section.items" 
                :key="item.id" 
                class="task-card"
              >
                <span class="status todo">[ ]</span>
                <span class="task-title">{{ item.text }}</span>
              </div>
              <div v-if="section.items.length === 0" class="empty-section">
                No items
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- WIP Column -->
      <div class="kanban-column wip-column">
        <div class="column-header">WIP</div>
        <div class="column-content">
          <div 
            v-for="section in wipSections" 
            :key="section.name" 
            class="section"
          >
            <div 
              :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
            >
              {{ section.name }}
            </div>
            <div class="section-items">
              <div 
                v-for="item in section.items" 
                :key="item.id" 
                class="task-card"
              >
                <span class="status in-progress">[~]</span>
                <span class="task-title">{{ item.text }}</span>
              </div>
              <div v-if="section.items.length === 0" class="empty-section">
                No items
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DONE Column -->
      <div class="kanban-column done-column">
        <div class="column-header">DONE</div>
        <div class="column-content">
          <div 
            v-for="section in doneSections" 
            :key="section.name" 
            class="section"
          >
            <div 
              :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
            >
              {{ section.name }}
            </div>
            <div class="section-items">
              <div 
                v-for="item in section.items" 
                :key="item.id" 
                class="task-card"
              >
                <span class="status done">[x]</span>
                <span class="task-title">{{ item.text }}</span>
              </div>
              <div v-if="section.items.length === 0" class="empty-section">
                No items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { parseTodoFile, renderTodoFile } from './utils/TodoParser';

// Base URL for the API
const API_BASE_URL = 'http://localhost:3001/api';

export default {
  name: 'App',
  setup() {
    const sections = ref([]);
    const loading = ref(true);

    // Computed properties to filter sections by column
    const todoSections = computed(() => {
      return sections.value.filter(section => section.column === 'TODO');
    });
    
    const wipSections = computed(() => {
      return sections.value.filter(section => section.column === 'WIP');
    });
    
    const doneSections = computed(() => {
      return sections.value.filter(section => section.column === 'DONE');
    });

    // Save todo data to the server
    const persistTodoData = async () => {
      try {
        console.log('Persisting todo data to server...');
        
        // Render the sections into text content
        const content = renderTodoFile(sections.value);
        
        if (!content) {
          console.error('No content generated for saving');
          return false;
        }
        
        // Send the content to the server
        const response = await axios.post(`${API_BASE_URL}/todos`, { content });
        console.log('Todo data saved successfully', response.data);
        return true;
      } catch (error) {
        console.error('Error saving todo data:', error);
        return false;
      }
    };
    
    // Load todo data from the server
    const loadTodoData = async () => {
      try {
        loading.value = true;
        const response = await axios.get(`${API_BASE_URL}/todos`);
        
        // Parse the todo text into sections
        sections.value = parseTodoFile(response.data.content);
        console.log('Loaded sections:', sections.value);
        
        loading.value = false;
      } catch (error) {
        console.error('Error loading todo file:', error);
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadTodoData();
      persistTodoData();
    });

    return {
      sections,
      todoSections,
      wipSections,
      doneSections,
      loading
    };
  }
}
</script>

<style>
.todo-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
}

.app-header {
  background-color: #2c3e50;
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 20px;
  color: #555;
}

.kanban-container {
  display: flex;
  height: calc(100vh - 60px);
  gap: 20px;
  padding: 20px;
  overflow-x: auto;
}

.kanban-column {
  flex: 1;
  min-width: 300px;
  background-color: #ebecf0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.column-header {
  padding: 12px;
  font-weight: bold;
  text-align: center;
  background-color: #ebecf0;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.todo-column .column-header {
  background-color: #e2e4f1;
}

.wip-column .column-header {
  background-color: #e4f1e2;
}

.done-column .column-header {
  background-color: #f1e2e4;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.section {
  margin-bottom: 20px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 5px;
  padding: 2px;
}

.section-header {
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
  margin-bottom: 8px;
}

.section-header.large {
  font-size: 18px;
  text-align: center;
  color: #2c3e50;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 15px 10px;
}

.section-header.small {
  font-size: 14px;
  color: #555;
  padding: 8px 10px;
}

.section-items {
  padding: 0 8px 8px;
}

.task-card {
  background-color: white;
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: flex-start;
}

.task-title {
  margin-left: 8px;
  flex: 1;
}

.status {
  font-family: monospace;
  font-size: 14px;
}

.status.todo {
  color: #f44336;
}

.status.in-progress {
  color: #ff9800;
}

.status.done {
  color: #4caf50;
}

.empty-section {
  padding: 10px;
  color: #999;
  font-style: italic;
  text-align: center;
}
</style>
