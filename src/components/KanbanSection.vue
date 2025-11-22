<!-- components/KanbanSection.vue -->
<template>
  <div
      :class="['section', {
      'archivable-section': section.archivable,
      'on-ice-section': columnData.on_ice,
      'raw-text-section': isRawTextSection
    }]"
  >
    <div
        v-if="!isRawTextSection"
        :class="['section-header', section.headerStyle === 'LARGE' ? 'large' : 'small']"
        @dblclick="section.archivable && startEditingSection()"
    >
      <template v-if="isEditingSection">
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
        <div v-if="section.on_ice" class="on-ice-label">ON ICE</div>
        <div class="section-header-actions">
          <!-- Collapse completed tasks button -->
          <button 
            v-if="!columnData.on_ice && hasCompletedTasks" 
            class="collapse-completed-btn"
            @click="toggleCompletedCollapse"
            :title="isCompletedCollapsed ? 'Expand completed/cancelled tasks' : 'Collapse completed/cancelled tasks'"
          >
            <span class="collapse-icon">{{ isCompletedCollapsed ? '▶' : '▼' }}</span>
          </button>
          <button v-if="!columnData.on_ice" class="add-task-btn" @click="createNewTask">
            <span class="add-icon">+</span> Add Task
          </button>
          <button v-if="!columnData.on_ice" 
                  :class="['sort-tasks-btn', { 'sorting': isSorting }]" 
                  @click="sortTasks" 
                  title="Sort tasks"
                  :disabled="isSorting">
            🔀
          </button>
          <button v-if="!columnData.on_ice" class="edit-section-btn" @click="startEditingSection">
            <span class="edit-icon">✎</span>
          </button>
          <!-- Archive button for archivable sections -->
          <button
              v-if="section.archivable && columnType === 'WIP'"
              class="archive-section-btn"
              @click="archiveSection"
              title="Archive this section"
          >
            <svg class="archive-icon" viewBox="0 0 24 24" width="16" height="16">
              <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
            </svg>
          </button>
          <!-- Delete section button -->
          <template v-if="sectionPendingDelete">
            <button class="confirm-delete-btn section-confirm-delete-btn" @click.stop="confirmDeleteSection">
              Delete Section?
            </button>
            <button class="cancel-delete-btn" @click.stop="cancelDeleteSection">
              ×
            </button>
          </template>
          <button
              v-else-if="columnType !== 'DONE'"
              class="delete-section-btn"
              :class="{ 'non-clickable': section.items.length > 0 }"
              @click.stop="section.items.length === 0 && requestDeleteSection()"
          >
            <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </template>
    </div>
    <div 
      v-if="!isRawTextSection" 
      class="section-items" 
      :class="{ 'completed-collapsed': isCompletedCollapsed }"
      :style="{ '--collapsed-stack-height': collapsedStackHeight }"
    >
      <!-- Summary card (only when collapsed) -->
      <div 
        v-if="isCompletedCollapsed && getContiguousCompletedTasks.length > 0"
        class="task-card-wrapper collapsed-summary"
        :style="getSummaryCardStyle()"
      >
        <div class="task-card summary-card">
          <div class="summary-content">
            <span v-if="collapsedSummary.completed > 0" class="summary-item">
              <div class="custom-checkbox checked"></div>
              <span class="summary-text">{{ collapsedSummary.completed }} completed</span>
            </span>
            <span v-if="collapsedSummary.completed > 0 && collapsedSummary.cancelled > 0" class="separator">, </span>
            <span v-if="collapsedSummary.cancelled > 0" class="summary-item">
              <div class="custom-checkbox cancelled"></div>
              <span class="summary-text">{{ collapsedSummary.cancelled }} cancelled</span>
            </span>
          </div>
        </div>
      </div>

      <!-- All tasks in single draggable container -->
      <draggable
          v-model="section.items"
          :group="'tasks'"
          item-key="id"
          class="task-list"
          ghost-class="ghost-card"
          handle=".task-card"
          @end="onDragEnd"
      >
        <template #item="{ element: item, index }">
          <div 
            v-if="showRawText || item.type !== 'raw-text'"
            :class="['task-card-wrapper', {
              'collapsed-completed': isCompletedCollapsed && getContiguousCompletedTasks.includes(item)
            }]"
            :style="getTaskCardStyle(item, index)"
          >
            <TaskCard
                :task="item"
                :section="section"
                :column="column"
                :is-on-ice="columnData.on_ice || false"
                :is-selected="isTaskSelected && isTaskSelected(item.id)"
                @task-updated="$emit('task-updated')"
                @show-date-picker="$emit('show-date-picker', $event)"
                @task-click="$emit('task-click', $event)"
                @task-context-menu="$emit('task-context-menu', $event)"
            />
          </div>
        </template>
      </draggable>
      
      <div v-if="visibleItemsCount === 0" class="empty-section">
        No items
      </div>
    </div>
    
    <!-- raw-text section content (text only) -->
    <div v-if="isRawTextSection" class="raw-text-section-content">
      <div class="raw-text-section-text">{{ section.displayText || section.text }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, computed } from 'vue';
