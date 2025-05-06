<template>
  <div class="todo-app">
    <div class="app-header">
      <input 
        type="file" 
        ref="fileInput" 
        style="display: none" 
        accept=".txt,.md" 
        @change="handleFileInputChange" 
      />
    </div>

    <div v-if="parsingError" class="error-message">
      {{ parsingError }}
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else>
      <div class="file-tabs">
        <div class="logo-container">
          <img src="./assets/favicon.svg" alt="Logo" class="app-logo">
        </div>
        <div class="app-title">It's TO_s_DO_pid TODO...</div>
        <div
          v-for="file in availableFiles" 
          :key="file.name" 
          :class="['file-tab', 'server-tab', { active: selectedFile === file.name }]"
          @click="selectedFile = file.name; handleFileChange()"
          :title="file.name"
        >
          {{ formatTabName(file.name) }}
        </div>
        <div 
          v-for="file in customFiles" 
          :key="file.path" 
          :class="['file-tab', 'custom-tab', { active: selectedFile === file.path }]"
          @click="selectedFile = file.path; handleFileChange()"
          :title="file.path"
        >
          {{ formatTabName(file.name) }}
          <template v-if="tabPendingRemove === file.path">
            <div class="tab-confirm-actions">
              <button class="confirm-remove-btn" @click.stop="confirmRemoveCustomFile(file)">
                Forget tab?
              </button>
              <button class="cancel-remove-btn" @click.stop="cancelRemoveCustomFile">
                ×
              </button>
            </div>
          </template>
          <button v-else class="close-tab-btn" @click.stop="requestRemoveCustomFile(file)">×</button>
        </div>
        <div class="file-tab add-tab" @click="fileInput.click()">
          <span class="add-icon">+</span>
        </div>
      </div>

      <div class="kanban-container">
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
            :disabled="true"
          >
            <template #item="{ element: section }">
              <div 
                :class="['section', { 'archivable-section': section.archivable, 'on-ice-section': section.on_ice }]"
              >
                <div 
                  :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
                  @dblclick="section.archivable && startEditingSection(section)"
                >
                  <template v-if="editableSectionId === section.name">
                    <div class="section-edit-container">
                      <input 
                        type="text" 
                        class="section-name-edit" 
                        v-model="editSectionName" 
                        @blur="saveEditedSection"
                        @keydown="handleEditKeydown"
                        ref="sectionNameInput"
                      />
                      <button class="confirm-section-btn" @click="saveEditedSection">
                        <span class="confirm-icon">✓</span>
                      </button>
                      <button class="cancel-section-btn" @click="cancelEditSection">
                        <span class="cancel-icon">×</span>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    {{ section.name }}
                    <span v-if="section.archivable" class="archive-badge">Archivable</span>
                    <div v-if="section.on_ice" class="on-ice-label">ON ICE</div>
                    <div class="section-header-actions">
                      <button class="add-task-btn" @click="createNewTask(section)">
                        <span class="add-icon">+</span> Add Task
                      </button>
                      <button v-if="section.archivable" class="edit-section-btn" @click="startEditingSection(section)">
                        <span class="edit-icon">✎</span>
                      </button>
                    </div>
                  </template>
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
                        <template v-if="editableTaskId === item.id">
                          <div class="task-edit-container">
                            <input 
                              type="text" 
                              class="task-text-edit" 
                              v-model="editTaskText" 
                              @blur="saveEditedTask"
                              @keydown="handleTaskEditKeydown"
                            />
                            <button class="confirm-task-btn" @click="saveEditedTask">
                              <span class="confirm-icon">✓</span>
                            </button>
                            <button class="cancel-task-btn" @click="cancelEditTask">
                              <span class="cancel-icon">×</span>
                            </button>
                          </div>
                        </template>
                        <template v-else>
                          <span 
                            class="task-title" 
                            :title="item.text"
                            @dblclick="startEditingTask(item)"
                          >
                            {{ item.text }}
                            <button class="edit-task-btn" @click="startEditingTask(item)">
                              <span class="edit-icon">✎</span>
                            </button>
                            <template v-if="taskPendingDelete === item.id">
                              <button class="confirm-delete-btn" @click.stop="confirmDeleteTask(item, section)">
                                Confirm Delete?
                              </button>
                              <button class="cancel-delete-btn" @click.stop="cancelDeleteTask">
                                ×
                              </button>
                            </template>
                            <button v-else class="delete-task-btn" @click.stop="requestDeleteTask(item)">
                              <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          </span>
                        </template>
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
            @start="onSectionDragStart"
            @end="onSectionDragEnd"
          >
            <template #item="{ element: section }">
              <div 
                :class="['section', { 'archivable-section': section.archivable, 'on-ice-section': section.on_ice }]"
              >
                <div 
                  :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
                  @dblclick="section.archivable && startEditingSection(section)"
                >
                  <template v-if="editableSectionId === section.name">
                    <div class="section-edit-container">
                      <input 
                        type="text" 
                        class="section-name-edit" 
                        v-model="editSectionName" 
                        @blur="saveEditedSection"
                        @keydown="handleEditKeydown"
                        ref="sectionNameInput"
                      />
                      <button class="confirm-section-btn" @click="saveEditedSection">
                        <span class="confirm-icon">✓</span>
                      </button>
                      <button class="cancel-section-btn" @click="cancelEditSection">
                        <span class="cancel-icon">×</span>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    {{ section.name }}
                    <span v-if="section.archivable" class="archive-badge">Archivable</span>
                    <div v-if="section.on_ice" class="on-ice-label">ON ICE</div>
                    <div class="section-header-actions">
                      <button v-if="section.archivable" class="edit-section-btn" @click="startEditingSection(section)">
                        <span class="edit-icon">✎</span>
                      </button>
                      <button class="add-task-btn" @click="createNewTask(section)">
                        <span class="add-icon">+</span> Add Task
                      </button>
                    </div>
                  </template>
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
                        <template v-if="editableTaskId === item.id">
                          <div class="task-edit-container">
                            <input 
                              type="text" 
                              class="task-text-edit" 
                              v-model="editTaskText" 
                              @blur="saveEditedTask"
                              @keydown="handleTaskEditKeydown"
                            />
                            <button class="confirm-task-btn" @click="saveEditedTask">
                              <span class="confirm-icon">✓</span>
                            </button>
                            <button class="cancel-task-btn" @click="cancelEditTask">
                              <span class="cancel-icon">×</span>
                            </button>
                          </div>
                        </template>
                        <template v-else>
                          <span 
                            class="task-title" 
                            :title="item.text"
                            @dblclick="startEditingTask(item)"
                          >
                            {{ item.text }}
                            <button class="edit-task-btn" @click="startEditingTask(item)">
                              <span class="edit-icon">✎</span>
                            </button>
                            <template v-if="taskPendingDelete === item.id">
                              <button class="confirm-delete-btn" @click.stop="confirmDeleteTask(item, section)">
                                Confirm Delete?
                              </button>
                              <button class="cancel-delete-btn" @click.stop="cancelDeleteTask">
                                ×
                              </button>
                            </template>
                            <button v-else class="delete-task-btn" @click.stop="requestDeleteTask(item)">
                              <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          </span>
                        </template>
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
            :animation="150"
            drag-class="is-dragging"
            @add="onSectionAdded"
            @dragover="onDoneColumnDragOver"
            @dragleave="onDoneColumnDragLeave"
          >
            <template #item="{ element: section }">
              <div :class="['section', { 'on-ice-section': section.on_ice }]">
                <div 
                  :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
                  @dblclick="section.archivable && startEditingSection(section)"
                >
                  <template v-if="editableSectionId === section.name">
                    <div class="section-edit-container">
                      <input 
                        type="text" 
                        class="section-name-edit" 
                        v-model="editSectionName" 
                        @blur="saveEditedSection"
                        @keydown="handleEditKeydown"
                        ref="sectionNameInput"
                      />
                      <button class="confirm-section-btn" @click="saveEditedSection">
                        <span class="confirm-icon">✓</span>
                      </button>
                      <button class="cancel-section-btn" @click="cancelEditSection">
                        <span class="cancel-icon">×</span>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    {{ section.name }}
                    <span v-if="section.archivable" class="archive-badge archived">Archived</span>
                    <div v-if="section.on_ice" class="on-ice-label">ON ICE</div>
                    <div class="section-header-actions">
                      <button class="add-task-btn" @click="createNewTask(section)">
                        <span class="add-icon">+</span> Add Task
                      </button>
                      <button v-if="section.archivable" class="edit-section-btn" @click="startEditingSection(section)">
                        <span class="edit-icon">✎</span>
                      </button>
                    </div>
                  </template>
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
                        <template v-if="editableTaskId === item.id">
                          <div class="task-edit-container">
                            <input 
                              type="text" 
                              class="task-text-edit" 
                              v-model="editTaskText" 
                              @blur="saveEditedTask"
                              @keydown="handleTaskEditKeydown"
                              placeholder="Enter task text..."
                            />
                            <button class="confirm-task-btn" @click="saveEditedTask">
                              <span class="confirm-icon">✓</span>
                            </button>
                            <button class="cancel-task-btn" @click="cancelEditTask">
                              <span class="cancel-icon">×</span>
                            </button>
                          </div>
                        </template>
                        <template v-else>
                          <span 
                            class="task-title" 
                            :title="item.text"
                            @dblclick="startEditingTask(item)"
                          >
                            {{ item.text }}
                            <button class="edit-task-btn" @click="startEditingTask(item)">
                              <span class="edit-icon">✎</span>
                            </button>
                            <template v-if="taskPendingDelete === item.id">
                              <button class="confirm-delete-btn" @click.stop="confirmDeleteTask(item, section)" :title="'Delete: ' + item.text">
                                Delete "{{ item.text.substring(0, 10) + (item.text.length > 10 ? '...' : '') }}"?
                              </button>
                              <button class="cancel-delete-btn" @click.stop="cancelDeleteTask">
                                ×
                              </button>
                            </template>
                            <button v-else class="delete-task-btn" @click.stop="requestDeleteTask(item)">
                              <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          </span>
                        </template>
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
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick } from 'vue';
import axios from 'axios';
import { parseTodoFile, renderTodoFile } from './utils/TodoParser';
import draggable from 'vuedraggable';

