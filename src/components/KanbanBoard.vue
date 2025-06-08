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

    <!-- Archive Confirmation Modal -->
    <ArchiveConfirmationModal
        v-if="archiveConfirmation"
        :section-name="archiveConfirmation.sectionName"
        :section-items="archiveConfirmation.sectionItems"
        :new-section-name="archiveConfirmation.newSectionName"
        :available-columns="archiveConfirmation.availableColumns"
        @close="cancelArchiveConfirmation"
        @confirm="confirmArchive"
    />

    <!-- TODO Columns -->
    <div class="column-stack">
      <template v-for="columnName in props.todoData.columnOrder" :key="`todo-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columnStacks[columnName]?.name === 'TODO'"
            column-type="TODO"
            :title="columnName"
            :sections="props.todoData.columnStacks[columnName].sections"
            :can-add-section="true"
            :column="columnName"
            :column-data="getColumnDataWithIce(columnName)"
            :show-raw-text="props.showRawText"
            @add-section="createNewSection('TODO', columnName)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
        />
      </template>
    </div>

    <!-- WIP Columns -->
    <div class="column-stack">
      <template v-for="columnName in props.todoData.columnOrder" :key="`wip-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columnStacks[columnName]?.name === 'WIP'"
            column-type="WIP"
            :title="columnName"
            :sections="props.todoData.columnStacks[columnName].sections"
            :can-add-section="true"
            :column="columnName"
            :column-data="getColumnDataWithIce(columnName)"
            :show-raw-text="props.showRawText"
            @add-section="createNewSection('WIP', columnName)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
        />
      </template>
    </div>

    <!-- DONE Columns -->
    <div class="column-stack">
      <template v-for="columnName in props.todoData.columnOrder" :key="`done-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columnStacks[columnName]?.name === 'DONE'"
            column-type="DONE"
            :title="columnName"
            :sections="props.todoData.columnStacks[columnName].sections"
            :can-add-section="false"
            :column="columnName"
            :column-data="getColumnDataWithIce(columnName)"
            :show-raw-text="props.showRawText"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import DatePicker from './DatePicker.vue';
import ArchiveConfirmationModal from './ArchiveConfirmationModal.vue';
import { generateLeftoversSectionName } from '../utils/sectionHelpers.js';

