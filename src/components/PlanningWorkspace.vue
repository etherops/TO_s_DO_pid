<template>
  <div ref="workspace" class="planning-workspace">
    <nav class="planning-outline" aria-label="File outline">
      <button class="planning-overview" :class="{ active: selection === 'plan' }" @click="selection = 'plan'">
        Selected + WIP
      </button>
      <button class="planning-overview" :class="{ active: selection === 'triage' }" @click="selection = 'triage'">
        Todo + Projects
      </button>
      <button class="planning-overview planning-archive-link" :class="{ active: selection === 'archive' }"
              @click="showArchive">Archive</button>
      <div v-for="column in columns" :key="column.key" class="planning-outline-group">
        <button class="planning-heading-link" :class="{ active: visibleKeys.includes(column.key) }"
                @click="reveal(column.key)">
          <span class="planning-hash">#</span><span>{{ column.key }}</span>
          <span class="planning-outline-count">{{ taskCount(column) }}</span>
        </button>
        <template v-for="(section, index) in column.sections" :key="index">
          <button v-if="section.type !== 'raw-text'" class="planning-section-link"
                  :title="section.name || 'Untitled section'"
                  @click="reveal(column.key, index)">
            <span>{{ section.name || 'Untitled section' }}</span>
            <span class="planning-outline-count">{{ sectionTaskCount(section) }}</span>
          </button>
        </template>
      </div>
    </nav>

    <main class="planning-columns" :class="{ 'single-group': visibleGroups.length === 1 }"
          aria-label="Planning columns">
      <div v-for="group in visibleGroups" :key="group.name" class="planning-group"
           :class="`${group.name.toLowerCase()}-stack`">
        <div v-for="column in group.columns" :key="column.key" class="planning-source"
             :data-planning-column="column.key">
          <slot name="column" :column="column" :show-archive="showArchive"
                :show-archive-weeks="group.name === 'WIP' && column.key === group.columns[0].key" />
        </div>
      </div>
      <p v-if="!visibleGroups.length" class="planning-empty">
        <template v-if="selection === 'archive'">No archived tasks yet. Archived weeks will appear here.</template>
        <template v-else>
        No {{ selection === 'plan' ? 'SELECTED or WIP' : 'TODO or PROJECTS' }} headings in this file.
        Choose another heading from the outline. No headings have been added.
        </template>
      </p>
    </main>

    <aside class="planning-schedule" aria-label="Schedule summary">
      <header><h2>Schedule</h2><span>Open dated work · all live headings</span></header>
      <div v-if="!schedule.length" class="planning-empty">No scheduled work. Add a date to any task.</div>
      <section v-for="group in schedule" :key="group.label" class="planning-schedule-group">
        <h3>{{ group.label }}<span>{{ group.entries.length }}</span></h3>
        <button v-for="entry in group.entries" :key="`${entry.columnKey}-${entry.task.id}`"
                class="planning-schedule-entry" @click="reveal(entry.columnKey, entry.sectionIndex)"
                :title="`Show source section: ${entry.columnKey} › ${entry.section.name}`">
          <span class="planning-schedule-title">{{ entry.parent ? '↳ ' : '' }}{{ entry.title }}</span>
          <span class="planning-schedule-meta">{{ entry.dateLabel }}</span>
          <span class="planning-schedule-source">
            {{ entry.columnKey }} › {{ entry.section.name }}
            <template v-if="entry.parent"> › {{ getStrippedDisplayText(entry.parent.text) }}</template>
          </span>
        </button>
      </section>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, provide, ref, watch } from 'vue';
import { derivePlanningSchedule, planningColumns } from '../utils/planningHelpers';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';

const props = defineProps({
  todoData: { type: Object, required: true }
});
provide('planningWorkspace', true);
const workspace = ref(null);
const selection = ref('plan');
const columns = computed(() => planningColumns(props.todoData));
const schedule = computed(() => derivePlanningSchedule(props.todoData));
const sectionTaskCount = section => (section.items || []).filter(item => item.type === 'task').length;
const taskCount = column => (column.sections || []).reduce((total, section) => total + sectionTaskCount(section), 0);

watch(() => props.todoData, () => {
  const hasPlanning = columns.value.some(column => ['SELECTED', 'WIP'].includes(column.name));
  const hasBacklog = columns.value.some(column => ['TODO', 'PROJECTS'].includes(column.name));
  selection.value = hasPlanning ? 'plan' : hasBacklog ? 'triage' : columns.value[0]?.key || 'plan';
}, { immediate: true });

const visibleGroups = computed(() => {
  const categories = selection.value === 'plan' ? ['SELECTED', 'WIP']
    : selection.value === 'triage' ? ['TODO', 'PROJECTS'] : selection.value === 'archive' ? ['DONE'] : null;
  if (!categories) {
    const column = columns.value.find(candidate => candidate.key === selection.value);
    return column ? [{ name: column.name, columns: [column] }] : [];
  }
  return categories.map(name => ({ name, columns: columns.value.filter(column => column.name === name) }))
    .filter(group => group.columns.length);
});
const visibleKeys = computed(() => visibleGroups.value.flatMap(group => group.columns.map(column => column.key)));

