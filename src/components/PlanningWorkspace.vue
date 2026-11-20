<template>
  <div ref="workspace" class="planning-workspace">
    <div class="planning-layout" :style="scheduleColumnWidths">
      <div class="planning-area-label planning-commitment-label">
        <h2 class="planning-area-title planning-commitment-title">SELECTED</h2>
      </div>
      <div class="planning-area-label planning-toolbar">
        <h2 id="planning-scheduled-title" class="planning-area-title">SCHEDULED</h2>
        <span class="planning-scheduled-count">{{ scheduledLanes.reduce((sum, lane) => sum + lane.count, 0) }}</span>
        <button class="planning-action planning-add-task" @click="openAdd">+ Add</button>
        <button class="planning-action planning-open-archive" :aria-expanded="archiveOpen"
                @click="archiveOpen ? closeArchive() : showArchive()">Archive ›</button>
      </div>
      <OutlineDrawer ref="tocDrawer" class="planning-toc" id="planning-toc-panel" label="Show backlog"
                     edge-label="BACKLOG" :width="840" :close-on-leave="false">
        <header class="planning-backlog-header"><h2>BACKLOG</h2>
          <button class="planning-action" aria-label="Close backlog" @click="closeToc">‹ Close</button>
        </header>
        <div class="planning-backlog-workspace">
        <nav class="planning-sidebar planning-outline"
             aria-label="Backlog sections">
          <div v-for="column in backlogColumns" :key="column.key" class="planning-outline-group">
            <button class="planning-heading-link" :class="{ active: selectedKey === column.key }"
                    @click="reveal(column.key)">
              {{ column.key }} <span>{{ taskCount(column) }}</span>
            </button>
            <template v-for="(section, index) in column.sections" :key="index">
              <button v-if="section.type !== 'raw-text' && section.headerStyle !== 'NONE'" class="planning-section-link"
                      @click="reveal(column.key, index)">
                <span>{{ section.name || 'Untitled section' }}</span><span>{{ sectionTaskCount(section) }}</span>
              </button>
            </template>
          </div>
          <p v-if="!backlogColumns.length" class="planning-empty">No backlog sections.</p>
        </nav>
        <section ref="backlogLane" class="planning-source-lane planning-backlog" aria-label="Backlog">
          <p v-if="!backlogColumns.length" class="planning-empty">Add a task to start your backlog.</p>
          <div v-for="column in backlogColumns" :key="column.key"
               :class="`${column.name.toLowerCase()}-stack`" :data-planning-column="column.key">
            <slot name="column" :column="column" />
          </div>
        </section>
        </div>
      </OutlineDrawer>
      <main class="planning-columns" aria-label="Planning columns">
        <section id="planning-projects" class="planning-lane projects-stack" data-planning-lane="PROJECTS" aria-label="PROJECTS">
          <header class="planning-lane-header"><h2>PROJECTS <span>{{ model.projects.length }}</span></h2>
            <button v-if="expandableProjects.length" class="planning-projects-toggle" @click="toggleAllProjects">
              {{ allProjectsExpanded ? 'Collapse all' : 'Expand all' }}
            </button>
          </header>
          <div class="planning-lane-body" @dragover.self="previewProjectEnd" @drop.self="dropProjectEnd">
            <div v-for="project in projectRows" :key="project.entry.task.id" class="planning-project"
                 :class="{ 'project-drop-before': projectDrop?.id === project.entry.task.id && !projectDrop.after,
                           'project-drop-after': projectDrop?.id === project.entry.task.id && projectDrop.after }"
                 @dragover.stop="previewProjectDrop($event, project.entry)"
                 @drop.stop="dropProject($event, project.entry)">
              <div class="planning-project-heading">
                <PlanningTaskRow :entry="project.entry" show-source reorder-project
                  :before-title-edit="() => expandProjectTitle(project)"
                  :selected="isTaskSelected(project.entry.task.id)" @update="updateEntry" @refresh="refresh"
                  @request-date="openSchedule" @task-click="$emit('task-click', $event)"
                  @task-context-menu="$emit('task-context-menu', $event)"
                  @drag-start="dragEntry = $event" @drag-end="endProjectDrag" />
                <button v-if="expandedProjects.has(project.entry.task.id)" class="planning-project-close"
                        :aria-label="`Close ${project.entry.title}`" @click="toggleProject(project.entry.task.id)">Close</button>
              </div>
              <div v-if="expandedProjects.has(project.entry.task.id)"
                   :id="`project-children-${project.entry.task.id}`" class="planning-project-children"
                   role="group" :aria-label="`Subtasks of ${project.entry.title}`">
                <PlanningTaskRow v-for="child in project.children" :key="child.task.id" :entry="child" nested
                                 @update="updateEntry" @refresh="refresh" @request-date="openSchedule"
                                 @drag-start="dragEntry = $event" @drag-end="dragEntry = null" />
                <PlanningSubtaskAdd :entry="project.entry" @update="refresh(); $emit('update')" />
              </div>
            </div>
            <p v-if="!model.projects.length" class="planning-empty">No projects yet.</p>
          </div>
        </section>
        <section id="planning-selected" class="planning-source-lane planning-selected"
                 data-planning-lane="SELECTED" aria-label="TASKS">
          <div v-for="(column, index) in selectedColumns" :key="column.key" class="selected-stack"
               :data-planning-column="column.key">
            <slot name="column" :column="column" :heading-label="index === 0 ? 'TASKS' : column.key" />
          </div>
          <div v-if="!selectedColumns.length" class="planning-lane">
            <header class="planning-lane-header"><h2>TASKS <span>0</span></h2></header>
            <p class="planning-empty">No selected tasks yet.</p>
          </div>
        </section>

      <section v-for="lane in scheduledLanes" :key="lane.id" class="planning-lane planning-scheduled"
               :class="{ 'is-active': activeScheduleLane === lane.id }" @click="activeScheduleLane = lane.id"
               :data-planning-lane="lane.id" :aria-label="`Scheduled: ${lane.label}`">
        <header class="planning-lane-header" :class="{ 'drop-active': dragEntry && lane.value }"
                @dragover.prevent @drop.stop.prevent="dropScheduled(lane, 'WIP')">
          <h2><button class="planning-lane-activate" :aria-pressed="activeScheduleLane === lane.id"
                      :title="lane.label" @click="activeScheduleLane = lane.id">
            <span class="planning-lane-name">{{ lane.label }}</span><span>{{ lane.count }}</span>
          </button></h2>
        </header>
        <button v-if="activeScheduleLane !== lane.id && !dragEntry" class="planning-preview-activate"
                :aria-label="`Activate ${lane.label} schedule`" tabindex="-1"
                @wheel.prevent="scrollSchedulePreview"
                @click.stop="activeScheduleLane = lane.id"></button>
        <div class="planning-lane-body" :inert="activeScheduleLane !== lane.id && !dragEntry">
          <section v-if="lane.projects.length" class="planning-scheduled-projects" data-entry-group="projects">
            <header class="planning-section-heading"><h3>PROJECTS</h3><span>{{ lane.projects.length }}</span></header>
            <PlanningEntryList :entries="lane.projects" :is-task-selected="isTaskSelected"
                @update="updateEntry" @refresh="refresh" @request-date="openSchedule"
                @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
                @drag-start="dragEntry = $event" @drag-end="dragEntry = null" />
          </section>
          <slot v-if="lane.id === 'WIP'" name="archive-weeks" :show-archive="showArchive" />
          <p v-if="lane.id !== 'WIP' && !lane.count" class="planning-empty">Nothing scheduled.</p>
          <section v-for="group in lane.schedule" :key="group.id" class="planning-date-group"
                   :class="{ 'drop-active': dragEntry && group.id !== 'overdue',
                     'is-empty': !group.entries.length, 'future-date-group': group.subgroups }"
                   :data-schedule-group="group.id"
                   @dragover.prevent @drop.stop.prevent="dropScheduled(group, 'WIP')">
            <header class="planning-section-heading">
              <h3>{{ group.label }}</h3>
              <span v-if="!group.entries.length" class="planning-empty-inline">
                {{ group.id === 'overdue' ? 'Nothing overdue.' : 'Nothing scheduled.' }}
              </span>
              <span>{{ group.entries.length }}</span>
            </header>
            <div v-for="subgroup in scheduleSubgroups(group)" :key="subgroup.id" class="planning-day-group"
                 :class="{ 'drop-active': dragEntry && subgroup.value }" :data-schedule-day="subgroup.id"
                 @dragover.prevent @drop.stop.prevent="dropScheduled(subgroup, 'WIP')">
              <header v-if="subgroup.label" class="planning-day-heading">
                <h4>{{ subgroup.label }}</h4><span>{{ subgroup.entries.length }}</span>
              </header>
              <PlanningEntryList :entries="subgroup.entries" :is-task-selected="isTaskSelected" clock-only
                @update="updateEntry" @refresh="refresh" @request-date="openSchedule"
                @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
                @drag-start="dragEntry = $event" @drag-end="dragEntry = null" />
            </div>
          </section>
          <section v-if="lane.needsDate.length" class="planning-date-group planning-needs-date">
            <header class="planning-section-heading"><h3>Needs a date</h3><span>{{ lane.needsDate.length }}</span></header>
            <PlanningEntryList :entries="lane.needsDate" :is-task-selected="isTaskSelected" clock-only
                @update="updateEntry" @refresh="refresh" @request-date="openSchedule"
                @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
                @drag-start="dragEntry = $event" @drag-end="dragEntry = null" />
          </section>
          <section v-for="group in lane.id === 'WIP' ? wipSourceExtras : []" :key="group.key" class="planning-date-group">
            <header class="planning-section-heading"><h3>{{ group.section.name || group.columnKey }}</h3></header>
            <p v-if="group.section.type === 'raw-text'" class="planning-raw">{{ group.section.text }}</p>
            <PlanningEntryList :entries="group.entries" :is-task-selected="isTaskSelected" clock-only
                @update="updateEntry" @refresh="refresh" @request-date="openSchedule"
                @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
                @drag-start="dragEntry = $event" @drag-end="dragEntry = null" />
            <p v-for="(line, index) in group.raw" :key="index" class="planning-raw">{{ line.text }}</p>
          </section>
          <section v-if="lane.id === 'WIP' && wipCompleted.length" class="planning-completed">
            <header class="planning-section-heading">
              <h3>Completed / will not do</h3><span>{{ wipCompleted.length }}</span>
            </header>
            <section v-for="group in completedDays" :key="group.id" class="planning-day-group"
                     :data-completion-day="group.id">
              <header class="planning-day-heading"><h4>{{ group.label }}</h4><span>{{ group.entries.length }}</span></header>
              <PlanningEntryList :entries="group.entries" :is-task-selected="isTaskSelected" clock-only
                @update="updateEntry" @refresh="refresh" @request-date="openSchedule"
                @task-click="$emit('task-click', $event)" @task-context-menu="$emit('task-context-menu', $event)"
                @drag-start="dragEntry = $event" @drag-end="dragEntry = null" />
            </section>
          </section>
        </div>
      </section>
      </main>
    </div>
    <Transition name="archive-slide">
      <aside v-if="archiveOpen" ref="archiveDrawer" class="planning-archive-drawer"
             aria-label="Archive" @keydown.esc.stop="closeArchive">
        <header class="planning-lane-header"><h2>Archive</h2>
          <button class="planning-action" aria-label="Close archive" @click="closeArchive">×</button>
        </header>
        <div class="planning-archive-view done-stack">
          <p v-if="!model.archives.length" class="planning-empty">No archived tasks yet.</p>
          <div v-for="column in model.archives" :key="column.key" :data-planning-column="column.key">
            <slot name="column" :column="column" />
          </div>
        </div>
      </aside>
    </Transition>

    <Teleport v-if="scheduleEntry || addingTask" to=".todo-app">
      <div v-if="addingTask" class="planning-modal-backdrop" @click.self="closeAdd" @keydown.esc.stop="closeAdd">
        <form ref="addDialog" class="planning-dialog planning-add-dialog" role="dialog" aria-modal="true"
              aria-labelledby="planning-add-title" @submit.prevent="saveAddedTask" @keydown.tab="trapDialogFocus">
          <header><h2 id="planning-add-title">Add task</h2>
            <button type="button" aria-label="Close" @click="closeAdd">×</button></header>
          <label>Task<input v-model="newTaskTitle" aria-label="Task title" placeholder="What needs doing?" /></label>
          <label>Section<select v-model="newTaskSection" aria-label="Task section">
            <option :value="null">TODO (directly in column)</option>
            <optgroup v-for="column in addColumns" :key="column.key" :label="column.key">
              <option v-for="section in column.sections.filter(section => section.type === 'section' && !section.on_ice)"
                      :key="section.name" :value="section">{{ section.name || 'Directly in column' }}</option>
            </optgroup>
          </select></label>
          <footer><button type="button" @click="closeAdd">Cancel</button>
            <button type="submit" class="planning-confirm" :disabled="!newTaskTitle.trim()">Add task</button></footer>
        </form>
      </div>
      <div v-if="scheduleEntry" class="planning-modal-backdrop planning-date-backdrop"
           @click.self="closeSchedule" @keydown.esc.stop="closeSchedule">
        <section ref="scheduleDialog" class="planning-dialog planning-date-popover" :style="schedulePosition"
                 role="dialog" aria-modal="true"
                 aria-labelledby="planning-date-title" @keydown.tab="trapDialogFocus">
          <header><h2 id="planning-date-title">Schedule task</h2><button aria-label="Close" @click="closeSchedule">×</button></header>
          <p class="planning-dialog-title">{{ getStrippedDisplayText(scheduleEntry.task.text) }}</p>
          <SubtaskDatePicker :key="scheduleEntry.task.id" :model-value="scheduleValue" subject-label="Task"
                            clear-label="Clear date" :show-close="false"
                            @update:model-value="applySchedule" @close="closeSchedule" />
          <p class="planning-hint">{{ scheduleEntry.parent ? 'Keeps this subtask attached to its parent.'
            : 'Saves immediately. Clear date returns the task to SELECTED.' }}</p>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, provide, ref, shallowRef, watch } from 'vue';
