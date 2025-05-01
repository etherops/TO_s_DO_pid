<template>
  <div class="todo-app">
    <div class="app-header">
      <h1>Simple Todo Kanban</h1>
      <div class="app-actions">
        <button class="add-category-btn" @click="showAddCategoryModal = true">
          Add Category
        </button>
      </div>
    </div>
    
    <div class="app-tabs">
      <div 
        class="tab" 
        :class="{ active: activeTab === 'kanban' }"
        @click="activeTab = 'kanban'"
      >
        Kanban Board
      </div>
      <div 
        class="tab" 
        :class="{ active: activeTab === 'archive' }"
        @click="activeTab = 'archive'"
      >
        Archive
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Loading...
    </div>
    
    <KanbanBoard 
      v-if="activeTab === 'kanban' && !loading"
      :todoItems="todos"
      :inProgressItems="inProgress" 
      :doneItems="doneItems"
      :notesContent="notes"
      :categories="categories"
      @move-item="handleMoveItem"
      @add-item="handleAddItem"
    />
    
    <ArchiveView 
      v-if="activeTab === 'archive' && !loading"
      :archiveItems="archiveItems" 
    />
    
    <!-- Add Category Modal -->
    <div class="modal" v-if="showAddCategoryModal">
      <div class="modal-content">
        <h3>Add New Category</h3>
        <input 
          type="text" 
          v-model="newCategoryName" 
          placeholder="Category name"
          @keyup.enter="addCategory"
        >
        <div class="modal-actions">
          <button @click="showAddCategoryModal = false">Cancel</button>
          <button @click="addCategory" :disabled="!newCategoryName">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, reactive } from 'vue';
import axios from 'axios';
import KanbanBoard from './components/KanbanBoard.vue';
import ArchiveView from './components/ArchiveView.vue';
import { parseTodoFile, updateItemStatus, addNewItem } from './utils/TodoParser';

// Base URL for the API
const API_BASE_URL = 'http://localhost:3001/api';

export default {
  name: 'App',
  components: {
    KanbanBoard,
    ArchiveView
  },
  setup() {
    const todoText = ref('');
    const todos = ref([]);
    const inProgress = ref([]);
    const doneItems = ref([]);
    const archiveItems = ref([]);
    const notes = ref('');
    const categories = ref([]);
    const activeTab = ref('kanban');
    const loading = ref(true);
    
    // Modal state
    const showAddCategoryModal = ref(false);
    const newCategoryName = ref('');

    // Load todo data from the server
    const loadTodoData = async () => {
      try {
        loading.value = true;
        const response = await axios.get(`${API_BASE_URL}/todos`);
        todoText.value = response.data.content;
        
        // Parse the todo text
        const parsedData = parseTodoFile(todoText.value);
        todos.value = parsedData.todos;
        inProgress.value = parsedData.inProgress;
        doneItems.value = parsedData.done;
        archiveItems.value = parsedData.archive;
        notes.value = parsedData.notes;
        categories.value = parsedData.categories;
        
        loading.value = false;
      } catch (error) {
        console.error('Error loading todo file:', error);
        loading.value = false;
      }
    };
    
    // Save todo data to the server
    const saveTodoData = async (content) => {
      try {
        await axios.post(`${API_BASE_URL}/todos`, { content });
        await loadTodoData(); // Reload data after saving
      } catch (error) {
        console.error('Error saving todo file:', error);
      }
    };
    
    // Handle moving items between columns
    const handleMoveItem = async (item, targetStatus) => {
      let statusChar = ' ';
      
      if (targetStatus === 'wip') {
        statusChar = '~';
      } else if (targetStatus === 'done') {
        statusChar = 'x';
      }
      
      // Update the item status in the file content
      const updatedContent = updateItemStatus(todoText.value, item, statusChar);
      
      // Save the updated content
      await saveTodoData(updatedContent);
    };
    
    // Handle adding a new item
    const handleAddItem = async (text, status, category) => {
      let statusChar = ' ';
      
      if (status === 'wip') {
        statusChar = '~';
      } else if (status === 'done') {
        statusChar = 'x';
      }
      
      // Add the new item to the file content
      const updatedContent = addNewItem(todoText.value, text, statusChar, category);
      
      // Save the updated content
      await saveTodoData(updatedContent);
    };
    
    // Add a new category
    const addCategory = async () => {
      if (!newCategoryName.value) return;
      
      try {
        await axios.post(`${API_BASE_URL}/todos/add-category`, { 
          name: newCategoryName.value 
        });
        
        // Reset modal state and reload data
        showAddCategoryModal.value = false;
        newCategoryName.value = '';
        await loadTodoData();
      } catch (error) {
        console.error('Error adding new category:', error);
      }
    };

    onMounted(() => {
      loadTodoData();
    });

    return {
      todos,
      inProgress,
      doneItems,
      archiveItems,
      notes,
      categories,
      activeTab,
      loading,
      showAddCategoryModal,
      newCategoryName,
      handleMoveItem,
      handleAddItem,
      addCategory
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

.app-tabs {
  display: flex;
  background-color: #34495e;
}

.tab {
  padding: 10px 20px;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.tab.active {
  background-color: #1abc9c;
}

.tab:hover:not(.active) {
  background-color: #3d5a74;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 20px;
  color: #555;
}

.add-category-btn {
  background-color: #1abc9c;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 400px;
  max-width: 90%;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content input {
  width: 100%;
  padding: 8px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.modal-actions button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions button:first-child {
  background-color: #f1f1f1;
}

.modal-actions button:last-child {
  background-color: #1abc9c;
  color: white;
}
</style>