import draggable from 'vuedraggable';
import TaskCard from './TaskCard.vue';
import {
  getStatusPriority,
  sortTaskToCorrectPosition
} from '../utils/sortHelpers';

const props = defineProps({
  section: {
    type: Object,
    required: true
  },
  columnType: {
    type: String,
    required: true
  },
  column: {
    type: String,
    required: true
  },
  columnData: {
    type: Object,
    default: () => ({})
  },
  showRawText: {
    type: Boolean,
    default: false
  },
  isTaskSelected: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['task-updated', 'section-updated', 'show-date-picker', 'task-click', 'task-context-menu']);

// Computed properties
const isRawTextSection = computed(() => props.section.type === 'raw-text');

// Count visible items for empty section display
const visibleItemsCount = computed(() => {
  if (props.showRawText) {
    return (props.section.items || []).length;
  }
  // Count non-raw-text items when showRawText is false
  return (props.section.items || []).filter(item => item.type !== 'raw-text').length;
});


// Section editing state
const isEditingSection = ref(false);
const editSectionName = ref('');
const sectionPendingDelete = ref(false);
const isSorting = ref(false);

// Initialize collapse state from localStorage
const storageKey = computed(() => `section-collapse-${props.section.name}`);
const isCompletedCollapsed = ref(false);

// Function to load collapse state from localStorage
const loadCollapseState = () => {
  const saved = localStorage.getItem(storageKey.value);
  if (saved !== null) {
    isCompletedCollapsed.value = saved === 'true';
  } else {
    // If no saved state, default to collapsed for DONE columns
    isCompletedCollapsed.value = props.columnType === 'DONE';
  }
};

// Load collapse state on mount
onMounted(() => {
  loadCollapseState();
});

// Template refs
const sectionNameInput = ref(null);

// Computed property to check if section has completed/cancelled tasks
const hasCompletedTasks = computed(() => {
  return (props.section.items || []).some(item => 
    item.type === 'task' && (item.statusChar === 'x' || item.statusChar === '-')
  );
});

// Get contiguous completed/cancelled tasks from the top of the list
const getContiguousCompletedTasks = computed(() => {
  const items = props.section.items || [];
  const contiguousTasks = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === 'task' && (item.statusChar === 'x' || item.statusChar === '-')) {
      contiguousTasks.push(item);
    } else {
      // Stop at first non-completed task
      break;
    }
  }
  
  return contiguousTasks;
});

// Toggle collapsed state for completed tasks
const toggleCompletedCollapse = () => {
  isCompletedCollapsed.value = !isCompletedCollapsed.value;
  // Save to localStorage
  localStorage.setItem(storageKey.value, isCompletedCollapsed.value.toString());
};


// Computed property to calculate counts for summary card
const collapsedSummary = computed(() => {
  const tasks = getContiguousCompletedTasks.value;
  const completed = tasks.filter(task => task.statusChar === 'x').length;
  const cancelled = tasks.filter(task => task.statusChar === '-').length;
  return { completed, cancelled };
});

// Get positioning styles for task cards
const getTaskCardStyle = (item, index) => {
  if (!isCompletedCollapsed.value) {
    return {}; // Normal positioning when not collapsed
  }
  
  const contiguousTasks = getContiguousCompletedTasks.value;
  const isInCollapsed = contiguousTasks.includes(item);
  
  if (isInCollapsed) {
    // Apply absolute positioning for collapsed cards relative to section-items
    const collapsedIndex = contiguousTasks.findIndex(t => t.id === item.id);
    return {
      position: 'absolute',
      top: `${8 + collapsedIndex * 15}px`, // 8px for section padding
      zIndex: 100 + collapsedIndex,
      height: '45px',
      overflow: 'hidden',
      width: '100%',
      left: '0',
    };
  }
  
  // For uncompleted tasks, return normal styling (padding-top on container handles spacing)
  return {};
};

