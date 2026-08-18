<!-- components/FileTabBar.vue -->
<template>
  <div class="file-tabs-container">
    <div class="file-selector-area">
      <div class="logo-container">
        <img src="../assets/favicon.svg" alt="Logo" class="app-logo">
      </div>
      <div class="app-title">TO_s_DO_pid</div>
      <div class="file-selector">
        <button class="file-selector-trigger" :class="fileSourceClass(selectedFile)" type="button" aria-haspopup="listbox"
                :aria-expanded="fileSelectorOpen" :title="getFileTooltip(selectedFile)"
                @click.stop="toggleFileSelector"
                @contextmenu.prevent="showFileContextMenu($event, selectedFile)">
          <span class="selected-file-name">{{ selectedFile?.name ? formatTabName(selectedFile) : 'Select TODO List' }}</span>
          <svg class="selector-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m7 10 5 5 5-5z"/>
          </svg>
        </button>
        <div v-if="fileSelectorOpen" class="file-selector-popover" role="listbox"
             aria-label="Todo file" @click.stop>
          <button v-for="file in availableFiles" :key="file.path || file.name" type="button"
                  class="file-selector-option"
                  :class="[fileSourceClass(file), { active: isFileActive(file) }]"
                  role="option" :aria-selected="isFileActive(file)" :title="getFileTooltip(file)"
                  @click="selectFile(file)"
                  @contextmenu.prevent.stop="showFileContextMenu($event, file)">
            <span class="file-option-name">{{ formatTabName(file) }}</span>
            <span v-if="file.taskCounts" class="file-option-counts">
              <span class="counts-parenthesis" aria-hidden="true">(</span>
              <span class="file-status-count" title="Not started">
                <span class="visually-hidden">Not started:</span>
                {{ file.taskCounts.open }}
                <span class="file-status-icon unchecked" aria-hidden="true"></span>
              </span>
              <template v-if="file.taskCounts.active">
                <span class="count-separator" aria-hidden="true">·</span>
                <span class="file-status-count" title="In progress">
                  <span class="visually-hidden">In progress:</span>
                  {{ file.taskCounts.active }}
                  <span class="file-status-icon in-progress" aria-hidden="true"></span>
                </span>
              </template>
              <template v-if="file.taskCounts.done">
                <span class="count-separator" aria-hidden="true">·</span>
                <span class="file-status-count" title="Done">
                  <span class="visually-hidden">Done:</span>
                  {{ file.taskCounts.done }}
                  <span class="file-status-icon checked" aria-hidden="true"></span>
                </span>
              </template>
              <template v-if="file.taskCounts.skipped">
                <span class="count-separator" aria-hidden="true">·</span>
                <span class="file-status-count" title="Will not do">
                  <span class="visually-hidden">Will not do:</span>
                  {{ file.taskCounts.skipped }}
                  <span class="file-status-icon cancelled" aria-hidden="true"></span>
                </span>
              </template>
              <span class="counts-parenthesis" aria-hidden="true">)</span>
            </span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="selectedFile?.taskCounts" class="selected-file-status-summary"
         aria-label="Selected list task status counts">
      <span class="header-status-count" title="Not started">
        <span class="file-status-icon unchecked" aria-hidden="true"></span>
        <span class="header-status-label">Not started</span>
        <span class="header-status-number">{{ selectedFile.taskCounts.open }}</span>
      </span>
      <span class="header-status-count" title="In progress">
        <span class="file-status-icon in-progress" aria-hidden="true"></span>
        <span class="header-status-label">In progress</span>
        <span class="header-status-number">{{ selectedFile.taskCounts.active }}</span>
      </span>
      <span class="header-status-count" title="Done">
        <span class="file-status-icon checked" aria-hidden="true"></span>
        <span class="header-status-label">Done</span>
        <span class="header-status-number">{{ selectedFile.taskCounts.done }}</span>
      </span>
      <span class="header-status-count" title="Will not do">
        <span class="file-status-icon cancelled" aria-hidden="true"></span>
        <span class="header-status-label">Will not do</span>
        <span class="header-status-number">{{ selectedFile.taskCounts.skipped }}</span>
      </span>
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
      <button
          class="history-btn theme-toggle-btn"
          @click="$emit('cycle-theme')"
          :title="`Theme: ${themePreference} — click to switch`"
          aria-label="Toggle theme"
      >
        {{ themeGlyph }}
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
            :class="{ active: viewMode === 'plan' }"
            @click="$emit('set-view-mode', 'plan')"
            title="Plan Mode: Expand SELECTED, WIP; Collapse TODO, PROJECTS, ARCHIVE"
        >
          Plan
        </button>
        <button
            class="view-mode-btn"
            :class="{ active: viewMode === 'focus' }"
            @click="$emit('set-view-mode', 'focus')"
            title="Focus Mode: Execute this week — NOW / UP NEXT / DONE pulled from SELECTED and WIP"
        >
          Focus
        </button>
        <button
            class="view-mode-btn"
            :class="{ active: viewMode === 'review' }"
            @click="$emit('set-view-mode', 'review')"
            title="Review Mode: Week or month calendar of what was completed, dropped, and still due, over a year of monthly bars"
        >
          Review
        </button>
      </div>
    </div>
    <Teleport to="body">
      <div v-if="fileContextMenu.show" class="file-tab-context-menu" role="menu"
           :style="{ left: `${fileContextMenu.x}px`, top: `${fileContextMenu.y}px`, width: `${fileContextMenu.width}px` }"
           @click.stop @contextmenu.prevent>
        <div class="file-path-row">
          <code>{{ contextAbsolutePath }}</code>
          <button type="button" role="menuitem" title="Copy absolute file path"
                  aria-label="Copy absolute file path" @click="copyFilePath(false)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
        </div>
        <div class="file-path-row">
          <code>{{ contextBrowserPath }}</code>
          <button type="button" role="menuitem" title="Copy file URL for browser"
                  aria-label="Copy file URL for browser" @click="copyFilePath(true)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

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
  themePreference: {
    type: String,
    default: 'auto'
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

const emit = defineEmits([
  'file-selected',
  'set-view-mode',
  'cycle-theme',
  'show-history',
  'undo',
  'redo'
]);

const themeGlyph = computed(() => ({ auto: '◐', dark: '☾', light: '☀' }[props.themePreference] || '◐'));
const fileSelectorOpen = ref(false);
const fileSourceClass = (file) => file?.isBuiltIn ? 'built-in-file' : 'user-file';

const toggleFileSelector = () => {
  closeFileContextMenu();
  fileSelectorOpen.value = !fileSelectorOpen.value;
};

const selectFile = (file) => {
  fileSelectorOpen.value = false;
  emit('file-selected', file);
};

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
  
  // Keep the filename's original capitalization and punctuation.
  return file.name.replace(/\.todo\.md$/i, '');
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

const fileContextMenu = reactive({ show: false, file: null, x: 0, y: 0, width: 0 });
const contextAbsolutePath = computed(() => {
  const filePath = fileContextMenu.file?.path || '';
  return filePath.startsWith('/') ? filePath : `/${filePath}`;
});
const contextBrowserPath = computed(() => contextAbsolutePath.value
  ? `file://${contextAbsolutePath.value.split('/').map(encodeURIComponent).join('/')}`
  : '');

const closeFileContextMenu = () => {
  fileContextMenu.show = false;
  fileContextMenu.file = null;
};

const showFileContextMenu = (event, file) => {
  const menuHeight = 104;
  const tabRect = event.currentTarget.getBoundingClientRect();
  const absolutePath = file?.path?.startsWith('/') ? file.path : `/${file?.path || ''}`;
  const browserPath = absolutePath ? `file://${absolutePath.split('/').map(encodeURIComponent).join('/')}` : '';
  const menuWidth = Math.min(
    Math.max(260, Math.max(absolutePath.length, browserPath.length) * 7.25 + 58),
    680,
    window.innerWidth - 8
  );
  const spaceBelow = window.innerHeight - tabRect.bottom;
  const menuTop = spaceBelow >= menuHeight + 4
    ? tabRect.bottom + 4
    : tabRect.top - menuHeight - 4;
  fileContextMenu.file = file;
  fileContextMenu.width = menuWidth;
  fileSelectorOpen.value = false;
  fileContextMenu.x = Math.max(4, Math.min(event.clientX, window.innerWidth - menuWidth - 4));
  fileContextMenu.y = Math.max(4, Math.min(menuTop, window.innerHeight - menuHeight - 4));
  fileContextMenu.show = true;
};

const copyFilePath = async (forBrowser) => {
  const value = forBrowser ? contextBrowserPath.value : contextAbsolutePath.value;
  if (!value) return;
  await navigator.clipboard.writeText(value);
  closeFileContextMenu();
};

const handleDocumentKeydown = (event) => {
  if (event.key === 'Escape') {
    closeFileContextMenu();
    fileSelectorOpen.value = false;
  }
};

const closePopovers = () => {
  closeFileContextMenu();
  fileSelectorOpen.value = false;
};

onMounted(() => {
  document.addEventListener('click', closePopovers);
  document.addEventListener('keydown', handleDocumentKeydown);
  window.addEventListener('blur', closeFileContextMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closePopovers);
  document.removeEventListener('keydown', handleDocumentKeydown);
  window.removeEventListener('blur', closeFileContextMenu);
});
</script>

<style scoped>
.file-tabs-container {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  margin-top: 5px;
  width: 100%;
  box-sizing: border-box;
  overflow: visible;
  padding: 4px 0;
}

.selected-file-status-summary {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 4px 12px;
  color: #747b81;
  font-size: 16px;
  font-weight: 650;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

.header-status-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.selected-file-status-summary .file-status-icon {
  width: 18px;
  height: 17px;
  flex-basis: 18px;
}

.selected-file-status-summary .file-status-icon.in-progress::after {
  width: 7px;
  height: 7px;
}

.selected-file-status-summary .file-status-icon.checked::after {
  top: 1px;
  left: 5px;
  width: 4px;
  height: 9px;
}

.header-status-label {
  font-weight: 600;
}

.header-status-number {
  font-weight: 750;
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
  margin-right: 10px;
  margin-bottom: 3px;
  white-space: nowrap;
  display: flex;
  align-items: end;
}

.file-selector-area {
  display: flex;
  align-items: center;
  padding: 0 6px;
  flex: 1 1 auto;
  min-width: 0;
}

.file-selector {
  position: relative;
  flex: 0 1 max-content;
  width: max-content;
  min-width: 0;
  max-width: min(520px, calc(100vw - 430px));
}

.file-selector-trigger {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 6px 5px 6px 9px;
  background: #fff;
  color: #5f666b;
  border: 1px solid #d2d5d8;
  border-left-width: 4px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 650;
  text-align: left;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.file-selector-trigger.built-in-file {
  border-left-color: #888;
}

.file-selector-trigger.user-file {
  border-left-color: #4caf50;
}

.file-selector-trigger:hover,
.file-selector-trigger[aria-expanded="true"] {
  background-color: #f7f9fb;
  border-top-color: #91bde4;
  border-right-color: #91bde4;
  border-bottom-color: #91bde4;
  color: #333;
}

.file-selector-trigger[aria-expanded="true"] {
  box-shadow: 0 0 0 2px rgba(64, 137, 209, 0.14);
}

.selected-file-name {
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-chevron {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  color: #8a9094;
}

.file-selector-trigger[aria-expanded="true"] .selector-chevron {
  transform: rotate(180deg);
}

.file-selector-popover {
  position: absolute;
  z-index: 9000;
  top: calc(100% + 4px);
  left: 0;
  width: max-content;
  min-width: 100%;
  max-width: calc(100vw - 12px);
  max-height: min(420px, calc(100vh - 60px));
  overflow-y: auto;
  box-sizing: border-box;
  padding: 5px;
  background: #fff;
  border: 1px solid #c8c8c8;
  border-radius: 6px;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
}

.file-selector-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  margin: 2px 0;
  padding: 8px 9px;
  border: 1px solid #e3e5e7;
  border-left-width: 4px;
  border-radius: 5px;
  background: #f7f8f9;
  color: #444;
  font: inherit;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
}

.file-selector-option.built-in-file {
  border-left-color: #888;
}

.file-selector-option.user-file {
  border-left-color: #4caf50;
}

.file-option-name {
  flex: 1 0 auto;
  white-space: nowrap;
}

.file-option-counts {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: #92979b;
  font-size: 14px;
  font-weight: 550;
  white-space: nowrap;
  margin-left: auto;
  justify-content: flex-end;
}

.file-status-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.file-status-icon {
  position: relative;
  display: inline-block;
  width: 14px;
  height: 13px;
  flex: 0 0 14px;
  box-sizing: border-box;
  border: 2px solid #aaa;
  border-radius: 3px;
}

.file-status-icon.in-progress {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.12);
}

.file-status-icon.unchecked {
  border-color: #aaa;
  background: #fff;
}

.file-status-icon.in-progress::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 1px;
  background: #ff9800;
  transform: translate(-50%, -50%);
}

.file-status-icon.checked {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.file-status-icon.checked::after {
  content: '';
  position: absolute;
  top: 0;
  left: 3px;
  width: 3px;
  height: 7px;
  border: solid #4caf50;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.file-status-icon.cancelled {
  border-color: #757575;
  background: rgba(117, 117, 117, 0.16);
}

.file-status-icon.cancelled::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 2px;
  right: 2px;
  height: 2px;
  background: #757575;
  transform: translateY(-50%);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-selector-option:hover,
.file-selector-option:focus-visible {
  background: #edf4fb;
  border-color: #cbdced;
  outline: none;
}

.file-selector-option.active {
  background: #e7f2fc;
  border-color: #8bbce8;
  color: #285f91;
  font-weight: 650;
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

.view-mode-btn + .view-mode-btn {
  border-left: 1px solid #ccc;
}

.view-mode-btn:hover {
  background-color: #e8e8e8;
}

.view-mode-btn.active {
  background-color: #f5f5f5;
  color: #2e7d32;
  box-shadow: inset 0 -3px 0 #4caf50;
}

.view-mode-btn.active:hover {
  background-color: #e8e8e8;
  color: #2e7d32;
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

:global(.file-tab-context-menu) {
  position: fixed;
  z-index: 10000;
  max-width: calc(100vw - 8px);
  box-sizing: border-box;
  padding: 4px;
  background: #fff;
  border: 1px solid #c8c8c8;
  border-radius: 6px;
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.2);
}

:global(.file-path-row) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 7px;
}

:global(.file-path-row + .file-path-row) {
  border-top: 1px solid #e7e7e7;
}

:global(.file-path-row code) {
  flex: 1 1 auto;
  min-width: 0;
  color: #333;
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
  user-select: text;
}

:global(.file-tab-context-menu button) {
  display: inline-flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #333;
  cursor: pointer;
}

:global(.file-tab-context-menu button svg) {
  width: 16px;
  height: 16px;
}

:global(.file-tab-context-menu button:hover),
:global(.file-tab-context-menu button:focus-visible) {
  background: #e8f1fb;
  outline: none;
}
</style>
