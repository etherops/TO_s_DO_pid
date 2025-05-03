<template>
  <div class="kanban-container">
    <!-- TODO Column -->
    <div class="kanban-column todo-column">
      <div class="column-header">TODO</div>
      <div class="column-content">
        <div v-for="(group, category) in groupedTodos" :key="category" class="task-group">
          <div class="task-group-title">{{ category }}</div>
          <draggable
            v-model="groupedTodos[category]"
            group="tasks"
            item-key="id"
            class="draggable-group"
            ghost-class="ghost-card"
            handle=".drag-handle"
            :data-category="encodeURIComponent(category)"
            data-status="todo"
            @start="drag = true"
            @end="handleDragEnd($event)"
          >
            <template #item="{element}">
              <div class="task-card draggable" :data-id="element.id">
                <i class="drag-handle fas fa-grip-lines"></i>
                <span class="task-title">{{ element.text }}</span>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <!-- WIP Column -->
    <div class="kanban-column wip-column">
      <div class="column-header">WIP</div>
      <div class="column-content">
        <div v-for="(group, category) in groupedInProgress" :key="category" class="task-group">
          <div class="task-group-title">{{ category }}</div>
          <draggable
            v-model="groupedInProgress[category]"
            group="tasks"
            item-key="id"
            class="draggable-group"
            ghost-class="ghost-card"
            handle=".drag-handle"
            :data-category="encodeURIComponent(category)"
            data-status="wip"
            @start="drag = true"
            @end="handleDragEnd($event)"
          >
            <template #item="{element}">
              <div class="task-card draggable" :data-id="element.id">
                <i class="drag-handle fas fa-grip-lines"></i>
                <span class="task-title">{{ element.text }}</span>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <!-- DONE Column -->
    <div class="kanban-column done-column">
      <div class="column-header">DONE</div>
      <div class="column-content">
        <div v-for="(group, category) in groupedDone" :key="category" class="task-group">
          <div class="task-group-title">{{ category }}</div>
          <draggable
            v-model="groupedDone[category]"
            group="tasks"
            item-key="id"
            class="draggable-group"
            ghost-class="ghost-card"
            handle=".drag-handle"
            :data-category="encodeURIComponent(category)"
            data-status="done"
            @start="drag = true"
            @end="handleDragEnd($event)"
          >
            <template #item="{element}">
              <div class="task-card draggable" :data-id="element.id">
                <i class="drag-handle fas fa-grip-lines"></i>
                <span class="task-title">{{ element.text }}</span>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <!-- Notes Column -->
    <div class="kanban-column notes-column">
      <div class="column-header">NOTES</div>
      <div class="column-content">
        <div class="notes-container">{{ notesContent }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, reactive, watch } from 'vue';
import draggable from 'vuedraggable';

