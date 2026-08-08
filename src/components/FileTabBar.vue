<!-- components/FileTabBar.vue -->
<template>
  <div class="file-tabs-container">
    <div class="file-tabs">
      <div class="logo-container">
        <img src="../assets/favicon.svg" alt="Logo" class="app-logo">
      </div>
      <div class="app-title">TO_s_DO_pid</div>
      <div
          v-for="file in availableFiles"
          :key="file.path || file.name"
          :class="['file-tab', { 'server-tab': file.isBuiltIn, 'custom-tab': !file.isBuiltIn, active: isFileActive(file) }]"
          @click="$emit('file-selected', file)"
          :title="getFileTooltip(file)"
      >
        {{ formatTabName(file) }}
      </div>
    </div>
    <div class="toolbar-controls">
      <div class="history-controls">
        <button
            class="history-btn"
            @click="$emit('undo')"
            :disabled="!canUndo"
            title="Undo"
            aria-label="Undo"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M12 5c-2.65 0-5.02 1.15-6.66 2.97L2 4.63V13h8.37L6.76 9.39A7.1 7.1 0 0 1 12 7c3.31 0 6 2.69 6 6 0 1.61-.63 3.12-1.76 4.24l1.41 1.41A7.94 7.94 0 0 0 20 13c0-4.42-3.58-8-8-8z"/>
          </svg>
        </button>
        <button
            class="history-btn"
            @click="$emit('redo')"
            :disabled="!canRedo"
            title="Redo"
            aria-label="Redo"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M12 5c2.65 0 5.02 1.15 6.66 2.97L22 4.63V13h-8.37l3.61-3.61A7.1 7.1 0 0 0 12 7c-3.31 0-6 2.69-6 6 0 1.61.63 3.12 1.76 4.24l-1.41 1.41A7.94 7.94 0 0 1 4 13c0-4.42 3.58-8 8-8z"/>
          </svg>
        </button>
      </div>
      <button
          class="history-btn"
          @click="$emit('show-history')"
          :disabled="!selectedFile?.path"
          title="Version history"
          aria-label="Version history"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M13 3a9 9 0 1 0 8.94 10h-2.02A7 7 0 1 1 13 5v3l4-4-4-4v3zm-1 5v5l4.25 2.52.75-1.23L13.5 12.25V8z"/>
        </svg>
      </button>
      <div class="view-mode-buttons">
        <button
            class="view-mode-btn"
            :class="{ active: viewMode === 'triage' }"
            @click="$emit('set-view-mode', 'triage')"
            title="Triage Mode: Expand TODO, PROJECTS, SELECTED; Collapse WIP, ARCHIVE"
        >
          Triage
        </button>
        <button
            class="view-mode-btn"
            :class="{ active: viewMode === 'focus' }"
            @click="$emit('set-view-mode', 'focus')"
            title="Focus Mode: Expand SELECTED, WIP; Collapse TODO, PROJECTS, ARCHIVE"
        >
          Focus
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  availableFiles: {
    type: Array,
    default: () => []
  },
  selectedFile: {
    type: Object,
    default: () => ({ name: '', path: '', isBuiltIn: true })
  },
  viewMode: {
    type: String,
    default: 'normal'
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  }
});

defineEmits(['file-selected', 'set-view-mode', 'show-history', 'undo', 'redo']);

// Format tab name based on file type
const formatTabName = (file) => {
  // For full path files, show directory/filename
  if (!file.isBuiltIn && file.path && file.source !== 'directory') {
    const parts = file.path.split('/');
    if (parts.length >= 2) {
      // Get parent directory and filename
      const parentDir = parts[parts.length - 2];
      const filename = parts[parts.length - 1].replace(/\.todo\.md$/i, '').replace(/\.md$/i, '');
      return `${parentDir}/${filename}`;
    }
  }
  
  // For directory files and built-in files, just show the name
  let displayName = file.name.replace(/\.todo\.md$/i, '');
  displayName = displayName.replace(/_/g, ' ');
  return displayName;
};

// Check if a file is the active one
const isFileActive = (file) => {
  if (!props.selectedFile || !file) return false;
  return (props.selectedFile.path && file.path === props.selectedFile.path) ||
         (!props.selectedFile.path && file.name === props.selectedFile.name);
};

// Get tooltip for file
const getFileTooltip = (file) => {
  if (!file.isBuiltIn && file.path) {
    return file.path;
  }
  return file.name;
};
</script>

<style scoped>
.file-tabs-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  margin-top: 5px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.logo-container {
  display: flex;
  align-items: center;
  margin-right: 2px;
}

.app-logo {
  height: 24px;
  width: 24px;
  margin-right: 5px;
}

.app-title {
  vertical-align: bottom;
  font-size: 22px;
  font-weight: bold;
  color: #71797E;
  margin-right: 15px;
  margin-bottom: 3px;
  white-space: nowrap;
  display: flex;
  align-items: end;
}

.file-tabs {
  display: flex;
  overflow-x: auto;
  padding: 0 6px;
  flex: 1 1 auto;
  min-width: 0; /* Allow flex item to shrink below content width */
}

.file-tab {
  padding: 7px 10px;
  margin: 0 2px;
  background-color: #e9e9e9;
  color: #555;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  flex-shrink: 0; /* Prevent tabs from shrinking */
}

.file-tab:hover {
  background-color: #f0f0f0;
}

.file-tab.active {
  background-color: #f5f5f5;
  border-top-width: 1.5px;
  border-bottom: none;
  border-right-width: 1.5px;
  font-weight: 600;
  position: relative;
}

/* Built-in server tab styles (grey theme) */
.server-tab {
  border-left: 3px solid #888;
}

.server-tab:hover {
  color: #666;
}

.server-tab.active {
  border-left-width: 6px;
  color: #666;
}

.server-tab::after {
  content: '•';
  font-size: 14px;
  color: #888;
  margin-left: 8px;
  opacity: 0.7;
}

/* Custom tab styles (green theme) */
.custom-tab {
  border-left: 3px solid #4caf50;
}

.custom-tab:hover {
  color: #4caf50;
}

.custom-tab.active {
  border-left-width: 6px;
  color: #4caf50;
}

.custom-tab::after {
  content: '•';
  font-size: 14px;
  color: #4caf50;
  margin-left: 8px;
  opacity: 0.7;
}


.toolbar-controls {
  display: flex;
  gap: 8px;
  padding: 0 25px 0 6px;
  flex-shrink: 0;
  align-items: center;
  box-sizing: border-box;
}

.history-controls {
  display: flex;
  gap: 2px;
  align-items: center;
}

.view-mode-buttons {
  display: flex;
  gap: 0;
  border: 1px solid #ccc;
  border-radius: 6px;
  overflow: hidden;
}

.view-mode-btn {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  background-color: #f5f5f5;
  border: none;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.view-mode-btn:first-child {
  border-right: 1px solid #ccc;
}

.view-mode-btn:hover {
  background-color: #e8e8e8;
}

.view-mode-btn.active {
  background-color: #4caf50;
  color: white;
}

.view-mode-btn.active:hover {
  background-color: #43a047;
}

.history-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  flex-shrink: 0;
}

.history-btn:hover:not(:disabled) {
  background-color: #e8e8e8;
  border-color: #ccc;
  color: #333;
}

.history-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
