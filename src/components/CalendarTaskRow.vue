<template>
  <li class="calendar-day-task" :class="{ 'calendar-project-row': isProject, 'is-movable': movable, 'is-tile': tile }"
      :data-task-id="entry.task.id" :draggable="movable" :tabindex="movable ? 0 : undefined"
      :title="`${status.label}: ${entry.title}${movable ? ' — drag to a date, or press Space to move' : ''}`"
      @click.stop @dragstart="$emit('move-start', entry, $event)" @dragend="$emit('move-end')"
      @keydown.space.prevent.stop="movable && $emit('move-start', entry, $event)"
      @keydown.esc.stop="$emit('move-end')">
    <span class="calendar-task-status" :class="`status-${entry.bucket}`" role="img" :aria-label="status.label">
      <SubtaskStatusGrid v-if="isProject && entry.task.children?.some(child => child.type === 'subtask')"
                         :task="entry.task" />
      <template v-else>{{ status.symbol }}</template>
    </span>
    <span class="calendar-task-title">{{ entry.title }}</span>
    <span v-if="showDate" class="calendar-row-date">{{ getDuePeriodLabel(entry.task.text) }}</span>
  </li>
</template>

<script setup>
import { computed } from 'vue';
import { getDuePeriodLabel } from '../utils/dateHelpers';
import SubtaskStatusGrid from './SubtaskStatusGrid.vue';
const props = defineProps({ entry: { type: Object, required: true }, showDate: Boolean, tile: Boolean });
defineEmits(['move-start', 'move-end']);
const statuses = {
  queued: { label: 'Not started', symbol: '' }, inProgress: { label: 'In progress', symbol: '▪' },
  blocked: { label: 'Blocked', symbol: '' }, completed: { label: 'Done', symbol: '✓' },
  cancelled: { label: 'Will not do', symbol: '−' }
};
const status = computed(() => statuses[props.entry.bucket]);
const isProject = computed(() => !props.entry.parent && props.entry.task.listMarker === '+');
const movable = computed(() => !['completed', 'cancelled'].includes(props.entry.bucket)
  && !props.entry.frozen && props.entry.columnType !== 'DONE');
</script>

<style scoped>
.calendar-day-task { display: flex; align-items: center; gap: 5px; min-width: 0;
  padding: 4px 5px; border: 1px solid var(--ui-border); border-radius: 5px;
  background: var(--ui-surface-soft); font-size: 11px; line-height: 1.4; margin-bottom: 3px; }
.is-movable { cursor: grab; }
.is-movable:active { cursor: grabbing; }
.calendar-day-task:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: -2px; }
.calendar-project-row { background: var(--ui-blue-soft); }
.calendar-task-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.calendar-project-row .calendar-task-title { font-weight: 650; color: var(--ui-blue); }
.is-tile { display: flex; flex-direction: column; align-items: stretch; justify-content: center;
  width: 58px; height: 58px; gap: 2px; padding: 4px; margin: 0; box-sizing: border-box;
  border-radius: 6px; text-align: center; }
.is-tile .calendar-task-title { flex: none; font-size: 10px; line-height: 12px; }
.is-tile .calendar-row-date { max-width: none; font-size: 9px; line-height: 11px; }
.is-tile .calendar-task-status { align-self: center; flex: none; width: 16px; height: 16px; font-size: 13px; }
.calendar-row-date { flex: none; max-width: 40%; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 10px; color: var(--ui-muted); }
.calendar-task-status { display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 14px; height: 14px; border: 2px solid var(--ui-faint); border-radius: 3px;
  box-sizing: border-box; font-size: 12px; font-weight: 700; line-height: 1; color: var(--ui-muted); }
.status-inProgress { color: var(--ui-orange); border-color: currentColor; background: var(--ui-orange-soft); }
.status-completed { color: var(--ui-green); border-color: currentColor; background: var(--ui-green-soft); }
.status-blocked { color: var(--ui-blocked); border-color: currentColor; background: var(--ui-blocked-soft); }
.status-cancelled { background: var(--ui-gray-soft); }
.calendar-task-status:has(> .subtask-status-grid) {
  border-color: var(--ui-faint); background: transparent; overflow: hidden;
}
</style>
