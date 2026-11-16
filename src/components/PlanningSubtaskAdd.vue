<template>
  <label v-if="!entry.frozen && taskPriority(entry.task) !== 'low'" class="planning-subtask-add">
    <span aria-hidden="true" class="planning-subtask-placeholder"></span>
    <input v-model="title" :aria-label="`Add subtask to ${entry.title}`" placeholder="Subtask…"
           @blur="save" @keydown.enter.stop.prevent="!$event.isComposing && save()"
           @keydown.esc.stop.prevent="title = ''" />
  </label>
</template>

<script setup>
import { ref } from 'vue';
import { taskPriority } from '../utils/priorityHelpers';
import { createSubtask, saveSubtaskEdits } from '../utils/subtaskHelpers';

const props = defineProps({ entry: { type: Object, required: true } });
const emit = defineEmits(['update']);
const title = ref('');
const save = () => {
  const text = title.value.trim();
  if (!text || props.entry.frozen || taskPriority(props.entry.task) === 'low') return;
  saveSubtaskEdits(props.entry.task, [...(props.entry.task.children || []), createSubtask(text)]);
  title.value = '';
  emit('update');
};
</script>

<style scoped>
.planning-subtask-add { display: flex; align-items: center; gap: 7px; padding: 3px 4px 3px 18px; }
.planning-subtask-placeholder { box-sizing: border-box; width: 16px; height: 16px; flex: none;
  border: 2px solid var(--ui-muted); border-radius: 3px; opacity: 0.55; }
.planning-subtask-add input { min-width: 0; width: 100%; padding: 1px 3px;
  font: 400 13px/18px var(--ui-font); color: var(--ui-text); background: transparent;
  border: 1px solid transparent; border-radius: 4px; }
.planning-subtask-add input::placeholder { color: var(--ui-muted); }
.planning-subtask-add input:focus { outline: none; border-color: var(--ui-blue); background: var(--ui-surface); }
</style>
