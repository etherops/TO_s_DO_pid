<template>
  <div class="subtask-parent-header">
    <span>Subtask of <strong>{{ title }}</strong></span>
    <button type="button" @click.stop="$emit('detach')">Detach</button>
  </div>
</template>
<script setup>
defineProps({ title: String });
defineEmits(['detach']);
</script>
<style scoped>
.subtask-parent-header { grid-column: 1 / -1; display: flex; align-items: flex-start; gap: 8px;
  color: var(--ui-muted); font-size: 11px; padding: 4px 0; min-width: 0; }
span { flex: 1; overflow-wrap: anywhere; white-space: normal; }
strong { color: var(--ui-text); font-weight: 600; }
button { flex: none; font: inherit; color: var(--ui-blue); background: var(--ui-blue-soft);
  border: 1px solid var(--ui-border); border-radius: 4px; padding: 3px 7px; cursor: pointer; }
</style>
