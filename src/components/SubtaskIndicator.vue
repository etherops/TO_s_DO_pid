<template>
  <button v-if="subtasks.length" type="button" class="subtask-indicator" :title="summary"
          :aria-label="`Edit subtasks: ${summary}`" @click.stop="$emit('edit')">
    <span class="subtask-total" aria-hidden="true">{{ subtasks.length }} {{ subtasks.length === 1 ? 'subtask' : 'subtasks' }}</span>
  </button>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({ task: { type: Object, required: true } });
defineEmits(['edit']);
const states = [
  { status: 'x', kind: 'checked', label: 'done' },
  { status: '~', kind: 'in-progress', label: 'in progress' },
  { status: '!', kind: 'blocked', label: 'blocked' },
  { status: ' ', kind: 'unchecked', label: 'not started' },
  { status: '-', kind: 'cancelled', label: 'will not do' }
];
const subtasks = computed(() => (props.task.children || []).filter(child => child.type === 'subtask'));
const groups = computed(() => states.map(state => ({
  ...state,
  count: subtasks.value.filter(child => child.statusChar === state.status).length
})).filter(group => group.count));
const summary = computed(() => [
  `${subtasks.value.length} total`, ...groups.value.map(group => `${group.count} ${group.label}`)
].join(', '));
</script>
<style scoped>
.subtask-indicator { display: inline-flex; align-items: center; padding: 1px 4px;
  border: 1px solid var(--ui-border, #8996a54d); font: 600 10px var(--ui-font, sans-serif);
  white-space: nowrap; line-height: 1.4;
  background: transparent; color: var(--ui-muted, #8996a5); cursor: pointer; flex: none; border-radius: 4px; }
.subtask-indicator:hover { color: var(--ui-blue); background: var(--ui-blue-soft); }
.subtask-indicator:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 2px; }
</style>
