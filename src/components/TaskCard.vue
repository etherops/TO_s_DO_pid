<!-- components/TaskCard.vue -->
<template>
  <div class="task-card" :class="{ 
    'raw-text-card': isRawText, 
    'ice-task-card': isOnIce, 
    'floating': task.isFloating, 
    'sorting': task.isSorting, 
    'floating-up': task.isFloatingUp,
    'floating-down': task.isFloatingDown
  }"
  :style="(task.isFloatingUp || task.isFloatingDown) && task.floatDistance ? {
    '--float-distance': task.floatDistance
  } : {}">
    <!-- raw-text display (simple, uneditable) -->
    <div v-if="isRawText" class="raw-text-content">
      <div class="raw-text-text">{{ task.displayText || task.text }}</div>
    </div>
    
    <!-- Task display (interactive) -->
    <div v-else class="task-content-wrapper">
      <div class="checkbox-wrapper">
        <div
            :class="['custom-checkbox', {
            'unchecked': task.statusChar === ' ',
            'in-progress': task.statusChar === '~',
            'checked': task.statusChar === 'x',
            'cancelled': task.statusChar === '-',
            'pending-sort': isPendingSort
          }]"
            @click="toggleTaskStatus"
        ></div>
      </div>
    <template v-if="isEditing">
      <!-- Simplified interface for new tasks or simple edit mode -->
      <div v-if="task.isNew || isSimpleEdit" class="new-task-wrapper">
        <input
            type="text"
            class="new-task-input"
            v-model="editTaskText"
            @keydown="handleNewTaskKeydown"
            ref="taskTextInput"
            placeholder="Enter task text..."
        />
        <button class="confirm-edit-btn" @click="saveAllEdits">
          <span class="confirm-icon">✓</span>
        </button>
        <button class="cancel-edit-btn" @click="cancelAllEdits">
          <span class="cancel-icon">×</span>
        </button>
      </div>
      <!-- Full edit interface for existing tasks -->
      <div v-else class="task-edit-wrapper">
        <!-- Title editing row -->
        <div class="task-edit-row">
          <textarea
              class="task-text-edit"
              v-model="editTaskText"
              @keydown="handleTaskEditKeydown"
              ref="taskTextInput"
              placeholder="Enter task text..."
          ></textarea>
        </div>
        
        <!-- Note and Date row -->
        <div class="note-date-row">
          <!-- Note editing section -->
          <div class="note-edit-section">
            <label class="note-label">Notes</label>
            <textarea
                class="note-text-edit"
                v-model="editNoteText"
                @keydown="handleNoteEditKeydown"
                ref="noteTextInput"
                placeholder="Enter note..."
            ></textarea>
          </div>
          
          <!-- Date picker section -->
          <div class="date-edit-section">
            <CompactDatePicker
                v-model="editDateValue"
                ref="datePickerRef"
            />
          </div>
        </div>
        
        <!-- Action buttons row -->
        <div class="edit-actions-row">
          <button class="confirm-edit-btn" @click="saveAllEdits">
            <span class="confirm-icon">✓</span> Save
          </button>
          <button class="cancel-edit-btn" @click="cancelAllEdits">
            <span class="cancel-icon">×</span> Cancel
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="task-container">
          <span
              :class="[
              'task-title',
              { 'due-date': task.statusChar !== 'x' && task.statusChar !== '-' && hasDueDate(task.text) },
              { 'due-past': task.statusChar !== 'x' && task.statusChar !== '-' && isPast(task.text) },
              { 'due-today': task.statusChar !== 'x' && task.statusChar !== '-' && isToday(task.text) },
              { 'due-soon': task.statusChar !== 'x' && task.statusChar !== '-' && isSoon(task.text) }
            ]"
              :title="task.text"
              @dblclick="isOnIce ? null : startEditingAll"
          >
            {{ task.displayText || task.text }}
          </span>

          <!-- Inline note preview -->
          <div v-if="hasNote(task.text) && !isEditing" class="inline-note-preview">
            {{ formatInlineNote(extractNoteFromText(task.text)) }}
          </div>

          <div class="task-buttons-container">
          <!-- Clock button -->
          <button
              v-if="!isOnIce"
              class="task-icon-btn clock-btn"
              :class="{ 'has-due-date': hasDueDate(task.text) }"
              @click.stop="handleDateClick"
              :title="hasDueDate(task.text) ? getDueDateTooltip(task.text) : 'Add due date'"
          >
            ⏰
          </button>

          <!-- Notes button -->
          <button
              v-if="!isOnIce"
              class="task-icon-btn notes-btn"
              :class="{ 'has-notes': hasNote(task.text) }"
              @click.stop="handleNotesClick"
              :title="hasNote(task.text) ? extractNoteFromText(task.text) : 'Add note'"
          >
            📋
          </button>

          <!-- Edit button -->
          <button 
            v-if="!isOnIce"
            class="task-icon-btn edit-btn" 
            @click="handleEditClick" 
            title="Edit task (Shift+click for simple edit)"
          >
            <span class="edit-icon">✎</span>
          </button>

          <!-- Delete button -->
          <template v-if="taskPendingDelete">
            <button class="confirm-delete-btn" @click.stop="confirmDeleteTask" :title="'Delete: ' + task.text">
              Delete "{{ (task.displayText || task.text).substring(0, 10) + ((task.displayText || task.text).length > 10 ? '...' : '') }}"?
            </button>
            <button class="cancel-delete-btn" @click.stop="cancelDeleteTask">
              ×
            </button>
          </template>
          <button 
            v-else 
            class="task-icon-btn delete-btn" 
            @click.stop="requestDeleteTask"
          >
            <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>
    </template>
    </div>
    
    <!-- Hover preview container (non-edit mode) -->
    <div v-if="!isEditing && !isRawText && (isLongTitle || hasDueDate(task.text) || hasNote(task.text))" class="hover-preview-container">
      <!-- Full title display -->
      <div v-if="isLongTitle" class="full-title-preview">
        <div class="preview-display-label">Full Title</div>
        <div class="full-title-text">{{ task.displayText || task.text }}</div>
      </div>
      
      <!-- Notes and due date row -->
      <div v-if="hasDueDate(task.text) || hasNote(task.text)" class="hover-preview-row">
        <!-- Note preview aligned with title -->
        <div v-if="hasNote(task.text) || hasDueDate(task.text)" class="note-preview">
          <div class="preview-display-label">Notes</div>
          <div class="note-display-text" :class="{ 'empty-note': !hasNote(task.text) }">
            {{ hasNote(task.text) ? extractNoteFromText(task.text) : '' }}
          </div>
        </div>
        <!-- Due date preview aligned with icons -->
        <div class="due-date-preview">
          <template v-if="hasDueDate(task.text)">
            <div class="preview-display-label">Due Date</div>
            <div class="mini-calendar">
              <div class="calendar-header">{{ getMonthYear(task.text) }}</div>
              <div class="calendar-day">{{ getDayNumber(task.text) }}</div>
              <div class="calendar-weekday">{{ getWeekday(task.text) }}</div>
            </div>
          </template>
          <div v-else class="due-date-placeholder"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue';
