<template>
  <button v-if="count" type="button" class="subtask-indicator" :title="`${count} subtasks — edit task`"
          :aria-label="`Edit ${count} subtasks`" @click.stop="$emit('edit')">
    {{ count }} {{ count === 1 ? 'subtask' : 'subtasks' }}
  </button>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({ task: { type: Object, required: true } });
defineEmits(['edit']);
const count = computed(() => (props.task.children || []).filter(child => child.type === 'subtask').length);
</script>
<style scoped>
.subtask-indicator { display: inline-flex; align-items: center; padding: 1px 4px;
  border: 1px solid var(--ui-border, #8996a54d); font: 600 10px var(--ui-font, sans-serif);
  white-space: nowrap; line-height: 1.4;
  background: transparent; color: var(--ui-muted, #8996a5); cursor: pointer; flex: none; border-radius: 4px; }
.subtask-indicator:hover { color: var(--ui-blue); background: var(--ui-blue-soft); }
.subtask-indicator:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 2px; }
</style>