// Base URL for the API
const API_BASE_URL = 'http://localhost:3001/api';

// Custom directive to focus an element when it's inserted into the DOM
const vFocus = {
  mounted: (el) => el.focus()
};

export default {
  name: 'App',
  components: {
    draggable
  },
  setup() {
    const sections = ref([]);
    const loading = ref(true);
    const availableFiles = ref([]);
    const selectedFile = ref('');
    const customFiles = ref([]);
    const parsingError = ref('');
    const fileInput = ref(null);
    const editableSectionId = ref(null);
    const editSectionName = ref('');
    const editableTaskId = ref(null);
    const editTaskText = ref('');
    const nextTaskId = ref(1);
    const taskPendingDelete = ref(null); // Store the ID of the task pending deletion
    const tabPendingRemove = ref(null); // Store the path of the tab pending removal

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

    // Load available text files from the server
    const loadAvailableFiles = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/files`);
        availableFiles.value = response.data.files;
        console.log('Available files:', availableFiles.value);

        // Check for saved file in localStorage
        const savedFile = localStorage.getItem('selectedTodoFile');

        // Set the selected file - first try localStorage, then first file in list
        if (savedFile && availableFiles.value.some(file => file.name === savedFile)) {
          // If we have a saved file and it still exists in the file list
          selectedFile.value = savedFile;
        } else if (!selectedFile.value && availableFiles.value.length > 0) {
          // Otherwise default to first file
          selectedFile.value = availableFiles.value[0].name;
        }
      } catch (error) {
        console.error('Error loading file list:', error);
      }
    };

    // Load todo data from the server for the selected file
    const loadTodoData = async () => {
      try {
        loading.value = true;
        parsingError.value = '';

        // Check if the selected file is a custom file
        if (selectedFile.value && selectedFile.value.startsWith('custom:')) {
          // Find the custom file in the list
          const customFile = customFiles.value.find(file => file.path === selectedFile.value);
          if (customFile) {
            // Parse the custom file content
            try {
              sections.value = parseTodoFile(customFile.content);
              console.log('Loaded sections from custom file:', sections.value);
            } catch (parseError) {
              console.error('Error parsing custom todo file:', parseError);
              parsingError.value = `Error parsing file: ${parseError.message || 'Invalid format'}`;
              // Revert to the previously selected file if possible
              const previousFile = localStorage.getItem('previousTodoFile');
              if (previousFile && previousFile !== selectedFile.value) {
                selectedFile.value = previousFile;
                // Try loading the previous file
                await loadTodoData();
                return;
              }
            }
          } else {
            console.error('Custom file not found:', selectedFile.value);
            parsingError.value = 'Custom file not found';
            // Revert to the first available file if possible
            if (availableFiles.value.length > 0) {
              selectedFile.value = availableFiles.value[0].name;
              localStorage.setItem('selectedTodoFile', selectedFile.value);
            }
          }
        } else {
          // Load from server
          const params = selectedFile.value ? { filename: selectedFile.value } : {};
          const response = await axios.get(`${API_BASE_URL}/todos`, { params });

          try {
            // Parse the todo text into sections
            sections.value = parseTodoFile(response.data.content);
            console.log('Loaded sections:', sections.value);
          } catch (parseError) {
            console.error('Error parsing server todo file:', parseError);
            parsingError.value = `Error parsing file: ${parseError.message || 'Invalid format'}`;
          }
        }

        // Save the current file as the previous file
        localStorage.setItem('previousTodoFile', selectedFile.value);
        loading.value = false;
      } catch (error) {
        console.error('Error loading todo file:', error);
        parsingError.value = `Error loading file: ${error.message || 'Could not load file'}`;
        loading.value = false;
      }
    };

    // Save todo data to the server or update custom file
    const persistTodoData = async () => {
      try {
        console.log('Persisting todo data...');

        // Render the sections into text content
        const content = renderTodoFile(sections.value);

        if (!content) {
          console.error('No content generated for saving');
          return false;
        }

        // Check if the selected file is a custom file
        if (selectedFile.value && selectedFile.value.startsWith('custom:')) {
          // Find the custom file in the list
          const customFileIndex = customFiles.value.findIndex(file => file.path === selectedFile.value);
          if (customFileIndex >= 0) {
            // Update the custom file content
            customFiles.value[customFileIndex].content = content;
            // Save the updated custom files to localStorage
            saveCustomFilesToStorage();
            console.log('Custom todo file updated successfully');
            return true;
          } else {
            console.error('Custom file not found for updating:', selectedFile.value);
            return false;
          }
        } else {
          // Send the content to the server, including the filename
          const payload = { 
            content,
            filename: selectedFile.value 
          };

          const response = await axios.post(`${API_BASE_URL}/todos`, payload);
          console.log('Todo data saved successfully to server', response.data);
          return true;
        }
      } catch (error) {
        console.error('Error saving todo data:', error);
        parsingError.value = `Error saving file: ${error.message || 'Could not save file'}`;
        return false;
      }
    };

    // Create a new task in the specified section
    const createNewTask = (section) => {
      // Calculate the next available task ID
      let maxId = 0;
      sections.value.forEach(section => {
        section.items.forEach(item => {
          if (item.id > maxId) {
            maxId = item.id;
          }
        });
      });

      // Create a new task with default values
      const newTask = {
        id: maxId + 1,
        statusChar: ' ', // Default to unchecked
        text: '', // Empty text to be filled by user
        lineIndex: -1, // This will be assigned when saving
        isNew: true // Flag to track newly created tasks
      };

      // Add the task to the section
      section.items.push(newTask);

      // Open the task for editing immediately
      nextTick(() => {
        startEditingTask(newTask);
      });
    };

    // Handle file selection change
    const handleFileChange = async () => {
      console.log('File changed to:', selectedFile.value);

      // Clear any previous parsing errors
      parsingError.value = '';

      // Check if the user selected the "Select from device" option
      if (selectedFile.value === '__select_from_device__') {
        // Trigger the file input click
        fileInput.value.click();
        return;
      }

      // Save selected file to localStorage
      localStorage.setItem('selectedTodoFile', selectedFile.value);
      await loadTodoData();
    };

    // Handle file selection from the device
    const handleFileInputChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        // Read the file content
        const content = await readFileContent(file);

        // Try to parse the file content
        try {
          // Parse the todo text into sections
          sections.value = parseTodoFile(content);
          console.log('Loaded sections from local file:', sections.value);

          // Create a custom file object
          const customFile = {
            name: file.name,
            path: `custom:${file.name}`,
            content: content
          };

          // Check if this file is already in the custom files list
          const existingIndex = customFiles.value.findIndex(f => f.path === customFile.path);
          if (existingIndex >= 0) {
            // Update the existing file
            customFiles.value[existingIndex] = customFile;
          } else {
            // Add the new file to the custom files list
            customFiles.value.push(customFile);
          }

          // Save the custom files to localStorage
          saveCustomFilesToStorage();

          // Select the custom file
          selectedFile.value = customFile.path;
          localStorage.setItem('selectedTodoFile', selectedFile.value);

          loading.value = false;
        } catch (parseError) {
          console.error('Error parsing todo file:', parseError);
          parsingError.value = `Error parsing file: ${parseError.message || 'Invalid format'}`;
          // Reset the file input
          event.target.value = '';
          // Revert to the previously selected file
          selectedFile.value = localStorage.getItem('selectedTodoFile') || '';
          loading.value = false;
        }
      } catch (readError) {
        console.error('Error reading file:', readError);
        parsingError.value = `Error reading file: ${readError.message || 'Could not read file'}`;
        // Reset the file input
        event.target.value = '';
        // Revert to the previously selected file
        selectedFile.value = localStorage.getItem('selectedTodoFile') || '';
        loading.value = false;
      }
    };

    // Helper function to read file content
    const readFileContent = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    };

    // Save custom files to localStorage
    const saveCustomFilesToStorage = () => {
      const customFilesData = customFiles.value.map(file => ({
        name: file.name,
        path: file.path,
        content: file.content
      }));
      localStorage.setItem('customTodoFiles', JSON.stringify(customFilesData));
    };

    // Load custom files from localStorage
    const loadCustomFilesFromStorage = () => {
      try {
        const customFilesData = localStorage.getItem('customTodoFiles');
        if (customFilesData) {
          const parsedData = JSON.parse(customFilesData);
          customFiles.value = parsedData.map(file => ({
            name: file.name,
            path: file.path,
            content: file.content
          }));
          console.log('Loaded custom files from storage:', customFiles.value);
        }
      } catch (error) {
        console.error('Error loading custom files from storage:', error);
      }
    };

    // Format tab name by removing .txt extension and replacing underscores with spaces
    const formatTabName = (filename) => {
      // Remove .txt extension (case insensitive)
      let displayName = filename.replace(/\.txt$/i, '');

      // Replace underscores with spaces
      displayName = displayName.replace(/_/g, ' ');

      return displayName;
    };

    // Request to remove a custom file - first step that asks for confirmation
    const requestRemoveCustomFile = (file) => {
      tabPendingRemove.value = file.path;
      // Auto-cancel after 3 seconds for better UX
      setTimeout(() => {
        if (tabPendingRemove.value === file.path) {
          tabPendingRemove.value = null;
        }
      }, 3000);
    };

    // Cancel a tab removal request
    const cancelRemoveCustomFile = () => {
      tabPendingRemove.value = null;
    };

    // Confirm and execute the tab removal
    const confirmRemoveCustomFile = (file) => {
      // Find the index of the file in the customFiles array
      const fileIndex = customFiles.value.findIndex(f => f.path === file.path);

      if (fileIndex >= 0) {
        // Remove the file from the array
        customFiles.value.splice(fileIndex, 1);

        // Save the updated custom files to localStorage
        saveCustomFilesToStorage();

        // If the removed file was the selected file, select another file
        if (selectedFile.value === file.path) {
          // Try to select another custom file first
          if (customFiles.value.length > 0) {
            selectedFile.value = customFiles.value[0].path;
          } 
          // Otherwise select a server file if available
          else if (availableFiles.value.length > 0) {
            selectedFile.value = availableFiles.value[0].name;
          }
          // Update localStorage and load the new file
          localStorage.setItem('selectedTodoFile', selectedFile.value);
          loadTodoData();
        }

        // Reset the pending remove state
        tabPendingRemove.value = null;

        console.log('Custom file removed:', file.name);
      }
    };

    // Legacy function for backward compatibility
    const removeCustomFile = confirmRemoveCustomFile;

    // Function to toggle task status
    const toggleTaskStatus = (item) => {
      // Find the section that contains this item
      const section = sections.value.find(section => 
        section.items.some(i => i.id === item.id)
      );

      // If the item is in an "on_ice" section, don't allow toggling
      if (section && section.on_ice) {
        console.log('Cannot toggle status of items in "on_ice" sections');
        return;
      }

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

    // Track dragging state
    const isDragging = ref(false);
    const draggedSection = ref(null);

    // Start dragging a section
    const onSectionDragStart = (event) => {
      console.log('Section drag started', event);
      isDragging.value = true;
      draggedSection.value = event.item.__draggable_context.element;

      // If the dragged section is archivable, add a special class to the done column
      if (draggedSection.value.archivable) {
        document.querySelector('.done-column')?.classList.add('potential-target');
      }
    };

    // End dragging a section
    const onSectionDragEnd = (event) => {
      console.log('Section drag ended', event);
      isDragging.value = false;
      draggedSection.value = null;

      // Remove classes from the done column
      document.querySelector('.done-column')?.classList.remove('potential-target', 'drag-target');
    };

    // When dragging over the DONE column
    const onDoneColumnDragOver = () => {
      // Only highlight if we're dragging an archivable section
      if (isDragging.value && draggedSection.value?.archivable) {
        console.log('Dragging over DONE column', draggedSection.value.name);
        document.querySelector('.done-column')?.classList.add('drag-target');
      }
    };

    // When leaving the DONE column during drag
    const onDoneColumnDragLeave = () => {
      console.log('Leaving DONE column');
      document.querySelector('.done-column')?.classList.remove('drag-target');
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

    // Start editing a section name
    const startEditingSection = (section) => {
      // Only allow editing archivable sections
      if (section.archivable) {
        editableSectionId.value = section.name;
        editSectionName.value = section.name;

        // Focus the input after the DOM updates
        nextTick(() => {
          const input = document.querySelector('.section-name-edit');
          if (input) {
            input.focus();
          }
        });
      }
    };

    // Save the edited section name
    const saveEditedSection = async () => {
      if (!editableSectionId.value || !editSectionName.value.trim()) {
        cancelEditSection();
        return;
      }

      // Find the section being edited
      const sectionIndex = sections.value.findIndex(s => s.name === editableSectionId.value);
      if (sectionIndex !== -1 && editSectionName.value.trim() !== sections.value[sectionIndex].name) {
        // Update the section name
        sections.value[sectionIndex].name = editSectionName.value.trim();

        // Persist the change
        await persistTodoData();
      }

      // Reset edit state
      editableSectionId.value = null;
      editSectionName.value = '';
    };

    // Cancel editing without saving
    const cancelEditSection = () => {
      editableSectionId.value = null;
      editSectionName.value = '';
    };

    // Handle keydown events in the edit input
    const handleEditKeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveEditedSection();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEditSection();
      }
    };

    // Start editing a task
    const startEditingTask = (item) => {
      editableTaskId.value = item.id;
      editTaskText.value = item.text;

      // Focus the input after the DOM updates
      nextTick(() => {
        const input = document.querySelector('.task-text-edit');
        if (input) {
          input.focus();
        }
      });
    };

    // Save the edited task text
    const saveEditedTask = async () => {
      // If no task ID or empty text, cancel editing (which will remove new tasks)
      if (editableTaskId.value === null || !editTaskText.value.trim()) {
        cancelEditTask();
        return;
      }

      // Find the task being edited
      let taskFound = false;

      // Search in all sections
      for (const section of sections.value) {
        const taskIndex = section.items.findIndex(item => item.id === editableTaskId.value);
        if (taskIndex !== -1) {
          // Remove the isNew flag if it exists
          if (section.items[taskIndex].isNew) {
            delete section.items[taskIndex].isNew;
          }

          // Update the task text
          if (editTaskText.value.trim() !== section.items[taskIndex].text) {
            section.items[taskIndex].text = editTaskText.value.trim();
            taskFound = true;
          }

          // Persist the change
          await persistTodoData();
          break;
        }
      }

      // Reset edit state
      editableTaskId.value = null;
      editTaskText.value = '';
    };

    // Cancel editing task without saving
    const cancelEditTask = () => {
      // Find the task being edited
      if (editableTaskId.value !== null) {
        // Look through all sections to find the task
        for (const section of sections.value) {
          const taskIndex = section.items.findIndex(item => item.id === editableTaskId.value);
          if (taskIndex !== -1) {
            // If this is a new task being canceled, remove it
            if (section.items[taskIndex].isNew || section.items[taskIndex].text === '') {
              section.items.splice(taskIndex, 1);
            }
            break;
          }
        }
      }

      // Reset edit state
      editableTaskId.value = null;
      editTaskText.value = '';
    };

    // Handle keydown events in the task edit input
    const handleTaskEditKeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveEditedTask();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEditTask();
      }
    };

    // Request deletion of a task - first step that asks for confirmation
    const requestDeleteTask = (item) => {
      taskPendingDelete.value = item.id;
      // Auto-cancel after 3 seconds for better UX
      setTimeout(() => {
        if (taskPendingDelete.value === item.id) {
          taskPendingDelete.value = null;
        }
      }, 3000);
    };

    // Cancel a delete request
    const cancelDeleteTask = () => {
      taskPendingDelete.value = null;
    };

    // Confirm and execute the deletion
    const confirmDeleteTask = async (item, section) => {
      // Find the task index in the section
      const taskIndex = section.items.findIndex(task => task.id === item.id);
      if (taskIndex !== -1) {
        // Remove the task from the section
        section.items.splice(taskIndex, 1);
        // Reset the pending delete state
        taskPendingDelete.value = null;
        // Persist the change
        await persistTodoData();
      }
    };

    onMounted(async () => {
      // First load custom files from localStorage
      loadCustomFilesFromStorage();

      // Then load available files from the server
      await loadAvailableFiles();

      // Then load todo data for the selected file
      await loadTodoData();
    });

    return {
      sections,
      todoSections,
      wipSections,
      doneSections,
      loading,
      isDragging,
      draggedSection,
      availableFiles,
      customFiles,
      selectedFile,
      parsingError,
      fileInput,
      editableSectionId,
      editSectionName,
      editableTaskId,
      editTaskText,
      taskPendingDelete,
      tabPendingRemove,
      handleFileChange,
      handleFileInputChange,
      toggleTaskStatus,
      onDragEnd,
      checkSectionMove,
      onSectionDragStart,
      onSectionDragEnd,
      onDoneColumnDragOver,
      onDoneColumnDragLeave,
      onSectionAdded,
      startEditingSection,
      saveEditedSection,
      cancelEditSection,
      handleEditKeydown,
      startEditingTask,
      saveEditedTask,
      cancelEditTask,
      handleTaskEditKeydown,
      createNewTask,
      requestDeleteTask,
      confirmDeleteTask,
      cancelDeleteTask,
      formatTabName,
      removeCustomFile,
      requestRemoveCustomFile,
      confirmRemoveCustomFile,
      cancelRemoveCustomFile
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
  display: none;
}

.logo-container {
  display: flex;
  align-items: center;
  margin-right: 2px;
}

.app-logo {
  height: 24px;
  width: 24px;
  margin-right: 5px;
}

.app-title {
  vertical-align: bottom;
  font-size: 13px;
  font-weight: bold;
  color: #71797E;
  margin-right: 15px;
  margin-bottom: 3px;
  white-space: nowrap;
  display: flex;
  align-items: end;
}

.file-tabs {
  display: flex;
  overflow-x: auto;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
  margin-top: 5px;
}

.file-tab {
  padding: 7px 10px;
  margin: 0 2px;
  background-color: #e9e9e9;
  color: #555;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-bottom: none;
}

.file-tab:hover {
  background-color: #f0f0f0;
  color: #4caf50;
}

.file-tab.active {
  background-color: #f5f5f5;
  color: #4caf50;
  border-top-width: 1.5px;
  border-bottom: none;
  border-right-width: 1.5px;
  font-weight: 600;
  position: relative;
}


.file-tab.add-tab {
  padding: 7px 15px;
  min-width: 40px;
  justify-content: center;
}

.file-tab .add-icon {
  font-size: 16px;
  font-weight: bold;
}

/* Server tab styles */
.server-tab {
  border-left: 3px solid #4caf50;
}

.server-tab.active {
  border-left-width: 6px;
}

.server-tab::after {
  content: '•';
  font-size: 14px;
  color: #4caf50;
  margin-left: 8px;
  opacity: 0.7;
}

/* Custom tab styles */
.custom-tab {
  border-left: 3px solid #2196F3;
  position: relative;
  padding-right: 25px; /* Make room for the close button */
}

.close-tab-btn {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 50%;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.close-tab-btn:hover {
  color: #f44336;
  background-color: rgba(0, 0, 0, 0.05);
  opacity: 1;
}

.custom-tab.active {
  border-left-width: 6px;
}

.custom-tab::after {
  content: '↑';
  font-size: 12px;
  color: #2196F3;
  margin-left: 8px;
  opacity: 0.7;
}

.tab-confirm-actions {
  display: flex;
  align-items: center;
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
}

.confirm-remove-btn {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  margin-right: 4px;
  white-space: nowrap;
}

.cancel-remove-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 20px;
  color: #555;
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

.kanban-container {
  display: flex;
  height: calc(100vh - 40px);
  gap: 10px;
  padding: 10px;
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
  margin-bottom: 5px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 5px;
  padding: 2px;
}

.section-header {
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
  margin-bottom: 8px;
  position: relative;
}

.section-header.large {
  font-size: 18px;
  text-align: center;
  color: #2c3e50;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 6px 10px;
}

.section-header.small {
  font-size: 14px;
  color: #555;
  padding: 8px 10px;
}

.section-items {
  padding: 0 4px 8px;
}

.task-card {
  background-color: white;
  border-radius: 5px;
  padding: 6px 3px 6px 1px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: flex-start;
}

.task-title {
  margin-left: 6px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 50px;
  position: relative;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 16px;
}

.custom-checkbox {
  width: 20px;
  height: 16px;
  border: 2px solid #aaa;
  border-radius: 2px;
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
  border-color: #aaaaaa;
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
  left: 2px;
  right: 2px;
  height: 1px;
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
  width: 4px;
  height: 8px;
  border: solid #4caf50;
  border-width: 0 1px 1px 0;
  transform: rotate(45deg);
}

.empty-section {
  padding: 1px;
  color: #999;
  font-style: italic;
  text-align: center;
  height: 11px;
  line-height: 11px;
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

.ghost-section {
  opacity: 0.6;
  background: #e0f7fa;
  border: 2px dashed #26c6da;
}

.task-card {
  cursor: grab;
}

.task-card:active {
  cursor: grabbing;
}

/* Section dragging styles */
.is-dragging {
  opacity: 0.4;
}

.archivable-section {
  cursor: grab;
  border: 1px dashed #aaa;
  position: relative;
}

.archivable-section:hover::before {
  content: "Drag to Archive";
  position: absolute;
  top: -10px;
  right: 5px;
  font-size: 10px;
  background: rgba(0,0,0,0.1);
  padding: 2px 5px;
  border-radius: 3px;
  color: #666;
  opacity: 0.7;
}

/* On Ice section styles */
.on-ice-section {
  background-color: rgba(173, 216, 230, 0.3); /* Light blue transparent background */
  border: 1px solid rgba(173, 216, 230, 0.5);
  position: relative;
}

.on-ice-label {
  background-color: rgba(173, 216, 230, 0.5);
  border: 1px solid rgba(100, 149, 237, 0.7);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: bold;
  color: #4a6d8c;
  display: inline-block;
  margin-left: 8px;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  vertical-align: middle;
}

.on-ice-label:hover {
  background-color: rgba(173, 216, 230, 0.7);
  transform: scale(1.05);
}

/* DONE column highlight when dragging */
.done-column.potential-target .column-content {
  transition: all 0.3s ease;
  border: 2px dashed transparent;
}

.done-column.drag-target .column-content {
  background-color: rgba(76, 175, 80, 0.1);
  border: 2px dashed #4caf50;
  border-radius: 8px;
}

.done-column .section-list {
  min-height: 100px;
  transition: all 0.3s ease;
}

/* Editable section name styles */
.section-name-edit {
  width: calc(100% - 20px);
  padding: 5px;
  font-size: inherit;
  font-weight: bold;
  border: 1px solid #4caf50;
  border-radius: 3px;
  background-color: white;
  outline: none;
}

.edit-section-btn {
  visibility: hidden;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  padding: 2px 6px;
  margin-left: 5px;
  opacity: 0.9;
  transition: all 0.2s;
  border-radius: 3px;
  background-color: rgba(220, 220, 220, 0.3);
}

.section-header:hover .edit-section-btn {
  visibility: visible;
}

.edit-section-btn:hover {
  opacity: 1;
  color: #4caf50;
  background-color: rgba(220, 220, 220, 0.6);
}

.edit-icon {
  font-size: 14px;
  font-weight: bold;
}

/* Task editing styles */
.task-edit-container {
  display: flex;
  align-items: center;
  flex: 1;
  margin-left: 8px;
}

.task-text-edit {
  width: calc(100% - 30px);
  padding: 5px;
  font-size: inherit;
  border: 1px solid #4caf50;
  border-radius: 3px;
  background-color: white;
  outline: none;
  flex: 1;
}

.cancel-task-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #e53935;
  font-size: 20px;
  margin-left: 5px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border-radius: 50%;
  transition: all 0.2s;
}

.cancel-task-btn:hover {
  background-color: #ffebee;
  transform: scale(1.1);
}

.cancel-icon {
  font-weight: bold;
}

.confirm-task-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #4caf50;
  font-size: 20px;
  margin-left: 5px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border-radius: 50%;
  transition: all 0.2s;
}

.confirm-task-btn:hover {
  background-color: #e8f5e9;
  transform: scale(1.1);
}

.confirm-icon {
  font-weight: bold;
}

.section-edit-container {
  display: flex;
  align-items: center;
  width: calc(100% - 20px);
}

.confirm-section-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #4caf50;
  font-size: 18px;
  margin-left: 5px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border-radius: 50%;
  transition: all 0.2s;
}

.confirm-section-btn:hover {
  background-color: #e8f5e9;
  transform: scale(1.1);
}

.cancel-section-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #e53935;
  font-size: 18px;
  margin-left: 5px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border-radius: 50%;
  transition: all 0.2s;
}

.cancel-section-btn:hover {
  background-color: #ffebee;
  transform: scale(1.1);
}

.edit-task-btn {
  visibility: hidden;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  padding: 2px 5px;
  margin-left: 5px;
  opacity: 0.9;
  transition: all 0.2s;
  position: absolute;
  right: 25px; /* Move to make room for delete button */
  top: 50%;
  transform: translateY(-50%);
}

.delete-task-btn {
  visibility: hidden;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 5px;
  opacity: 0.9;
  transition: all 0.2s;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  fill: #e57373; /* Red color for the trash icon */
  transition: fill 0.2s;
}

.task-title:hover .edit-task-btn,
.task-title:hover .delete-task-btn {
  visibility: visible;
}

.edit-task-btn:hover {
  opacity: 1;
  color: #4caf50;
  transform: translateY(-50%) scale(1.1);
}

.delete-task-btn:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.1);
}

.delete-task-btn:hover .delete-icon {
  fill: #e53935; /* Darker red on hover */
}

.confirm-delete-btn {
  background-color: rgba(229, 115, 115, 0.1);
  border: 1px solid rgba(229, 115, 115, 0.3);
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #d32f2f;
  padding: 4px 12px;
  position: absolute;
  right: 25px;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  line-height: 1.5;
  display: flex;
  align-items: center;
  height: 20px;
}

.confirm-delete-btn:hover {
  background-color: rgba(229, 115, 115, 0.2);
  border-color: rgba(229, 115, 115, 0.5);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-50%) scale(1.02);
}

.cancel-delete-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  color: #757575;
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.2s ease;
}

.cancel-delete-btn:hover {
  color: #e53935;
  background-color: rgba(229, 115, 115, 0.1);
  border-color: rgba(229, 115, 115, 0.3);
  transform: translateY(-50%) scale(1.1);
}

/* Add Task button styles */
.section-header-actions {
  display: flex;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.add-task-btn {
  background-color: #f1f8e9;
  border: 1px solid #c5e1a5;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  color: #558b2f;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  margin-right: 5px;
}

.add-task-btn:hover {
  background-color: #dcedc8;
  border-color: #8bc34a;
  transform: scale(1.05);
}

.add-icon {
  font-size: 14px;
  margin-right: 5px;
  font-weight: bold;
}
</style>
