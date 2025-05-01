<template>
  <div class="kanban-container">
    <!-- TODO Column -->
    <div class="kanban-column todo-column">
      <div class="column-header">TODO</div>
      <div class="column-content">
        <div v-for="(group, category) in groupedTodos" :key="category" class="task-group">
          <div class="task-group-title">{{ category }}</div>
          <div v-for="item in group" :key="item.id" class="task-card">
            <span class="status todo">[ ]</span>
            <span class="task-title">{{ item.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- WIP Column -->
    <div class="kanban-column wip-column">
      <div class="column-header">WIP</div>
      <div class="column-content">
        <div v-for="(group, category) in groupedInProgress" :key="category" class="task-group">
          <div class="task-group-title">{{ category }}</div>
          <div v-for="item in group" :key="item.id" class="task-card">
            <span class="status in-progress">[~]</span>
            <span class="task-title">{{ item.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- DONE Column -->
    <div class="kanban-column done-column">
      <div class="column-header">DONE</div>
      <div class="column-content">
        <div v-for="(group, category) in groupedDone" :key="category" class="task-group">
          <div class="task-group-title">{{ category }}</div>
          <div v-for="item in group" :key="item.id" class="task-card">
            <span class="status done">[x]</span>
            <span class="task-title">{{ item.text }}</span>
          </div>
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
import { computed } from 'vue';

export default {
  name: 'KanbanBoard',
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
    }
  },
  setup(props) {
    // Group todo items by category
    const groupedTodos = computed(() => {
      return groupItemsByCategory(props.todoItems);
    });

    // Group in-progress items by category
    const groupedInProgress = computed(() => {
      return groupItemsByCategory(props.inProgressItems);
    });

    // Group done items by category
    const groupedDone = computed(() => {
      return groupItemsByCategory(props.doneItems);
    });

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

    return {
      groupedTodos,
      groupedInProgress,
      groupedDone
    };
  }
}
</script>
