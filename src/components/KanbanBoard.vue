<!-- components/KanbanBoard.vue -->
<template>
  <div class="kanban-shell">
  <div class="kanban-container outline-container">
    <!-- Archive Confirmation Modal -->
    <ArchiveConfirmationModal
        v-if="archiveConfirmation"
        :section-name="archiveConfirmation.sectionName"
        :section-items="archiveConfirmation.sectionItems"
        :fallback-date="archiveConfirmation.fallbackDate"
        :available-columns="archiveConfirmation.availableColumns"
        :initial-weeks="archiveConfirmation.initialWeeks"
        :archive-columns="todoData.columnStacks"
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

    <PlanningWorkspace :todo-data="todoData">
      <template #column="{ column, showArchiveWeeks, showArchive }">
        <KanbanColumn
            :column-type="column.name"
            :title="column.key"
            :sections="column.sections"
            :can-add-section="column.name !== 'DONE'"
            :column="column.key"
            :column-data="getColumnDataWithIce(column.key)"
            :is-task-selected="isTaskSelected"
            :selected-task-ids="selectedTaskIds"
            @add-section="createNewSection(column.name, column.key)"
            @task-updated="handleTaskUpdate"
            @section-updated="handleSectionUpdate"
            @update="emit('update')"
            @task-click="handleTaskClick"
            @task-context-menu="handleTaskContextMenu"
            @multi-drag-complete="handleMultiDragComplete"
        >
          <template #before-sections>
            <PlanningArchiveWeeks v-if="showArchiveWeeks" :todo-data="todoData"
                                  @archive-week="archiveWipWeek" @view-archive="showArchive" />
          </template>
        </KanbanColumn>
      </template>
    </PlanningWorkspace>
  </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import ArchiveConfirmationModal from './ArchiveConfirmationModal.vue';
import ContextMenu from './ContextMenu.vue';
import PlanningWorkspace from './PlanningWorkspace.vue';
import PlanningArchiveWeeks from './PlanningArchiveWeeks.vue';
import '../styles/planning-workspace.css';
import { archiveTaskGroups, groupTasksForArchive, wipArchiveSections } from '../utils/archiveHelpers.js';
import { useTaskSelection } from '../composables/useTaskSelection.js';
import { getBoardTaskSortPriority, sortTaskToCorrectPosition } from '../utils/sortHelpers.js';

const props = defineProps({
  todoData: {
    type: Object,
    default: () => ({ columnOrder: [], columnStacks: {} })
  }
});

const emit = defineEmits(['update']);

// Archive confirmation state
const archiveConfirmation = ref(null);
watch(() => props.todoData, () => { archiveConfirmation.value = null; });

// Task selection composable
const {
  selectedTaskIds,
  selectedCount,
  isTaskSelected,
  clearSelection,
  handleTaskClick: handleTaskSelection
} = useTaskSelection();

// Context menu state
const contextMenu = ref({
  show: false,
  position: { x: 0, y: 0 },
  currentColumn: '',
  currentSection: ''
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
          sortTaskToCorrectPosition(targetSectionObj.items, task, emit, { getPriority: getBoardTaskSortPriority });
        });
        
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
    
    // Search through all columns to find the section
    for (const columnName of props.todoData.columnOrder) {
      const columnData = props.todoData.columnStacks[columnName];
      if (columnData && columnData.sections) {
        const section = columnData.sections.find(s => s.name === payload.sectionName);
        if (section) {
          sectionToArchive = section;
          break;
        }
      }
    }
    
    if (sectionToArchive) {
      // Get available DONE columns
      const doneColumns = getDoneFileColumns();
      const availableColumns = doneColumns.length > 0 ? doneColumns : ['ARCHIVE'];
      
      // Show confirmation modal
      archiveConfirmation.value = {
        sectionName: payload.sectionName,
        sectionItems: sectionToArchive.items || [],
        fallbackDate: new Date(),
        section: sectionToArchive,
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
const archiveWipWeek = weekName => {
  if (archiveConfirmation.value) return;
  const sections = wipArchiveSections(props.todoData);
  const fallbackDate = new Date();
  const group = groupTasksForArchive(sections.flatMap(section => section.items || []), fallbackDate)
    .find(candidate => candidate.name === weekName);
  if (!group) return;
  const doneColumns = getDoneFileColumns();
  const availableColumns = doneColumns.length ? doneColumns : ['ARCHIVE'];
  archiveConfirmation.value = {
    sectionName: 'WIP', sectionItems: group.tasks, sections, fallbackDate,
    initialWeeks: [weekName], availableColumns
  };
};

const confirmArchive = (selectedColumn, selectedWeeks = []) => {
  if (!archiveConfirmation.value) return;
  const { section, sections, fallbackDate } = archiveConfirmation.value;
  archiveConfirmation.value = null;
  if (archiveTaskGroups(props.todoData, sections || [section], selectedColumn, selectedWeeks, fallbackDate)) {
    clearSelection();
    emit('update');
  }
};

</script>

<style scoped>
.kanban-shell { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.kanban-container { display: flex; flex: 1; min-height: 0; overflow: hidden; padding: 6px 20px 20px; }
.kanban-shell .kanban-container { padding-top: 6px; }
</style>
