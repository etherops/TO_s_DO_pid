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
          <draggable
            v-model="todoSections"
            :group="{ name: 'sections', pull: false, put: false }"
            item-key="name"
            class="section-list"
            ghost-class="ghost-section"
            :sort="false"
            :move="checkSectionMove"
          >
            <template #item="{ element: section }">
              <div 
                :class="['section', { 'archivable-section': section.archivable }]"
              >
                <div 
                  :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
                >
                  {{ section.name }}
                  <span v-if="section.archivable" class="archive-badge">Archivable</span>
                </div>
                <div class="section-items">
                  <draggable
                    v-model="section.items"
                    :group="{ name: 'tasks', pull: true, put: true }"
                    item-key="id"
                    class="task-list"
                    ghost-class="ghost-card"
                    handle=".task-card"
                    @end="onDragEnd"
                  >
                    <template #item="{ element: item }">
                      <div class="task-card">
                        <div class="checkbox-wrapper">
                          <div
                            :class="['custom-checkbox', {
                              'unchecked': item.statusChar === ' ',
                              'in-progress': item.statusChar === '~',
                              'checked': item.statusChar === 'x'
                            }]"
                            @click="toggleTaskStatus(item)"
                          ></div>
                        </div>
                        <span class="task-title">{{ item.text }}</span>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="section.items.length === 0" class="empty-section">
                    No items
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <!-- WIP Column -->
      <div class="kanban-column wip-column">
        <div class="column-header">WIP</div>
        <div class="column-content">
          <draggable
            v-model="wipSections"
            :group="{ name: 'sections', pull: true, put: false }"
            item-key="name"
            class="section-list"
            ghost-class="ghost-section"
            :sort="false"
            :move="checkSectionMove"
          >
            <template #item="{ element: section }">
              <div 
                :class="['section', { 'archivable-section': section.archivable }]"
              >
                <div 
                  :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
                >
                  {{ section.name }}
                  <span v-if="section.archivable" class="archive-badge">Archivable</span>
                </div>
                <div class="section-items">
                  <draggable
                    v-model="section.items"
                    :group="{ name: 'tasks', pull: true, put: true }"
                    item-key="id"
                    class="task-list"
                    ghost-class="ghost-card"
                    handle=".task-card"
                    @end="onDragEnd"
                  >
                    <template #item="{ element: item }">
                      <div class="task-card">
                        <div class="checkbox-wrapper">
                          <div
                            :class="['custom-checkbox', {
                              'unchecked': item.statusChar === ' ',
                              'in-progress': item.statusChar === '~',
                              'checked': item.statusChar === 'x'
                            }]"
                            @click="toggleTaskStatus(item)"
                          ></div>
                        </div>
                        <span class="task-title">{{ item.text }}</span>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="section.items.length === 0" class="empty-section">
                    No items
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <!-- DONE Column -->
      <div class="kanban-column done-column">
        <div class="column-header">DONE</div>
        <div class="column-content">
          <draggable
            v-model="doneSections"
            :group="{ name: 'sections', pull: false, put: true }"
            item-key="name"
            class="section-list"
            ghost-class="ghost-section"
            :sort="false"
            @add="onSectionAdded"
          >
            <template #item="{ element: section }">
              <div class="section">
                <div 
                  :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
                >
                  {{ section.name }}
                  <span v-if="section.archivable" class="archive-badge archived">Archived</span>
                </div>
                <div class="section-items">
                  <draggable
                    v-model="section.items"
                    :group="{ name: 'tasks', pull: true, put: true }"
                    item-key="id"
                    class="task-list"
                    ghost-class="ghost-card"
                    handle=".task-card"
                    @end="onDragEnd"
                  >
                    <template #item="{ element: item }">
                      <div class="task-card">
                        <div class="checkbox-wrapper">
                          <div
                            :class="['custom-checkbox', {
                              'unchecked': item.statusChar === ' ',
                              'in-progress': item.statusChar === '~',
                              'checked': item.statusChar === 'x'
                            }]"
                            @click="toggleTaskStatus(item)"
                          ></div>
                        </div>
                        <span class="task-title">{{ item.text }}</span>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="section.items.length === 0" class="empty-section">
                    No items
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { parseTodoFile, renderTodoFile } from './utils/TodoParser';
import draggable from 'vuedraggable';

