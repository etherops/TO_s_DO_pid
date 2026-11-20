<template>
  <div class="planning-task-row" :class="{ 'planning-nested-row': nested }" :data-task-id="entry.task.id">
    <button v-if="!entry.frozen && (reorderProject || !['x', '-'].includes(entry.task.statusChar))"
            class="planning-task-grip" draggable="true" tabindex="-1"
            :aria-label="reorderProject ? 'Drag to reorder project' : 'Drag to reschedule'"
            :title="reorderProject ? 'Drag to reorder project' : 'Drag to reschedule'"
            @dragstart="beginDrag" @dragend="$emit('drag-end')">⠿</button>
    <div v-if="entry.parent" class="planning-child-row" @contextmenu.prevent.stop="openChildActions"
         @keydown.shift.f10.prevent.stop="openChildActions">
      <button type="button" class="planning-child-status" :disabled="entry.frozen" @click.stop="cycleChildStatus"
        :title="`Change status: ${entry.title}`" :class="`child-status-${entry.task.statusChar === '~' ? 'active'
        : entry.task.statusChar === '!' ? 'blocked' : entry.task.statusChar === 'x' ? 'done'
        : entry.task.statusChar === '-' ? 'cancelled' : 'open'}`" :aria-label="statusLabel">
        {{ { '~': '▪', 'x': '✓', '-': '−' }[entry.task.statusChar] || '' }}
      </button>
      <form v-if="editing" class="planning-child-editor" @submit.prevent="saveTitle" @keydown.esc.stop="editing = false">
        <input ref="titleInput" v-model="titleDraft" aria-label="Subtask title" />
        <button type="submit">Save</button><button type="button" @click="editing = false">Cancel</button>
      </form>
      <button v-else class="planning-child-title" :title="entry.title" @click="editTitle">{{ entry.title }}</button>
      <button v-if="!nested" class="planning-source-badge" :title="`Subtask of ${parentTitle}`"
              :aria-label="`Edit subtask of ${parentTitle}`" @click="editTitle">↳</button>
      <span v-if="entry.frozen" class="planning-child-date-label">
        {{ clockOnly ? '' : entry.dateLabel }}
      </span>
      <button v-else class="planning-child-date"
              :aria-label="`${isTerminal ? 'Edit completion date for' : 'Schedule'} ${entry.title}`"
              :title="entry.dateLabel || 'Add due date'"
              @click="dateOpen = !dateOpen">{{ !clockOnly && entry.dateLabel ? `${entry.dateLabel} ◷` : '◷' }}</button>
      <button v-if="!entry.frozen" class="planning-child-actions" :aria-label="`Actions for ${entry.title}`"
              title="Subtask actions" @click.stop="openChildActions">•••</button>
    </div>
    <SubtaskDatePicker v-if="entry.parent && dateOpen" :completion="isTerminal" :model-value="dateValue"
                       @update:model-value="saveDate" @close="dateOpen = false" />
    <TaskCard v-if="!entry.parent" :task="entry.task" :section="entry.section" :column="entry.columnKey"
              :before-title-edit="beforeTitleEdit" :clock-only="clockOnly"
              :is-on-ice="entry.frozen" :is-selected="selected" quick-schedule
              @task-updated="$emit('update', entry, $event)" @edit-cancelled="$emit('refresh')"
              @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
              @request-date="$emit('request-date', entry, null, $event)">
      <template v-if="showSource && entry.section.name !== entry.title" #source>
        <span class="planning-source-badge" :title="`${entry.columnKey} › ${entry.section.name}`">
          {{ entry.section.name || entry.columnKey }}
        </span>
      </template>
    </TaskCard>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, ref } from 'vue';
import TaskCard from './TaskCard.vue';
import SubtaskDatePicker from './SubtaskDatePicker.vue';
import { updateSubtaskTitle } from '../utils/subtaskHelpers';
import { extractDuePeriod, formatDuePeriodValue, setDuePeriod } from '../utils/dateHelpers';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';
import { nextTaskStatus } from '../utils/statusHelpers';
import { reconcileLifecycleDateForStatus, extractCompletionDateValue, setCompletionDate } from '../utils/completionDateHelpers';
const props = defineProps({ entry: { type: Object, required: true }, showSource: Boolean, selected: Boolean,
  nested: Boolean, reorderProject: Boolean, clockOnly: Boolean, beforeTitleEdit: { type: Function, default: null } });
const emit = defineEmits(['update', 'refresh', 'request-date', 'task-click', 'task-context-menu',
  'drag-start', 'drag-end']);
const openSubtaskActions = inject('openSubtaskActions', null);
const planningStatusChanges = inject('planningStatusChanges', null);
const editing = ref(false);
const titleDraft = ref('');
const titleInput = ref(null);
const dateOpen = ref(false);
const isTerminal = computed(() => ['x', '-'].includes(props.entry.task.statusChar));
const dateValue = computed(() => {
  if (!isTerminal.value) return formatDuePeriodValue(extractDuePeriod(props.entry.task.text));
  const date = extractCompletionDateValue(props.entry.task.text);
  return date ? formatDuePeriodValue({ kind: 'day', start: date }) : '';
});
const editTitle = async () => {
  if (props.entry.frozen) return;
  titleDraft.value = getStrippedDisplayText(props.entry.task.text);
  editing.value = true;
  await nextTick();
  titleInput.value?.focus();
};
const saveTitle = () => {
  if (!titleDraft.value.trim()) return;
  props.entry.task.text = updateSubtaskTitle(props.entry.task.text, titleDraft.value.trim());
  editing.value = false;
  emit('update', props.entry);
};
const saveDate = value => {
  props.entry.task.text = isTerminal.value ? setCompletionDate(props.entry.task.text, value)
    : setDuePeriod(props.entry.task.text, value);
  dateOpen.value = false;
  emit('update', props.entry);
};
const cycleChildStatus = () => {
  if (props.entry.frozen) return;
  if (planningStatusChanges) {
    planningStatusChanges.cycle(props.entry.task, props.entry.section);
    return;
  }
  const task = props.entry.task;
  task.statusChar = nextTaskStatus(task.statusChar);
  task.text = reconcileLifecycleDateForStatus(task.text, task.statusChar);
  emit('update', props.entry);
};
const openChildActions = event => {
  if (props.entry.frozen) return;
  openSubtaskActions?.(props.entry.task.id, event, {
    edit: editTitle,
    date: () => { dateOpen.value = true; }
  });
};
const parentTitle = computed(() => getStrippedDisplayText(props.entry.parent?.text || ''));
const statusLabel = computed(() => ({ ' ': 'Not started', '~': 'In progress', '!': 'Blocked',
  x: 'Done', '-': 'Will not do' })[props.entry.task.statusChar] || 'Not started');
const beginDrag = event => {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', props.entry.task.id);
  emit('drag-start', props.entry);
};
</script>

<style scoped>
.planning-task-row { position: relative; padding-left: 14px; min-width: 0; }
.planning-nested-row .planning-task-grip { top: 1px; }
.planning-child-date-label { color: var(--ui-muted); font-size: 11px; flex: none; }
.planning-task-grip { position: absolute; left: -2px; top: 6px; padding: 0; width: 14px; height: 22px;
  border: 0; background: none; color: var(--ui-muted); cursor: grab; font-size: 15px; }
.planning-source-badge { display: inline-block; max-width: 105px; min-width: 0; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 500; color: var(--ui-muted);
  background: var(--ui-surface); border: 1px solid var(--ui-border); border-radius: 4px; padding: 1px 4px; }
.planning-child-row { display: flex; align-items: center; gap: 6px; padding: 4px 6px; margin-bottom: 3px;
  min-width: 0; border: 1px solid var(--ui-border); border-radius: 8px; background: var(--ui-surface-soft); }
.planning-child-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  border: 0; background: none; text-align: left; color: var(--ui-text); font-size: 14px; cursor: pointer; }
.planning-child-date { flex: none; color: var(--ui-blue); background: var(--ui-surface);
  border: 1px solid var(--ui-border); border-radius: 5px; font-size: 11px; padding: 3px 5px;
  white-space: nowrap; cursor: pointer; }
.planning-child-status { width: 17px; height: 17px; border: 2px solid var(--ui-muted); border-radius: 3px;
  flex: none; padding: 0; box-sizing: content-box; text-align: center; line-height: 17px;
  color: var(--ui-muted); background: transparent; cursor: pointer; }
.planning-child-status:disabled { cursor: default; }
.child-status-active { color: #ff9800; border-color: #ff9800; background: var(--ui-orange-soft); }
.child-status-blocked { position: relative; color: var(--ui-blocked); border-color: var(--ui-blocked);
  background: var(--ui-blocked-soft); }
.child-status-blocked::after { content: ''; position: absolute; inset: 4px; background: currentColor;
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
.child-status-done { color: var(--ui-green); border-color: var(--ui-green); background: var(--ui-green-soft); }
.child-status-cancelled { color: var(--ui-gray); border-color: var(--ui-gray); background: var(--ui-gray-soft); }

/* Expanded projects read as a checklist, not a second stack of task cards. */
.planning-nested-row .planning-child-row { display: flex;
  align-items: center; gap: 7px; margin: 0; padding: 3px 4px; border: 0; border-radius: 4px;
  background: transparent; min-height: 24px; box-sizing: border-box; }
.planning-nested-row .planning-child-row:hover,
.planning-nested-row .planning-child-row:focus-within { background: var(--ui-surface-soft); }
.planning-nested-row .planning-child-title { font: 400 13px/18px var(--ui-font); padding: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.planning-nested-row .planning-child-status { box-sizing: border-box; width: 16px; height: 16px;
  margin-top: 1px; line-height: 12px; font-size: 12px; }
.planning-nested-row .planning-child-date { border-color: transparent; background: transparent;
  color: var(--ui-muted); font: 400 11px/18px var(--ui-font); padding: 0 2px; }
.planning-nested-row .planning-child-date:hover { color: var(--ui-blue); background: var(--ui-blue-soft); }
.planning-nested-row .planning-child-date-label { line-height: 18px; }
.planning-nested-row button:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 1px; }
.planning-child-actions { flex: none; padding: 2px; border: 0; background: transparent;
  color: var(--ui-muted); cursor: pointer; }
.planning-child-editor { display: flex; flex: 1; min-width: 0; gap: 3px; flex-wrap: wrap; }
.planning-child-editor input { flex: 1 1 100%; min-width: 0; width: 100%; box-sizing: border-box;
  color: var(--ui-text); background: var(--ui-surface); border: 1px solid var(--ui-blue); }
.planning-child-editor button { color: var(--ui-text); background: var(--ui-surface);
  border: 1px solid var(--ui-border); border-radius: 4px; cursor: pointer; }
</style>