import PlanningTaskRow from './PlanningTaskRow.vue';
import PlanningEntryList from './PlanningEntryList.vue';
import PlanningSubtaskAdd from './PlanningSubtaskAdd.vue';
import OutlineDrawer from './OutlineDrawer.vue';
import SubtaskDatePicker from './SubtaskDatePicker.vue';
import {
  addPlanningTask, planningColumns, derivePlanningModel, reconcilePlanningDate,
  schedulePlanningEntry, groupPlanningEntriesByDuePeriod, groupPlanningEntriesByCompletionDay,
  groupPlanningFutureByWeek
} from '../utils/planningHelpers';
import { extractDuePeriod, formatDuePeriodValue, getDuePeriodLabel } from '../utils/dateHelpers';
import { getCompletionBadgeFromText } from '../utils/completionDateHelpers';
import { getStrippedDisplayText } from '../utils/taskTextHelpers';
import { usePlanningStatusChanges } from '../composables/usePlanningStatusChanges';
import { moveProjectRelativeTo } from '../utils/projectOrder';

const props = defineProps({ todoData: { type: Object, required: true },
  isTaskSelected: { type: Function, default: () => false } });
const emit = defineEmits(['update', 'task-click', 'task-context-menu', 'add-section', 'set-view-mode']);
provide('planningWorkspace', true);
const workspace = ref(null);
const tocDrawer = ref(null);
const closeToc = () => tocDrawer.value?.close();
const model = shallowRef(derivePlanningModel(props.todoData));
const expandedProjects = ref(new Set());
const projectDrop = ref(null);
const canDropProject = target => dragEntry.value && !dragEntry.value.parent && !dragEntry.value.frozen
  && dragEntry.value.task.listMarker === '+' && target && !target.frozen;