// Get positioning styles for summary card
const getSummaryCardStyle = () => {
  const completedCount = getContiguousCompletedTasks.value.length;
  return {
    position: 'absolute',
    top: `${8 + completedCount * 15}px`, // 8px for section padding
    zIndex: 100 + completedCount,
    width: '100%',
    left: '0',
  };
};

// Calculate the height needed for the collapsed stack
const collapsedStackHeight = computed(() => {
  if (!isCompletedCollapsed.value) return 0;
  const completedCount = getContiguousCompletedTasks.value.length;
  if (completedCount === 0) return 0;
  // Height calculation: last card top position + summary card height + spacing to prevent overlap
  return completedCount * 15 + 45; // 45px for summary card + spacing to clear uncompleted tasks
});

// Start editing section name
const startEditingSection = () => {
  isEditingSection.value = true;
  editSectionName.value = props.section.name;

  nextTick(() => {
    const input = sectionNameInput.value;
    if (input) {
      input.focus();
    }
  });
};

// Save edited section name
const saveEditedSection = () => {
  if (!editSectionName.value.trim()) {
    cancelEditSection();
    return;
  }

  if (editSectionName.value.trim() !== props.section.name) {
    props.section.name = editSectionName.value.trim();
    emit('section-updated');
  }

  // Remove isNew flag after saving
  if (props.section.isNew) {
    delete props.section.isNew;
  }

  isEditingSection.value = false;
  editSectionName.value = '';
};

// Cancel section editing
const cancelEditSection = () => {
  isEditingSection.value = false;
  editSectionName.value = '';
};

// Handle keydown in section edit
const handleEditKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveEditedSection();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelEditSection();
  }
};

// Create new task
const createNewTask = () => {
  // Calculate the next available task ID
  let maxId = 0;
  // Get all sections from parent (would need to be passed down or use provide/inject)
  // For now, we'll use a timestamp-based ID
  const newTask = {
    id: Date.now(),
    type: 'task',
    statusChar: ' ',
    text: '',
    displayText: '',
    hasNotes: false,
    notes: '',
    lineIndex: -1,
    isNew: true
  };

  props.section.items.push(newTask);
  emit('task-updated');
};

// Request section deletion
const requestDeleteSection = () => {
  sectionPendingDelete.value = true;
  setTimeout(() => {
    if (sectionPendingDelete.value) {
      sectionPendingDelete.value = false;
    }
  }, 3000);
};

// Cancel section deletion
const cancelDeleteSection = () => {
  sectionPendingDelete.value = false;
};

// Confirm section deletion
const confirmDeleteSection = () => {
  if (props.section.items.length === 0) {
    // Find the index of this section in its column
    const sectionIndex = props.columnData.sections ? props.columnData.sections.indexOf(props.section) : -1;
    // Emit delete event to parent with both name and index
    emit('section-updated', { 
      action: 'delete', 
      sectionName: props.section.name,
      sectionIndex: sectionIndex 
    });
  }
  sectionPendingDelete.value = false;
};

// Archive section
const archiveSection = () => {
  emit('section-updated', { action: 'archive', sectionName: props.section.name });
};

// Sort a single task to its correct position with animation using shared utility
const sortSingleTask = async (task) => {
  return await sortTaskToCorrectPosition(
    props.section.items, 
    task, 
    emit,
    {
      allowOverlap: true,
      animationDuration: 150
    }
  );
};

// Visual bubble sort using the shared single task sort function
const sortTasks = async () => {
  if (isSorting.value) return; // Prevent multiple simultaneous sorts
  
  isSorting.value = true;
  
  const items = props.section.items;
  let swapped = true;
  let passCount = 0;
  
  // Continue making passes until no swaps occur
  while (swapped) {
    swapped = false;
    passCount++;
    
    // Bubble sort from bottom to top using the shared sort function
    for (let i = items.length - 1; i > 0; i--) {
      const currentItem = items[i];
      
      // Skip raw-text items
      if (currentItem.type === 'raw-text') continue;
      
      // Use the shared sort function for this task
      const taskMoved = await sortSingleTask(currentItem);
      if (taskMoved) {
        swapped = true;
        // Note: i doesn't need adjustment since sortSingleTask handles the array changes
      }
    }
    
    // Small pause between passes
    if (swapped) {
      await new Promise(resolve => setTimeout(resolve, 75));
    }
  }
  
  // Final cleanup
  items.forEach(item => {
    if (item.isFloatingUp) delete item.isFloatingUp;
    if (item.isFloatingDown) delete item.isFloatingDown;
    if (item.floatDistance) delete item.floatDistance;
  });
  
  isSorting.value = false;
  emit('task-updated');
};

