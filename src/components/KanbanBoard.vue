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

    <!-- Context Menu for Move To -->
    <ContextMenu
        v-if="contextMenu.show"
        :show="contextMenu.show"
        :position="contextMenu.position"
        :todo-data="props.todoData"
        :current-column="contextMenu.currentColumn"
        :current-section="contextMenu.currentSection"
        :selected-count="selectedCount"
        @close="closeContextMenu"
        @move-to-section="handleMoveToSection"
    />

    <!-- TODO Columns -->
    <div v-if="hasTodoColumns" class="column-stack todo-stack" :class="{ 'drawer-collapsed': !isTodoDrawerExpanded }">
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
            :is-task-selected="isTaskSelected"
            :selected-task-ids="selectedTaskIds"
            :is-drawer-expanded="isTodoDrawerExpanded"
            @add-section="createNewSection('TODO', columnName)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
            @task-click="handleTaskClick"
            @task-context-menu="handleTaskContextMenu"
            @toggle-drawer="toggleTodoDrawer"
            @multi-drag-complete="handleMultiDragComplete"
        />
      </template>
    </div>

    <!-- PROJECTS Columns -->
    <div v-if="hasProjectsColumns" class="column-stack projects-stack" :class="{ 'drawer-collapsed': !isProjectsDrawerExpanded }">
      <template v-for="columnName in props.todoData.columnOrder" :key="`projects-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columnStacks[columnName]?.name === 'PROJECTS'"
            column-type="PROJECTS"
            :title="columnName"
            :sections="props.todoData.columnStacks[columnName].sections"
            :can-add-section="true"
            :column="columnName"
            :column-data="getColumnDataWithIce(columnName)"
            :show-raw-text="props.showRawText"
            :is-task-selected="isTaskSelected"
            :selected-task-ids="selectedTaskIds"
            :is-drawer-expanded="isProjectsDrawerExpanded"
            @add-section="createNewSection('PROJECTS', columnName)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
            @task-click="handleTaskClick"
            @task-context-menu="handleTaskContextMenu"
            @toggle-drawer="toggleProjectsDrawer"
            @multi-drag-complete="handleMultiDragComplete"
        />
      </template>
    </div>

    <!-- SELECTED Columns -->
    <div v-if="hasSelectedColumns" class="column-stack selected-stack">
      <template v-for="columnName in props.todoData.columnOrder" :key="`selected-${columnName}`">
        <KanbanColumn
            v-if="props.todoData.columnStacks[columnName]?.name === 'SELECTED'"
            column-type="SELECTED"
            :title="columnName"
            :sections="props.todoData.columnStacks[columnName].sections"
            :can-add-section="true"
            :column="columnName"
            :column-data="getColumnDataWithIce(columnName)"
            :show-raw-text="props.showRawText"
            :is-task-selected="isTaskSelected"
            :selected-task-ids="selectedTaskIds"
            @add-section="createNewSection('SELECTED', columnName)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
            @task-click="handleTaskClick"
            @task-context-menu="handleTaskContextMenu"
            @multi-drag-complete="handleMultiDragComplete"
        />
      </template>
    </div>

    <!-- WIP Columns -->
    <div v-if="hasWipColumns" class="column-stack wip-stack" :class="{ 'drawer-collapsed': !isWipDrawerExpanded }">
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
            :is-task-selected="isTaskSelected"
            :selected-task-ids="selectedTaskIds"
            :is-drawer-expanded="isWipDrawerExpanded"
            @add-section="createNewSection('WIP', columnName)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
            @task-click="handleTaskClick"
            @task-context-menu="handleTaskContextMenu"
            @toggle-drawer="toggleWipDrawer"
            @multi-drag-complete="handleMultiDragComplete"
        />
      </template>
    </div>

    <!-- DONE Columns -->
    <div v-if="hasDoneColumns" class="column-stack done-stack" :class="{ 'drawer-collapsed': !isDoneDrawerExpanded }">
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
            :is-task-selected="isTaskSelected"
            :selected-task-ids="selectedTaskIds"
            :is-drawer-expanded="isDoneDrawerExpanded"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @show-date-picker="showDatePicker"
            @update="emit('update')"
            @task-click="handleTaskClick"
            @task-context-menu="handleTaskContextMenu"
            @toggle-drawer="toggleDoneDrawer"
            @multi-drag-complete="handleMultiDragComplete"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import DatePicker from './DatePicker.vue';
import ArchiveConfirmationModal from './ArchiveConfirmationModal.vue';
import ContextMenu from './ContextMenu.vue';
import { generateLeftoversSectionName } from '../utils/sectionHelpers.js';
import { useTaskSelection } from '../composables/useTaskSelection.js';
import { useTodoData } from '../composables/useTodoData.js';
import { sortTaskToCorrectPosition } from '../utils/sortHelpers.js';