export default {
  name: 'KanbanBoard',
  components: {
    draggable
  },
  props: {
    todoItems: {
      type: Array,
      required: true
    },
    inProgressItems: {
      type: Array,
      required: true
    },
    doneItems: {
      type: Array,
      required: true
    },
    notesContent: {
      type: String,
      default: ''
    },
    categories: {
      type: Array,
      default: () => []
    }
  },
  emits: ['move-item', 'add-item', 'reorder-items'],
  setup(props, { emit }) {
    const drag = ref(false);
    
    // Track items being moved
    const draggedItem = ref(null);
    const dragSourceColumn = ref(null);
    const dragSourceCategory = ref(null);
    
    // Create reactive wrappers for grouped data
    const groupedTodos = reactive({});
    const groupedInProgress = reactive({});
    const groupedDone = reactive({});

    // Watch the incoming props and update the reactive objects
    watch(() => props.todoItems, (newItems) => {
      const grouped = groupItemsByCategory(newItems);
      // Clear any existing categories first
      Object.keys(groupedTodos).forEach(key => {
        delete groupedTodos[key];
      });
      // Add new categories
      Object.keys(grouped).forEach(category => {
        groupedTodos[category] = grouped[category];
      });
    }, { immediate: true, deep: true });
    
    watch(() => props.inProgressItems, (newItems) => {
      const grouped = groupItemsByCategory(newItems);
      // Clear any existing categories first
      Object.keys(groupedInProgress).forEach(key => {
        delete groupedInProgress[key];
      });
      // Add new categories
      Object.keys(grouped).forEach(category => {
        groupedInProgress[category] = grouped[category];
      });
    }, { immediate: true, deep: true });
    
    watch(() => props.doneItems, (newItems) => {
      const grouped = groupItemsByCategory(newItems);
      // Clear any existing categories first
      Object.keys(groupedDone).forEach(key => {
        delete groupedDone[key];
      });
      // Add new categories
      Object.keys(grouped).forEach(category => {
        groupedDone[category] = grouped[category];
      });
    }, { immediate: true, deep: true });

    // Helper function to group items by category
    function groupItemsByCategory(items) {
      const grouped = {};
      
      items.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });
      
      return grouped;
    }

    // Get status character from column name
    function getStatusChar(column) {
      if (column === 'todo') return ' ';
      if (column === 'wip') return '~';
      if (column === 'done') return 'x';
      return ' ';
    }

    // Handle drag end to track destination and emit update
    const handleDragEnd = (evt) => {
      console.log('==== DRAG END EVENT ====');
      console.log('Event details:', {
        from: evt.from,
        to: evt.to,
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex
      });
      
      // Get source info from the 'from' element
      const sourceColumn = evt.from.getAttribute('data-status');
      const sourceCategory = decodeURIComponent(evt.from.getAttribute('data-category'));
      
      // Get target info from the 'to' element
      const targetColumn = evt.to.getAttribute('data-status');
      const targetCategory = decodeURIComponent(evt.to.getAttribute('data-category'));
      console.log('Source info:', { sourceColumn, sourceCategory });
      console.log('Target info:', { targetColumn, targetCategory });

      // Determine if this is a status change or category change
      const isStatusChange = sourceColumn !== targetColumn;
      const isCategoryChange = sourceCategory !== targetCategory;
      const isPositionChange = evt.oldIndex !== evt.newIndex;
      
      // Early return if nothing changed (same column, same category, same position)
      if (!isStatusChange && !isCategoryChange && !isPositionChange) {
        console.log('No changes detected - skipping update');
        drag.value = false;
        return;
      }
      
      console.log('Change type:', { isStatusChange, isCategoryChange, isPositionChange });
      
      // helper to get list of column/category grouping
      const getListForColumnAndCategory = (column, category) => {
        if (column === 'todo' && groupedTodos[category]) {
          return groupedTodos[category];
        } else if (column === 'wip' && groupedInProgress[category]) {
          return groupedInProgress[category];
        } else if (column === 'done' && groupedDone[category]) {
          return groupedDone[category];
        }
        return [];
      };
      
      // Get the moved item
      const movedItem = evt.item.__draggable_context.element;
      console.log('Successfully identified moved item:', movedItem);

      // Update the category if it changed
      if (isCategoryChange) {
        console.log('Category change detected:', {from: movedItem.category, to: targetCategory});
        movedItem.category = targetCategory;
        movedItem.section = targetCategory;
      }

      // Handle status changes
      if (isStatusChange) {
        const targetStatusChar = getStatusChar(targetColumn);
        console.log('Status change:', {from: movedItem.statusChar, to: targetStatusChar});

        // Include both old and new status for proper handling
        emit('move-item', {
          ...movedItem,
          originalStatusChar: movedItem.statusChar,
          targetStatusChar
        }, targetColumn);
      } else if (isCategoryChange) {
        // If only the category changed but not the status
        console.log('Category change only');
        emit('move-item', {
          ...movedItem,
          originalStatusChar: movedItem.statusChar,
          targetStatusChar: movedItem.statusChar
        }, targetColumn);
      } else {
        // For reordering within the same column/category
        console.log('Reordering within same column/category');
        const currentList = getListForColumnAndCategory(targetColumn, targetCategory);
        console.log('Current list after reordering:', currentList);

        emit('reorder-items', currentList, targetCategory, targetColumn);
      }
      
      drag.value = false;
    };

    return {
      groupedTodos,
      groupedInProgress,
      groupedDone,
      drag,
      handleDragEnd,
      draggedItem,
      dragSourceColumn,
      dragSourceCategory
    };
  }
}
</script>

<style scoped>
.draggable-group {
  min-height: 5px;
  padding: 4px;
}

.draggable {
  cursor: move;
  display: flex;
  align-items: center;
}

.drag-handle {
  color: #888;
  margin-right: 8px;
  cursor: grab;
}

.task-card {
  transition: background-color 0.2s;
  padding: 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.task-card:hover {
  background-color: #f7f7f7;
  box-shadow: 0 2px 5px rgba(0,0,0,0.15);
}

.ghost-card {
  opacity: 0.5;
  background-color: #c8ebfb;
  border: 1px dashed #2196F3;
}

.kanban-column {
  min-height: 300px;
  padding: 0 8px;
}

.task-group-title {
  font-weight: bold;
  margin: 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}
</style>
