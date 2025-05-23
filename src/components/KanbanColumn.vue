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
      <div class="section-list">
        <KanbanSection
            v-for="section in sections"
            :key="section.name"
            :section="section"
            :column-type="columnType"
            @task-updated="$emit('task-updated')"
            @section-updated="$emit('section-updated', $event)"
            @show-date-picker="$emit('show-date-picker', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import KanbanSection from './KanbanSection.vue';

defineProps({
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
  }
});

defineEmits([
  'add-section',
  'task-updated',
  'section-updated',
  'show-date-picker'
]);
</script>

<style scoped>
.kanban-column {
  flex: 1;
  min-width: 300px;
  background-color: #ebecf0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
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
  flex: 1;
  overflow-y: auto;
  padding: 5px;
}

.section-list {
  min-height: 100px;
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