const endProjectDrag = () => { dragEntry.value = null; projectDrop.value = null; };
const previewProjectDrop = (event, target, after = null) => {
  if (!canDropProject(target)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const bounds = event.currentTarget.getBoundingClientRect();
  projectDrop.value = { id: target.task.id, after: after ?? event.clientY >= bounds.top + bounds.height / 2 };
};
const dropProject = (event, target, after = projectDrop.value?.after ?? false) => {
  if (!canDropProject(target)) return;
  event.preventDefault();
  // Resolve fresh entries in case the file changed while dragging.
  const source = model.value.projects.find(entry => entry.task.id === dragEntry.value.task.id);
  const destination = model.value.projects.find(entry => entry.task.id === target.task.id);
  endProjectDrag();
  if (!moveProjectRelativeTo(source, destination, after)) return;
  refresh();
  emit('update');
};
const previewProjectEnd = event => previewProjectDrop(event, model.value.projects.at(-1), true);
const dropProjectEnd = event => dropProject(event, model.value.projects.at(-1), true);
const projectRows = computed(() => model.value.projects.map(entry => ({ entry,
  children: (entry.task.children || []).filter(child => child.type === 'subtask').map(task => ({
    ...entry, task, parent: entry.task, title: getStrippedDisplayText(task.text),
    period: extractDuePeriod(task.text), layoutStatus: task.statusChar,
    dateLabel: ['x', '-'].includes(task.statusChar) ? getCompletionBadgeFromText(task.text) : getDuePeriodLabel(task.text)
  }))
})));
const expandableProjects = computed(() => projectRows.value);
const allProjectsExpanded = computed(() => expandableProjects.value.length > 0
  && expandableProjects.value.every(project => expandedProjects.value.has(project.entry.task.id)));
const toggleProject = id => {
  if (expandedProjects.value.has(id)) expandedProjects.value.delete(id);
  else expandedProjects.value.add(id);
};
const expandProjectTitle = project => {
  if (expandedProjects.value.has(project.entry.task.id)) return false;
  toggleProject(project.entry.task.id);
  return true;
};
const toggleAllProjects = () => {
  expandedProjects.value = allProjectsExpanded.value ? new Set()
    : new Set(expandableProjects.value.map(project => project.entry.task.id));
};
const statusChanges = usePlanningStatusChanges(() => {
  refresh();
  emit('update');
  if (!pendingStatuses.size) {
    if (archiveRequested) showArchive();
  }
});
const pendingStatuses = statusChanges.pending;
provide('planningStatusChanges', statusChanges);
const selectedKey = ref(null);
const backlogLane = ref(null);
const columns = computed(() => planningColumns(props.todoData));
const selectedColumns = computed(() => columns.value.filter(column => column.name === 'SELECTED'));
const backlogColumns = computed(() => columns.value
  .filter(column => !['SELECTED', 'WIP', 'DONE'].includes(column.name)));
const addColumns = computed(() => columns.value.filter(column =>
  column.name !== 'DONE' && !column.on_ice && !column.key.toUpperCase().includes('ICE')));
const sectionTaskCount = section => (section.items || []).filter(item => item.type === 'task').length;
const taskCount = column => column.sections.reduce((sum, section) => sum + sectionTaskCount(section), 0);
const archiveOpen = ref(false);
const archiveDrawer = ref(null);
const addingTask = ref(false);
const addDialog = ref(null);
const newTaskTitle = ref('');
const newTaskSection = shallowRef(null);
watch(backlogColumns, available => {
  if (!available.some(column => column.key === selectedKey.value)) {
    selectedKey.value = (available.find(column => column.name !== 'SELECTED') || available[0])?.key || null;
  }
}, { immediate: true });
const reveal = async (key, sectionIndex) => {
  tocDrawer.value?.show();
  selectedKey.value = key;
  await nextTick();
  const column = [...(workspace.value?.querySelectorAll('.planning-backlog [data-planning-column]') || [])]
    .find(element => element.dataset.planningColumn === key);
  const target = sectionIndex === undefined ? column : column?.querySelector(`[data-planning-section="${sectionIndex}"]`);
  target?.dispatchEvent(new CustomEvent('set-collapse-state', { detail: { state: 'normal' } }));
  await nextTick();
  if (!target || !backlogLane.value) return;
  const lane = backlogLane.value;
  const top = lane.scrollTop + target.getBoundingClientRect().top - lane.getBoundingClientRect().top;
  lane.scrollTo?.({ top, behavior: 'auto' });
};
const openAdd = async () => {
  returnFocus = document.activeElement;
  newTaskTitle.value = '';
  newTaskSection.value = addColumns.value.find(column => column.key === selectedKey.value)
    ?.sections.find(section => section.type === 'section' && !section.on_ice) || null;
  addingTask.value = true;
  await nextTick(); addDialog.value?.querySelector('input')?.focus();
};
const closeAdd = () => { addingTask.value = false; returnFocus?.focus?.(); };
const saveAddedTask = () => {
  if (!newTaskTitle.value.trim()) return;
  const section = newTaskSection.value;
  if (section && !addColumns.value.some(column => column.sections.includes(section))) return;
  const task = addPlanningTask(props.todoData, section);
  task.text = newTaskTitle.value.trim(); task.displayText = task.text; task.isNew = false;
  refresh(); emit('update'); closeAdd();
  const owner = backlogColumns.value.find(column => column.sections.some(item => item.items?.includes(task)));
  if (owner) reveal(owner.key, owner.sections.findIndex(item => item.items?.includes(task)));
};
const dragEntry = shallowRef(null);
const scheduleEntry = shallowRef(null);
const scheduleTarget = ref(null);
const scheduleValue = ref('');
const scheduleDialog = ref(null);
const schedulePosition = ref({});
let returnFocus = null;
let archiveRequested = false;
const refresh = () => {
  const liveIds = new Set(Object.values(props.todoData.columnStacks)
    .flatMap(column => (column.sections || []).flatMap(section => (section.items || [])
      .flatMap(task => [task.id, ...(task.children || []).map(child => child.id)]))));
  for (const id of pendingStatuses.keys()) if (!liveIds.has(id)) pendingStatuses.delete(id);
  model.value = derivePlanningModel(props.todoData, new Date(), pendingStatuses);
};
watch(() => props.todoData, (data, old) => {
  if (data !== old) {
    expandedProjects.value.clear();
    projectDrop.value = null;
    statusChanges.reset(); scheduleEntry.value = null;
    dragEntry.value = null; addingTask.value = false; archiveOpen.value = false;
    archiveRequested = false;
  }
  refresh();
}, { deep: true });
const wipCompleted = computed(() => model.value.completed);
const completedDays = computed(() => groupPlanningEntriesByCompletionDay(wipCompleted.value));
const wipSourceExtras = computed(() => model.value.backlog.filter(column => column.name === 'WIP')
  .flatMap(column => column.sections.map(group => ({
    ...group, columnKey: column.key, key: `${column.key}-${group.sectionIndex}`
  }))));
const activeScheduleLane = ref('WIP');
const scrollSchedulePreview = event => {
  const body = event.currentTarget.nextElementSibling;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? body.clientHeight : 1;
  body.scrollBy({ top: event.deltaY * scale, left: event.deltaX * scale });
};
const scheduleColumnWidths = computed(() => Object.fromEntries(['WIP', 'WIP-MONTH', 'WIP-AFTER']
  .map((id, index) => [`--schedule-column-${index}`, activeScheduleLane.value === id
    ? 'minmax(320px, 1.6fr)' : 'minmax(155px, .55fr)'])));
const separateScheduledProjects = lane => {
  const isProject = entry => !entry.parent && entry.task.listMarker === '+';
  const tasksOnly = entries => entries.filter(entry => !isProject(entry));
  const entries = [...lane.schedule.flatMap(group => group.entries), ...lane.needsDate];
  return { ...lane, count: entries.length, projects: entries.filter(isProject),
    needsDate: tasksOnly(lane.needsDate),
    schedule: lane.schedule.map(group => ({ ...group, entries: tasksOnly(group.entries),
      ...(group.subgroups ? { subgroups: group.subgroups
        .map(subgroup => ({ ...subgroup, entries: tasksOnly(subgroup.entries) }))
        .filter(subgroup => subgroup.entries.length) } : {})
    })).filter(group => group.entries.length || ['overdue', 'today', 'week'].includes(group.id))
  };
};
const scheduledLanes = computed(() => {
  const current = model.value.schedule.filter(group => ['overdue', 'today', 'week'].includes(group.id));
  const month = model.value.schedule.find(group => group.id === 'month');
  const future = model.value.schedule.find(group => group.id === 'future');
  const needsDate = model.value.needsDate.filter(entry => entry.columnType === 'WIP');
  return [
    { id: 'WIP', label: 'This week', schedule: current, needsDate },
    { id: 'WIP-MONTH', label: 'Rest of this month', value: month.value,
      schedule: groupPlanningFutureByWeek(month.entries), needsDate: [] },
    { id: 'WIP-AFTER', label: 'After',
      schedule: groupPlanningFutureByWeek(future.entries), needsDate: [] }
  ].map(separateScheduledProjects);
});
const scheduleSubgroups = group => {
  if (!group.entries.length) return [];
  if (group.subgroups) return group.subgroups;
  if (group.id !== 'week') return [{ ...group, label: null }];
  return groupPlanningEntriesByDuePeriod(group.entries)
    .sort((a, b) => Number(b.period.kind === 'week') - Number(a.period.kind === 'week'))
    .map(subgroup => ({
    ...subgroup,
    label: subgroup.period.kind === 'day'
      ? subgroup.period.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      : 'This week · no specific day'
  }));
};
const updateEntry = (entry, payload) => {
  if (!entry) return;
  if (payload?.pendingStatus && !pendingStatuses.has(entry.task.id)) {
    pendingStatuses.set(entry.task.id, { status: entry.layoutStatus, period: entry.period });
  }
  if (payload?.statusSettled) pendingStatuses.delete(entry.task.id);
  if (!entry.section.items.includes(entry.task)) pendingStatuses.delete(entry.task.id);
  if (!pendingStatuses.has(entry.task.id) && !payload?.statusSettled) {
    reconcilePlanningDate(props.todoData, entry);
  }
  refresh();
  emit('update');
  if (!pendingStatuses.size) {
    if (archiveRequested) showArchive();
  }
};
const openSchedule = async (entry, targetCategory = null, event = null) => {
  if (entry.frozen || ['x', '-'].includes(entry.task.statusChar) || pendingStatuses.has(entry.task.id)) return;
  const lane = event?.currentTarget?.closest('.planning-scheduled')?.dataset.planningLane;
  if (lane) activeScheduleLane.value = lane;
  const anchor = (event?.currentTarget || document.activeElement)?.getBoundingClientRect?.();
  returnFocus = document.activeElement;
  schedulePosition.value = {};
  scheduleTarget.value = targetCategory;
  scheduleEntry.value = entry; scheduleValue.value = formatDuePeriodValue(extractDuePeriod(entry.task.text));
  await nextTick();
  const dialog = scheduleDialog.value;
  if (!dialog) return;
  if (anchor?.width) {
    const { width, height } = dialog.getBoundingClientRect();
    const top = anchor.bottom + height + 8 <= window.innerHeight ? anchor.bottom + 6 : anchor.top - height - 6;
    schedulePosition.value = {
      left: `${Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8))}px`,
      top: `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`, position: 'fixed'
    };
  }
  dialog.querySelector('.shortcuts button')?.focus();
};
const closeSchedule = () => { scheduleEntry.value = null; returnFocus?.focus?.(); };
const applySchedule = value => {
  if (!scheduleEntry.value) return;
  if (schedulePlanningEntry(props.todoData, scheduleEntry.value, value, scheduleTarget.value)) emit('update');
  closeSchedule(); refresh();
};
const dropScheduled = (group, targetCategory) => {
  const entry = dragEntry.value; dragEntry.value = null;
  if (!entry || group.id === 'overdue') return;
  if (pendingStatuses.has(entry.task.id)) return;
  if (!group.value) { openSchedule(entry, targetCategory); return; }
  if (schedulePlanningEntry(props.todoData, entry, group.value, targetCategory)) emit('update');
  refresh();
};
const trapDialogFocus = event => {
  const controls = [...event.currentTarget.querySelectorAll('button, input, textarea, select, [tabindex="0"]')]
    .filter(control => !control.disabled && control.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
};
let archiveReturnFocus = null;
const showArchive = async () => {
  if (pendingStatuses.size) { archiveRequested = true; return; }
  archiveRequested = false;
  archiveReturnFocus = document.activeElement;
  archiveOpen.value = true;
  await nextTick();
  archiveDrawer.value?.querySelector('button')?.focus();
  archiveDrawer.value?.querySelectorAll('.section').forEach(section => {
    section.dispatchEvent(new CustomEvent('set-collapse-state', { detail: { state: 'normal' } }));
  });
};
const closeArchive = () => { archiveOpen.value = false; archiveReturnFocus?.focus?.(); };
defineExpose({ refresh });
</script>

<style scoped>
.planning-workspace { display: flex; position: relative; flex-direction: column; gap: 6px; min-height: 0;
  width: 100%; color: var(--ui-text); }
.planning-action { background: var(--ui-surface); border: 1px solid var(--ui-border); border-radius: 6px;
  color: var(--ui-text); padding: 5px 12px; font-size: 13px; cursor: pointer; }
.planning-action:hover { background: var(--ui-surface-soft); }
.planning-layout { --planning-sidebar-width: 44px; display: grid;
  grid-template-columns: var(--planning-sidebar-width) repeat(2, minmax(230px, 1fr))
    var(--schedule-column-0) var(--schedule-column-1) var(--schedule-column-2);
  grid-template-rows: auto minmax(0, 1fr); gap: 6px 14px; flex: 1; min-height: 0; overflow-x: auto; }
.planning-layout { transition: grid-template-columns 280ms cubic-bezier(.22, 1, .36, 1); }
.planning-sidebar { overflow-y: auto; min-height: 0; min-width: 0; border: 0; background: transparent; }
.planning-toc { grid-column: 1; grid-row: 1 / 3; }
.planning-toc :deep(.outline-drawer-track),
.planning-toc :deep(.outline-drawer-panel) { max-width: calc(100vw - 30px); }
.planning-toc :deep(.outline-drawer-content) { display: flex; flex-direction: column; overflow: hidden; }
.planning-backlog-header { display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid var(--ui-border); }
.planning-backlog-header h2 { font-size: 18px; letter-spacing: 2px; }
.planning-backlog-workspace { display: grid; grid-template-columns: 160px minmax(0, 1fr);
  flex: 1; min-height: 0; gap: 8px; padding: 8px; }
.planning-backlog-workspace .planning-outline { border-right: 1px solid var(--ui-border); }
.planning-outline { box-sizing: border-box; padding: 10px 8px; }
.planning-outline-group { margin-bottom: 14px; }
.planning-outline button { display: flex; align-items: center; gap: 7px; width: 100%; border: 0;
  border-radius: 6px; background: transparent; color: var(--ui-text); text-align: left; cursor: pointer; }
.planning-outline button:hover { background: var(--ui-surface-soft); }
.planning-outline button.active { background: var(--ui-surface); }
.planning-heading-link { padding: 6px 8px; font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
.planning-outline button > span:last-child { margin-left: auto; color: var(--ui-muted); font-size: 11px; flex-shrink: 0; }
.planning-section-link { padding: 4px 8px 4px 20px; font-size: 12px; }
.planning-section-link > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.planning-source-lane { min-width: 0; min-height: 0; overflow-y: auto; padding-bottom: 20px; }
.planning-area-label { display: flex; align-items: center; font-size: 10px; font-weight: 700;
  letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--ui-muted); padding: 0 8px 2px; }
.planning-area-title { margin: 0; font-size: 24px; line-height: 22px; font-weight: 800;
  letter-spacing: 4px; white-space: nowrap; }
.planning-area-label .planning-action { margin-left: auto; padding: 3px 9px; font-size: 12px; }
.planning-area-label .planning-action + .planning-action { margin-left: 6px; }
.planning-area-label span { font-weight: 500; letter-spacing: 0; text-transform: none; margin-left: 7px; }
.planning-commitment-label { grid-column: 2 / 4; border-bottom: 1px solid var(--ui-border-strong); }
.planning-toolbar { grid-column: 4 / 7; border-bottom: 1px solid var(--ui-border-strong); }
.planning-backlog > [data-planning-column] + [data-planning-column] { margin-top: 14px; }
.planning-archive-drawer { position: absolute; z-index: 100; top: 30px; bottom: 0; right: 0;
  width: min(640px, 90%); display: flex; flex-direction: column; background: var(--ui-surface);
  border: 1px solid var(--ui-border); border-radius: 12px 0 0 12px; box-shadow: -12px 0 30px #182a3d22; }
.planning-archive-view { flex: 1; padding: 10px; }
.archive-slide-enter-active, .archive-slide-leave-active { transition: transform .2s ease, opacity .2s ease; }
.archive-slide-enter-from, .archive-slide-leave-to { transform: translateX(30px); opacity: 0; }
.planning-add-dialog label { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; font-size: 13px; }
.planning-add-dialog input, .planning-add-dialog select { width: 100%; box-sizing: border-box; padding: 9px;
  background: var(--ui-surface); color: var(--ui-text); border: 1px solid var(--ui-border); border-radius: 6px; }
.planning-add { background: transparent; border: 1px solid transparent;
  border-radius: 5px; color: var(--ui-muted); font-size: 12px; padding: 3px 7px; cursor: pointer; }
.planning-columns { grid-column: 2 / 7; grid-row: 2; display: grid;
  isolation: isolate;
  grid-template-columns: subgrid; gap: 14px;
  grid-template-rows: minmax(0, 1fr);
  flex: 1; min-height: 0; min-width: 0; }
.planning-backlog { min-height: 0; }
.planning-selected { grid-column: 2; grid-row: 1; padding-bottom: 0; }
.planning-selected > [data-planning-column] + [data-planning-column] { margin-top: 10px; }
.planning-columns > .projects-stack { grid-column: 1; grid-row: 1; }
.projects-stack > .planning-lane-body { padding-bottom: 8px; }
.projects-stack :deep(.inline-note-preview) { display: none; }
.projects-stack :deep(.planning-source-badge) { max-width: 48px; }
.planning-columns > [data-planning-lane="WIP"] { grid-column: 3; grid-row: 1; }
.planning-columns > [data-planning-lane="WIP-MONTH"] { grid-column: 4; grid-row: 1; }
.planning-columns > [data-planning-lane="WIP-AFTER"] { grid-column: 5; grid-row: 1; }
.planning-scheduled > .planning-lane-header { height: 32px; box-sizing: border-box; }
.planning-scheduled > .planning-lane-header h2 { font-size: 13px; min-width: 0; width: 100%; }
.planning-scheduled-projects { padding: 0 3px 9px; margin-bottom: 8px;
  border-bottom: 1px solid var(--ui-border-strong); }
.planning-scheduled-projects > .planning-section-heading h3 { color: var(--ui-muted); letter-spacing: 1px; }
.planning-scheduled[data-planning-lane="WIP"] { border-radius: 12px 0 0 12px; }
.planning-scheduled[data-planning-lane="WIP-MONTH"] { margin-left: -14px; border-left: 0; border-radius: 0; }
.planning-scheduled[data-planning-lane="WIP-AFTER"] { margin-left: -14px; border-left: 0; border-radius: 0 12px 12px 0; }
.planning-scheduled:not(.is-active) { background: var(--ui-surface-soft); }
.planning-scheduled:not(.is-active) > .planning-lane-body { opacity: .72; cursor: pointer; padding: 4px 6px 8px; }
.planning-scheduled:not(.is-active) :deep(.planning-task-grip),
.planning-scheduled:not(.is-active) :deep(.task-buttons-container),
.planning-scheduled:not(.is-active) :deep(.completion-date-trigger),
.planning-scheduled:not(.is-active) :deep(.subtask-indicator),
.planning-scheduled:not(.is-active) :deep(.planning-source-badge),
.planning-scheduled:not(.is-active) :deep(.planning-child-actions),
.planning-scheduled:not(.is-active) :deep(.planning-child-date) { display: none; }
.planning-scheduled:not(.is-active) :deep(.planning-task-row) { padding-left: 0; }
.planning-scheduled:not(.is-active) :deep(.task-card),
.planning-scheduled:not(.is-active) :deep(.planning-child-row) {
  padding: 4px; margin-bottom: 3px; box-shadow: none; border-radius: 5px; }
.planning-scheduled:not(.is-active) :deep(.task-title),
.planning-scheduled:not(.is-active) :deep(.planning-child-title) {
  font-size: 11px; line-height: 15px; font-weight: 500; white-space: nowrap;
  display: block; overflow: hidden; text-overflow: ellipsis; }
.planning-scheduled:not(.is-active) :deep(.task-content-area) { margin: 0 0 0 5px; gap: 0; }
.planning-scheduled:not(.is-active) :deep(.checkbox-wrapper) { flex-basis: 18px; width: 18px; margin-top: 0; }
.planning-scheduled:not(.is-active) :deep(.custom-checkbox),
.planning-scheduled:not(.is-active) :deep(.planning-child-status) {
  width: 14px; height: 14px; flex-shrink: 0; line-height: 14px; }
.planning-scheduled:not(.is-active) :deep(.low-priority-task-card .custom-checkbox) { width: 12px; height: 12px; }
.planning-scheduled:not(.is-active) .planning-day-heading h4,
.planning-scheduled:not(.is-active) .planning-section-heading h3 { font-size: 11px; }
.planning-scheduled:not(.is-active) > .planning-lane-header { color: var(--ui-muted); }
.planning-scheduled { position: relative; transition: background-color 220ms ease; }
.planning-preview-activate { position: absolute; inset: 32px 0 0; z-index: 1;
  border: 0; background: transparent; cursor: pointer; border-radius: inherit; }
.planning-scheduled > .planning-lane-body { transition: opacity 220ms ease; }
.planning-scheduled > .planning-lane-header { transition: color 220ms ease; }
.planning-lane-activate { padding: 0; border: 0; background: transparent; color: inherit;
  font: inherit; text-align: left; cursor: pointer; display: flex; align-items: center; width: 100%; min-width: 0; }
.planning-lane-activate .planning-lane-name { font: inherit; color: inherit; margin: 0;
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.planning-lane-activate > span:last-child { flex-shrink: 0; }
.planning-lane-activate:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .planning-layout, .planning-scheduled, .planning-scheduled > .planning-lane-body,
  .planning-scheduled > .planning-lane-header { transition: none; }
}
.planning-lane { display: flex; flex-direction: column; min-height: 0; min-width: 0;
  border: 1px solid var(--ui-border); border-radius: 12px; background: var(--ui-surface); }
.planning-lane-header { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 5px 10px; border-bottom: 1px solid var(--ui-border); flex: none; }
h2, h3, p { margin: 0; }
.planning-lane-header h2 { font-size: 16px; font-weight: 700; }
.planning-lane-header h2 span { margin-left: 7px; font-size: 12px; color: var(--ui-muted); font-weight: 500; }
.planning-lane-caption { font-size: 11px; color: var(--ui-muted); }
.planning-lane-body { overflow-y: auto; min-height: 0; padding: 4px 8px 8px; scrollbar-color: var(--ui-border-strong) transparent; }
.planning-project-heading { display: flex; align-items: flex-start; min-width: 0; }
.planning-project-heading > .planning-task-row { flex: 1; min-width: 0; }
.projects-stack :deep(.note-date-row) { grid-template-columns: minmax(0, 1fr); }
.projects-stack :deep(.note-date-row > *) { grid-column: 1; }
.planning-project-heading:has(.task-edit-wrapper) { display: block; }
.planning-project-heading:has(.task-edit-wrapper) > .planning-task-row { padding-left: 0; }
.planning-project-heading:has(.task-edit-wrapper) .planning-task-grip { display: none; }
.projects-stack :deep(.task-card:has(.task-edit-wrapper)) { padding: 6px; }
.planning-project-heading:has(.task-edit-wrapper) > .planning-project-close,
.planning-project:has(.task-edit-wrapper) > .planning-project-children { display: none; }
.projects-stack :deep(.task-content-wrapper:has(> .task-edit-wrapper)) {
  display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px 6px; }
.projects-stack :deep(.task-edit-wrapper) { display: contents; }
.projects-stack :deep(.task-edit-row) { grid-column: 2; min-width: 0; }
.projects-stack :deep(.note-date-row), .projects-stack :deep(.edit-actions-row) { grid-column: 1 / -1; }
.planning-workspace .projects-stack :deep(.edit-actions-row) { gap: 4px; flex-wrap: nowrap; }
.projects-stack :deep(.edit-actions-row > button) {
  padding: 4px 6px; font-size: 11px; min-width: 0; margin: 0; white-space: nowrap; transform: none;
}
.projects-stack :deep(.subtask-date) { width: 22px; padding: 1px 3px; box-sizing: border-box; }
.projects-stack :deep(.subtask-edit-row) { gap: 4px; padding: 2px 3px; }
.planning-project-close { flex: none; margin: 5px 0 0 3px; padding: 3px;
  color: var(--ui-muted); border: 0; border-radius: 4px; background: transparent; font-size: 11px; cursor: pointer; }
.planning-projects-toggle { border: 0; border-radius: 4px; background: transparent; color: var(--ui-muted);
  font: 500 11px var(--ui-font); padding: 4px; white-space: nowrap; cursor: pointer; }
.planning-project { position: relative; }
.project-drop-before::before, .project-drop-after::after { content: ''; position: absolute;
  left: 14px; right: 0; height: 3px; border-radius: 2px; background: var(--ui-blue);
  pointer-events: none; z-index: 2; }
.project-drop-before::before { top: -2px; }
.project-drop-after::after { bottom: -1px; }
.planning-project-close:hover, .planning-projects-toggle:hover { color: var(--ui-text); background: var(--ui-surface-soft); }
.planning-project-close:focus-visible, .planning-projects-toggle:focus-visible {
  outline: 2px solid var(--ui-blue); outline-offset: 1px; }
.planning-project-children { margin: 0 0 8px 18px; padding: 0 2px 3px 0; }
.planning-source { margin-top: 12px; }
.planning-source-header, .planning-section-heading { display: flex; align-items: center; gap: 6px; }
.planning-source-header { justify-content: space-between; padding: 5px 2px; border-bottom: 1px solid var(--ui-border); }
.planning-source-header h3 { font-size: 12px; letter-spacing: 1.4px; color: var(--ui-muted); }
.planning-backlog-section { margin-top: 6px; }
.planning-section-heading { padding: 6px 0; }
.planning-section-heading h3 { flex: 1; font-size: 12px; font-weight: 700; }
.planning-section-heading > span { font-size: 11px; color: var(--ui-muted); }
.planning-section-toggle { flex: 1; min-width: 0; text-align: left; background: none; border: 0;
  color: var(--ui-text); font-size: 12px; font-weight: 600; cursor: pointer; }
.planning-section-toggle span { margin-left: 6px; color: var(--ui-muted); font-weight: 400; }
.planning-date-group { margin-bottom: 12px; padding: 0 3px 3px; border-bottom: 1px solid var(--ui-border); }
.planning-date-group.is-empty { margin-bottom: 3px; padding-bottom: 0; }
.planning-date-group.is-empty .planning-section-heading { padding: 3px 0; }
.planning-date-group.is-empty .planning-section-heading h3 { flex: 0 0 auto; }
.planning-empty-inline { flex: 1; margin-left: 4px; }
.planning-day-heading { display: flex; align-items: center; gap: 6px; padding: 3px 0 2px;
  font-size: 11px; color: var(--ui-blue); }
.planning-day-heading h4 { flex: 1; margin: 0; font-size: inherit; font-weight: 600; }
.planning-day-group + .planning-day-group { margin-top: 4px; }
[data-schedule-group="overdue"] h3 { color: #d65b50; }
[data-schedule-group="today"] h3 { color: #c98a25; }
.future-date-group h3 { color: var(--ui-blue); }
.planning-empty, .planning-hint { color: var(--ui-muted); font-size: 12px; line-height: 1.5; padding: 8px 0; }
.planning-hint { font-size: 11px; padding: 0 0 6px; }
.planning-empty.compact { padding: 5px 14px 8px; font-size: 11px; }
.planning-raw { white-space: pre-wrap; font-size: 12px; color: var(--ui-muted); padding: 4px; }
.drop-active { outline: 1px dashed var(--ui-green); outline-offset: -2px; }
.planning-completed { padding: 0 3px 3px; }
.planning-archive-view { overflow-y: auto; min-height: 0; }
.planning-section-rename { display: flex; gap: 5px; padding: 5px; }
.planning-section-rename input { min-width: 0; flex: 1; }
.planning-modal-backdrop { position: fixed; inset: 0; z-index: 11000; display: grid; place-items: center;
  padding: 20px; background: #10182066; }
.planning-dialog { width: min(460px, calc(100vw - 40px)); box-sizing: border-box; max-height: 90vh; overflow-y: auto;
  background: var(--ui-surface, #fff); color: var(--ui-text, #28313d); border: 1px solid var(--ui-border, #d8dfe8);
  border-radius: 12px; padding: 16px; box-shadow: 0 16px 60px #0003; }
.planning-dialog header { display: flex; align-items: center; justify-content: space-between; }
.planning-dialog h2 { font-size: 15px; }
.planning-dialog button { border: 1px solid var(--ui-border, #d8dfe8); border-radius: 6px; padding: 5px 9px;
  color: inherit; background: var(--ui-surface-soft, #f4f6f8); cursor: pointer; }
.planning-dialog button:disabled { opacity: .5; cursor: default; }
.planning-dialog-title { margin: 10px 0; overflow-wrap: anywhere; font-size: 14px; }
.planning-date-shortcuts { display: flex; gap: 6px; margin: 10px 0; }
.planning-dialog footer { display: flex; gap: 6px; justify-content: flex-end; margin-top: 12px; }
.planning-dialog .planning-confirm { border-color: var(--ui-green, #4caf50); }
.planning-date-backdrop { background: transparent; }
.planning-date-popover { width: min(360px, calc(100vw - 16px)); padding: 10px;
  --subtask-border: var(--ui-border); --subtask-fill: var(--ui-surface-soft); }
.planning-date-popover .planning-dialog-title { margin: 6px 0; font-size: 12px; }
.planning-date-popover :deep(.subtask-date-picker) { width: auto; margin: 0 0 6px; }
.planning-date-popover .planning-hint { padding: 0; font-size: 10px; }
@media (max-width: 800px) {
  .planning-area-title { font-size: 18px; letter-spacing: 2px; }
  .planning-backlog-workspace { grid-template-columns: 120px minmax(0, 1fr); }
}
</style>
