<!-- components/ContextMenu.vue -->
<template>
  <div 
    v-if="show"
    ref="menuRef"
    class="context-menu"
    :style="menuStyle"
    @click.stop
  >
    <div class="context-menu-header">
      Move {{ selectedCount }} task{{ selectedCount > 1 ? 's' : '' }} to...
    </div>
    
    <!-- Current column sections -->
    <div v-if="currentColumnSections.length > 0" class="menu-section">
      <div class="menu-section-header">{{ currentColumn }}</div>
      <div 
        v-for="section in currentColumnSections"
        :key="`current-${section.sectionName}-${section.sectionIndex}`"
        class="menu-item"
        :class="{ 'disabled': isCurrentSection(section) }"
        @click="!isCurrentSection(section) && handleSectionClick(section)"
      >
        {{ section.sectionName }}
        <span v-if="isCurrentSection(section)" class="current-indicator">(current)</span>
      </div>
    </div>
    
    <!-- Other columns -->
    <div 
      v-for="(columnData, columnName) in otherColumns" 
      :key="columnName" 
      :ref="el => menuItemRefs[columnName] = el"
      class="menu-item expandable"
      @mouseenter="expandedColumn = columnName"
      @mouseleave="expandedColumn = null"
    >
      {{ columnName }}
      <span class="expand-arrow">›</span>
      
      <!-- Submenu -->
      <div 
        v-if="expandedColumn === columnName"
        class="submenu"
        :style="submenuStyle(columnName)"
        @mouseenter="expandedColumn = columnName"
        @mouseleave="expandedColumn = null"
      >
        <div 
          v-for="section in columnData.sections"
          :key="`${columnName}-${section.sectionName}-${section.sectionIndex}`"
          class="menu-item"
          @click="handleSectionClick(section)"
        >
          {{ section.sectionName }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { extractAllSections, groupSectionsByColumn } from '../utils/sectionHelpers';

const props = defineProps({
  show: Boolean,
  position: Object,
  todoData: Object,
  currentColumn: String,
  currentSection: String,
  selectedCount: { type: Number, default: 1 }
});

const emit = defineEmits(['close', 'move-to-section']);

const menuRef = ref(null);
const expandedColumn = ref(null);
const menuItemRefs = ref({});

// Simple position calculation
const menuStyle = computed(() => {
  const padding = 10;
  const maxWidth = window.innerWidth - padding;
  const maxHeight = window.innerHeight - padding;
  
  return {
    left: `${Math.min(props.position.x, maxWidth - 220)}px`,
    top: `${Math.min(props.position.y, maxHeight - 300)}px`
  };
});

// Submenu positioning calculation
const submenuStyle = (columnName) => {
  if (!menuRef.value || expandedColumn.value !== columnName || !menuItemRefs.value[columnName]) return {};
  
  const menuRect = menuRef.value.getBoundingClientRect();
  const menuItemRect = menuItemRefs.value[columnName].getBoundingClientRect();
  const submenuWidth = 180;
  const padding = 10;
  
  // Calculate position relative to viewport
  const leftPosition = menuRect.right - 1; // Small overlap to prevent gap
  const rightPosition = leftPosition + submenuWidth;
  
  // Check if submenu would overflow right edge
  const showOnLeft = rightPosition > window.innerWidth - padding;
  
  return {
    position: 'fixed',
    left: showOnLeft ? `${menuRect.left - submenuWidth + 1}px` : `${leftPosition}px`,
    top: `${menuItemRect.top}px`, // Align with the specific menu item, not the main menu
    zIndex: 10001
  };
};

// Extract and group sections
const allSections = computed(() => extractAllSections(props.todoData));
const groupedSections = computed(() => groupSectionsByColumn(allSections.value));

const currentColumnSections = computed(() => 
  allSections.value.filter(s => s.columnName === props.currentColumn)
);

const otherColumns = computed(() => {
  const others = {};
  Object.entries(groupedSections.value).forEach(([columnName, data]) => {
    if (columnName !== props.currentColumn) {
      others[columnName] = data;
    }
  });
  return others;
});

const isCurrentSection = (section) => 
  section.columnName === props.currentColumn && section.sectionName === props.currentSection;

const handleSectionClick = (section) => {
  emit('move-to-section', section);
  emit('close');
};

// Simple click outside handling
const handleClickOutside = (e) => {
  if (props.show && menuRef.value && !menuRef.value.contains(e.target)) {
    emit('close');
  }
};

const handleEscape = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => {
  // Small delay to avoid catching the click that opened the menu
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  }, 10);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('contextmenu', handleClickOutside);
  document.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 10000;
  font-size: 14px;
  
  /* CSS custom scrollbar that doesn't interfere */
  scrollbar-width: thin;
  scrollbar-color: #888 transparent;
}

.context-menu-header {
  padding: 10px 16px;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #333;
  background-color: #f5f5f5;
  border-radius: 8px 8px 0 0;
}

.menu-section {
  border-bottom: 1px solid #f0f0f0;
}

.menu-section:last-child {
  border-bottom: none;
}

.menu-section-header {
  padding: 8px 16px;
  font-weight: 600;
  color: #666;
  background-color: #fafafa;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-item {
  padding: 8px 16px 8px 24px;
  cursor: pointer;
  transition: background-color 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.menu-item:hover:not(.disabled) {
  background-color: #e3f2fd;
}

.menu-item.disabled {
  cursor: not-allowed;
  color: #999;
}

.menu-item.expandable {
  padding-left: 16px;
}

.expand-arrow {
  color: #999;
  transition: transform 0.2s;
}

.menu-item.expandable:hover .expand-arrow {
  transform: translateX(2px);
}

.current-indicator {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.submenu {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  max-height: 300px;
  overflow-y: auto;
}

/* Invisible bridge to prevent hover loss between menu and submenu */
.submenu::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  left: -10px;
  z-index: 9999;
}


/* Minimal custom scrollbar that fades away quickly */
.context-menu {
  /* Make scrollbar auto-hide and fade quickly */
  scrollbar-gutter: stable;
}

.context-menu::-webkit-scrollbar {
  width: 6px;
}

.context-menu::-webkit-scrollbar-track {
  background: transparent;
  margin: 8px 0;
}

.context-menu::-webkit-scrollbar-thumb {
  background-color: rgba(136, 136, 136, 0.3); /* Start more transparent */
  border-radius: 3px;
  border: 1px solid white;
  transition: background-color 0.1s ease-out; /* Quick fade */
}

.context-menu:hover::-webkit-scrollbar-thumb {
  background-color: rgba(136, 136, 136, 0.6); /* Show on container hover */
  transition: background-color 0.1s ease-in; /* Quick appear */
}

.context-menu::-webkit-scrollbar-thumb:hover {
  background-color: rgba(136, 136, 136, 0.8); /* Full opacity on direct hover */
}

/* Ensure the scrollbar doesn't create interaction dead zones */
.context-menu::-webkit-scrollbar-corner {
  background: transparent;
}

/* Auto-hide scrollbar when not needed (Firefox) */
.context-menu {
  scrollbar-color: rgba(136, 136, 136, 0.3) transparent;
  transition: scrollbar-color 0.1s ease-out;
}

.context-menu:hover {
  scrollbar-color: rgba(136, 136, 136, 0.6) transparent;
  transition: scrollbar-color 0.1s ease-in;
}
</style>