import CompactDatePicker from './CompactDatePicker.vue';
import {
  hasDueDate,
  isPast,
  isToday,
  isSoon,
  getDueDateTooltip,
  extractDateFromText,
  getMonthYear,
  getDayNumber,
  getWeekday
} from '../utils/dateHelpers';
import {
  hasNote,
  extractNoteFromText,
  updateNoteInText,
  getStrippedDisplayText
} from '../utils/noteHelpers';
import {
  sortTaskToCorrectPosition
} from '../utils/sortHelpers';

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  section: {
    type: Object,
    required: true
  },
  isOnIce: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['task-updated']);

// Computed properties
const isRawText = computed(() => props.task.type === 'raw-text');

// Check if title is long enough to be truncated
const isLongTitle = computed(() => {
  const titleText = props.task.displayText || props.task.text;
  // Rough estimate: if title is longer than 50 characters, it's probably truncated
  // You could also measure actual element width vs container width for more accuracy
  return titleText.length > 50;
});

// Task state
const isEditing = ref(false);
const isSimpleEdit = ref(false);
const editTaskText = ref('');
const taskPendingDelete = ref(false);
const editNoteText = ref('');
const editDateValue = ref('');
const isPendingSort = ref(false);
const sortTimeout = ref(null);

// Template refs
const taskTextInput = ref(null);
const noteTextInput = ref(null);
const datePickerRef = ref(null);

