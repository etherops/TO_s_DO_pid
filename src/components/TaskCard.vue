<!-- components/TaskCard.vue -->
<template>
  <div class="task-card">
    <div class="task-content-wrapper">
      <div class="checkbox-wrapper">
        <div
            :class="['custom-checkbox', {
            'unchecked': task.statusChar === ' ',
            'in-progress': task.statusChar === '~',
            'checked': task.statusChar === 'x'
          }]"
            @click="toggleTaskStatus"
        ></div>
      </div>
    <template v-if="isEditing">
      <div class="task-edit-wrapper">
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
        
        <!-- Note editing row -->
        <div class="note-edit-row">
          <label class="note-label">Notes</label>
          <textarea
              class="note-text-edit"
              v-model="editNoteText"
              @keydown="handleNoteEditKeydown"
              ref="noteTextInput"
              placeholder="Enter note..."
          ></textarea>
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
            { 'due-date': !task.statusChar.includes('x') && hasDueDate(task.text) },
            { 'due-past': !task.statusChar.includes('x') && isPast(task.text) },
            { 'due-today': !task.statusChar.includes('x') && isToday(task.text) },
            { 'due-soon': !task.statusChar.includes('x') && isSoon(task.text) }
          ]"
            :title="task.text"
            @dblclick="startEditingAll"
        >
          {{ task.displayText || task.text }}
        </span>

        <div class="task-buttons-container">
          <!-- Clock button -->
          <button
              class="task-icon-btn clock-btn"
              :class="{ 'has-due-date': !task.statusChar.includes('x') && hasDueDate(task.text) }"
              @click.stop="handleDueDateClick"
              :title="hasDueDate(task.text) ? getDueDateTooltip(task.text) : 'Add due date'"
          >
            ⏰
          </button>

          <!-- Notes button -->
          <button
              class="task-icon-btn notes-btn"
              :class="{ 'has-notes': hasNote(task.text) }"
              @click.stop="startEditingAll"
              :title="hasNote(task.text) ? extractNoteFromText(task.text) : 'Add note'"
          >
            📋
          </button>

          <!-- Edit button -->
          <button class="task-icon-btn edit-btn" @click="startEditingAll">
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
          <button v-else class="task-icon-btn delete-btn" @click.stop="requestDeleteTask">
            <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>
    </template>
    </div>
    
    <!-- Hover preview container (non-edit mode) -->
    <div v-if="!isEditing && (hasDueDate(task.text) || hasNote(task.text))" class="hover-preview-container">
      <div class="hover-preview-row">
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
import { ref, nextTick, onMounted, computed } from 'vue';
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

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  section: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['task-updated', 'show-date-picker']);

// Task state
const isEditing = ref(false);
const editTaskText = ref('');
const taskPendingDelete = ref(false);
const editNoteText = ref('');

// Template refs
const taskTextInput = ref(null);
const noteTextInput = ref(null);

// Toggle task status
const toggleTaskStatus = () => {
  // Don't allow toggling in "on_ice" sections
  if (props.section.on_ice) {
    console.log('Cannot toggle status of items in "on_ice" sections');
    return;
  }

  // Cycle through states
  if (props.task.statusChar === ' ') {
    props.task.statusChar = '~';
  } else if (props.task.statusChar === '~') {
    props.task.statusChar = 'x';
  } else {
    props.task.statusChar = ' ';
  }

  emit('task-updated');
};

// Start editing all (both title and note)
const startEditingAll = () => {
  isEditing.value = true;
  
  // Extract clean title without note or due date
  const cleanTitle = getStrippedDisplayText(props.task.text);
  editTaskText.value = cleanTitle;
  
  // Extract existing note
  editNoteText.value = extractNoteFromText(props.task.text) || '';

  nextTick(() => {
    if (taskTextInput.value) {
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

  // Build the new text with title, note, and preserved due date
  let newText = editTaskText.value.trim();
  
  // Add note if present - escape newlines
  if (editNoteText.value.trim()) {
    const escapedNote = editNoteText.value.trim().replace(/\n/g, '\\n');
    newText += ` (${escapedNote})`;
  }
  
  // Preserve existing due date
  const dueDateMatch = props.task.text.match(/!\!\s*\([^)]*\)/);
  if (dueDateMatch) {
    newText += ` ${dueDateMatch[0]}`;
  }

  if (newText !== props.task.text) {
    props.task.text = newText;
    props.task.displayText = getStrippedDisplayText(newText);
  }

  isEditing.value = false;
  editTaskText.value = '';
  editNoteText.value = '';
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
  editTaskText.value = '';
  editNoteText.value = '';
};

// Handle keydown in task edit
const handleTaskEditKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    // Move focus to note field
    if (noteTextInput.value) {
      noteTextInput.value.focus();
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelAllEdits();
  }
};

// Handle due date click
const handleDueDateClick = (event) => {
  const rect = event.target.getBoundingClientRect();
  const currentDate = extractDateFromText(props.task.text);

  emit('show-date-picker', {
    taskId: props.task.id,
    position: {
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX - 100
    },
    currentDate
  });
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

// Process display text on mount if the task is new
onMounted(() => {
  if (props.task.isNew) nextTick(() => startEditingAll());
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
}

.task-card:active {
  cursor: grabbing;
}

.task-card:hover {
  height: auto;
  z-index: 10;
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

/* ========================= */
/* Task Display Mode         */
/* ========================= */
.task-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  position: relative;
  align-items: flex-start;
  overflow: hidden;
}

.task-card:hover .task-container {
  align-items: flex-start;
}

.task-title {
  margin-left: 8px;
  margin-top: 3px;
  flex: 1;
  white-space: nowrap;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  transition: all 0.3s ease;
  max-width: calc(100% - 110px);
}

.task-card:hover .task-title {
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
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

/* Cancel due date styling for completed tasks */
.task-card:has(.custom-checkbox.checked) .task-title.has-due-date {
  color: inherit !important;
  font-weight: normal !important;
  font-size: 1em !important;
  animation: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

.task-card:has(.custom-checkbox.checked) .clock-btn.has-due-date {
  opacity: 0.3 !important;
}

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
  padding-right: 10px;
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
  display: none;
  margin-left: 28px;
  margin-top: 4px;
  margin-bottom: 4px;
  width: calc(100% - 28px);
}

.task-card:hover .hover-preview-container {
  display: block;
}

.hover-preview-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
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
</style>