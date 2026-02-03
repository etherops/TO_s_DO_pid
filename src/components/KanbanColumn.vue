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
          <button v-if="columnType === 'DONE' && isDrawerExpanded !== null" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="isDrawerExpanded ? 'Hide Done' : 'Show Done'">
            <span>{{ isDrawerExpanded ? '→' : '←' }}</span>
          </button>
          <button v-if="columnType === 'TODO' && isDrawerExpanded === false" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="'Show Todo'">
            <span>→</span>
          </button>
          <button v-if="columnType === 'PROJECTS' && isDrawerExpanded === false" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="'Show Projects'">
            <span>→</span>
          </button>
          <button v-if="columnType === 'WIP' && isDrawerExpanded === false" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="'Show WIP'">
            <span>→</span>
          </button>
          {{ title }}
          <div v-if="taskCounts.total > 0" class="column-counts">
            <span class="count-badge total-count">{{ taskCounts.total }}</span>
            <span v-if="taskCounts.todo > 0" class="count-badge todo-count">{{ taskCounts.todo }}</span>
            <span v-if="taskCounts.inProgress > 0" class="count-badge in-progress-count">{{ taskCounts.inProgress }}</span>
            <span v-if="taskCounts.completed > 0" class="count-badge completed-count">{{ taskCounts.completed }}</span>
            <span v-if="taskCounts.cancelled > 0" class="count-badge cancelled-count">{{ taskCounts.cancelled }}</span>
          </div>
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
          <button v-if="columnType === 'DONE' && !columnData.on_ice" class="expand-all-btn" @click="expandAll" title="Show all cards (▼)">
            <span class="expand-icon">▼</span> Expand
          </button>
          <button v-if="columnType === 'DONE' && !columnData.on_ice" class="collapse-all-btn" @click="collapseAll" title="Hide completed cards (▶)">
            <span class="collapse-icon">▶</span> Collapse
          </button>
          <button v-if="columnType === 'DONE' && !columnData.on_ice" class="hide-all-btn" @click="hideAll" title="Hide all cards (⏹)">
            <span class="hide-icon">⏹</span> Hide
          </button>
          <button v-if="canAddSection && !columnData.on_ice" class="add-section-btn" @click="$emit('add-section')">
            <span class="add-icon">+</span> Section
          </button>
          <!-- Tri-state caret for column-wide section collapse control -->
          <button
            v-if="!columnData.on_ice && nonRawTextSections.length > 0"
            :class="['column-caret-btn', columnCaretClass]"
            @click="cycleColumnCollapseState"
            :title="columnCaretTitle"
          >
            <span class="caret-icon">▶</span>
          </button>
          <button v-if="columnType === 'TODO' && isDrawerExpanded === true" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="'Hide Todo'">
            <span>←</span>
          </button>
          <button v-if="columnType === 'PROJECTS' && isDrawerExpanded === true" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="'Hide Projects'">
            <span>←</span>
          </button>
          <button v-if="columnType === 'WIP' && isDrawerExpanded === true" class="drawer-toggle-btn" @click="emit('toggle-drawer')" :title="'Hide WIP'">
            <span>←</span>
          </button>
        </div>
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
                v-if="showRawText || section.type !== 'raw-text'"
                :section="section"
                :column-type="columnType"
                :column="title"
                :column-data="columnData"
                :show-raw-text="showRawText"
                :is-task-selected="isTaskSelected"
                :is-column-collapsed="isDrawerExpanded === false"
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
  isTaskSelected: {
    type: Function,
    default: null
  },
  isDrawerExpanded: {
    type: Boolean,
    default: null
  }
});

const emit = defineEmits([
  'add-section',
  'task-updated',
  'section-updated',
  'show-date-picker',
  'task-click',
  'task-context-menu',
  'toggle-drawer'
]);

// Template refs
const columnRef = ref(null);

// Computed properties
const isRawTextColumn = computed(() => props.columnData?.type === 'raw-text');

// Count tasks by status across all sections
const taskCounts = computed(() => {
  const counts = { todo: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 };

  for (const section of props.sections) {
    if (section.type === 'raw-text') continue;
    for (const item of (section.items || [])) {
      if (item.type !== 'task') continue;
      counts.total++;
      switch (item.statusChar) {
        case ' ': counts.todo++; break;
        case '~': counts.inProgress++; break;
        case 'x': counts.completed++; break;
        case '-': counts.cancelled++; break;
      }
    }
  }

  return counts;
});


// Generate unique key for sections (including raw-text sections)
const getSectionKey = (section) => {
  if (section.type === 'raw-text') {
    // For raw-text sections, use a combination of type and the text content
    return `raw-text-${section.id || section.text?.substring(0, 20) || 'empty'}`;
  }
  // For regular sections, use name
  return section.name || 'unnamed';
};

// Get non-raw-text sections for collapse state management
const nonRawTextSections = computed(() =>
  props.sections.filter(s => s.type !== 'raw-text')
);

