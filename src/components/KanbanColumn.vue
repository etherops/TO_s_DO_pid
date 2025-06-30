<!-- components/KanbanColumn.vue -->
<template>
  <div v-if="showRawText || !isRawTextColumn" ref="columnRef" :class="['kanban-column', `${columnType.toLowerCase()}-column`, { 'raw-text-column': isRawTextColumn, 'ice-column': columnData.on_ice }]" :data-on-ice="columnData.on_ice">
    <!-- Raw-text column content (text only) -->
    <div v-if="isRawTextColumn" class="raw-text-column-content">
      <div class="raw-text-column-text">{{ columnData.displayText || columnData.text }}</div>
    </div>
    
    <!-- Regular column content -->
    <template v-else>
      <div class="column-header">
        <div class="column-title-container">
          {{ title }}
          <div v-if="columnData.on_ice" class="on-ice-badge">
            <svg class="ice-icon" viewBox="0 0 16 16" width="12" height="12">
              <g fill="currentColor">
                <path d="M8 2 L8 14 M3 5 L13 11 M13 5 L3 11 M8 4 L6 2 M8 4 L10 2 M8 12 L6 14 M8 12 L10 14 M5 7 L3 5 M5 7 L3 9 M11 9 L13 11 M11 9 L13 7" stroke="currentColor" stroke-width="0.8" fill="none"/>
              </g>
            </svg>
            ON ICE
          </div>
        </div>
        <div class="column-header-buttons">
          <button v-if="columnType === 'DONE' && !columnData.on_ice" class="collapse-all-btn" @click="collapseAll">
            <span class="collapse-icon">▼</span> Collapse All
          </button>
          <button v-if="columnType === 'DONE' && !columnData.on_ice" class="expand-all-btn" @click="expandAll">
            <span class="expand-icon">▶</span> Expand All
          </button>
          <button v-if="canAddSection && !columnData.on_ice" class="add-section-btn" @click="$emit('add-section')">
            <span class="add-icon">+</span> Add Section
          </button>
        </div>
      </div>
      <div class="column-content" :class="{ 'focus-mode-content': focusMode && columnType === 'WIP' }">
        <draggable
            :list="sections"
            :group="'sections'"
            :item-key="getSectionKey"
            class="section-list"
            :class="{ 'focus-mode-sections': focusMode && columnType === 'WIP' }"
            ghost-class="ghost-section"
            @end="$emit('update')"
        >
          <template #item="{ element: section }">
            <KanbanSection
                v-if="showRawText || section.type !== 'raw-text'"
                :section="section"
                :column-type="columnType"
                :column-data="columnData"
                :show-raw-text="showRawText"
                :is-task-selected="isTaskSelected"
                @task-updated="$emit('task-updated')"
                @section-updated="$emit('section-updated', $event)"
                @show-date-picker="$emit('show-date-picker', $event)"
                @task-click="$emit('task-click', $event)"
                @task-context-menu="$emit('task-context-menu', $event)"
            />
          </template>
        </draggable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
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
  column: {
    type: String,
    default: null
  },
  columnData: {
    type: Object,
    default: () => ({})
  },
  showRawText: {
    type: Boolean,
    default: false
  },
  focusMode: {
    type: Boolean,
    default: false
  },
  isTaskSelected: {
    type: Function,
    default: null
  }
});

const emit = defineEmits([
  'add-section',
  'task-updated',
  'section-updated',
  'show-date-picker',
  'task-click',
  'task-context-menu'
]);

// Template refs
const columnRef = ref(null);

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

// Collapse all sections in this column
const collapseAll = () => {
  // Find all sections in this column that are expanded and click their collapse button
  if (columnRef.value) {
    const collapseButtons = columnRef.value.querySelectorAll('.collapse-completed-btn');
    collapseButtons.forEach(button => {
      const icon = button.querySelector('.collapse-icon');
      // Only click if currently expanded (showing ▼)
      if (icon && icon.textContent === '▼') {
        button.click();
      }
    });
  }
};