const props = defineProps({
  todoData: {
    type: Object,
    default: () => ({ columnOrder: [], columnStacks: {} })
  },
  showRawText: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'normal',
    validator: (value) => ['normal', 'triage', 'focus'].includes(value)
  }
});

const emit = defineEmits(['update', 'set-view-mode', 'clear-view-mode']);

// Date picker state
const datePickerTaskId = ref(null);
const datePickerPosition = ref({ top: 0, left: 0 });
const datePickerInitialDate = ref(null);

// Archive confirmation state
const archiveConfirmation = ref(null);

// Task selection composable
const {
  selectedTaskIds,
  selectedCount,
  isTaskSelected,
  clearSelection,
  handleTaskClick: handleTaskSelection
} = useTaskSelection();

// Data persistence
const { persistTodoData } = useTodoData();

// Context menu state
const contextMenu = ref({
  show: false,
  position: { x: 0, y: 0 },
  currentColumn: '',
  currentSection: ''
});

// Flag to preserve drawer states when exiting view mode via column toggle
const preserveDrawersOnExit = ref(false);

// Drawer state for TODO column - load from localStorage
const isTodoDrawerExpanded = ref(
  localStorage.getItem('todoDrawerExpanded') !== 'false'
);

const toggleTodoDrawer = () => {
  // If in a view mode, exit it (but preserve other drawer states)
  if (props.viewMode !== 'normal') {
    preserveDrawersOnExit.value = true;
    emit('clear-view-mode');
  }
  isTodoDrawerExpanded.value = !isTodoDrawerExpanded.value;
};

// Save TODO drawer state to localStorage when it changes
watch(isTodoDrawerExpanded, (newValue) => {
  localStorage.setItem('todoDrawerExpanded', String(newValue));
});

// Drawer state for PROJECTS column - load from localStorage
const isProjectsDrawerExpanded = ref(
  localStorage.getItem('projectsDrawerExpanded') !== 'false'
);

const toggleProjectsDrawer = () => {
  if (props.viewMode !== 'normal') {
    preserveDrawersOnExit.value = true;
    emit('clear-view-mode');
  }
  isProjectsDrawerExpanded.value = !isProjectsDrawerExpanded.value;
};

// Save PROJECTS drawer state to localStorage when it changes
watch(isProjectsDrawerExpanded, (newValue) => {
  localStorage.setItem('projectsDrawerExpanded', String(newValue));
});

// Drawer state for DONE column - load from localStorage
const isDoneDrawerExpanded = ref(
  localStorage.getItem('doneDrawerExpanded') !== 'false'
);

const toggleDoneDrawer = () => {
  if (props.viewMode !== 'normal') {
    preserveDrawersOnExit.value = true;
    emit('clear-view-mode');
  }
  isDoneDrawerExpanded.value = !isDoneDrawerExpanded.value;
};

// Save DONE drawer state to localStorage when it changes
watch(isDoneDrawerExpanded, (newValue) => {
  localStorage.setItem('doneDrawerExpanded', String(newValue));
});

// Drawer state for WIP column - load from localStorage
const isWipDrawerExpanded = ref(
  localStorage.getItem('wipDrawerExpanded') !== 'false'
);

const toggleWipDrawer = () => {
  if (props.viewMode !== 'normal') {
    preserveDrawersOnExit.value = true;
    emit('clear-view-mode');
  }
  isWipDrawerExpanded.value = !isWipDrawerExpanded.value;
};

// Save WIP drawer state to localStorage when it changes
watch(isWipDrawerExpanded, (newValue) => {
  localStorage.setItem('wipDrawerExpanded', String(newValue));
});

// Watch view mode changes and update drawer states accordingly
watch(() => props.viewMode, (newViewMode) => {
  if (newViewMode === 'focus') {
    // Focus mode: collapse TODO, PROJECTS, DONE; expand SELECTED, WIP
    isTodoDrawerExpanded.value = false;
    isProjectsDrawerExpanded.value = false;
    isDoneDrawerExpanded.value = false;
    isWipDrawerExpanded.value = true;
  } else if (newViewMode === 'triage') {
    // Triage mode: expand TODO, PROJECTS, SELECTED; collapse WIP, DONE
    isTodoDrawerExpanded.value = true;
    isProjectsDrawerExpanded.value = true;
    isDoneDrawerExpanded.value = false;
    isWipDrawerExpanded.value = false;
  } else if (newViewMode === 'normal') {
    // Normal mode: expand all drawers UNLESS exiting via manual column toggle
    if (preserveDrawersOnExit.value) {
      preserveDrawersOnExit.value = false;
      return; // Keep current drawer states
    }
    isTodoDrawerExpanded.value = true;
    isProjectsDrawerExpanded.value = true;
    isDoneDrawerExpanded.value = true;
    isWipDrawerExpanded.value = true;
  }
});

