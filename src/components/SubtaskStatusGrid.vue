<template>
  <span v-if="statuses.length && task.statusChar !== '!'" class="subtask-status-grid" aria-hidden="true">
    <span v-for="(status, index) in statuses" :key="index" class="subtask-status-block"
          :class="kinds[status]" :data-status="status"></span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ task: { type: Object, required: true } });
const order = [' ', '-', '!', '~', 'x'];
const kinds = { x: 'checked', '~': 'in-progress', '!': 'blocked', ' ': 'unchecked', '-': 'cancelled' };
const statuses = computed(() => {
  const children = (props.task.children || []).filter(child => child.type === 'subtask');
  if (!children.length) return [];
  const shares = order.map(status => {
    const exact = children.filter(child => child.statusChar === status).length * 16 / children.length;
    return { status, count: Math.floor(exact), remainder: exact % 1 };
  });
  const remaining = 16 - shares.reduce((sum, share) => sum + share.count, 0);
  [...shares].sort((a, b) => b.remainder - a.remainder)
    .slice(0, remaining).forEach(share => share.count++);
  return shares.flatMap(share => Array(share.count).fill(share.status));
});
</script>

<style scoped>
.subtask-status-grid { display: grid; width: 100%; aspect-ratio: 1; gap: 0;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr); }
.subtask-status-block { min-width: 0; min-height: 0; }
.checked { background: #4caf50; }
.in-progress { background: #ffb347; }
.blocked { background: var(--ui-blocked, #dc4545); }
.unchecked { position: relative; background: #edf0f3; }
.unchecked::after { content: ''; position: absolute; width: 1px; height: 1px;
  left: 50%; top: 50%; transform: translate(-50%, -50%); border-radius: 50%; background: #a5b0bb; }
.cancelled { background: #8b96a2; }
</style>