// Expand all sections in this column
const expandAll = () => {
  // Find all sections in this column that are collapsed and click their collapse button
  if (columnRef.value) {
    const collapseButtons = columnRef.value.querySelectorAll('.collapse-completed-btn');
    collapseButtons.forEach(button => {
      const icon = button.querySelector('.collapse-icon');
      // Only click if currently collapsed (showing ▶)
      if (icon && icon.textContent === '▶') {
        button.click();
      }
    });
  }
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

/* Ice column styling - frozen blue theme */
.kanban-column.ice-column {
  background: 
    /* Large snowflakes */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M50 10 L50 90 M20 30 L80 70 M80 30 L20 70 M50 20 L40 10 M50 20 L60 10 M50 80 L40 90 M50 80 L60 90 M30 40 L20 30 M30 40 L20 50 M70 60 L80 70 M70 60 L80 50' stroke='%23ffffff' stroke-width='1' fill='none'/%3E%3C/g%3E%3C/svg%3E"),
    /* Medium snowflakes */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M50 30 L50 70 M35 40 L65 60 M65 40 L35 60 M50 35 L45 30 M50 35 L55 30 M50 65 L45 70 M50 65 L55 70' stroke='%23ffffff' stroke-width='0.5' fill='none'/%3E%3C/g%3E%3C/svg%3E"),
    /* Tiny snowflakes - spinning */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M30 21 L30 39 M21 25.5 L39 34.5 M39 25.5 L21 34.5 M30 23 L28 21 M30 23 L32 21 M30 37 L28 39 M30 37 L32 39' stroke='%23ffffff' stroke-width='0.5' fill='none'/%3E%3CanimateTransform attributeName='transform' type='rotate' values='0 30 30;360 30 30' dur='8s' repeatCount='indefinite'/%3E%3C/g%3E%3C/svg%3E"),
    linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  background-size: 100px 100px, 100px 100px, 60px 60px, 100% 100%;
  background-position: 0 0, 50px 50px, 15px 45px, 0 0;
  animation: snowfall 15s linear infinite;
  border: 1px solid #90caf9;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
}

@keyframes snowfall {
  0% {
    background-position: 0 0, 50px 50px, 15px 45px, 0 0;
  }
  100% {
    background-position: 0 75px, 50px 600px, 15px 360px, 0 0;
  }
}

.kanban-column.ice-column .column-header {
  background: transparent !important;
  color: #1565c0;
  border-bottom: 1px solid rgba(144, 202, 249, 0.5);
}

.ice-column .column-content {
  background: transparent;
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

.column-title-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.on-ice-badge {
  background: linear-gradient(45deg, #ffffff 0%, #e3f2fd 100%);
  color: #1976d2;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 12px;
  border: 1px solid #2196f3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(33, 150, 243, 0.3);
  display: flex;
  align-items: center;
  gap: 3px;
}

.ice-icon {
  animation: snowflake-spin 8s linear infinite;
}

@keyframes snowflake-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.column-content {
  padding: 5px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.section-list {
  min-height: 100px;
  flex: 1;
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

/* Collapse/Expand All buttons */
.collapse-all-btn,
.expand-all-btn {
  background-color: rgba(220, 220, 220, 0.5);
  border: 1px solid #adb5bd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #495057;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  white-space: nowrap;
}

.collapse-all-btn:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
  transform: scale(1.02);
}

.expand-all-btn:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
  transform: scale(1.02);
}

.collapse-icon,
.expand-icon {
  font-size: 10px;
  margin-right: 4px;
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

/* Focus mode content layout */
.focus-mode-content {
  width: 100%;
  height: 100%;
  flex: 1;
}

/* Use CSS columns for the section list in focus mode */
.focus-mode-sections {
  column-count: 2;
  column-gap: 20px;
  column-fill: auto;
  height: 80vh; /* 80% of viewport height */
  overflow: visible; /* Allow content to flow naturally */
}

/* Prevent task cards from breaking across columns */
.focus-mode-sections .task-card {
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
}

/* Hide any draggable placeholder elements in focus mode */
.focus-mode-sections .sortable-ghost,
.focus-mode-sections .sortable-drag {
  opacity: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

.continuation-header {
  font-weight: 600;
  font-size: 12px;
  color: #666;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  margin-bottom: 10px;
  text-align: center;
}
</style>