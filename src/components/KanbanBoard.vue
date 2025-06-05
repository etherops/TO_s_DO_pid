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
      <template v-for="columnName in props.todoData.fileColumnOrder" :key="`todo-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columns[columnName]?.visualColumn === 'TODO'"
            column-type="TODO"
            :title="columnName"
            :sections="props.todoData.columns[columnName].sections"
            :can-add-section="true"
            :file-column="columnName"
            :column-data="props.todoData.columns[columnName]"
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
      <template v-for="columnName in props.todoData.fileColumnOrder" :key="`wip-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columns[columnName]?.visualColumn === 'WIP'"
            column-type="WIP"
            :title="columnName"
            :sections="props.todoData.columns[columnName].sections"
            :can-add-section="true"
            :file-column="columnName"
            :column-data="props.todoData.columns[columnName]"
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
      <template v-for="columnName in props.todoData.fileColumnOrder" :key="`done-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columns[columnName]?.visualColumn === 'DONE'"
            column-type="DONE"
            :title="columnName"
            :sections="props.todoData.columns[columnName].sections"
            :can-add-section="false"
            :file-column="columnName"
            :column-data="props.todoData.columns[columnName]"
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
import ArchiveColumnPicker from './ArchiveColumnPicker.vue';

const props = defineProps({
  todoData: {
    type: Object,
    default: () => ({ fileColumnOrder: [], columns: {} })
  }
});

const emit = defineEmits(['update']);

// Date picker state
const datePickerTaskId = ref(null);
const datePickerPosition = ref({ top: 0, left: 0 });
const datePickerInitialDate = ref(null);

// Archive choice state
const archiveChoice = ref(null);



// Create a new section in the specified column
const createNewSection = (column, fileColumn = null) => {
  let sectionNumber = 1;
  let sectionName = `New Section ${sectionNumber}`;

  // Check for existing sections in nested structure
  const allExistingSections = [];
  props.todoData.fileColumnOrder.forEach(columnName => {
    const columnData = props.todoData.columns[columnName];
    if (columnData && columnData.sections) {
      allExistingSections.push(...columnData.sections);
    }
  });

  while (allExistingSections.some(s => s.name === sectionName)) {
    sectionNumber++;
    sectionName = `New Section ${sectionNumber}`;
  }

  // If no fileColumn specified, use the first one for this column type
  if (!fileColumn) {
    // Find the first column that matches the desired visual column type
    const matchingColumn = props.todoData.fileColumnOrder.find(columnName => {
      const columnData = props.todoData.columns[columnName];
      return columnData && columnData.visualColumn === column;
    });
    fileColumn = matchingColumn || column;
  }

  const newSection = {
    name: sectionName,
    headerStyle: column === 'WIP' ? 'SMALL' : 'LARGE',
    archivable: column === 'WIP',
    on_ice: false,
    items: [],
    isNew: true
  };

  // Add to nested structure
  if (!props.todoData.columns[fileColumn]) {
    const visualColumn = column === 'TODO' ? 'TODO' : column === 'WIP' ? 'WIP' : 'DONE';
    props.todoData.columns[fileColumn] = {
      visualColumn: visualColumn,
      sections: []
    };
    props.todoData.fileColumnOrder.push(fileColumn);
  }

  // Insert at beginning for TODO columns, end for WIP columns
  if (column === 'TODO') {
    props.todoData.columns[fileColumn].sections.unshift(newSection);
  } else {
    props.todoData.columns[fileColumn].sections.push(newSection);
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
  props.todoData.fileColumnOrder.forEach(columnName => {
    const columnData = props.todoData.columns[columnName];
    if (columnData && columnData.visualColumn === 'DONE') {
      doneColumns.push(columnName);
    }
  });
  return doneColumns;
};

// Archive a section in the nested structure
const archiveSectionInNestedStructure = (section, sourceFileColumn, targetColumn) => {
  // Remove from source column
  const sourceColumnData = props.todoData.columns[sourceFileColumn];
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
  if (!props.todoData.columns[targetColumn]) {
    props.todoData.columns[targetColumn] = {
      visualColumn: 'DONE',
      sections: []
    };
    props.todoData.fileColumnOrder.push(targetColumn);
  }
  
  props.todoData.columns[targetColumn].sections.unshift(section);
};


// Handle section updates from columns
const handleSectionUpdate = (payload) => {
  if (payload && payload.action === 'delete') {
    // Find and delete the section from nested structure
    // Search through all columns to find the section
    for (const columnName of props.todoData.fileColumnOrder) {
      const columnData = props.todoData.columns[columnName];
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
    // Handle section archiving
    // Find section in nested structure
    let sectionToArchive = null;
    let sourceFileColumn = null;
    
    // Search through all columns to find the section
    for (const columnName of props.todoData.fileColumnOrder) {
      const columnData = props.todoData.columns[columnName];
      if (columnData && columnData.sections) {
        const section = columnData.sections.find(s => s.name === payload.sectionName);
        if (section) {
          sectionToArchive = section;
          sourceFileColumn = columnName;
          break;
        }
      }
    }
    
    if (sectionToArchive) {
      // Get all DONE-type file columns
      const doneColumns = getDoneFileColumns();
      
      let targetColumn;
      if (doneColumns.length > 1) {
        // Multiple DONE columns, show picker
        archiveChoice.value = {
          sectionName: payload.sectionName,
          availableColumns: doneColumns,
          section: sectionToArchive,
          sourceFileColumn: sourceFileColumn
        };
        return; // Don't update yet, wait for user choice
      }

      // Determine target column based on existing DONE columns
      targetColumn = (doneColumns.length === 1) ? doneColumns[0] : 'ARCHIVE';
      archiveSectionInNestedStructure(sectionToArchive, sourceFileColumn, targetColumn);
    }
  }

  // Always emit update to trigger save
  emit('update');
};

// Handle archive column selection
const handleArchiveColumnSelect = (targetColumn) => {
  if (archiveChoice.value && archiveChoice.value.section && archiveChoice.value.sourceFileColumn) {
    archiveSectionInNestedStructure(
      archiveChoice.value.section, 
      archiveChoice.value.sourceFileColumn, 
      targetColumn
    );
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
  // Find the task across all sections in nested structure
  let task = null;
  for (const columnName of props.todoData.fileColumnOrder) {
    const columnData = props.todoData.columns[columnName];
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
  for (const columnName of props.todoData.fileColumnOrder) {
    const columnData = props.todoData.columns[columnName];
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