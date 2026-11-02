<template>
  <template v-if="groups.length">
    <header class="planning-archive"><h2>Ready to archive</h2>
      <button class="archive-week-action" @click="$emit('view-archive')">View archive</button>
    </header>
    <section v-for="group in groups" :key="group.name" class="planning-archive-week"
             :aria-label="`Ready to archive: ${group.name}`">
      <div class="archive-week-heading">
        <button class="archive-week-toggle" :aria-expanded="expanded.has(group.name)"
                @click="toggle(group.name)">
          <span aria-hidden="true">{{ expanded.has(group.name) ? '▾' : '▸' }}</span>
          <span>{{ group.name }}<small>{{ group.closed ? 'Closed week' : 'Open / upcoming week' }}</small></span>
          <span class="archive-week-count">{{ group.tasks.length }}</span>
        </button>
        <button class="archive-week-action" :aria-label="`Archive ${group.name}`"
                @click="$emit('archive-week', group.name)">Archive week</button>
      </div>
      <p v-if="group.undatedCount" class="archive-week-note">
        {{ group.undatedCount }} without a completion date; included in this week.
      </p>
      <ul v-if="expanded.has(group.name)" class="archive-week-tasks">
        <li v-for="task in group.tasks" :key="task.id">
          <span class="archive-task-status" :class="{ done: task.statusChar === 'x' }"
                :aria-label="task.statusChar === 'x' ? 'Done' : 'Will not do'">
            {{ task.statusChar === 'x' ? '✓' : '−' }}
          </span>
          <span>{{ getStrippedDisplayText(task.text) }}</span>
        </li>
      </ul>
    </section>
  </template>
</template>

<script setup>
import { computed, ref } from 'vue';
import { groupTasksForArchive, wipArchiveSections } from '../utils/archiveHelpers';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';

const props = defineProps({ todoData: { type: Object, required: true } });
defineEmits(['archive-week', 'view-archive']);
const expanded = ref(new Set());
const groups = computed(() => groupTasksForArchive(
  wipArchiveSections(props.todoData).flatMap(section => section.items || [])
));
const toggle = name => {
  if (expanded.value.has(name)) expanded.value.delete(name);
  else expanded.value.add(name);
};
</script>

<style scoped>
.planning-archive { padding: 4px 2px; color: var(--ui-text); }
header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px 10px; margin-bottom: 5px; }
h2 { margin: 0; font-size: 13px; }
header > span, small, .archive-week-note { color: var(--ui-muted); font-size: 11px; }
.planning-archive-week {
  border: 1px solid var(--ui-border); border-radius: var(--ui-radius-sm); padding: 6px;
  margin-bottom: 10px; background: var(--ui-surface); color: var(--ui-text);
}
.archive-week-heading { display: flex; align-items: center; gap: 8px; }
.archive-week-toggle { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; text-align: left;
  border: 0; background: transparent; color: var(--ui-text); padding: 3px 0; font-size: 12px; cursor: pointer; }
small { display: block; margin-top: 2px; font-weight: 400; }
.archive-week-count { margin-left: auto; font-size: 11px; color: var(--ui-muted); }
.archive-week-action { border: 1px solid var(--ui-border); border-radius: 6px; padding: 4px 7px;
  background: var(--ui-surface-soft); color: var(--ui-text); font-size: 11px; cursor: pointer; flex-shrink: 0; }
.archive-week-action:hover { border-color: var(--ui-green); }
.archive-week-note { margin: 3px 0 3px 16px; }
.archive-week-tasks { list-style: none; margin: 4px 0 0; padding: 0; }
li { display: flex; align-items: center; gap: 7px; border: 1px solid var(--ui-border); border-radius: 6px;
  background: var(--ui-surface-soft); padding: 3px 6px; margin-top: 3px; font-size: 12px; }
li > span:last-child { min-width: 0; overflow-wrap: anywhere; }
.archive-task-status { border: 1.5px solid var(--ui-muted); border-radius: 3px; width: 14px; height: 14px;
  line-height: 14px; text-align: center; color: var(--ui-muted); flex-shrink: 0; }
.archive-task-status.done { border-color: var(--ui-green); color: var(--ui-green); }
</style>