// Handle drag end
const onDragEnd = () => {
  emit('task-updated');
};

// Check if section is new and enter edit mode
onMounted(() => {
  if (props.section.isNew) {
    nextTick(() => {
      startEditingSection();
      // Select all text for easy replacement
      nextTick(() => {
        if (sectionNameInput.value) {
          sectionNameInput.value.select();
        }
      });
    });
  }
});
</script>

<style scoped>
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
  text-align: left;
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

.task-list {
  min-height: 5px;
}

/* Add smooth transitions for task reordering */
.section-items .task-card {
  transition: transform 0.3s ease-in-out;
  margin-bottom: 3px;
}

.ghost-card {
  opacity: 0.5;
  background: #c8ebfb;
  border: 1px dashed #97d6ef;
}

.empty-section {
  padding: 1px;
  color: #999;
  font-style: italic;
  text-align: center;
  height: 11px;
  line-height: 11px;
}

/* Archivable section styles */


/* raw-text section styles */
.raw-text-section {
  background-color: rgba(248, 249, 250, 0.8);
  border: 1px solid rgba(224, 224, 224, 0.5);
  border-radius: 4px;
  margin-bottom: 8px;
  position: relative;
}

.raw-text-section .section-items {
  padding: 4px 8px 8px;
}

.raw-text-section-content {
  padding: 8px 12px;
}

.raw-text-section-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #2d3748;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f7fafc;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  margin: 0;
}

/* On Ice section styles */
.on-ice-section {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(144, 202, 249, 0.5);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(33, 150, 243, 0.1);
  position: relative;
}

.on-ice-section .section-header {
  background: rgba(255, 255, 255, 0.2);
  color: #1565c0;
  border-radius: 6px 6px 0 0;
  overflow: hidden;
}

.on-ice-section .section-header.small {
  padding: 8px 10px;
}

.on-ice-section .section-header.large {
  padding: 6px 10px;
}

.on-ice-section .section-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.4'%3E%3Cpath d='M20 5 L20 35 M8 12 L32 28 M32 12 L8 28'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 20px 20px;
  background-repeat: repeat;
  pointer-events: none;
  z-index: 0;
}

.on-ice-section .section-header .on-ice-label {
  position: relative;
  z-index: 2;
}

