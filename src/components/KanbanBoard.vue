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
            @end="handleDragEnd($event, 'todo', category)"
            @change="handleDragChange($event, 'todo', category)"
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
            @end="handleDragEnd($event, 'wip', category)"
            @change="handleDragChange($event, 'wip', category)"
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
            @end="handleDragEnd($event, 'done', category)"
            @change="handleDragChange($event, 'done', category)"
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

    // Handle changes during drag (added, removed, moved)
    const handleDragChange = (evt, column, category) => {
      console.log('==== DRAG CHANGE EVENT ====', evt);
      
      // Handle added elements (this happens when dragging to a new list)
      if (evt.added) {
        console.log('Item added to', column, category);
        const addedItem = evt.added.element;
        
        if (addedItem) {
          console.log('Added item:', addedItem);
          
          // If this is a different category than the item's current category
          if (addedItem.category !== category) {
            console.log('Category change detected!', { from: addedItem.category, to: category });
            
            // Update the category on the item
            addedItem.category = category;
            
            // Determine if we also had a status change
            const sourceStatus = dragSourceColumn.value;
            if (sourceStatus && sourceStatus !== column) {
              console.log('Status change detected!', { from: sourceStatus, to: column });
              
              // Get the target status character
              const targetStatusChar = getStatusChar(column);
              
              // Emit move event with both changes
              emit('move-item', {
                ...addedItem,
                originalStatusChar: addedItem.statusChar,
                targetStatusChar
              }, column);
            } else {
              // Only category changed, status remained the same
              emit('move-item', {
                ...addedItem,
                originalStatusChar: addedItem.statusChar,
                targetStatusChar: addedItem.statusChar
              }, column);
            }
          }
        }
      }
      
      // Handle removed elements (this happens when dragging from a list)
      if (evt.removed) {
        console.log('Item removed from', column, category);
        
        // Store info about what's being dragged
        draggedItem.value = evt.removed.element;
        dragSourceColumn.value = column;
        dragSourceCategory.value = category;
        
        console.log('Stored dragged item:', {
          item: draggedItem.value,
          sourceColumn: dragSourceColumn.value,
          sourceCategory: dragSourceCategory.value
        });
      }
    };
    
    // Handle drag end to track destination and emit update
    const handleDragEnd = (evt, targetColumn, targetCategory) => {
      console.log('==== DRAG END EVENT ====');
      console.log('Event details:', {
        targetColumn, 
        targetCategory,
        from: evt.from,
        to: evt.to,
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex
      });
      
      if (!evt.from || !evt.to || evt.oldIndex === undefined || evt.newIndex === undefined) {
        console.error('Missing essential drag event data:', evt);
        return;
      }
      
      // Get the source column and category
      const sourceColumn = evt.from.getAttribute('data-status');
      let sourceCategory = evt.from.getAttribute('data-category');
      
      // Get the target category from the to element
      let decodedTargetCategory = targetCategory;
      let targetCategoryFromElement = evt.to.getAttribute('data-category');
      
      // If the category is URL encoded (contains special chars), decode it
      try {
        if (sourceCategory && sourceCategory.includes('%')) {
          sourceCategory = decodeURIComponent(sourceCategory);
        }
        if (targetCategoryFromElement && targetCategoryFromElement.includes('%')) {
          decodedTargetCategory = decodeURIComponent(targetCategoryFromElement);
        }
      } catch (error) {
        console.error('Error decoding category:', error);
        // Keep the original values if decoding fails
      }
      
      // Use the category from the target element if available
      if (decodedTargetCategory !== targetCategory && decodedTargetCategory) {
        targetCategory = decodedTargetCategory;
      }
      
      console.log('Source info:', { sourceColumn, sourceCategory });
      console.log('Target info:', { targetColumn, targetCategory });
      
      // Determine if this is a status change or category change
      const isStatusChange = sourceColumn !== targetColumn;
      const isCategoryChange = sourceCategory !== targetCategory;
      
      console.log('Change type:', { isStatusChange, isCategoryChange });
      
      // Get the appropriate lists based on columns and categories
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
      let movedItem;
      
      // First, try to find the moved item by its ID in the DOM
      if (evt.item && evt.item.getAttribute) {
        const itemId = evt.item.getAttribute('data-id');
        if (itemId) {
          // Look in the source list first
          const sourceList = getListForColumnAndCategory(sourceColumn, sourceCategory);
          movedItem = sourceList.find(item => item.id === itemId);
        }
      }
      
      // If we couldn't find it that way, try the draggable_context
      if (!movedItem && evt.item && evt.item.__draggable_context && evt.item.__draggable_context.element) {
        movedItem = evt.item.__draggable_context.element;
        console.log('Found item via draggable_context:', movedItem);
      } 
      
      // If still not found, try to find in the target list by new index
      if (!movedItem) {
        const targetList = getListForColumnAndCategory(targetColumn, targetCategory);
        if (targetList && targetList.length > evt.newIndex) {
          movedItem = targetList[evt.newIndex];
          console.log('Found item in target list:', movedItem);
        }
      }
      
      if (movedItem) {
        console.log('Successfully identified moved item:', movedItem);
        
        // Update the category if it changed
        if (isCategoryChange) {
          console.log('Category change detected:', { 
            from: movedItem.category, 
            to: targetCategory 
          });
          movedItem.category = targetCategory;
        }
        
        // Handle status changes
        if (isStatusChange) {
          // For status changes, we need to update the status character
          const targetStatusChar = getStatusChar(targetColumn);
          console.log('Status change:', { 
            from: movedItem.statusChar, 
            to: targetStatusChar 
          });
          
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
      } else {
        console.error('Could not identify the moved item!', evt);
      }
      
      drag.value = false;
    };

    return {
      groupedTodos,
      groupedInProgress,
      groupedDone,
      drag,
      handleDragEnd,
      handleDragChange,
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
