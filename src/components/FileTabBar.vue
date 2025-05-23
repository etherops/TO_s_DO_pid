<!-- components/FileTabBar.vue -->
<template>
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
  }
});

defineEmits(['file-selected']);

// Format tab name by removing .txt extension and replacing underscores with spaces
const formatTabName = (filename) => {
  let displayName = filename.replace(/\.txt$/i, '');
  displayName = displayName.replace(/_/g, ' ');
  return displayName;
};
</script>

<style scoped>
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
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
  margin-top: 5px;
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
</style>