// Toggle task status
const toggleTaskStatus = () => {
  // Don't allow toggling in "on_ice" columns
  if (props.isOnIce) {
    console.log('Cannot toggle status of items in "on_ice" columns');
    return;
  }

  // Clear any existing sort timeout
  if (sortTimeout.value) {
    clearTimeout(sortTimeout.value);
    sortTimeout.value = null;
    isPendingSort.value = false;
  }

  // Cycle through states: unchecked -> in-progress -> checked -> cancelled -> unchecked
  const oldStatus = props.task.statusChar;
  if (props.task.statusChar === ' ') {
    props.task.statusChar = '~';
  } else if (props.task.statusChar === '~') {
    props.task.statusChar = 'x';
  } else if (props.task.statusChar === 'x') {
    props.task.statusChar = '-';
  } else {
    props.task.statusChar = ' ';
  }

  // Semi auto-sort: trigger when any status change occurs
  if (oldStatus !== props.task.statusChar) {
    // Start pulsing animation
    isPendingSort.value = true;
    
    // Delay sorting by 1.5 seconds to allow user to continue clicking
    sortTimeout.value = setTimeout(() => {
      isPendingSort.value = false;
      sortTaskAfterStatusChange();
    }, 1500);
  }

  emit('task-updated');
};

// Sort task after status change using shared sorting utility
const sortTaskAfterStatusChange = () => {
  sortTaskToCorrectPosition(props.section.items, props.task, emit);
};

// Handle edit button click (check for shift key)
const handleEditClick = (event) => {
  if (event.shiftKey) {
    startSimpleEdit();
  } else {
    startEditingAll();
  }
};

// Handle date click - start edit mode with focus on date
const handleDateClick = () => {
  startEditingAll('date');
};

// Handle notes click - start edit mode with focus on notes
const handleNotesClick = () => {
  startEditingAll('notes');
};

// Start simple edit mode (shows full text)
const startSimpleEdit = () => {
  isEditing.value = true;
  isSimpleEdit.value = true;
  
  // Use the full raw text
  editTaskText.value = props.task.text;

  nextTick(() => {
    if (taskTextInput.value) {
      taskTextInput.value.focus();
      taskTextInput.value.select();
    }
  });
};

// Start editing all (both title and note)
const startEditingAll = (focusTarget = '') => {
  isEditing.value = true;
  isSimpleEdit.value = false;
  
  // Extract clean title without note or due date
  const cleanTitle = getStrippedDisplayText(props.task.text);
  editTaskText.value = cleanTitle;
  
  // Extract existing note
  editNoteText.value = extractNoteFromText(props.task.text) || '';
  
  // Extract existing date
  const existingDate = extractDateFromText(props.task.text);
  if (existingDate) {
    const year = existingDate.getFullYear();
    const month = String(existingDate.getMonth() + 1).padStart(2, '0');
    const day = String(existingDate.getDate()).padStart(2, '0');
    editDateValue.value = `${year}-${month}-${day}`;
  } else {
    editDateValue.value = '';
  }

  nextTick(() => {
    if (focusTarget === 'date' && datePickerRef.value) {
      datePickerRef.value.focus();
    } else if (focusTarget === 'notes' && noteTextInput.value) {
      noteTextInput.value.focus();
    } else if (taskTextInput.value) {
      taskTextInput.value.focus();

      // If this is a new task, select all text
      if (props.task.isNew) {
        taskTextInput.value.select();
      }
    }
  });
};


// Save all edits (title and note)
const saveAllEdits = () => {
  if (!editTaskText.value.trim()) {
    // If empty and this is a new task, remove it
    if (props.task.isNew) {
      const index = props.section.items.findIndex(item => item.id === props.task.id);
      if (index !== -1) {
        props.section.items.splice(index, 1);
      }
    }
    cancelAllEdits();
    return;
  }

  // Update task
  if (props.task.isNew) {
    delete props.task.isNew;
  }

  let newText;
  
  if (isSimpleEdit.value || props.task.isNew) {
    // In simple edit mode or for new tasks, use the text as-is
    newText = editTaskText.value.trim();
  } else {
    // In full edit mode, build the text from components
    newText = editTaskText.value.trim();
    
    // Add note if present - escape newlines
    if (editNoteText.value.trim()) {
      const escapedNote = editNoteText.value.trim().replace(/\n/g, '\\n');
      newText += ` (${escapedNote})`;
    }
    
    // Add date if present
    if (editDateValue.value) {
      // Parse the date value
      const [year, month, day] = editDateValue.value.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
      newText += ` !!(${formattedDate})`;
    }
  }

  if (newText !== props.task.text) {
    props.task.text = newText;
    props.task.displayText = getStrippedDisplayText(newText);
  }

  isEditing.value = false;
  isSimpleEdit.value = false;
  editTaskText.value = '';
  editNoteText.value = '';
  editDateValue.value = '';
  emit('task-updated');
};


