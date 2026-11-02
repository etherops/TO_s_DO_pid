<!-- components/ArchiveConfirmationModal.vue -->
<template>
  <div class="modal-backdrop" @click="$emit('close')">
    <div ref="dialog" class="modal-content" role="dialog" aria-modal="true"
         aria-labelledby="archive-dialog-title" tabindex="-1" @click.stop
         @keydown.esc.prevent.stop="$emit('close')" @keydown.tab="trapFocus">
      <div class="modal-header">
        <h3 id="archive-dialog-title">Archive Completed Tasks</h3>
      </div>
      
      <div class="modal-body">
        <p class="confirmation-message">
          Archive completed tasks from <strong>"{{ sectionName }}"</strong> by completion week?
        </p>
        
        <div class="archive-details">
          <div v-if="archiveGroups.length > 0" class="detail-item">
            <span class="detail-icon">📋</span>
            <span class="detail-text">
              {{ initialWeeks ? 'Review this week before archiving.'
                : 'Choose weeks to archive. Only closed weeks are selected by default.' }}
              <label v-for="group in archiveGroups" :key="group.name" class="archive-week-summary">
                <input v-model="selectedWeeks" type="checkbox" :value="group.name" :aria-label="group.name" />
                <span>
                  <strong>{{ group.name }}</strong> — {{ group.tasks.length }} task{{ group.tasks.length === 1 ? '' : 's' }}
                  <span class="archive-week-state">{{ group.closed ? 'Closed' : 'Open / upcoming' }}</span>
                  <span v-if="group.undatedCount" class="archive-undated-note">
                    ({{ group.undatedCount }} without a completion date; using this week)
                  </span>
                </span>
              </label>
              <span class="archive-selection-count" aria-live="polite">
                {{ archiveTasks.length }} task{{ archiveTasks.length === 1 ? '' : 's' }} selected
              </span>
            </span>
          </div>
          
          <div v-else class="detail-item">
            <span class="detail-icon">✅</span>
            <span class="detail-text">There are no completed or will-not-do tasks to archive</span>
          </div>
        </div>
        
        <div v-if="archiveTasks.length > 0" class="incomplete-tasks-preview">
          <h4>Tasks to be archived:</h4>
          <ul class="task-list">
            <li v-for="task in archiveTasks.slice(0, 5)" :key="task.id" class="task-item">
              <div class="task-status-icon" :class="getStatusClass(task.statusChar)"></div>
              <span class="task-text">{{ task.displayText || task.text }}</span>
            </li>
            <li v-if="archiveTasks.length > 5" class="more-tasks">
              ... and {{ archiveTasks.length - 5 }} more task{{ archiveTasks.length - 5 > 1 ? 's' : '' }}
            </li>
          </ul>
        </div>
        
        <!-- Archive destination section -->
        <div class="archive-destination">
          <h4>Archive To:</h4>
          <div v-if="availableColumns.length === 1" class="single-destination">
            <span class="destination-icon">📁</span>
            <span class="destination-name">{{ availableColumns[0] }}</span>
          </div>
          <div v-else class="destination-selector">
            <button 
              v-for="column in availableColumns" 
              :key="column"
              :class="['destination-btn', { 'selected': selectedColumn === column }]"
              @click="selectedColumn = column"
            >
              <span class="destination-icon">📁</span>
              <span class="destination-name">{{ column }}</span>
            </button>
          </div>
          <p v-for="summary in destinationSummaries" :key="summary.name" class="archive-destination-summary">
            <template v-if="summary.matches.length">
              Add {{ summary.count }} task{{ summary.count === 1 ? '' : 's' }} to existing
              <strong>{{ summary.matches[0].name }}</strong> ({{ summary.existingCount }} already there).
              No new week section will be created.
              <span v-if="summary.matches.length > 1" class="archive-duplicate-warning">
                {{ summary.matches.length }} matching sections already exist; tasks will go into the first.
                Existing sections will not be merged or deleted.
              </span>
            </template>
            <template v-else>Create <strong>{{ summary.name }}</strong> with {{ summary.count }}
              task{{ summary.count === 1 ? '' : 's' }}.</template>
          </p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button ref="cancelButton" class="btn-cancel" @click="$emit('close')">
          Cancel
        </button>
        <button class="btn-confirm" :disabled="submitted || !archiveTasks.length" @click="handleConfirm">
          Archive Completed Tasks
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { groupTasksForArchive, matchingArchiveSections } from '../utils/archiveHelpers';

