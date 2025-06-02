<!-- components/KanbanBoard.vue -->
<template>
  <div class="kanban-container">
    <!-- Date Picker (Global for all columns) -->
    <DatePicker
        v-if="datePickerTaskId !== null"
        :task-id="datePickerTaskId"
        :position="datePickerPosition"
        :initial-date="datePickerInitialDate"
        @confirm="handleDateConfirm"
        @clear="handleDateClear"
        @close="closeDatePicker"
    />

    <!-- TODO Column -->
    <KanbanColumn
        column-type="TODO"
        title="TODO"
        :sections="todoSections"
        :can-add-section="true"
        @add-section="createNewSection('TODO')"
        @task-updated="handleTaskUpdate"
        @section-updated="handleSectionUpdate"
        @show-date-picker="showDatePicker"
    />

    <!-- WIP Column -->
    <KanbanColumn
        column-type="WIP"
        title="WIP"
        :sections="wipSections"
        :can-add-section="true"
        @add-section="createNewSection('WIP')"
        @task-updated="handleTaskUpdate"
        @section-updated="handleSectionUpdate"
        @show-date-picker="showDatePicker"
    />

    <!-- DONE Column -->
    <KanbanColumn
        column-type="DONE"
        title="DONE"
        :sections="doneSections"
        :can-add-section="false"
        @task-updated="handleTaskUpdate"
        @section-updated="handleSectionUpdate"
        @show-date-picker="showDatePicker"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import DatePicker from './DatePicker.vue';
import { extractDateFromText } from '../utils/dateHelpers';

const props = defineProps({
  sections: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update']);

// Date picker state
const datePickerTaskId = ref(null);
const datePickerPosition = ref({ top: 0, left: 0 });
const datePickerInitialDate = ref(null);

// Computed properties to filter sections by column
const todoSections = computed(() => {
  return props.sections.filter(section => section.column === 'TODO' && !section.hidden);
});

const wipSections = computed(() => {
  return props.sections.filter(section => section.column === 'WIP' && !section.hidden);
});

const doneSections = computed(() => {
  return props.sections.filter(section => section.column === 'DONE' && !section.hidden);
});

// Create a new section in the specified column
const createNewSection = (column) => {
  let sectionNumber = 1;
  let sectionName = `New Section ${sectionNumber}`;

  while (props.sections.some(s => s.name === sectionName)) {
    sectionNumber++;
    sectionName = `New Section ${sectionNumber}`;
  }

  const newSection = {
    name: sectionName,
    column: column,
    headerStyle: column === 'WIP' ? 'SMALL' : 'LARGE',
    archivable: column === 'WIP',
    hidden: false,
    on_ice: false,
    items: [],
    isNew: true
  };

  // Insert the section at the appropriate position
  const getLastWipArchivableSectionIndex = () => {
    for (let i = props.sections.length - 1; i >= 0; i--) {
      const section = props.sections[i];
      if (section.column === 'WIP' && section.archivable && !section.hidden) {
        return i;
      }
    }
    return props.sections.findIndex(section => section.name === 'WIP');
  };

  let insertIndex;
  if (column === 'TODO') {
    insertIndex = 0;
  } else if (column === 'WIP') {
    const lastWipIndex = getLastWipArchivableSectionIndex();
    insertIndex = lastWipIndex !== -1 ? lastWipIndex + 1 : props.sections.length;
  } else {
    insertIndex = props.sections.length;
  }

  props.sections.splice(insertIndex, 0, newSection);
  emit('update');
};

// Handle task updates from columns
const handleTaskUpdate = () => {
  emit('update');
};

// Handle section updates from columns
const handleSectionUpdate = (payload) => {
  if (payload && payload.action === 'delete') {
    // Find and delete the section
    const sectionIndex = props.sections.findIndex(s => s.name === payload.sectionName);
    if (sectionIndex !== -1) {
      props.sections.splice(sectionIndex, 1);
    }
  } else if (payload && payload.action === 'archive') {
    // Handle section archiving
    const sectionIndex = props.sections.findIndex(s => s.name === payload.sectionName);
    if (sectionIndex !== -1) {
      const section = props.sections[sectionIndex];
      // Change the column to DONE
      section.column = 'DONE';
      // Update fileColumn to ensure it's saved under ARCHIVE column in the file
      section.fileColumn = 'ARCHIVE';
    }
  }

  // Always emit update to trigger save
  emit('update');
};

// Show date picker for a task
const showDatePicker = ({ taskId, position, currentDate }) => {
  datePickerTaskId.value = taskId;
  datePickerPosition.value = position;
  datePickerInitialDate.value = currentDate;
};

// Close date picker
const closeDatePicker = () => {
  datePickerTaskId.value = null;
  datePickerInitialDate.value = null;
};

// Handle date confirmation from date picker
const handleDateConfirm = ({ taskId, date }) => {
  // Find the task across all sections
  let task = null;
  for (const section of props.sections) {
    const found = section.items.find(item => item.id === taskId);
    if (found) {
      task = found;
      break;
    }
  }

  if (!task) {
    closeDatePicker();
    return;
  }

  // Format the date
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}`;

  // Update the task text
  if (task.text.includes('!!(')) {
    task.text = task.text.replace(/!!\(.+?\)/, `!!(${formattedDate})`);
  } else {
    task.text = task.text.trim() + ` !!(${formattedDate})`;
  }

  // Update display text
  task.displayText = task.text.replace(/!!\s*\([^)]*\)/g, '').trim();

  emit('update');
  closeDatePicker();
};

// Handle date clear from date picker
const handleDateClear = ({ taskId }) => {
  // Find the task across all sections
  let task = null;
  for (const section of props.sections) {
    const found = section.items.find(item => item.id === taskId);
    if (found) {
      task = found;
      break;
    }
  }

  if (!task) {
    closeDatePicker();
    return;
  }

  // Remove the due date
  if (task.text.includes('!!(')) {
    task.text = task.text.replace(/\s*!!\(.+?\)/, '');
    task.displayText = task.text;
  }

  emit('update');
  closeDatePicker();
};
</script>

<style scoped>
.kanban-container {
  display: flex;
  height: calc(100vh - 40px);
  gap: 10px;
  padding: 10px;
  overflow-x: auto;
  position: relative;
}
</style>