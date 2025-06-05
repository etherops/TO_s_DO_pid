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
          :key="file.name"
          :class="['file-tab', 'server-tab', { active: selectedFile.name === file.name }, { 'custom-file': file.isCustom }]"
          @click="$emit('file-selected', file)"
          :title="file.name + (file.isCustom ? ' (Custom)' : '')"
      >
        {{ formatTabName(file.name) }}
        <span v-if="file.isCustom" class="custom-badge">Custom</span>
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
defineProps({
  availableFiles: {
    type: Array,
    default: () => []
  },
  selectedFile: {
    type: Object,
    default: () => ({ name: '', isCustom: false })
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

// Format tab name by removing .todo.md extension and replacing underscores with spaces
const formatTabName = (filename) => {
  let displayName = filename.replace(/\.todo\.md$/i, '');
  displayName = displayName.replace(/_/g, ' ');
  return displayName;
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
  color: #4caf50;
}

.file-tab.active {
  background-color: #f5f5f5;
  color: #4caf50;
  border-top-width: 1.5px;
  border-bottom: none;
  border-right-width: 1.5px;
  font-weight: 600;
  position: relative;
}

/* Server tab styles */
.server-tab {
  border-left: 3px solid #4caf50;
}

.server-tab.active {
  border-left-width: 6px;
}

.server-tab::after {
  content: '•';
  font-size: 14px;
  color: #4caf50;
  margin-left: 8px;
  opacity: 0.7;
}

/* Custom file styles (from custom directory) */
.server-tab.custom-file {
  border-left: 3px solid #9c27b0;
}

.server-tab.custom-file.active {
  border-left-width: 6px;
}

.server-tab.custom-file::after {
  content: '•';
  font-size: 14px;
  color: #9c27b0;
  margin-left: 8px;
  opacity: 0.7;
}

.custom-badge {
  font-size: 10px;
  background-color: #9c27b0;
  color: white;
  padding: 2px 5px;
  border-radius: 10px;
  margin-left: 5px;
  font-weight: normal;
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