const props = defineProps({
  sectionName: {
    type: String,
    required: true
  },
  sectionItems: {
    type: Array,
    default: () => []
  },
  fallbackDate: {
    type: Date,
    default: () => new Date()
  },
  availableColumns: {
    type: Array,
    default: () => ['ARCHIVE']
  },
  initialWeeks: { type: Array, default: null },
  archiveColumns: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['close', 'confirm']);
const dialog = ref(null);
const cancelButton = ref(null);
const submitted = ref(false);
const previousFocus = document.activeElement;
onMounted(() => cancelButton.value?.focus());
onUnmounted(() => { if (previousFocus?.isConnected) previousFocus.focus(); });
const trapFocus = event => {
  const elements = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
  const first = elements[0];
  const last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
};

// Selected archive destination
const selectedColumn = ref(props.availableColumns[0]);

// Only completed and explicitly will-not-do tasks are archived.
const archiveGroups = computed(() => groupTasksForArchive(props.sectionItems, props.fallbackDate));
const selectedWeeks = ref(props.initialWeeks || archiveGroups.value.filter(group => group.closed).map(group => group.name));
const archiveTasks = computed(() => archiveGroups.value
  .filter(group => selectedWeeks.value.includes(group.name)).flatMap(group => group.tasks));
const destinationSummaries = computed(() => archiveGroups.value
  .filter(group => selectedWeeks.value.includes(group.name)).map(group => {
    const matches = matchingArchiveSections(props.archiveColumns[selectedColumn.value]?.sections, group);
    return {
      name: group.name, count: group.tasks.length, matches,
      existingCount: (matches[0]?.items || []).filter(item => item.type === 'task').length
    };
  }));

// Get CSS class for task status
const getStatusClass = (statusChar) => {
  switch (statusChar) {
    case ' ': return 'status-unchecked';
    case '~': return 'status-in-progress';
    case 'x': return 'status-checked';
    case '-': return 'status-cancelled';
    default: return 'status-unchecked';
  }
};

// Handle confirm with selected column
const handleConfirm = () => {
  if (submitted.value || !archiveTasks.value.length) return;
  submitted.value = true;
  emit('confirm', selectedColumn.value, [...selectedWeeks.value]);
};
</script>

<style scoped>
.archive-destination-summary { font-size: 13px; line-height: 1.5; color: var(--ui-text); margin: 12px 0 0; }
.archive-duplicate-warning { display: block; margin-top: 5px; color: var(--ui-orange); }
.archive-week-summary { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; cursor: pointer; }
.archive-week-summary input { margin: 3px 0 0; flex: none; accent-color: var(--ui-green, #4caf50); }
.archive-week-state { display: block; font-size: 12px; color: var(--ui-muted); }
.archive-selection-count { display: block; margin-top: 14px; font-weight: 600; }
.btn-confirm:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
.archive-undated-note { display: block; font-size: 12px; color: var(--ui-muted); }
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.modal-header {
  padding: 20px 24px 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0;
}

.modal-header h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.modal-body {
  padding: 20px 24px;
}

.confirmation-message {
  font-size: 16px;
  color: #374151;
  margin-bottom: 20px;
  line-height: 1.5;
}

.archive-details {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 10px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.detail-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.4;
}

.incomplete-tasks-preview {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
}

.incomplete-tasks-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2563eb;
}

.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.task-item:last-child {
  margin-bottom: 0;
}

.more-tasks {
  font-style: italic;
  color: #9ca3af;
  font-size: 12px;
  margin-top: 4px;
  padding-left: 20px;
}

.task-status-icon {
  width: 12px;
  height: 12px;
  border: 1.5px solid;
  border-radius: 2px;
  flex-shrink: 0;
  position: relative;
}

.status-unchecked {
  background-color: white;
  border-color: #9ca3af;
}

.status-in-progress {
  background-color: #fff8e1;
  border-color: #ff9800;
}

.status-in-progress:after {
  content: "~";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ff9800;
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.status-checked {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.status-checked:after {
  content: "";
  position: absolute;
  top: 1px;
  left: 3px;
  width: 2px;
  height: 5px;
  border: solid #4caf50;
  border-width: 0 1px 1px 0;
  transform: rotate(45deg);
}

.status-cancelled {
  background-color: #f5f5f5;
  border-color: #757575;
}

.status-cancelled:after {
  content: "";
  position: absolute;
  top: 50%;
  left: 1px;
  right: 1px;
  height: 1.5px;
  background-color: #757575;
  transform: translateY(-50%);
}

.task-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  min-width: 100px;
}

.btn-cancel {
  background-color: white;
  color: #6b7280;
  border-color: #d1d5db;
}

.btn-cancel:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

.btn-confirm {
  background-color: #16a34a;
  color: white;
  border-color: #16a34a;
}

.btn-confirm:hover {
  background-color: #15803d;
  border-color: #15803d;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(22, 163, 74, 0.3);
}

/* Archive destination styles */
.archive-destination {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.archive-destination h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #0369a1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.single-destination {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #e0f2fe;
  border: 1px solid #7dd3fc;
  border-radius: 6px;
  color: #075985;
  font-weight: 500;
}

.destination-icon {
  font-size: 16px;
}

.destination-name {
  font-size: 14px;
}

.destination-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.destination-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: white;
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.destination-btn:hover {
  background-color: #f0f9ff;
  border-color: #60a5fa;
  color: #1e40af;
  transform: translateY(-1px);
}

.destination-btn.selected {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.destination-btn.selected:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}
</style>