const props = defineProps({
  todoData: {
    type: Object,
    default: () => ({ columnOrder: [], columnStacks: {} })
  },
  showRawText: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update']);

// Date picker state
const datePickerTaskId = ref(null);
const datePickerPosition = ref({ top: 0, left: 0 });
const datePickerInitialDate = ref(null);

// Archive confirmation state
const archiveConfirmation = ref(null);

// Helper function to add ice logic to column data
const getColumnDataWithIce = (columnName) => {
  const baseColumnData = props.todoData.columnStacks[columnName] || {};
  const isIceColumn = columnName.toUpperCase().includes('ICE');
  
  return {
    ...baseColumnData,
    on_ice: isIceColumn
  };
};



// Create a new section in the specified columnStack
const createNewSection = (columnStack, column = null) => {
  let sectionNumber = 1;
  let sectionName = `New Section ${sectionNumber}`;

  // Check for existing sections in nested structure
  const allExistingSections = [];
  props.todoData.columnOrder.forEach(columnName => {
    const columnData = props.todoData.columnStacks[columnName];
    if (columnData && columnData.sections) {
      allExistingSections.push(...columnData.sections);
    }
  });

  while (allExistingSections.some(s => s.name === sectionName)) {
    sectionNumber++;
    sectionName = `New Section ${sectionNumber}`;
  }

  // If no column specified, use the first one for this columnStack type
  if (!column) {
    // Find the first columnStack that matches the desired visual columnStack type
    const matchingColumnStack = props.todoData.columnOrder.find(columnName => {
      const columnData = props.todoData.columnStacks[columnName];
      return columnData && columnData.name === columnStack;
    });
    column = matchingColumnStack || columnStack;
  }

  const newSection = {
    name: sectionName,
    headerStyle: columnStack === 'WIP' ? 'SMALL' : 'LARGE',
    archivable: columnStack === 'WIP',
    on_ice: false,
    items: [],
    isNew: true
  };

  // Add to nested structure
  if (!props.todoData.columnStacks[column]) {
    const nameValue = columnStack === 'TODO' ? 'TODO' : columnStack === 'WIP' ? 'WIP' : 'DONE';
    props.todoData.columnStacks[column] = {
      name: nameValue,
      sections: []
    };
    props.todoData.columnOrder.push(column);
  }

  // Insert at beginning for TODO columnStacks, end for WIP columnStacks
  if (columnStack === 'TODO') {
    props.todoData.columnStacks[column].sections.unshift(newSection);
  } else {
    props.todoData.columnStacks[column].sections.push(newSection);
  }

  emit('update');
};

// Handle task updates from columns
const handleTaskUpdate = () => {
  emit('update');
};

// Get all unique DONE-type file columns
const getDoneFileColumns = () => {
  // Use nested structure from todoData
  const doneColumns = [];
  props.todoData.columnOrder.forEach(columnName => {
    const columnData = props.todoData.columnStacks[columnName];
    if (columnData && columnData.name === 'DONE') {
      doneColumns.push(columnName);
    }
  });
  return doneColumns;
};

// Archive a section in the nested structure
const archiveSectionInNestedStructure = (section, sourceColumn, targetColumn) => {
  // Remove from source column
  const sourceColumnData = props.todoData.columnStacks[sourceColumn];
  if (sourceColumnData && sourceColumnData.sections) {
    const sectionIndex = sourceColumnData.sections.indexOf(section);
    if (sectionIndex !== -1) {
      sourceColumnData.sections.splice(sectionIndex, 1);
    }
  }
  
  // Update section properties
  section.archivable = false;
  section.headerStyle = 'SMALL';
  
  // Add to target column at the beginning (newest archives go to top)
  if (!props.todoData.columnStacks[targetColumn]) {
    props.todoData.columnStacks[targetColumn] = {
      name: 'DONE',
      sections: []
    };
    props.todoData.columnOrder.push(targetColumn);
  }
  
  props.todoData.columnStacks[targetColumn].sections.unshift(section);
};


// Handle section updates from columns
const handleSectionUpdate = (payload) => {
  if (payload && payload.action === 'delete') {
    // Find and delete the section from nested structure
    // Search through all columns to find the section
    for (const columnName of props.todoData.columnOrder) {
      const columnData = props.todoData.columnStacks[columnName];
      if (columnData && columnData.sections) {
        const sectionIndex = columnData.sections.findIndex(s => s.name === payload.sectionName);
        if (sectionIndex !== -1) {
          // Remove the section from its column
          columnData.sections.splice(sectionIndex, 1);
          break;
        }
      }
    }
  } else if (payload && payload.action === 'archive') {
    // Handle section archiving - show confirmation modal first
    // Find section in nested structure
    let sectionToArchive = null;
    let sourceColumn = null;
    
    // Search through all columns to find the section
    for (const columnName of props.todoData.columnOrder) {
      const columnData = props.todoData.columnStacks[columnName];
      if (columnData && columnData.sections) {
        const section = columnData.sections.find(s => s.name === payload.sectionName);
        if (section) {
          sectionToArchive = section;
          sourceColumn = columnName;
          break;
        }
      }
    }
    
    if (sectionToArchive) {
      // Generate the new leftovers section name
      const newSectionName = generateLeftoversSectionName(payload.sectionName);
      
      // Get available DONE columns
      const doneColumns = getDoneFileColumns();
      const availableColumns = doneColumns.length > 0 ? doneColumns : ['ARCHIVE'];
      
      // Show confirmation modal
      archiveConfirmation.value = {
        sectionName: payload.sectionName,
        sectionItems: sectionToArchive.items || [],
        newSectionName: newSectionName,
        section: sectionToArchive,
        sourceColumn: sourceColumn,
        availableColumns: availableColumns
      };
      return; // Don't update yet, wait for user confirmation
    }
  }

  // Always emit update to trigger save
  emit('update');
};

// Cancel archive confirmation
const cancelArchiveConfirmation = () => {
  archiveConfirmation.value = null;
};

// Confirm archive - execute the enhanced archive process
const confirmArchive = (selectedColumn) => {
  if (!archiveConfirmation.value) return;
  
  const { section, sourceColumn, newSectionName } = archiveConfirmation.value;
  
  // Filter incomplete tasks (not completed or cancelled)
  const incompleteTasks = section.items.filter(item => 
    item.type === 'task' && item.statusChar !== 'x' && item.statusChar !== '-'
  );
  
  // Create new week section if there are incomplete tasks
  if (incompleteTasks.length > 0) {
    // Create the new section in the same column position
    const newSection = {
      name: newSectionName,
      headerStyle: 'SMALL',
      archivable: true,
      on_ice: false,
      items: [...incompleteTasks] // Move incomplete tasks to new section
    };
    
    // Find the index of the current section being archived
    const sourceColumnData = props.todoData.columnStacks[sourceColumn];
    const sectionIndex = sourceColumnData.sections.indexOf(section);
    
    // Insert the new section at the same position
    sourceColumnData.sections.splice(sectionIndex, 0, newSection);
    
    // Remove incomplete tasks from the original section
    section.items = section.items.filter(item => 
      item.type !== 'task' || item.statusChar === 'x' || item.statusChar === '-'
    );
  }
  
  // Archive to the selected column
  archiveSectionInNestedStructure(section, sourceColumn, selectedColumn);
  emit('update');
  
  // Clear confirmation modal
  archiveConfirmation.value = null;
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
  // Find the task across all sections in nested structure
  let task = null;
  for (const columnName of props.todoData.columnOrder) {
    const columnData = props.todoData.columnStacks[columnName];
    if (columnData && columnData.sections) {
      for (const section of columnData.sections) {
        const found = section.items.find(item => item.id === taskId);
        if (found) {
          task = found;
          break;
        }
      }
      if (task) break;
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
  // Find the task across all sections in nested structure
  let task = null;
  for (const columnName of props.todoData.columnOrder) {
    const columnData = props.todoData.columnStacks[columnName];
    if (columnData && columnData.sections) {
      for (const section of columnData.sections) {
        const found = section.items.find(item => item.id === taskId);
        if (found) {
          task = found;
          break;
        }
      }
      if (task) break;
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