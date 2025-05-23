<!-- components/TaskCard.vue -->
<template>
  <div class="task-card">
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
      <div class="task-edit-container">
        <textarea
            class="task-text-edit"
            v-model="editTaskText"
            @blur="saveEditedTask"
            @keydown="handleTaskEditKeydown"
            ref="taskTextInput"
            placeholder="Enter task text..."
        ></textarea>
        <button class="confirm-task-btn" @click="saveEditedTask">
          <span class="confirm-icon">✓</span>
        </button>
        <button class="cancel-task-btn" @click="cancelEditTask">
          <span class="cancel-icon">×</span>
        </button>
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
            @dblclick="startEditingTask"
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

          <!-- Notes button (placeholder for compatibility) -->
          <button
              class="task-icon-btn notes-btn"
              :class="{ 'has-notes': task.hasNotes }"
              @click="toggleNotes"
              :title="'Notes feature removed'"
          >
            📋
          </button>

          <!-- Edit button -->
          <button class="task-icon-btn edit-btn" @click="startEditingTask">
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
  getDisplayTextWithoutDueDate
} from '../utils/dateHelpers';

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

// Template refs
const taskTextInput = ref(null);

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

// Start editing task
const startEditingTask = () => {
  isEditing.value = true;
  editTaskText.value = props.task.text;

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

// Save edited task
const saveEditedTask = () => {
  if (!editTaskText.value.trim()) {
    // If empty and this is a new task, remove it
    if (props.task.isNew) {
      const index = props.section.items.findIndex(item => item.id === props.task.id);
      if (index !== -1) {
        props.section.items.splice(index, 1);
      }
    }
    cancelEditTask();
    return;
  }

  // Update task
  if (props.task.isNew) {
    delete props.task.isNew;
  }

  const newText = editTaskText.value.trim();
  if (newText !== props.task.text) {
    props.task.text = newText;
    props.task.displayText = getDisplayTextWithoutDueDate(newText);
  }

  isEditing.value = false;
  editTaskText.value = '';
  emit('task-updated');
};

// Cancel editing
const cancelEditTask = () => {
  // If this is a new task being canceled, remove it
  if (props.task.isNew || props.task.text === '') {
    const index = props.section.items.findIndex(item => item.id === props.task.id);
    if (index !== -1) {
      props.section.items.splice(index, 1);
    }
  }

  isEditing.value = false;
  editTaskText.value = '';
};

// Handle keydown in task edit
const handleTaskEditKeydown = (event) => {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      return; // Allow new line
    }
    event.preventDefault();
    saveEditedTask();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelEditTask();
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

// Placeholder for notes toggle (feature removed)
const toggleNotes = () => {
  console.log('Notes feature has been removed');
};

// Process display text on mount if the task is new
onMounted(() => {
  if (props.task.isNew) {
    nextTick(() => {
      startEditingTask();
    });
  }
});
</script>

<style scoped>
.task-card {
  background-color: white;
  border-radius: 5px;
  padding: 3px 10px;
  margin-bottom: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: flex-start;
  cursor: grab;
}

.task-card:active {
  cursor: grabbing;
}

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

/* Task container and title */
.task-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  position: relative;
  align-items: flex-start;
  overflow: hidden;
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

/* Due date styles */
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

/* Task card hover effects */
.task-card:hover {
  height: auto;
  z-index: 10;
}

.task-card:hover .task-title {
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
  max-width: calc(100% - 110px);
  margin-top: 3px;
}

.task-card:hover .task-buttons-container {
  align-self: flex-start;
  margin-top: 0;
}

.task-card:hover .task-container {
  align-items: flex-start;
}

/* Due date card styles */
.task-card:has(.task-title.due-past) {
  background-color: #ffebee;
  box-shadow: 0 2px 5px rgba(255, 0, 0, 0.2);
}

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

/* Task buttons container */
.task-buttons-container {
  display: flex;
  align-items: center;
  z-index: 20;
  width: 100px;
  justify-content: flex-end;
  margin-left: auto;
}

/* Task icon buttons */
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

.clock-btn {
  font-size: 14px;
}

.clock-btn.has-due-date {
  opacity: 1;
}

.task-card:hover .edit-btn,
.task-card:hover .delete-btn {
  opacity: 1;
}

.task-icon-btn:hover {
  transform: scale(1.1);
}

/* Task editing styles */
.task-edit-container {
  display: flex;
  align-items: flex-start;
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
  resize: vertical;
  min-height: 30px;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Confirm/Cancel buttons */
.confirm-task-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #4caf50;
  font-size: 20px;
  margin-left: 5px;
  margin-top: 2px;
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

.cancel-task-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #e53935;
  font-size: 20px;
  margin-left: 5px;
  margin-top: 2px;
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

.confirm-icon, .cancel-icon {
  font-weight: bold;
}

/* Delete button styles */
.delete-icon {
  fill: #e57373;
  transition: fill 0.2s;
}

.delete-btn:hover .delete-icon {
  fill: #e53935;
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

/* Animation */
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