// Read collapse state from localStorage for a section
const getSectionCollapseState = (section) => {
  const storageKey = `sectionCollapseState-${props.columnType}-${section.name}`;
  return localStorage.getItem(storageKey) || 'normal';
};

// Determine the unified collapse state of all sections in this column
const columnCollapseState = computed(() => {
  if (nonRawTextSections.value.length === 0) return 'normal';

  const states = nonRawTextSections.value.map(s => getSectionCollapseState(s));
  const uniqueStates = [...new Set(states)];

  // If all sections have the same state, return that state
  if (uniqueStates.length === 1) {
    const state = uniqueStates[0];
    // Only return normal, partial, or summary (ignore 'full' for tri-state)
    if (['normal', 'partial', 'summary'].includes(state)) {
      return state;
    }
    return 'normal';
  }

  // Mixed states
  return 'mixed';
});

// CSS class for the column caret based on state
const columnCaretClass = computed(() => {
  switch (columnCollapseState.value) {
    case 'partial': return 'state-focus';
    case 'summary': return 'state-collapse';
    case 'mixed': return 'state-mixed';
    default: return 'state-normal';
  }
});

// Title for the column caret
const columnCaretTitle = computed(() => {
  switch (columnCollapseState.value) {
    case 'partial': return 'All sections: Focus (click for Collapse)';
    case 'summary': return 'All sections: Collapse (click for Normal)';
    case 'mixed': return 'Mixed states (click to expand all)';
    default: return 'All sections: Normal (click for Focus)';
  }
});

// Cycle through column-wide collapse states
const cycleColumnCollapseState = () => {
  let nextState;

  if (columnCollapseState.value === 'mixed') {
    // From mixed, go to normal (expand all)
    nextState = 'normal';
  } else {
    // Cycle: normal → partial → summary → normal
    const cycle = { 'normal': 'partial', 'partial': 'summary', 'summary': 'normal' };
    nextState = cycle[columnCollapseState.value] || 'normal';
  }

  setAllSectionsCollapseState(nextState);
};

// Set collapse state on all sections via custom event
const setAllSectionsCollapseState = (targetState) => {
  if (!columnRef.value) return;

  // Dispatch custom event that sections will listen to
  const event = new CustomEvent('set-collapse-state', {
    detail: { state: targetState },
    bubbles: true
  });
  // Target the collapse-controls wrapper in each section
  columnRef.value.querySelectorAll('.collapse-controls').forEach(el => {
    el.dispatchEvent(event);
  });
};

// Collapse all sections in this column (set to partial state)
const collapseAll = () => setAllSectionsCollapseState('partial');

// Expand all sections in this column (set to normal state)
const expandAll = () => setAllSectionsCollapseState('normal');

// Hide all sections in this column (set to full state)
const hideAll = () => setAllSectionsCollapseState('full');
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

.projects-column .column-header {
  background-color: #f1e8e2;
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

.column-counts {
  display: flex;
  gap: 2px;
  align-items: center;
}

.count-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
}

.total-count {
  background-color: #333;
  color: #fff;
}

.todo-count {
  background-color: #e3e3e3;
  color: #666;
}

.in-progress-count {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

.completed-count {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.cancelled-count {
  background-color: #f5f5f5;
  color: #757575;
  border: 1px solid #bdbdbd;
}

.drawer-toggle-btn {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  line-height: 1;
  min-width: 24px;
}

.drawer-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: scale(1.1);
}

.drawer-toggle-btn span {
  user-select: none;
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

/* Add button styles */
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

/* Collapse/Expand/Hide All buttons */
.collapse-all-btn,
.expand-all-btn,
.hide-all-btn {
  background-color: rgba(220, 220, 220, 0.5);
  border: 1px solid #adb5bd;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 11px;
  color: #495057;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  white-space: nowrap;
}

.collapse-all-btn:hover,
.expand-all-btn:hover,
.hide-all-btn:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
  transform: scale(1.02);
}

.collapse-icon,
.expand-icon,
.hide-icon {
  font-size: 10px;
  margin-right: 3px;
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

/* Column-wide caret toggle button */
.column-caret-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  margin-left: 4px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  height: 24px;
  width: 24px;
}

.column-caret-btn:hover {
  background: rgba(33, 150, 243, 0.15);
}

.column-caret-btn .caret-icon {
  color: #1976d2;
  font-size: 10px;
  transition: transform 0.2s ease;
  display: inline-block;
}

/* Caret rotation states */
.column-caret-btn.state-normal .caret-icon {
  transform: rotate(90deg); /* ▼ pointing down */
}

.column-caret-btn.state-focus .caret-icon {
  transform: rotate(45deg); /* ◢ 45° diagonal */
}

.column-caret-btn.state-collapse .caret-icon {
  transform: rotate(0deg); /* ▶ pointing right */
}

/* Mixed state - blurred down arrow */
.column-caret-btn.state-mixed .caret-icon {
  transform: rotate(90deg); /* ▼ pointing down */
  opacity: 0.4;
}
</style>