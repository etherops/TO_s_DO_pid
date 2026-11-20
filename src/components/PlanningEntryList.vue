<template>
  <template v-for="group in groups" :key="group.id">
    <h4 v-if="group.label && group.entries.length" class="planning-entry-heading"
        :class="{ 'planning-low-priority-heading': group.id === 'low' }" :data-entry-group="group.id">
      {{ group.label }} <span>{{ group.entries.length }}</span>
    </h4>
    <PlanningTaskRow v-for="entry in group.entries" :key="entry.task.id" :entry="entry" show-source
      :clock-only="clockOnly"
      :selected="isTaskSelected(entry.task.id)" @update="(...args) => $emit('update', ...args)"
      @refresh="$emit('refresh')" @request-date="(...args) => $emit('request-date', ...args)"
      @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
      @drag-start="$emit('drag-start', $event)"
      @drag-end="$emit('drag-end')" />
  </template>
</template>

<script setup>
import { computed } from 'vue';
import PlanningTaskRow from './PlanningTaskRow.vue';
const props = defineProps({ entries: { type: Array, required: true },
  isTaskSelected: { type: Function, default: () => false }, clockOnly: Boolean });
defineEmits(['update', 'refresh', 'request-date', 'task-click', 'task-context-menu',
  'drag-start', 'drag-end']);
const low = entry => !entry.parent && (entry.task.isLowPriority || entry.task.listMarker === '-');
const groups = computed(() => [
  { id: 'main', entries: props.entries.filter(entry => !low(entry)) },
  { id: 'low', label: 'LOW PRIO', entries: props.entries.filter(low) }
]);
</script>