// Check if each column stack type has any columns
const hasTodoColumns = computed(() => {
  return props.todoData.columnOrder?.some(columnName =>
    props.todoData.columnStacks[columnName]?.name === 'TODO'
  ) ?? false;
});

const hasProjectsColumns = computed(() => {
  return props.todoData.columnOrder?.some(columnName =>
    props.todoData.columnStacks[columnName]?.name === 'PROJECTS'
  ) ?? false;
});

const hasSelectedColumns = computed(() => {
  return props.todoData.columnOrder?.some(columnName =>
    props.todoData.columnStacks[columnName]?.name === 'SELECTED'
  ) ?? false;
});

const hasWipColumns = computed(() => {
  return props.todoData.columnOrder?.some(columnName =>
    props.todoData.columnStacks[columnName]?.name === 'WIP'
  ) ?? false;
});

const hasDoneColumns = computed(() => {
  return props.todoData.columnOrder?.some(columnName =>
    props.todoData.columnStacks[columnName]?.name === 'DONE'
  ) ?? false;
});

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
    headerStyle: (columnStack === 'WIP' || columnStack === 'SELECTED') ? 'SMALL' : 'LARGE',
    archivable: (columnStack === 'WIP' || columnStack === 'SELECTED'),
    on_ice: false,
    items: [],
    isNew: true
  };

  // Add to nested structure
  if (!props.todoData.columnStacks[column]) {
    const nameMap = { TODO: 'TODO', PROJECTS: 'PROJECTS', SELECTED: 'SELECTED', WIP: 'WIP', DONE: 'DONE' };
    props.todoData.columnStacks[column] = {
      name: nameMap[columnStack] || 'TODO',
      sections: []
    };
    props.todoData.columnOrder.push(column);
  }

  // Insert at beginning for TODO/PROJECTS columnStacks, end for SELECTED/WIP columnStacks
  if (columnStack === 'TODO' || columnStack === 'PROJECTS') {
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

// Handle task click for selection
const handleTaskClick = (event) => {
  // If only one task is selected and it's clicked without modifiers, deselect it
  if (selectedCount.value === 1 && isTaskSelected(event.taskId) && 
      !event.event.ctrlKey && !event.event.metaKey && !event.event.shiftKey) {
    clearSelection();
  } else {
    handleTaskSelection(event.taskId, event.event);
  }
};

// Handle task context menu
const handleTaskContextMenu = (event) => {
  const { taskId, event: mouseEvent } = event;
  
  // If clicked task is not selected, select only this task
  if (!isTaskSelected(taskId)) {
    clearSelection();
    handleTaskSelection(taskId, { ctrlKey: false, metaKey: false, shiftKey: false }, []);
  }
  
  // Find the task's current section and column
  let currentColumn = '';
  let currentSection = '';
  
  for (const columnName of props.todoData.columnOrder) {
    const columnStack = props.todoData.columnStacks[columnName];
    if (!columnStack?.sections) continue;
    
    for (const section of columnStack.sections) {
      if (!section.items) continue;
      
      if (section.items.some(item => item.id === taskId)) {
        currentColumn = columnName;
        currentSection = section.name;
        break;
      }
    }
    if (currentColumn) break;
  }
  
  // Show context menu
  contextMenu.value = {
    show: true,
    position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
    currentColumn,
    currentSection
  };
};

// Close context menu
const closeContextMenu = () => {
  contextMenu.value.show = false;
};

// Move multiple tasks to a target section
const moveTasksToSection = async (taskIds, targetSection) => {
  try {
    const tasksToMove = [];
    
    // First, collect all tasks and remove them from their current locations
    for (const columnName of props.todoData.columnOrder) {
      const columnStack = props.todoData.columnStacks[columnName];
      if (!columnStack?.sections) continue;
      
      for (const section of columnStack.sections) {
        if (!section.items) continue;
        
        // Find and collect tasks to move
        const tasksInSection = section.items.filter(item => 
          taskIds.includes(item.id)
        );
        
        if (tasksInSection.length > 0) {
          tasksToMove.push(...tasksInSection);
          // Remove tasks from current section
          section.items = section.items.filter(item => 
            !taskIds.includes(item.id)
          );
        }
      }
    }
    
    // Find target section and add tasks
    const targetColumnStack = props.todoData.columnStacks[targetSection.columnName];
    if (targetColumnStack?.sections) {
      const targetSectionObj = targetColumnStack.sections[targetSection.sectionIndex];
      if (targetSectionObj) {
        // Ensure items array exists
        if (!targetSectionObj.items) {
          targetSectionObj.items = [];
        }
        
        // Add all tasks to target section
        targetSectionObj.items.push(...tasksToMove);
        
        // Auto-sort each moved task to its correct position based on status
        tasksToMove.forEach(task => {
          sortTaskToCorrectPosition(targetSectionObj.items, task, emit);
        });
        
        // Persist changes
        await persistTodoData();
        
        return true;
      }
    }
    
    console.error('Target section not found:', targetSection);
    return false;
  } catch (error) {
    console.error('Error moving tasks:', error);
    return false;
  }
};

// Handle move to section from context menu
const handleMoveToSection = async (targetSection) => {
  if (selectedCount.value === 0) return;
  
  // Use local moveTasksToSection function
  const success = await moveTasksToSection(
    Array.from(selectedTaskIds.value),
    targetSection
  );
  
  if (success) {
    clearSelection();
    emit('update');
  }
};

// Handle multi-drag completion - move remaining selected tasks to where the dragged task landed
const handleMultiDragComplete = async ({ draggedTaskId }) => {
  if (selectedCount.value <= 1) return;

  // Find the section containing the dragged task (vuedraggable already moved it)
  let targetSection = null;
  for (const columnName of props.todoData.columnOrder) {
    const columnStack = props.todoData.columnStacks[columnName];
    if (!columnStack?.sections) continue;
    for (const section of columnStack.sections) {
      if (section.items?.some(item => item.id === draggedTaskId)) {
        targetSection = section;
        break;
      }
    }
    if (targetSection) break;
  }
  if (!targetSection) return;

  // Collect other selected tasks (not the already-moved dragged task)
  const otherTaskIds = Array.from(selectedTaskIds.value).filter(id => id !== draggedTaskId);
  const tasksToMove = [];

  for (const columnName of props.todoData.columnOrder) {
    const columnStack = props.todoData.columnStacks[columnName];
    if (!columnStack?.sections) continue;
    for (const section of columnStack.sections) {
      if (!section.items) continue;
      const found = section.items.filter(item => otherTaskIds.includes(item.id));
      if (found.length) {
        tasksToMove.push(...found);
        section.items = section.items.filter(item => !otherTaskIds.includes(item.id));
      }
    }
  }

  if (tasksToMove.length === 0) return;

  // Insert after the dragged task
  const draggedIndex = targetSection.items.findIndex(item => item.id === draggedTaskId);
  targetSection.items.splice(draggedIndex + 1, 0, ...tasksToMove);

  clearSelection();
  await persistTodoData();
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
        // Use the provided index if available and valid
        if (payload.sectionIndex !== undefined && payload.sectionIndex !== -1) {
          // Validate that the section at this index has the expected name
          if (payload.sectionIndex < columnData.sections.length && 
              columnData.sections[payload.sectionIndex].name === payload.sectionName) {
            // Remove the section using the exact index
            columnData.sections.splice(payload.sectionIndex, 1);
            break;
          }
        } else {
          // Fallback to name-based search if index not provided
          const sectionIndex = columnData.sections.findIndex(s => s.name === payload.sectionName);
          if (sectionIndex !== -1) {
            // Remove the section from its column
            columnData.sections.splice(sectionIndex, 1);
            break;
          }
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

/* TODO drawer styles */
.todo-stack {
  transition: min-width 0.3s ease-in-out, max-width 0.3s ease-in-out;
}

.todo-stack.drawer-collapsed {
  min-width: 125px;
  max-width: 125px;
  overflow: hidden;
}

.todo-stack.drawer-collapsed :deep(.column-header-buttons) {
  display: none;
}

/* PROJECTS drawer styles */
.projects-stack {
  transition: min-width 0.3s ease-in-out, max-width 0.3s ease-in-out;
}

.projects-stack.drawer-collapsed {
  min-width: 125px;
  max-width: 125px;
  overflow: hidden;
}

.projects-stack.drawer-collapsed :deep(.column-header-buttons) {
  display: none;
}

/* WIP drawer styles */
.wip-stack {
  transition: min-width 0.3s ease-in-out, max-width 0.3s ease-in-out;
}

.wip-stack.drawer-collapsed {
  min-width: 125px;
  max-width: 125px;
  overflow: hidden;
}

.wip-stack.drawer-collapsed :deep(.column-header-buttons) {
  display: none;
}

/* DONE drawer styles */
.done-stack {
  transition: min-width 0.3s ease-in-out, max-width 0.3s ease-in-out;
}

.done-stack.drawer-collapsed {
  min-width: 50px;
  max-width: 50px;
  overflow: hidden;
}
</style>