// Cancel all edits
const cancelAllEdits = () => {
  // If this is a new task being canceled, remove it
  if (props.task.isNew || props.task.text === '') {
    const index = props.section.items.findIndex(item => item.id === props.task.id);
    if (index !== -1) {
      props.section.items.splice(index, 1);
    }
  }

  isEditing.value = false;
  isSimpleEdit.value = false;
  editTaskText.value = '';
  editNoteText.value = '';
  editDateValue.value = '';
};

// Handle keydown in task edit
const handleTaskEditKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    saveAllEdits();
  } else if (event.key === 'Tab' && !event.shiftKey) {
    // Tab key moves to notes field (default browser behavior)
    // No need to prevent default here
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelAllEdits();
  }
};


// Delete task functions
const requestDeleteTask = () => {
  taskPendingDelete.value = true;
  setTimeout(() => {
    if (taskPendingDelete.value) {
      taskPendingDelete.value = false;
    }
  }, 3000);
};

const cancelDeleteTask = () => {
  taskPendingDelete.value = false;
};

const confirmDeleteTask = () => {
  const index = props.section.items.findIndex(item => item.id === props.task.id);
  if (index !== -1) {
    props.section.items.splice(index, 1);
    taskPendingDelete.value = false;
    emit('task-updated');
  }
};


// Handle keydown in note edit
const handleNoteEditKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    saveAllEdits();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelAllEdits();
  }
};

// Handle keydown for new task input
const handleNewTaskKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveAllEdits();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelAllEdits();
  }
};

// Format note for inline preview - show \n instead of line breaks
const formatInlineNote = (noteText) => {
  if (!noteText) return '';
  
  // Truncate to reasonable length and show literal \n
  const maxLength = 60;
  let formatted = noteText;
  
  // If it's too long, truncate with ellipsis
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength) + '...';
  }
  
  return formatted;
};

// Process display text on mount if the task is new
onMounted(() => {
  if (props.task.isNew) nextTick(() => startEditingAll());
});

// Clean up timeout on unmount
onUnmounted(() => {
  if (sortTimeout.value) {
    clearTimeout(sortTimeout.value);
  }
});
</script>

<style scoped>
/* ========================= */
/* Base Task Card Structure  */
/* ========================= */
.task-card {
  background-color: white;
  border-radius: 5px;
  padding: 3px 10px;
  margin-bottom: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  cursor: grab;
  position: relative;
}

.task-card:active {
  cursor: grabbing;
}

.task-card:hover {
  height: auto;
  z-index: 100;
}

/* ========================= */
/* raw-text Card Styles       */
/* ========================= */
.raw-text-card {
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  cursor: default;
}

.raw-text-content {
  padding: 8px 12px;
  min-height: 22px; /* Match task card height */
}

.raw-text-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #2d3748;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.task-content-wrapper {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

/* ========================= */
/* Checkbox Styles           */
/* ========================= */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 16px;
  margin-top: 3px;
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
}

.custom-checkbox.in-progress:after {
  content: "~";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ff9800;
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
}

.custom-checkbox.checked {
  background-color: #e8f5e9;
  border-color: #4caf50;
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

.custom-checkbox.cancelled {
  background-color: #f5f5f5;
  border-color: #757575;
}

.custom-checkbox.cancelled:after {
  content: "";
  position: absolute;
  top: 50%;
  left: 2px;
  right: 2px;
  height: 2px;
  background-color: #757575;
  transform: translateY(-50%);
}

/* ========================= */
/* Task Display Mode         */
/* ========================= */
.task-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  position: relative;
  align-items: flex-start;
}

.task-card:hover .task-container {
  align-items: flex-start;
}

.task-title {
  margin-left: 8px;
  margin-top: 3px;
  flex: 0 1 auto;
  white-space: nowrap;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  transition: all 0.3s ease;
}

