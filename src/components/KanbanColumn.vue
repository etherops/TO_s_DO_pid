<!-- components/KanbanColumn.vue -->
<template>
  <div :class="['kanban-column', `${columnType.toLowerCase()}-column`, { 'raw-text-column': isRawTextColumn }]">
    <!-- Raw-text column content (text only) -->
    <div v-if="isRawTextColumn" class="raw-text-column-content">
      <div class="raw-text-column-text">{{ columnData.displayText || columnData.text }}</div>
    </div>
    
    <!-- Regular column content -->
    <template v-else>
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
            :item-key="getSectionKey"
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
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
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
  },
  columnData: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits([
  'add-section',
  'task-updated',
  'section-updated',
  'show-date-picker'
]);

// Computed properties
const isRawTextColumn = computed(() => props.columnData?.type === 'raw-text');

// Generate unique key for sections (including raw-text sections)
const getSectionKey = (section) => {
  if (section.type === 'raw-text') {
    // For raw-text sections, use a combination of type and the text content
    return `raw-text-${section.id || section.text?.substring(0, 20) || 'empty'}`;
  }
  // For regular sections, use name
  return section.name || 'unnamed';
};
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

/* Raw-text column styles */
.raw-text-column {
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.raw-text-column-content {
  padding: 12px;
  width: 100%;
}

.raw-text-column-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #2d3748;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: center;
  background-color: #ffffff;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}
</style>