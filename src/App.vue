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
      :categories="categories"
      @move-item="handleMoveItem"
      @add-item="handleAddItem"
      @reorder-items="handleReorderItems"
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
import { parseTodoFile } from './utils/TodoParser';

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
        categories.value = parsedData.categories;
        
        loading.value = false;
      } catch (error) {
        console.error('Error loading todo file:', error);
        loading.value = false;
      }
    };
    
    // Save todo data to the server
    const saveTodoData = async (content) => {
      console.log('Saving todo data to server...');
      try {
        console.log('Sending content to server, length:', content.length);
        await axios.post(`${API_BASE_URL}/todos`, { content });
        console.log('Content saved successfully');
        // Don't reload data - assume the UI is already correct
        // This avoids resetting the UI after drag and drop
      } catch (error) {
        console.error('Error saving todo file:', error);
      }
    };
    
    // Handle moving items between columns or categories
    const handleMoveItem = async (item, targetStatus) => {
      let statusChar = ' ';
      
      if (targetStatus === 'wip') {
        statusChar = '~';
      } else if (targetStatus === 'done') {
        statusChar = 'x';
      }
      
      console.log('Moving item:', { 
        id: item.id, 
        text: item.text, 
        from: item.originalStatusChar || item.statusChar, 
        to: statusChar,
        category: item.category
      });
      
      // Update local data immediately
      // Remove item from current list based on original status
      const originalStatusChar = item.originalStatusChar || item.statusChar;
      const sourceList = originalStatusChar === ' ' ? todos.value :
                         originalStatusChar === '~' ? inProgress.value :
                         doneItems.value;
      
      const itemIndex = sourceList.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) {
        sourceList.splice(itemIndex, 1);
      } else {
        console.warn(`Could not find item with id ${item.id} in source list`);
      }
      
      // Update item status if needed
      if (statusChar !== item.statusChar) {
        item.statusChar = statusChar;
      }
      
      // Add to new list
      const targetList = targetStatus === 'todo' ? todos.value :
                         targetStatus === 'wip' ? inProgress.value :
                         doneItems.value;
      
      targetList.push(item);
    };
    
    // Handle reordering items within a column
    const handleReorderItems = async (items, category, status, sourceCategory) => {
      console.log('==== HANDLING REORDER EVENT ====');
      console.log('Reorder params:', { 
        itemCount: items.length, 
        category, 
        status,
        sourceCategory: sourceCategory || category // If sourceCategory is provided, use it
      });
      
      if (!items || items.length === 0) {
        console.error('No items provided for reordering');
        return;
      }
      
      console.log('Items to reorder:');
      items.forEach((item, idx) => {
        // Add originalCategory property if category has changed and sourceCategory is provided
        if (sourceCategory && sourceCategory !== category && !item.originalCategory) {
          item.originalCategory = sourceCategory;
        }
        
        console.log(`Item ${idx}:`, {
          id: item.id,
          text: item.text,
          status: item.status,
          category: item.category,
          originalCategory: item.originalCategory
        });
      });
    };

    onMounted(() => {
      loadTodoData();
    });

    return {
      todos,
      inProgress,
      doneItems,
      archiveItems,
      categories,
      activeTab,
      loading,
      showAddCategoryModal,
      newCategoryName,
      handleMoveItem,
      handleReorderItems,
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
