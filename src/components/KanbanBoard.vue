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

    <!-- Archive Column Picker Modal -->
    <ArchiveColumnPicker
        v-if="archiveChoice"
        :section-name="archiveChoice.sectionName"
        :available-columns="archiveChoice.availableColumns"
        @select="handleArchiveColumnSelect"
        @cancel="cancelArchiveChoice"
    />

    <!-- TODO Columns -->
    <div class="column-stack">
      <KanbanColumn
          v-for="group in todoGroups"
          :key="`todo-${group.fileColumn}`"
          column-type="TODO"
          :title="group.fileColumn"
          :sections="group.sections"
          :can-add-section="true"
          @add-section="createNewSection('TODO')"
          @task-updated="handleTaskUpdate"
          @section-updated="handleSectionUpdate"
          @show-date-picker="showDatePicker"
      />
    </div>

    <!-- WIP Columns -->
    <div class="column-stack">
      <KanbanColumn
          v-for="group in wipGroups"
          :key="`wip-${group.fileColumn}`"
          column-type="WIP"
          :title="group.fileColumn"
          :sections="group.sections"
          :can-add-section="true"
          @add-section="createNewSection('WIP')"
          @task-updated="handleTaskUpdate"
          @section-updated="handleSectionUpdate"
          @show-date-picker="showDatePicker"
      />
    </div>

    <!-- DONE Columns -->
    <div class="column-stack">
      <KanbanColumn
          v-for="group in doneGroups"
          :key="`done-${group.fileColumn}`"
          column-type="DONE"
          :title="group.fileColumn"
          :sections="group.sections"
          :can-add-section="false"
          @task-updated="handleTaskUpdate"
          @section-updated="handleSectionUpdate"
          @show-date-picker="showDatePicker"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import DatePicker from './DatePicker.vue';
import ArchiveColumnPicker from './ArchiveColumnPicker.vue';

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

// Archive choice state
const archiveChoice = ref(null);

// Helper function to group sections by file column occurrences
const groupSectionsByFileColumn = (sections) => {
  const groups = [];
  let currentGroup = null;
  let lastSectionIndex = -1;
  
  // Process sections in order to maintain file structure
  sections.forEach(section => {
    const fileColumn = section.fileColumn || 'UNKNOWN';
    
    // Get the original index in props.sections to detect gaps
    const originalIndex = props.sections.indexOf(section);
    
    // Start a new group if:
    // 1. It's the first section
    // 2. The fileColumn changes
    // 3. There's a gap in the original sections (indicating a new occurrence of the same column)
    const hasGap = lastSectionIndex !== -1 && (originalIndex - lastSectionIndex > 1);
    
    if (!currentGroup || currentGroup.fileColumn !== fileColumn || hasGap) {
      currentGroup = {
        fileColumn,
        sections: []
      };
      groups.push(currentGroup);
    }
    
    currentGroup.sections.push(section);
    lastSectionIndex = originalIndex;
  });
  
  return groups;
};

// Computed properties to filter and group sections by column
const todoGroups = computed(() => {
  const sections = props.sections.filter(section => section.column === 'TODO' && !section.hidden);
  return groupSectionsByFileColumn(sections);
});

const wipGroups = computed(() => {
  const sections = props.sections.filter(section => section.column === 'WIP' && !section.hidden);
  return groupSectionsByFileColumn(sections);
});

const doneGroups = computed(() => {
  const sections = props.sections.filter(section => section.column === 'DONE' && !section.hidden);
  return groupSectionsByFileColumn(sections);
});

// Create a new section in the specified column
const createNewSection = (column, fileColumn = null) => {
  let sectionNumber = 1;
  let sectionName = `New Section ${sectionNumber}`;

  while (props.sections.some(s => s.name === sectionName)) {
    sectionNumber++;
    sectionName = `New Section ${sectionNumber}`;
  }

  // If no fileColumn specified, use the first one for this column type
  if (!fileColumn) {
    const groups = column === 'TODO' ? todoGroups.value : 
                   column === 'WIP' ? wipGroups.value : 
                   doneGroups.value;
    fileColumn = groups.length > 0 ? groups[0].fileColumn : column;
  }

  const newSection = {
    name: sectionName,
    column: column,
    fileColumn: fileColumn,
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

// Get all unique DONE-type file columns
const getDoneFileColumns = () => {
  const doneColumns = new Set();
  props.sections.forEach(section => {
    if (section.column === 'DONE' && section.fileColumn) {
      doneColumns.add(section.fileColumn);
    }
  });
  return Array.from(doneColumns);
};

// Archive a section to a specific column
const archiveSection = (sectionIndex, targetColumn) => {
  const section = props.sections[sectionIndex];
  if (!section) return;
  
  // Remove from current position first
  props.sections.splice(sectionIndex, 1);
  
  // Update section properties
  section.column = 'DONE';
  section.fileColumn = targetColumn;
  
  // Find where to insert - look for first section of target column
  const targetIndex = props.sections.findIndex(s => s.fileColumn === targetColumn);
  
  if (targetIndex !== -1) {
    // Insert before the first section of the target column
    props.sections.splice(targetIndex, 0, section);
  } else {
    // No existing sections for this column, append to end
    props.sections.push(section);
  }
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
      // Get all DONE-type file columns
      const doneColumns = getDoneFileColumns();
      
      let targetColumn;
      if (doneColumns.length > 1) {
        // Multiple DONE columns, show picker
        archiveChoice.value = {
          sectionName: payload.sectionName,
          availableColumns: doneColumns,
          sectionIndex: sectionIndex
        };
        return; // Don't update yet, wait for user choice
      }

      // Determine target column based on existing DONE columns
      targetColumn = (doneColumns.length === 0) ? doneColumns[0] : 'ARCHIVE';
      archiveSection(sectionIndex, targetColumn);
    }
  }

  // Always emit update to trigger save
  emit('update');
};

// Handle archive column selection
const handleArchiveColumnSelect = (targetColumn) => {
  if (archiveChoice.value && archiveChoice.value.sectionIndex !== undefined) {
    archiveSection(archiveChoice.value.sectionIndex, targetColumn);
    emit('update');
  }
  archiveChoice.value = null;
};

// Cancel archive choice
const cancelArchiveChoice = () => {
  archiveChoice.value = null;
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

.column-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 300px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}
</style>