// Base URL for the API
const API_BASE_URL = 'http://localhost:3001/api';

export default {
  name: 'App',
  components: {
    draggable
  },
  setup() {
    const sections = ref([]);
    const loading = ref(true);

    // Computed properties to filter sections by column
    const todoSections = computed(() => {
      return sections.value.filter(section => section.column === 'TODO' && !section.hidden);
    });
    
    const wipSections = computed(() => {
      return sections.value.filter(section => section.column === 'WIP' && !section.hidden);
    });
    
    const doneSections = computed(() => {
      // Filter out any hidden sections (like ARCHIVE) for display
      return sections.value.filter(section => section.column === 'DONE' && !section.hidden);
    });

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


    // Function to toggle task status
    const toggleTaskStatus = (item) => {
      // Cycle through the states: ' ' (unchecked) -> '~' (in-progress) -> 'x' (done) -> ' ' (unchecked)
      if (item.statusChar === ' ') {
        item.statusChar = '~';
      } else if (item.statusChar === '~') {
        item.statusChar = 'x';
      } else {
        item.statusChar = ' ';
      }
    
      // Persist changes to file
      persistTodoData();
    };

    // Handle drag end events
    const onDragEnd = (event) => {
      console.log('Drag ended', event);
      // Persist changes after drag operations
      persistTodoData();
    };
    
    // Function to check if a section can be moved
    const checkSectionMove = (evt) => {
      const draggedSection = evt.draggedContext.element;
      const targetList = evt.to;

      // Only allow archivable sections to be dragged
      if (!draggedSection.archivable) {
        return false;
      }

      if (!targetList || !targetList.closest('.done-column')) {
        return false;
      }

      return true;
    };


    // Helper to find the ARCHIVE section index
    const getArchiveSectionIndex = () => {
      return sections.value.findIndex(section => section.name === 'ARCHIVE');
    };

    // Handle section added to DONE column
    const onSectionAdded = (event) => {
      console.log('Section added to DONE column', event);
      
      // Get the moved section from the event
      const movedSection = event.item.__draggable_context.element;
      console.log('Moving section:', movedSection.name);
      
      // Find the ARCHIVE section
      const archiveSectionIndex = getArchiveSectionIndex();
      if (archiveSectionIndex == -1) {
        return false
      }

      // Find the current position of the moved section in the main sections array
      const currentIndex = sections.value.findIndex(s => s.name === movedSection.name);
      if (currentIndex == -1) {
        return false
      }

      // Remove the section from its current position
      const [removed] = sections.value.splice(currentIndex, 1);
      // Insert it right after the ARCHIVE section (at the same position, not +1)
      sections.value.splice(archiveSectionIndex, 0, removed);

      // Update its column property
      removed.column = 'DONE';

      persistTodoData();
    };
    
    onMounted(async () => {
      await loadTodoData();
    });
    
    return {
      sections,
      todoSections,
      wipSections,
      doneSections,
      loading,
      toggleTaskStatus,
      onDragEnd,
      checkSectionMove,
      onSectionAdded
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
  margin-left: 12px;
  flex: 1;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #aaa;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.custom-checkbox:hover {
  transform: scale(1.05);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
}

.custom-checkbox.unchecked {
  background-color: white;
  border-color: #f44336;
}

.custom-checkbox.in-progress {
  background-color: #fff8e1;
  border-color: #ff9800;
  position: relative;
}

.custom-checkbox.in-progress:after {
  content: "";
  position: absolute;
  top: 50%;
  left: 3px;
  right: 3px;
  height: 2px;
  background-color: #ff9800;
  transform: translateY(-50%);
}

.custom-checkbox.checked {
  background-color: #e8f5e9;
  border-color: #4caf50;
  position: relative;
}

.custom-checkbox.checked:after {
  content: "";
  position: absolute;
  top: 2px;
  left: 6px;
  width: 5px;
  height: 10px;
  border: solid #4caf50;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.empty-section {
  padding: 10px;
  color: #999;
  font-style: italic;
  text-align: center;
}

/* Drag and drop styles */
.task-list {
  min-height: 5px;
}

.ghost-card {
  opacity: 0.5;
  background: #c8ebfb;
  border: 1px dashed #97d6ef;
}

.task-card {
  cursor: grab;
}

.task-card:active {
  cursor: grabbing;
}
</style>
