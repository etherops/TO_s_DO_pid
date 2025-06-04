<!-- components/KanbanSection.vue -->
<template>
  <div
      :class="['section', {
      'archivable-section': section.archivable,
      'on-ice-section': section.on_ice
    }]"
  >
    <div
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
          <button class="add-task-btn" @click="createNewTask">
            <span class="add-icon">+</span> Add Task
          </button>
          <button class="edit-section-btn" @click="startEditingSection">
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
    <div class="section-items">
      <draggable
          v-model="section.items"
          :group="'tasks'"
          item-key="id"
          class="task-list"
          ghost-class="ghost-card"
          handle=".task-card"
          @end="onDragEnd"
      >
        <template #item="{ element: item }">
          <TaskCard
              :task="item"
              :section="section"
              @task-updated="$emit('task-updated')"
              @show-date-picker="$emit('show-date-picker', $event)"
          />
        </template>
      </draggable>
      <div v-if="section.items.length === 0" class="empty-section">
        No items
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import draggable from 'vuedraggable';
import TaskCard from './TaskCard.vue';

const props = defineProps({
  section: {
    type: Object,
    required: true
  },
  columnType: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['task-updated', 'section-updated', 'show-date-picker']);

// Section editing state
const isEditingSection = ref(false);
const editSectionName = ref('');
const sectionPendingDelete = ref(false);

// Template refs
const sectionNameInput = ref(null);

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
    // Emit delete event to parent
    emit('section-updated', { action: 'delete', sectionName: props.section.name });
  }
  sectionPendingDelete.value = false;
};

// Archive section
const archiveSection = () => {
  emit('section-updated', { action: 'archive', sectionName: props.section.name });
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

.task-list {
  min-height: 5px;
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


/* On Ice section styles */
.on-ice-section {
  background-color: rgba(173, 216, 230, 0.3);
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

/* Section header actions */
.section-header-actions {
  display: flex;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
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
</style>