.task-card:hover .task-title {
  /* Keep title truncated even on hover to prevent card expansion */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Inline note preview */
.inline-note-preview {
  margin-left: 8px;
  margin-right: 8px;
  font-size: 11px;
  color: #555;
  line-height: 1.2;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  border-left: 3px solid #2196f3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 1 auto;
  max-width: 300px;
  align-self: center;
}

/* ========================= */
/* Due Date Styling          */
/* ========================= */
.task-title.due-past {
  animation: pulse 1.5s infinite;
  color: #f44336;
  font-size: 1.1em;
}

.task-title.due-today {
  color: #f44336;
}

.task-title.due-soon {
  color: #ff9800;
}

/* Due date card backgrounds */
.task-card:has(.task-title.due-past),
.task-card:has(.task-title.due-today) {
  background-color: #ffebee;
  box-shadow: 0 2px 5px rgba(255, 0, 0, 0.2);
}

.task-card:has(.task-title.due-soon) {
  background-color: #fffde7;
  box-shadow: 0 2px 5px rgba(255, 193, 7, 0.2);
}

/* Cancel due date styling for completed and cancelled tasks */
.task-card:has(.custom-checkbox.checked) .task-title.has-due-date,
.task-card:has(.custom-checkbox.cancelled) .task-title.has-due-date {
  color: inherit !important;
  font-weight: normal !important;
  font-size: 1em !important;
  animation: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

/* Clock button remains visible for completed tasks with due dates */

/* ========================= */
/* Action Buttons            */
/* ========================= */
.task-buttons-container {
  display: flex;
  align-items: center;
  z-index: 20;
  width: 100px;
  justify-content: flex-end;
  margin-left: auto;
}

.task-card:hover .task-buttons-container {
  align-self: flex-start;
  margin-top: 0;
}

.task-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 3px;
  opacity: 0.3;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-icon-btn:hover {
  transform: scale(1.1);
}

.task-card:hover .edit-btn,
.task-card:hover .delete-btn {
  opacity: 1;
}

.clock-btn.has-due-date,
.notes-btn.has-notes {
  opacity: 1;
}

/* Delete button specific */
.delete-icon {
  fill: #e57373;
  transition: fill 0.2s;
}

.delete-btn:hover .delete-icon {
  fill: #e53935;
}

/* Delete confirmation */
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
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  line-height: 1.5;
  display: flex;
  align-items: center;
  height: 20px;
  z-index: 10;
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

/* ========================= */
/* Edit Mode                 */
/* ========================= */
.new-task-wrapper {
  display: flex;
  flex: 1;
  margin-left: 8px;
  gap: 8px;
  align-items: center;
  width: calc(100% - 28px);
}

.new-task-input {
  flex: 1;
  padding: 5px 8px;
  font-size: inherit;
  border: 1px solid #4caf50;
  border-radius: 3px;
  background-color: white;
  outline: none;
  font-family: inherit;
}

.new-task-input:focus {
  border-color: #45a049;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.new-task-wrapper .confirm-edit-btn,
.new-task-wrapper .cancel-edit-btn {
  padding: 4px 8px;
  min-width: auto;
  font-size: 12px;
}

.task-edit-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-left: 8px;
  gap: 8px;
  padding: 5px 0;
  width: calc(100% - 28px);
}

.task-edit-row {
  display: flex;
  width: 100%;
}

.task-text-edit {
  width: 100%;
  padding: 5px;
  font-size: inherit;
  border: 1px solid #4caf50;
  border-radius: 3px;
  background-color: white;
  outline: none;
  resize: vertical;
  min-height: 30px;
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.note-date-row {
  display: flex;
  gap: 10px;
  width: 100%;
  align-items: flex-start;
}

.note-edit-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-edit-section {
  width: 120px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.note-edit-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 4px;
}

.note-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.note-text-edit {
  padding: 5px;
  font-size: 14px;
  border: 1px solid #2196f3;
  border-radius: 3px;
  background-color: #f5f5f5;
  outline: none;
  resize: vertical;
  min-height: 50px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.edit-actions-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.confirm-edit-btn,
.cancel-edit-btn {
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 6px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.confirm-edit-btn {
  background-color: #4caf50;
}

.confirm-edit-btn:hover {
  background-color: #45a049;
  transform: scale(1.02);
}

.cancel-edit-btn {
  background-color: #f44336;
}

.cancel-edit-btn:hover {
  background-color: #da190b;
  transform: scale(1.02);
}

.confirm-icon,
.cancel-icon {
  font-weight: bold;
}

/* ========================= */
/* Hover Preview             */
/* ========================= */
.hover-preview-container {
  visibility: hidden;
  position: absolute;
  top: 100%;
  right: 0;
  width: 66.67%;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  z-index: 50;
  padding: 12px;
  margin: 0;
  margin-top: 4px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
}

.task-card:hover .hover-preview-container {
  visibility: visible;
  opacity: 1;
  transform: translateY(0);
}

.hover-preview-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

/* Full title preview section */
.full-title-preview {
  margin-bottom: 12px;
}

.full-title-text {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
  white-space: normal;
  word-wrap: break-word;
  background-color: #f9f9f9;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.preview-display-label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

/* Note preview section */
.note-preview {
  flex: 1;
  margin-right: 0;
}

.note-display-text {
  font-size: 14px;
  color: #555;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid #2196f3;
  box-sizing: border-box;
  min-height: 60px;
  display: flex;
  align-items: flex-start;
}

.note-display-text.empty-note {
  background-color: #fafafa;
  border-left-color: #e0e0e0;
  color: #999;
}

/* Due date preview section */
.due-date-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 83px;
  flex-shrink: 0;
  padding-left: 10px;
  margin-left: 10px;
}

.due-date-preview .preview-display-label {
  text-align: right;
}

.due-date-placeholder {
  width: 100%;
  height: 60px;
}

/* Mini calendar component */
.mini-calendar {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  width: 60px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  align-self: flex-start;
}

.calendar-header {
  font-size: 9px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
  font-weight: 500;
}

.calendar-day {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  line-height: 1;
  margin: 2px 0;
}

.calendar-weekday {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Calendar due date states */
.task-card:has(.task-title.due-past) .mini-calendar,
.task-card:has(.task-title.due-today) .mini-calendar {
  background-color: #ffebee;
  border-color: #f44336;
}

.task-card:has(.task-title.due-past) .calendar-day,
.task-card:has(.task-title.due-today) .calendar-day {
  color: #f44336;
}

.task-card:has(.task-title.due-soon) .mini-calendar {
  background-color: #fff8e1;
  border-color: #ff9800;
}

.task-card:has(.task-title.due-soon) .calendar-day {
  color: #ff9800;
}

/* ========================= */
/* Ice Task Card Styling     */
/* ========================= */
.ice-task-card {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(144, 202, 249, 0.7);
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
  cursor: default;
}

.ice-task-card:hover {
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.ice-task-card .custom-checkbox {
  border-color: #2196f3;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  cursor: not-allowed;
}

.ice-task-card .task-title {
  color: #1565c0;
  font-weight: 600;
}

/* ========================= */
/* Animations                */
/* ========================= */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes checkboxPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
  }
}

/* Pending sort animation */
.custom-checkbox.pending-sort {
  animation: checkboxPulse 0.6s ease-in-out infinite;
}

@keyframes floatUp {
  0% {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  50% {
    transform: translateY(-10px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
}

/* Floating card animation */
.task-card.floating {
  animation: floatUp 0.8s ease-out;
  z-index: 200;
}

@keyframes sortShimmer {
  0% {
    background-color: white;
    transform: scale(1);
  }
  25% {
    background-color: #e3f2fd;
    transform: scale(1.02);
  }
  50% {
    background-color: #bbdefb;
    transform: scale(1.01);
  }
  75% {
    background-color: #e3f2fd;
    transform: scale(1.02);
  }
  100% {
    background-color: white;
    transform: scale(1);
  }
}

/* Sorting card animation */
.task-card.sorting {
  animation: sortShimmer 0.6s ease-in-out;
  border: 1px solid #2196f3;
}

@keyframes smoothFloatUp {
  0% {
    transform: translateY(calc(var(--float-distance, 1) * 100%));
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes smoothFloatDown {
  0% {
    transform: translateY(calc(var(--float-distance, 1) * -100%));
  }
  100% {
    transform: translateY(0);
  }
}

/* Simple floating up animation */
.task-card.floating-up {
  animation: smoothFloatUp 0.3s cubic-bezier(0.1, 0.8, 0.5, 1) forwards;
  z-index: 200;
  position: relative;
}

/* Simple floating down animation */
.task-card.floating-down {
  animation: smoothFloatDown 0.3s cubic-bezier(0.1, 0.8, 0.5, 1) forwards;
  z-index: 200;
  position: relative;
}
</style>