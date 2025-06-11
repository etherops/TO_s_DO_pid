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
    <div class="raw-text-toggle-container">
      <label class="toggle-switch" :class="{ disabled: unparsedLineCount === 0 }">
        <input
            type="checkbox"
            class="raw-text-toggle"
            :disabled="unparsedLineCount === 0"
            :checked="showRawText"
            @change="$emit('toggle-raw-text')"
        />
        <span class="slider"></span>
        <span class="toggle-label">
          {{ showRawText ? 'Hide' : 'Show' }} raw text
          <span v-if="unparsedLineCount > 0">({{ unparsedLineCount }} lines)</span>
        </span>
      </label>
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
  unparsedLineCount: {
    type: Number,
    default: 0
  },
  showRawText: {
    type: Boolean,
    default: false
  }
});

defineEmits(['file-selected', 'toggle-raw-text']);

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
  padding: 0 20px;
  flex: 1;
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


.raw-text-toggle-container {
  padding: 0 20px;
}

.toggle-switch {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.toggle-switch.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.raw-text-toggle {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: #ccc;
  border-radius: 20px;
  transition: background-color 0.2s ease;
  margin-right: 8px;
}

.slider:before {
  content: "";
  position: absolute;
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.raw-text-toggle:checked + .slider {
  background-color: #4caf50;
}

.raw-text-toggle:checked + .slider:before {
  transform: translateX(20px);
}

.raw-text-toggle:disabled + .slider {
  background-color: #ddd;
}

.toggle-label {
  color: #555;
}
</style>