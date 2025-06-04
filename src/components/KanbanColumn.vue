<!-- components/KanbanColumn.vue -->
<template>
  <div :class="['kanban-column', `${columnType.toLowerCase()}-column`]">
    <div class="column-header">
      {{ title }}
      <button v-if="canAddSection" class="add-section-btn" @click="$emit('add-section')">
        <span class="add-icon">+</span> Add Section
      </button>
    </div>
    <div class="column-content">
      <draggable
          :list="sections"
          :group="'sections'"
          item-key="name"
          class="section-list"
          ghost-class="ghost-section"
          @end="$emit('update')"
      >
        <template #item="{ element: section }">
          <KanbanSection
              :section="section"
              :column-type="columnType"
              @task-updated="$emit('task-updated')"
              @section-updated="$emit('section-updated', $event)"
              @show-date-picker="$emit('show-date-picker', $event)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup>
import draggable from 'vuedraggable';
import KanbanSection from './KanbanSection.vue';

const props = defineProps({
  columnType: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  sections: {
    type: Array,
    default: () => []
  },
  canAddSection: {
    type: Boolean,
    default: false
  },
  fileColumn: {
    type: String,
    default: null
  }
});

const emit = defineEmits([
  'add-section',
  'task-updated',
  'section-updated',
  'show-date-picker'
]);
</script>

<style scoped>
.kanban-column {
  width: 100%;
  background-color: #ebecf0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.column-header {
  padding: 6px;
  font-weight: bold;
  background-color: #ebecf0;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 30;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.todo-column .column-header {
  background-color: #e2e4f1;
}

.wip-column .column-header {
  background-color: #e4f1e2;
}

.done-column .column-header {
  background-color: #f1e2e4;
}

.column-content {
  padding: 5px;
}

.section-list {
  min-height: 100px;
}

/* Ghost class for dragging sections */
.ghost-section {
  opacity: 0.5;
  background: #c8e6c9;
  border: 2px dashed #4caf50;
  border-radius: 5px;
}

/* Add Section button styles */
.add-section-btn {
  background-color: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #2e7d32;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.add-section-btn:hover {
  background-color: #c8e6c9;
  border-color: #66bb6a;
  transform: scale(1.05);
}

.add-icon {
  font-size: 14px;
  margin-right: 5px;
  font-weight: bold;
}
</style>