const expandSections = target => {
  if (!target) return;
  // A fully hidden section has no collapse control, but its root is still mounted.
  const sections = target.matches('.section') ? [target] : target.querySelectorAll('.section');
  for (const section of sections) {
    section.dispatchEvent(new CustomEvent('set-collapse-state', { detail: { state: 'normal' } }));
  }
};
const showArchive = async () => {
  selection.value = 'archive';
  await nextTick();
  expandSections(workspace.value.querySelector('.done-stack'));
};

const reveal = async (key, sectionIndex = null) => {
  const column = columns.value.find(candidate => candidate.key === key);
  if (!column) return;
  if (!visibleKeys.value.includes(key)) {
    selection.value = ['SELECTED', 'WIP'].includes(column.name) ? 'plan' : key;
  }
  await nextTick();
  const source = [...workspace.value.querySelectorAll('[data-planning-column]')]
    .find(element => element.dataset.planningColumn === key);
  const target = sectionIndex === null ? source
    : source?.querySelector(`[data-planning-section="${sectionIndex}"]`);
  if (column.name === 'DONE' || sectionIndex !== null) expandSections(target);
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (target) {
    target.animate?.([{ outline: '2px solid var(--ui-blue)' }, { outline: '2px solid transparent' }],
      { duration: 900 });
  }
};
</script>

<style scoped>
.planning-workspace {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr) 235px;
  gap: 16px;
  width: 100%;
  min-height: 0;
  color: var(--ui-text);
}
.planning-outline, .planning-schedule, .planning-group { overflow-y: auto; min-height: 0; }
.planning-outline { padding: 5px 4px 20px 0; }
.planning-outline button {
  display: flex; align-items: center; gap: 7px; width: 100%; border: 0; border-radius: 6px;
  background: transparent; color: var(--ui-text); text-align: left; cursor: pointer;
}
.planning-outline button:hover { background: var(--ui-surface-soft); }
.planning-overview { font-size: 13px; font-weight: 650; padding: 8px; }
.planning-outline button.active { background: var(--ui-surface); box-shadow: inset 3px 0 var(--ui-green); }
.planning-outline-group { margin-top: 14px; }
.planning-heading-link { padding: 6px 8px; font-weight: 700; font-size: 13px; overflow-wrap: anywhere; }
.planning-hash, .planning-outline-count { color: var(--ui-muted); font-weight: 500; }
.planning-outline-count { margin-left: auto; font-size: 11px; }
.planning-outline .planning-section-link { padding: 4px 8px 4px 25px; font-size: 12px; color: var(--ui-muted); }
.planning-section-link > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.planning-outline-count { flex-shrink: 0; }
.planning-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; min-width: 0; min-height: 0; }
.planning-columns.single-group { grid-template-columns: minmax(0, 1fr); }
.planning-group { min-width: 0; padding-bottom: 25px; }
.planning-source { margin-bottom: 14px; }
.planning-schedule { border: 1px solid var(--ui-border); border-radius: var(--ui-radius); background: var(--ui-surface); padding: 15px; }
.planning-schedule h2 { margin: 0 0 3px; font-size: 15px; }
.planning-schedule header > span { color: var(--ui-muted); font-size: 11px; }
.planning-schedule-group { border-top: 1px solid var(--ui-border); margin-top: 16px; padding-top: 10px; }
.planning-schedule h3 { display: flex; justify-content: space-between; margin: 0 0 8px; font-size: 12px; color: var(--ui-blue); }
.planning-schedule-entry {
  display: block; width: 100%; text-align: left; padding: 6px 0; margin: 0; background: none;
  border: 0; color: var(--ui-text); cursor: pointer; border-radius: 4px;
}
.planning-schedule-entry:hover { background: var(--ui-surface-soft); }
.planning-schedule-title { font-size: 12px; display: block; overflow-wrap: anywhere; }
.planning-schedule-meta, .planning-schedule-source { display: block; font-size: 11px; color: var(--ui-muted); margin-top: 2px; }
.planning-schedule-meta { color: var(--ui-blue); }
.planning-empty { font-size: 13px; padding: 16px; color: var(--ui-muted); }
@media (max-width: 1250px) {
  .planning-workspace { grid-template-columns: 145px minmax(0, 1fr); }
  .planning-schedule { grid-column: 2; max-height: 260px; }
  .planning-outline { grid-row: 1 / 3; }
  .planning-workspace { overflow-y: auto; grid-template-rows: minmax(420px, 1fr) auto; }
}
@media (max-width: 780px) {
  .planning-workspace { display: block; overflow-y: auto; }
  .planning-outline { max-height: 180px; margin-bottom: 12px; }
  .planning-columns { display: block; }
  .planning-group { overflow: visible; }
  .planning-schedule { max-height: none; }
}
</style>