.on-ice-label {
  background: linear-gradient(45deg, #ffffff 0%, #e3f2fd 100%);
  border: 1px solid #2196f3;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: bold;
  color: #1976d2;
  display: inline-block;
  margin-left: 8px;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(33, 150, 243, 0.3);
  vertical-align: middle;
}

.on-ice-label:hover {
  background: linear-gradient(45deg, #e3f2fd 0%, #bbdefb 100%);
  transform: scale(1.05);
}

/* Section header actions */
.section-header-actions {
  display: flex;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
}

/* Edit section styles */
.section-edit-container {
  display: flex;
  align-items: center;
  width: calc(100% - 20px);
}

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

.edit-section-btn:hover {
  opacity: 1;
  color: #4caf50;
  background-color: rgba(220, 220, 220, 0.6);
}

.edit-icon {
  font-size: 14px;
  font-weight: bold;
}

/* Confirm/Cancel buttons */
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

.confirm-icon, .cancel-icon {
  font-weight: bold;
}

/* Add Task button */
.add-task-btn {
  background-color: #f1f8e9;
  border: 1px solid #c5e1a5;
  border-radius: 4px;
  padding: 4px 8px;
  height: 70%;
  margin-top: 4px;
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

/* Sort Tasks button */
.sort-tasks-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  padding: 4px 6px;
  margin-left: 5px;
  opacity: 0.7;
  transition: all 0.2s;
  border-radius: 3px;
  background-color: rgba(220, 220, 220, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sort-tasks-btn:hover {
  opacity: 1;
  color: #2196f3;
  background-color: rgba(33, 150, 243, 0.1);
  transform: scale(1.1);
}

.sort-tasks-btn.sorting {
  animation: sortSpin 0.5s linear infinite;
  opacity: 0.7;
  cursor: not-allowed;
  color: #ff9800;
}

@keyframes sortSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Archive button */
.archive-section-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-left: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.7;
}

.archive-section-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
  transform: scale(1.1);
  opacity: 1;
}

.archive-icon {
  fill: #4caf50;
  transition: fill 0.2s;
}

.archive-section-btn:hover .archive-icon {
  fill: #388e3c;
}

/* Delete section button */
.delete-section-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-left: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.7;
}

.delete-section-btn:hover {
  background-color: rgba(229, 115, 115, 0.1);
  transform: scale(1.1);
  opacity: 1;
}

.delete-section-btn .delete-icon {
  fill: #e57373;
  transition: fill 0.2s;
}

.delete-section-btn:hover .delete-icon {
  fill: #e53935;
}

.delete-section-btn.non-clickable {
  opacity: 0.3;
  cursor: not-allowed;
}

.delete-section-btn.non-clickable:hover {
  background-color: transparent;
  transform: none;
  opacity: 0.3;
}

/* Delete confirmation buttons */
.confirm-delete-btn {
  background-color: rgba(229, 115, 115, 0.1);
  border: 1px solid rgba(229, 115, 115, 0.3);
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #d32f2f;
  padding: 4px 12px;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  line-height: 1.5;
  display: flex;
  align-items: center;
  height: 20px;
  z-index: 10;
}

.section-confirm-delete-btn {
  margin-right: 5px;
}

.confirm-delete-btn:hover {
  background-color: rgba(229, 115, 115, 0.2);
  border-color: rgba(229, 115, 115, 0.5);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: scale(1.02);
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
  transition: all 0.2s ease;
}

.cancel-delete-btn:hover {
  color: #e53935;
  background-color: rgba(229, 115, 115, 0.1);
  border-color: rgba(229, 115, 115, 0.3);
  transform: scale(1.1);
}

/* Collapse completed tasks button */
.collapse-completed-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  padding: 4px 6px;
  margin-right: 5px;
  opacity: 0.7;
  transition: all 0.2s;
  border-radius: 3px;
  background-color: rgba(220, 220, 220, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-completed-btn:hover {
  opacity: 1;
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
  transform: scale(1.05);
}

.collapse-icon {
  font-size: 10px;
  margin-right: 2px;
}

/* Collapsed completed tasks styles */
.section-items.completed-collapsed {
  position: relative;
}

.section-items.completed-collapsed .task-list {
  position: relative; /* Create positioning context for absolutely positioned collapsed cards */
  padding-top: calc(var(--collapsed-stack-height, 0) * 1px); /* Push uncompleted tasks below collapsed stack */
}



.task-card-wrapper {
  position: relative;
  transition: all 0.3s ease;
}

/* When collapsed, completed tasks get special styling */
.task-card-wrapper.collapsed-completed .task-card {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

/* Ensure dragging still works with collapsed items */
.task-card-wrapper.collapsed-completed.sortable-drag {
  height: auto !important;
  position: relative !important;
  top: auto !important;
  z-index: auto !important;
}

/* Summary card styling */
.task-card-wrapper.collapsed-summary {
  position: absolute !important;
  height: 45px !important;
  overflow: hidden !important;
  width: 100%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center; /* Center the summary card */
}

.summary-card {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  padding: 2px 8px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  cursor: default;
  font-size: 12px;
  width: auto; /* Only as wide as needed */
  height: 28px; /* Make it shorter */
}

.summary-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-text {
  font-size: 12px;
  color: #495057;
}

.separator {
  color: #6c757d;
  font-size: 12px;
}

/* Use regular checkbox styling for summary card - just disable interactions */
.summary-card .custom-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #aaa;
  border-radius: 2px;
  position: relative;
  cursor: default;
  transition: none;
  user-select: none;
}

.summary-card .custom-checkbox.checked {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.summary-card .custom-checkbox.checked:after {
  content: "";
  position: absolute;
  top: 2px;
  left: 5px;
  width: 4px;
  height: 8px;
  border: solid #4caf50;
  border-width: 0 1px 1px 0;
  transform: rotate(45deg);
}

.summary-card .custom-checkbox.cancelled {
  background-color: #f5f5f5;
  border-color: #757575;
}

.summary-card .custom-checkbox.cancelled:after {
  content: "";
  position: absolute;
  top: 50%;
  left: 2px;
  right: 2px;
  height: 2px;
  background-color: #757575;
  transform: translateY(-50%);
}
</style>