<!-- components/ReviewMode.vue -->
<!-- Full-screen retrospective view: what got done, what slipped, and what is
     landing - laid out on a Sunday-Saturday week strip or a month calendar,
     with a clickable calendar-year bar chart above the month grid.
     Unfinished work can be rescheduled directly; history stays read-only. -->
<template>
  <div class="review-mode" :class="`theme-${theme}`" @keydown.esc="handleEscape">
    <section class="review-card calendar-month-summary" aria-label="Month statistics">
      <h1 class="calendar-month-heading">{{ model.label }}</h1>
      <div class="review-metrics">
        <div v-for="tile in statTiles" :key="tile.key" class="review-stat" :class="`stat-${tile.key}`"
             :title="`${tile.label}: ${tile.hint}`">
          <div class="review-stat-value">{{ tile.value }}</div>
          <div class="review-stat-label">{{ tile.shortLabel || tile.label }}</div>
        </div>
      </div>
    </section>
    <aside class="calendar-selection-pane">
      <div class="calendar-selected-heading">SELECTED</div>
    <section class="review-card calendar-selected-projects">
      <div class="review-card-head"><h2>Projects</h2>
        <span class="calendar-count">{{ model.selectedProjects.length }}</span></div>
      <div class="calendar-month-scroll">
        <ul class="review-entry-list calendar-project-tiles">
          <CalendarTaskRow v-for="entry in model.selectedProjects" :key="entry.task.id" :entry="entry" show-date tile
                           @move-start="startMove" @move-end="cancelMove" />
        </ul>
        <p v-if="!model.selectedProjects.length" class="review-empty">No selected projects due this month.</p>
      </div>
    </section>
    <section class="review-card calendar-month-tasks">
      <div class="calendar-month-task-scroll">
      <div class="review-card-head"><h2>Tasks</h2>
        <span class="calendar-count">{{ model.monthTasks.length }}</span></div>
      <ul class="review-entry-list calendar-month-project-groups">
          <li v-for="group in monthProjectGroups" :key="group.key" class="calendar-project-group">
            <button class="calendar-project-group-toggle" :aria-expanded="expandedMonthProjects.has(group.key)"
                    :aria-controls="`calendar-project-children-${group.parent.id}`"
                    @click="toggleMonthProject(group.key)">
              <span class="calendar-project-group-title" :title="group.title">{{ group.title }}</span>
              <span class="calendar-project-group-count">{{ group.entries.length }}</span>
              <span aria-hidden="true">{{ expandedMonthProjects.has(group.key) ? '▾' : '▸' }}</span>
            </button>
            <ul v-if="expandedMonthProjects.has(group.key)" :id="`calendar-project-children-${group.parent.id}`"
                class="review-entry-list calendar-project-group-children">
              <CalendarTaskRow v-for="entry in group.entries" :key="entry.task.id" :entry="entry"
                               @move-start="startMove" @move-end="cancelMove" />
            </ul>
          </li>
      </ul>
      <ul class="review-entry-list calendar-month-standalone">
        <CalendarTaskRow v-for="group in monthStandaloneTasks" :key="group.key" :entry="group.entries[0]"
                         @move-start="startMove" @move-end="cancelMove" />
      </ul>
      <p v-if="!model.monthTasks.length" class="review-empty">No tasks selected for this month.</p>
      </div>
    </section>
    </aside>
    <header class="review-header">
      <div class="review-chart-pane">
        <div class="review-year-chart">
          <div class="review-side-label year">{{ yearBars.year }}</div>
          <button
              v-for="month in yearBars.months"
              :key="month.key"
              type="button"
              class="review-year-col"
              :class="{ 'is-anchor': isAnchorMonth(month), 'is-current': month.isCurrent, 'is-future': month.isFuture }"
              :title="`${month.label}: ${month.completed.length} completed, ${month.cancelled.length} will not do, ${month.due.length} still open`"
              @click="goToMonth(month)"
          >
            <div class="review-year-value">{{ monthTotal(month) || '' }}</div>
            <div class="review-year-track">
              <span class="review-year-seg done" :style="{ height: barHeight(month.completed.length) }"></span>
              <span class="review-year-seg dropped" :style="{ height: barHeight(month.cancelled.length) }"></span>
              <span class="review-year-seg open" :style="{ height: barHeight(month.due.length) }"></span>
            </div>
            <div class="review-year-label">{{ month.monthLabel }}</div>
          </button>
        </div>
      </div>

      <div class="review-header-side">
        <!-- Each arrow pair flanks the value it changes, so nothing has to be
             learned about which chevron means year and which means month. -->
        <div class="review-nav">
          <div class="review-stepper">
            <button class="review-step-btn" title="Previous year" @click="stepYear(-1)">‹</button>
            <span class="review-step-value year">{{ yearBars.year }}</span>
            <button class="review-step-btn" title="Next year" @click="stepYear(1)">›</button>
          </div>

          <div class="review-stepper month-stepper">
            <button class="review-step-btn" title="Previous month" @click="step(-1)">‹</button>
            <span class="review-step-value month">{{ monthName }}</span>
            <button class="review-step-btn" title="Next month" @click="step(1)">›</button>
          </div>

          <button class="review-this-month-btn" :disabled="model.isCurrentPeriod"
                  title="Jump to the current month" @click="goToCurrentMonth">This Month</button>
        </div>

        <!-- The swatches double as the chart's legend, so the year's totals and
             the key they explain are one thing instead of two. -->
        <div class="review-year-totals">
          <div v-for="total in yearTotals" :key="total.key" class="review-year-total">
            <span class="review-legend-swatch" :class="total.key"></span>
            <span class="review-year-total-value">{{ total.value }}</span>
            <span class="review-year-total-label">{{ total.label }}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="review-body">
        <section class="review-grid-pane">

        <div class="review-grid-body">
          <div class="review-weekday-row">
            <div class="review-weekday calendar-week-label">Not yet complete</div>
            <div v-for="label in model.weekdayLabels" :key="label" class="review-weekday">{{ label }}</div>
          </div>

          <div class="review-weeks">
          <div v-for="(week, weekIndex) in model.weeks" :key="weekIndex" class="review-week-row"
               :class="{ 'is-prominent-week': model.selectedWeeks[weekIndex].key === prominentWeekKey }">
            <section class="calendar-week-selection" :data-week="model.selectedWeeks[weekIndex].key">
              <button class="calendar-section-label calendar-week-toggle"
                      :aria-pressed="model.selectedWeeks[weekIndex].key === prominentWeekKey"
                      title="Make this week taller" @click="selectedWeekKey = model.selectedWeeks[weekIndex].key">
                {{ model.selectedWeeks[weekIndex].label }}
                <span>{{ model.selectedWeeks[weekIndex].entries.length }}</span></button>
              <ul class="review-entry-list">
                <CalendarTaskRow v-for="entry in model.selectedWeeks[weekIndex].entries" :key="entry.task.id"
                                 :entry="entry" @move-start="startMove" @move-end="cancelMove" />
              </ul>
              <p v-if="!model.selectedWeeks[weekIndex].entries.length" class="review-empty">Nothing selected.</p>
            </section>
            <article
                v-for="day in week"
                :key="day.key"
                class="review-day"
                :class="dayClasses(day)"
                :data-date="day.key"
                @dragover="previewMove($event, day)"
                @dragleave="leaveDay($event, day)"
                @drop.prevent.stop="dropOnDay(day)"
            >
              <button
                  type="button"
                  class="review-day-summary"
                  :aria-label="`Open Focus for ${day.label}`"
                  :title="`Open Focus for ${day.label}`"
                  @click.stop="openFocusDay(day)"
              >
              <div class="review-day-head">
                <span class="review-day-number">{{ day.dayOfMonth }}</span>
                <span v-if="bucketTotal(day)" class="review-day-total">{{ bucketTotal(day) }}</span>
              </div>
              </button>
              <button class="review-day-meter" :aria-label="`Show completed work for ${day.label}`"
                      :aria-pressed="day.key === selectedBucketKey" @click.stop="selectBucket(day)">
                <span class="meter-fill done" :style="{ width: meterWidth(day.completed.length) }"></span>
                <span class="meter-fill dropped" :style="{ width: meterWidth(day.cancelled.length) }"></span>
                <span class="meter-fill open" :style="{ width: meterWidth(day.due.length) }"></span>
              </button>
              <ul v-if="bucketTotal(day)" class="calendar-day-tasks" tabindex="0"
                  :aria-label="`Tasks for ${formatDateForTooltip(day.date)}`"
                  @keydown.esc.stop="cancelMove" @keydown.stop>
                <CalendarTaskRow v-for="entry in dayEntries(day)" :key="entry.task.id" :entry="entry"
                                 @move-start="startMove" @move-end="cancelMove" />
              </ul>
            </article>
              </div>
            </div>
          </div>
        </section>
    </div>
    <div class="calendar-drawer-track">
      <aside class="review-rail" :class="{ 'is-open': completedOpen }" aria-label="Completed work">
        <button ref="completedGrip" class="calendar-completed-toggle" :aria-expanded="completedOpen"
                aria-controls="calendar-completed-drawer" :aria-label="`Completed in ${monthName}: ${monthCompletedCount}`"
                @click="toggleCompleted">
          <span aria-hidden="true">{{ completedOpen ? '›' : '‹' }}</span>
          <span class="calendar-drawer-edge-label" aria-hidden="true">COMPLETED IN {{ monthName }}</span>
          <span class="calendar-count">{{ monthCompletedCount }}</span>
        </button>
        <div id="calendar-completed-drawer" class="calendar-completed-content"
             :inert="!completedOpen" :aria-hidden="!completedOpen">
        <button class="review-this-month-btn calendar-drawer-close" @click="closeCompleted">Close ›</button>
        <section v-if="!selectedBucket" class="review-card review-day-detail">
          <div class="review-card-head">
            <h2>Completed in {{ monthName }}</h2>
            <span class="review-card-note">{{ monthCompletedCount }}</span>
          </div>
          <div v-if="!monthCompletedCount" class="review-empty">Nothing completed this month yet.</div>
          <div v-for="week in monthCompletionWeeks" :key="week.key" class="review-day-group">
            <div class="review-day-divider">{{ week.label }}</div>
            <div v-for="day in week.days" :key="day.key" class="review-day-subgroup">
              <div class="review-day-sublabel">{{ day.label }}</div>
              <ul class="review-entry-list">
                <li v-for="entry in day.entries" :key="entry.task.id" class="review-entry">
                  <span class="review-item-dot bucket-completed" aria-hidden="true"></span>
                  <span class="review-entry-text" :title="entry.title">{{ entry.title }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section v-else class="review-card review-day-detail">
          <div class="review-card-head">
            <h2>Completed · {{ selectedBucketHeading }}</h2>
            <button class="review-card-close" title="Close detail" @click="selectedBucketKey = null">✕</button>
          </div>
          <div v-if="!selectedBucket.completed.length" class="review-empty">Nothing completed on this day.</div>
          <div v-for="group in selectedBucketGroups" :key="group.key" class="review-group">
            <div class="review-group-title" :class="`bucket-${group.key}`">{{ group.label }} · {{ group.entries.length }}</div>
            <ul class="review-entry-list">
              <li v-for="entry in group.entries" :key="entry.task.id" class="review-entry">
                <span class="review-item-dot" :class="`bucket-${entry.bucket}`" aria-hidden="true"></span>
                <span class="review-entry-text">
                  {{ entry.title }}
                  <span v-if="entry.sectionName" class="review-entry-section">({{ entry.sectionName }})</span>
                </span>
              </li>
            </ul>
          </div>
        </section>
        </div>
      </aside>
    </div>
    <p class="calendar-move-feedback" role="status">{{ moveMessage }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
  MONTHS_IN_YEAR,
  deriveCalendarYearBars,
  deriveReviewModel,
  groupCalendarProjectTasks,
  rescheduleCalendarTask,
  shiftAnchor
} from '../utils/reviewModeHelpers';
import { formatDateForTooltip, formatWeekPeriodLabel } from '../utils/dateHelpers';
import CalendarTaskRow from './CalendarTaskRow.vue';

const props = defineProps({
  todoData: { type: Object, default: () => ({ columnOrder: [], columnStacks: {} }) },
  theme: { type: String, default: 'light' }
});

const anchor = ref(new Date());
const selectedBucketKey = ref(null);
const completedOpen = ref(false);
const completedGrip = ref(null);
const closeCompleted = () => {
  if (!completedOpen.value) return;
  completedOpen.value = false;
  completedGrip.value?.focus();
};
const toggleCompleted = () => {
  selectedBucketKey.value = null;
  completedOpen.value = !completedOpen.value;
};
const handleEscape = () => {
  if (movingId.value) cancelMove();
  else closeCompleted();
};
const emit = defineEmits(['update', 'open-focus']);
const movingId = ref(null);
const dropDate = ref(null);
const moveMessage = ref('');
const endMove = () => { movingId.value = null; dropDate.value = null; };
const cancelMove = () => {
  if (!movingId.value) return;
  endMove();
  moveMessage.value = 'Move cancelled.';
};
watch(() => props.todoData, endMove);
const startMove = (entry, event) => {
  if (['completed', 'cancelled'].includes(entry.bucket) || entry.frozen || entry.columnType === 'DONE') {
    event.preventDefault();
    return;
  }
  movingId.value = entry.task.id;
  moveMessage.value = `Move ${entry.title}: drop on a date, or focus a date and press Enter. Escape cancels.`;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entry.task.id);
  }
};
const previewMove = (event, day) => {
  if (!movingId.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dropDate.value = day.key;
};
const leaveDay = (event, day) => {
  if (!event.currentTarget.contains(event.relatedTarget) && dropDate.value === day.key) dropDate.value = null;
};
const dropOnDay = day => {
  if (movingId.value && rescheduleCalendarTask(props.todoData, movingId.value, day.key)) {
    emit('update');
    moveMessage.value = `Rescheduled to ${formatDateForTooltip(day.date)}.`;
  }
  endMove();
};

const model = computed(() => deriveReviewModel(props.todoData, { anchor: anchor.value }));
const monthTaskGroups = computed(() => groupCalendarProjectTasks(model.value.monthTasks));
const monthProjectGroups = computed(() => monthTaskGroups.value.filter(group => group.parent));
const monthStandaloneTasks = computed(() => monthTaskGroups.value.filter(group => !group.parent));
const expandedMonthProjects = ref(new Set());
const selectedWeekKey = ref(null);
const prominentWeekKey = computed(() => selectedWeekKey.value
  ?? model.value.selectedWeeks.find((week, index) => model.value.weeks[index].some(day => day.isToday))?.key);
const toggleMonthProject = key => {
  const next = new Set(expandedMonthProjects.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedMonthProjects.value = next;
};
watch(() => model.value.periodStart.getTime(), () => {
  expandedMonthProjects.value = new Set();
  selectedWeekKey.value = null;
});

// One anchor drives both the grid and the chart, so they can never disagree:
// entering a month pulls the chart to its year, and changing year carries the
// grid along to the same month of that year.
const yearBars = computed(() => deriveCalendarYearBars(props.todoData, { year: anchor.value.getFullYear() }));

const goToMonth = (month) => { anchor.value = new Date(month.year, month.monthIndex, 1); };

const isAnchorMonth = (month) =>
  month.year === model.value.anchor.getFullYear() && month.monthIndex === model.value.anchor.getMonth();

const monthName = computed(() => model.value.anchor.toLocaleDateString('en-US', { month: 'long' }));

const monthTotal = (month) => month.completed.length + month.cancelled.length + month.due.length;

const yearTotals = computed(() => [
  { key: 'done', label: 'completed', value: yearBars.value.totals.completed },
  { key: 'dropped', label: 'will not do', value: yearBars.value.totals.cancelled },
  { key: 'open', label: 'still open', value: yearBars.value.totals.due }
]);
const barHeight = (count) => (count ? `${Math.max(2, Math.round((count / Math.max(1, yearBars.value.peak)) * 100))}%` : '0');

const step = (direction) => { anchor.value = shiftAnchor(anchor.value, direction); };
const stepYear = (direction) => { anchor.value = shiftAnchor(anchor.value, direction * MONTHS_IN_YEAR); };
const goToCurrentMonth = () => { anchor.value = new Date(); };

const selectBucket = (bucket) => {
  if (movingId.value) { dropOnDay(bucket); return; }
  selectedBucketKey.value = selectedBucketKey.value === bucket.key ? null : bucket.key;
  completedOpen.value = true;
};
const openFocusDay = (day) => {
  if (movingId.value) { dropOnDay(day); return; }
  emit('open-focus', day.key);
};

const selectedBucket = computed(() => model.value.days.find(day => day.key === selectedBucketKey.value) || null);

// A day selected in one month has no meaning in the next one.
watch(() => model.value.periodStart.getTime(), () => { selectedBucketKey.value = null; });

const selectedBucketHeading = computed(() =>
  selectedBucket.value ? formatDateForTooltip(selectedBucket.value.date) : '');

const selectedBucketGroups = computed(() => {
  const bucket = selectedBucket.value;
  if (!bucket) return [];
  return [
    { key: 'completed', label: 'Completed', entries: bucket.completed }
  ].filter(group => group.entries.length > 0);
});

// With no day picked, the pane answers for the whole month: everything finished
// in it, oldest first, banded by the same Sunday-Saturday week label the due
// dates use, so the divider names a week the rest of the app also names.
const monthCompletionWeeks = computed(() => {
  const weeks = new Map();

  model.value.days
    .filter(day => !day.isOutsidePeriod && day.completed.length)
    .forEach(day => {
      const label = formatWeekPeriodLabel(day.date);
      if (!weeks.has(label)) weeks.set(label, { key: label, label, days: [] });
      weeks.get(label).days.push({ key: day.key, label: day.label, entries: day.completed });
    });

  return [...weeks.values()];
});

const monthCompletedCount = computed(() =>
  monthCompletionWeeks.value.reduce(
    (total, week) => total + week.days.reduce((count, day) => count + day.entries.length, 0),
    0
  )
);

const bucketTotal = (bucket) => bucket.completed.length + bucket.cancelled.length + bucket.due.length;

const dayEntries = (day) => [...day.due, ...day.completed, ...day.cancelled];

const meterScale = computed(() => Math.max(1, model.value.totals.peakDayCount));
const meterWidth = (count) => `${Math.round((count / meterScale.value) * 100)}%`;

const dayClasses = (day) => ({
  'is-today': day.isToday,
  'is-future': day.isFuture,
  'is-outside': day.isOutsidePeriod,
  'is-selected': day.key === selectedBucketKey.value,
  'is-drop-target': day.key === dropDate.value,
  'is-empty': bucketTotal(day) === 0
});

const statTiles = computed(() => {
  const totals = model.value.totals;
  return [
    {
      key: 'completed',
      label: 'Completed',
      shortLabel: 'Done',
      value: totals.completed,
      hint: `${totals.dailyAverage}/day · ${totals.activeDays} active days`
    },
    { key: 'cancelled', label: 'Will not do', shortLabel: "Won't do", value: totals.cancelled,
      hint: totals.cancelled ? 'dropped deliberately' : 'nothing dropped' },
    { key: 'open', label: 'Still open', shortLabel: 'Open', value: totals.due + totals.spanningDue,
      hint: `${totals.inProgress} in progress` },
    { key: 'rate', label: 'Completion', shortLabel: 'Done %', value: `${totals.completionRate}%`,
      hint: `${totals.completed} of ${totals.commitments} commitments` },
    { key: 'overdue', label: 'Overdue', value: totals.overdueOpen, hint: totals.overdueOpen ? 'past due, still open' : 'nothing late' },
  ];
});
</script>

<style scoped>
.review-mode {
  --review-bg: var(--ui-bg, #f4f6f9);
  --review-surface: var(--ui-surface, #ffffff);
  --review-border: var(--ui-border, #dde3ea);
  --review-text: var(--ui-text, #1f2733);
  --review-muted: var(--ui-muted, #6b7684);
  --review-done: var(--ui-green);
  --review-done-fill: var(--ui-green);
  --review-done-text: #397a43;
  --review-chip-done: #7abc7e;
  --review-dropped: var(--ui-gray, #9aa4b2);
  --review-open: var(--ui-blue, #4d8fd6);
  --review-overdue: #e5534b;
  --review-accent: var(--ui-blue);

  --calendar-week-width: clamp(160px, 15vw, 220px);
  --calendar-month-width: clamp(180px, 18vw, 260px);
  position: relative;
  display: grid;
  grid-template-columns: var(--calendar-month-width) var(--calendar-week-width) minmax(0, 1fr);
  grid-template-rows: 96px 12px 26px minmax(0, 1fr);
  gap: 0;
  column-gap: 12px;
  padding: 10px 62px 10px 10px;
  flex: 1;
  min-height: 0;
  background: var(--review-bg);
  color: var(--review-text);
  font-size: 13px;
  overflow: hidden;
}

.review-mode.theme-dark {
  --review-bg: var(--ui-bg, #14171c);
  --review-surface: var(--ui-surface, #1c2129);
  --review-border: var(--ui-border, #2a3240);
  --review-text: var(--ui-text, #dfe3e8);
  --review-muted: var(--ui-muted, #8d97a5);
  --review-dropped: var(--ui-gray, #6f7a88);
  --review-done: var(--ui-green);
  --review-done-fill: var(--ui-green);
  --review-done-text: #a5d6a7;
  --review-open: var(--ui-blue, #4d8fd6);
  --review-overdue: #e5534b;
  --review-accent: var(--ui-blue);
}

/* One outer frame around the weekday strip and all connected calendar weeks. */
.review-mode::after {
  content: '';
  grid-column: 2 / -1;
  grid-row: 3 / -1;
  border: 1px solid var(--ui-border-strong);
  border-radius: 12px;
  pointer-events: none;
  z-index: 1;
}

/* --- Header: the year chart, with the date controls hard right --- */
.review-header {
  grid-column: 2 / -1;
  grid-row: 1;
  display: flex;
  align-items: stretch;
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  margin: 0;
  border: 1px solid var(--ui-border-strong);
  border-radius: 12px;
  box-shadow: none;
  flex: none;
  background: var(--review-surface);
}

.review-header-side {
  flex: none;
  margin-left: auto;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7px;
}


.review-nav { display: flex; align-items: center; gap: 8px; flex: none; }

.review-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--review-border);
  border-radius: 6px;
  overflow: hidden;
}

.review-step-btn {
  width: 24px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--review-text);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.review-step-btn:hover { background: rgba(127, 143, 165, 0.16); }

.review-step-value {
  padding: 0 2px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

/* Fixed widths so the arrows never shift as the value's text length changes. */
.review-step-value.year { min-width: 40px; }
.review-step-value.month { min-width: 74px; }

.review-this-month-btn {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--review-border);
  border-radius: 6px;
  background: transparent;
  color: var(--review-text);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.review-this-month-btn:hover:not(:disabled) { background: rgba(127, 143, 165, 0.14); }
.review-this-month-btn:disabled { opacity: 0.4; cursor: default; }

/* --- Metrics: one row for the month on screen --- */
.review-metrics {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.review-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2px 8px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 3px solid var(--review-muted);
  border-radius: 4px;
  background: rgba(127, 143, 165, 0.08);
}

.review-stat.stat-completed { border-left-color: var(--review-done); }
.review-stat.stat-open { border-left-color: var(--review-open); }
.review-stat.stat-overdue { border-left-color: var(--review-overdue); }
.review-stat.stat-rate { border-left-color: var(--review-accent); }

.review-stat-value { font-size: 16px; font-weight: 600; line-height: 1.1; }
.review-stat-label { font-size: 11px; line-height: 1.15; white-space: nowrap; }
.review-stat-hint {
  font-size: 10px;
  line-height: 1.35;
  color: var(--review-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- Body layout --- */
.review-body {
  display: contents;
}

.review-grid-pane {
  display: contents;
}

.review-grid-body {
  display: contents;
}

.review-weekday-row {
  grid-column: 2 / -1;
  grid-row: 3;
  display: grid;
  grid-template-columns: var(--calendar-week-width) repeat(7, minmax(0, 1fr));
  gap: 0;
  background: var(--review-surface);
  border-bottom: 1px solid var(--review-border);
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.review-weekday {
  padding-top: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--review-muted);
  text-align: center;
}

.review-weeks {
  grid-column: 2 / -1;
  grid-row: 4;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--review-surface);
  border-radius: 0 0 12px 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.review-week-row {
  display: grid;
  grid-template-columns: var(--calendar-week-width) repeat(7, minmax(0, 1fr));
  gap: 0;
  flex: 1 0 76px;
  min-height: 76px;
}
.review-week-row.is-prominent-week { flex: 2.4 0 132px; min-height: 132px; }
.review-week-row.is-prominent-week .calendar-week-selection { background: var(--ui-blue-soft);
  box-shadow: inset 3px 0 var(--ui-blue); }
.review-week-row.is-prominent-week .calendar-section-label { color: var(--ui-blue); }
.review-week-row.is-prominent-week .review-day-head { color: var(--ui-blue); }

.review-strip {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.review-chart-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Each band names itself in the same left gutter, which also aligns the bars,
   the stat tiles and the calendar on one left edge. */
/* One gutter width for all three, so the bars, tiles and calendar share a left edge. */
.review-side-label {
  flex: none;
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--review-muted);
  user-select: none;
}

.review-side-label.year { letter-spacing: -1px; font-size: 11px; }

/* The month names the whole grid, so it carries the most weight of the three. */
.review-side-label.month { width: auto; writing-mode: horizontal-tb; justify-content: flex-start;
  padding: 4px 0; font-size: 14px; letter-spacing: 2px; font-weight: 700; color: var(--ui-text); }

.review-year-totals { display: flex; gap: 16px; }

.review-year-total { display: flex; align-items: baseline; gap: 6px; }
.review-year-total-value { font-size: 14px; font-weight: 600; }
.review-year-total-label { font-size: 11px; color: var(--review-muted); }


.review-year-chart {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.review-year-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 3px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.review-year-col:hover { background: rgba(127, 143, 165, 0.12); }
.review-year-col.is-current .review-year-label { color: var(--review-open); font-weight: 600; }
.review-year-col.is-anchor {
  border-color: var(--review-open);
  background: var(--ui-blue-soft, rgba(77, 143, 214, 0.12));
}
.review-year-col.is-future { opacity: 0.5; }

.review-year-value {
  height: 14px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--review-muted);
}

.review-year-track {
  flex: 1;
  height: 30px;
  min-height: 0;
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  border-radius: 3px 3px 0 0;
  border-bottom: 1px solid var(--review-border);
  overflow: hidden;
}

.review-year-seg { width: 100%; }
.review-year-seg.done { background: var(--review-done-fill); }
.review-year-seg.dropped { background: var(--review-dropped); }
.review-year-seg.open { background: var(--review-open); opacity: 0.55; }

.review-year-label { font-size: 11px; text-align: center; }

.review-legend-swatch { flex: none; width: 9px; height: 9px; border-radius: 2px; }
.review-legend-swatch.done { background: var(--review-done-fill); }
.review-legend-swatch.dropped { background: var(--review-dropped); }
.review-legend-swatch.open { background: var(--review-open); opacity: 0.55; }

/* --- Day cells --- */
.review-day {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  min-height: 0;
  padding: 6px;
  border: 0;
  border-left: 1px solid var(--review-border);
  border-bottom: 1px solid var(--review-border);
  border-radius: 0;
  background: var(--review-surface);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.review-day:hover { background: var(--ui-surface-soft); }
.review-day.is-outside { background: var(--ui-surface-soft); }
.review-day.is-outside > * { opacity: 0.45; }
.review-day.is-empty { background: var(--ui-surface-soft); }
.review-day.is-drop-target { background: var(--ui-blue-soft); border-color: var(--ui-blue);
  box-shadow: inset 0 0 0 2px var(--ui-blue); opacity: 1; }
.review-day.is-today { border-color: var(--review-open); box-shadow: inset 0 0 0 1px var(--review-open); }
.review-day.is-selected { border-color: var(--review-accent); box-shadow: inset 0 0 0 2px var(--review-accent); }
.review-day.is-future .review-day-number { color: var(--review-muted); }

.review-day-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: none;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.review-day-summary:focus-visible,
.calendar-day-tasks:focus-visible {
  outline: 2px solid var(--review-open);
  outline-offset: -2px;
  border-radius: 3px;
}

/* Busy days scroll independently; theme the native scrollbar in both color schemes. */
.calendar-day-tasks {
  flex: 1 1 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--ui-border-strong, #c4cfda) transparent;
  list-style: none;
}

.review-day-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.review-day-number { font-size: 15px; font-weight: 600; }
.review-day-total { margin-left: auto; font-size: 11px; color: var(--review-muted); }

.review-day-meter {
  display: flex;
  width: 100%;
  padding: 0;
  border: 0;
  flex: none;
  cursor: pointer;
  height: 4px;
  border-radius: 2px;
  background: rgba(127, 143, 165, 0.16);
  overflow: hidden;
}
.review-day-meter:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 2px; }

.meter-fill { height: 100%; }
.meter-fill.done { background: var(--review-done-fill); }
.meter-fill.dropped { background: var(--review-dropped); }
.meter-fill.open { background: var(--review-open); opacity: 0.55; }

.review-item-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--review-open);
}

.review-item-dot.bucket-completed { background: var(--review-done-fill); }
.review-item-dot.bucket-cancelled { background: var(--review-dropped); }
.review-item-dot.bucket-blocked { background: var(--ui-blocked); }

.review-day.is-empty .review-day-meter { visibility: hidden; }

.review-day-chips { display: flex; gap: 4px; flex-wrap: wrap; }

.review-chip {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.review-chip.done { color: var(--review-done-text); background: var(--review-chip-done); }
.review-chip.dropped { background: var(--review-dropped); }
.review-chip.open { background: var(--review-open); }

/* --- Rail --- */
/* Every card keeps its header on screen: the rail itself never scrolls, cards
   shrink to share the height, and long lists scroll inside their own card. */
.calendar-drawer-track {
  position: absolute;
  z-index: 10;
  inset: 10px 10px 10px auto;
  width: min(400px, calc(100% - 40px));
  overflow: hidden;
  pointer-events: none;
}
.review-rail {
  position: absolute;
  inset: 0;
  width: 100%;
  pointer-events: auto;
  transform: translateX(calc(100% - 44px));
  padding: 0;
  box-sizing: border-box;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
  box-shadow: -8px 0 28px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: row;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}
.review-rail.is-open { transform: translateX(0); }
.calendar-completed-content { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 8px;
  padding: 10px; overflow: hidden; }
.calendar-completed-toggle { flex: 0 0 23px; width: 23px; padding: 12px 0 0; display: flex;
  flex-direction: column; align-items: center; gap: 14px; border: 0; border-right: 1px solid var(--ui-border);
  background: transparent; color: var(--ui-muted); font: 600 20px/1 var(--ui-font); cursor: pointer; }
.calendar-completed-toggle:hover { color: var(--ui-text); background: var(--ui-surface-soft); }
.calendar-completed-toggle:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: -3px; }
.calendar-completed-toggle .calendar-count { padding: 2px; font-size: 10px; }
.calendar-drawer-edge-label { writing-mode: vertical-rl; text-orientation: mixed;
  font: 700 11px/1 var(--ui-font); letter-spacing: 2px; text-transform: uppercase; }

.review-card-note.out-of-scope { font-style: italic; }

/* Standing cards keep their natural height so they never move; only the pane
   at the foot of the rail absorbs whatever space is left. */
.review-card {
  display: flex;
  flex-direction: column;
  flex: none;
  min-height: 0;
  padding: 8px 12px;
  border: 1px solid var(--review-border);
  border-radius: var(--ui-radius);
  background: var(--review-surface);
  box-shadow: var(--ui-shadow-sm);
  overflow: hidden;
}

.review-card > .review-entry-list,
.review-card > .review-bar-list,
.review-day-detail > .review-group:last-child {
  overflow-y: auto;
  min-height: 0;
}

/* Sitting last, this pane simply takes whatever height is left over. */
.review-day-detail { flex: 1 1 auto; min-height: 0; overflow-y: auto; }

.review-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  margin-bottom: 6px;
}

.review-card-head h2 { margin: 0; font-size: 12px; font-weight: 700; flex: 1;
  text-transform: uppercase; letter-spacing: 1px; }
.review-card-head { border-bottom: 1px solid var(--ui-border); padding-bottom: 8px; }
.review-card-note { font-size: 11px; color: var(--review-muted); }

.review-card-close {
  border: none;
  background: transparent;
  color: var(--review-muted);
  cursor: pointer;
  font-size: 12px;
}

.review-empty { margin: 4px 0; font-size: 11px; color: var(--review-muted); }

.review-group + .review-group { margin-top: 8px; }

.review-group-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--review-muted);
  margin-bottom: 4px;
}

.review-group-title.bucket-completed { color: var(--review-done-text); }
.review-group-title.bucket-queued { color: var(--review-open); }

.review-entry-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }

.review-entry { display: flex; align-items: flex-start; gap: 7px; min-width: 0; }
.review-entry .review-item-dot { margin-top: 5px; }
.review-entry-text { font-size: 12px; line-height: 1.35; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* The old sub-label's grey and size, now inline after the title. */
.review-entry-section { font-size: 10px; color: var(--review-muted); }

/* --- Day dividers in the month's completion list --- */
.review-day-group + .review-day-group { margin-top: 8px; }

.review-day-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--review-muted);
}

.review-day-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--review-border);
}

.review-day-subgroup + .review-day-subgroup { margin-top: 5px; }

.review-day-sublabel {
  margin-bottom: 2px;
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--review-muted);
}

/* --- Trend + bars --- */
.review-trend { display: flex; align-items: flex-end; gap: 6px; flex: none; height: 64px; }

.review-trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }

.review-trend-bars {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  align-items: stretch;
  border-radius: 3px 3px 0 0;
  overflow: hidden;
}

.review-trend-bar { width: 100%; }
.review-trend-bar.done { background: var(--review-done-fill); }
.review-trend-bar.dropped { background: var(--review-dropped); }
.review-trend-label { font-size: 10px; color: var(--review-muted); padding-top: 3px; }

.review-bar-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }

.review-bar-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }

.review-bar-label {
  width: 120px;
  flex: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--review-muted);
}

.review-bar-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(127, 143, 165, 0.2); }
.review-bar-fill { display: block; height: 100%; border-radius: 3px; background: var(--review-done-fill); }
.review-bar-count { width: 18px; text-align: right; }

.calendar-selection-pane { grid-column: 1; grid-row: 3 / -1; display: flex; flex-direction: column;
  min-height: 0; min-width: 0; background: var(--review-surface); border-radius: 12px; overflow: hidden;
  border: 1px solid var(--ui-border-strong); }
.calendar-month-heading { margin: 0; padding: 6px 12px; font-size: clamp(18px, 1.7vw, 28px);
  line-height: 28px; font-weight: 800; white-space: nowrap; color: var(--ui-blue);
  background: var(--ui-blue-soft); border: 1px solid var(--ui-border-strong); border-radius: 12px 12px 0 0; }
.calendar-selected-heading { margin: 12px 12px 16px; font-size: 20px; line-height: 26px; font-weight: 800;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: 4px; color: var(--review-muted); }
.calendar-selected-projects { min-width: 0; flex: 0 1 auto; max-height: 35%; }
.calendar-month-summary { grid-column: 1; grid-row: 1; min-width: 0; }
.calendar-selected-projects, .calendar-month-summary, .calendar-month-tasks {
  border: 0; border-radius: 0; box-shadow: none; }
.calendar-month-summary { padding: 0; border-radius: 12px; }
.calendar-month-summary .review-stat { border: 1px solid var(--ui-border); border-radius: 5px;
  background: var(--ui-surface-soft); padding: 1px 2px; color: var(--review-muted);
  flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 0; }
.calendar-month-summary .review-stat-value { font-size: 13px; font-weight: 700; line-height: 15px; color: var(--review-text); }
.calendar-month-summary .review-stat-label { font-size: 9px; line-height: 10px; min-height: 20px;
  white-space: normal; overflow-wrap: anywhere; display: flex; align-items: center; }
.calendar-month-summary .review-metrics { padding: 6px 8px; grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 3px; }
.calendar-selected-projects .review-card-head { padding-bottom: 6px; margin-bottom: 4px; }
.calendar-selected-projects > .calendar-section-label { margin-bottom: 4px; padding-bottom: 0; border: 0; }
.calendar-month-tasks { min-width: 0; flex: 1; margin-top: 10px; }
.calendar-month-task-scroll { overflow-y: auto; min-height: 0; }
.calendar-month-project-groups:not(:empty) + .calendar-month-standalone:not(:empty) { margin-top: 8px; }
.calendar-project-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px; align-content: start; }
.calendar-project-tiles :deep(.is-tile) { width: 100%; height: auto; aspect-ratio: 1; min-width: 0; }
.calendar-project-group { flex: none; border: 1px solid var(--ui-border); border-radius: 6px; overflow: hidden; }
.calendar-project-group-toggle { display: flex; align-items: center; width: 100%; gap: 6px; padding: 6px;
  border: 0; background: var(--ui-blue-soft); color: var(--ui-blue); font: 650 11px/1.4 var(--ui-font);
  text-align: left; cursor: pointer; }
.calendar-project-group-title { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.calendar-project-group-count { margin-left: auto; }
.calendar-project-group-children { padding: 4px; }
.calendar-project-group-toggle:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: -2px; }
.calendar-month-tasks .review-entry-list, .calendar-month-scroll, .calendar-week-selection .review-entry-list {
  scrollbar-width: thin; scrollbar-color: var(--ui-border-strong, #c4cfda) transparent;
}
.calendar-month-scroll { overflow-y: auto; min-height: 0; }
.calendar-month-scroll h3 { margin-top: 8px; }
.calendar-week-selection { display: flex; flex-direction: column; padding: 6px 8px; min-height: 0;
  min-width: 0; border: 0; border-bottom: 1px solid var(--ui-border); border-radius: 0;
  background: var(--ui-surface-soft); }
.calendar-week-selection .calendar-section-label { color: var(--review-muted); font-size: 10px; }
.calendar-week-selection :deep(.calendar-day-task) { background: transparent; border-color: transparent;
  padding: 1px 4px; margin: 0; flex: none; }
.calendar-week-selection :deep(.calendar-task-title) { color: var(--review-muted); font-size: 10px; line-height: 14px; }
.calendar-week-selection > .review-entry-list { gap: 1px; }
.calendar-week-toggle { width: 100%; border: 0; border-bottom: 1px solid var(--ui-border);
  background: transparent; font-family: inherit; text-align: left; cursor: pointer; }
.calendar-week-toggle:hover { color: var(--ui-blue); }
.calendar-week-toggle:focus-visible { outline: 2px solid var(--ui-blue); outline-offset: 1px; }
.calendar-week-selection > .review-entry-list { overflow-y: auto; min-height: 0; }
.calendar-week-label { text-align: left; padding-left: 8px; background: var(--ui-surface-soft); font-size: 9px; }
.calendar-drawer-close { align-self: flex-end; }
.calendar-section-label { display: flex; align-items: center; justify-content: space-between;
  gap: 5px; margin: 0 0 6px; font-size: 11px; color: var(--ui-blue); font-weight: 700;
  border-bottom: 1px solid var(--ui-border); padding-bottom: 4px; }
.calendar-count { border-radius: 10px; padding: 1px 7px; font-weight: 650;
  background: var(--ui-surface-muted); color: var(--ui-muted); }
.calendar-move-feedback { position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap; }
@media (prefers-reduced-motion: no-preference) {
  .review-day { transition: background-color 120ms, border-color 120ms; }
  .review-rail { transition: transform 240ms ease; }
}
@media (max-width: 1100px) {
  .calendar-project-tiles :deep(.is-tile) { padding: 2px; gap: 1px; }
  .calendar-selected-heading { font-size: 18px; letter-spacing: 2px; }
  .review-header { flex-direction: column; gap: 3px; padding: 4px 8px; }
  .review-header-side { align-self: stretch; align-items: flex-end; }
  .review-chart-pane { min-height: 0; }
  .review-year-track { height: 16px; }
  .review-year-value { height: 10px; font-size: 9px; }
  .review-year-label { font-size: 10px; }
  .review-side-label.year { writing-mode: horizontal-tb; width: 30px; letter-spacing: 0; }
  .review-nav { gap: 4px; }
  .review-year-chart { gap: 1px; }
  .review-year-col { padding: 2px 0; min-width: 0; }
  .review-year-totals { display: none; }
  .review-year-total { gap: 3px; }
  .review-this-month-btn { padding: 0 5px; }
  .review-stat { padding: 2px 4px; }
  .review-stat-label { font-size: 10px; }
}
</style>
