<!-- components/ReviewMode.vue -->
<!-- Full-screen retrospective view: what got done, what slipped, and what is
     landing - laid out on a Sunday-Saturday week strip or a month calendar,
     with a clickable calendar-year bar chart above the month grid.
     Read-only by design; Focus and the board own task mutation. -->
<template>
  <div class="review-mode" :class="`theme-${theme}`">
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
      <!-- Stats and the calendar share the left column so the rail runs the full
           height beside both, with no dead space above its first card. -->
      <div class="review-main">
        <section class="review-strip">
          <div class="review-side-label">Stats</div>
          <div class="review-metrics">
            <div v-for="tile in statTiles" :key="tile.key" class="review-stat" :class="`stat-${tile.key}`">
              <div class="review-stat-value">{{ tile.value }}</div>
              <div class="review-stat-label">{{ tile.label }}</div>
              <div class="review-stat-hint">{{ tile.hint }}</div>
            </div>
          </div>
        </section>

        <section class="review-grid-pane">
          <div class="review-side-label month">{{ monthName }}</div>

        <div class="review-grid-body">
          <div class="review-weekday-row">
            <div v-for="label in model.weekdayLabels" :key="label" class="review-weekday">{{ label }}</div>
          </div>

          <div class="review-weeks">
          <div v-for="(week, weekIndex) in model.weeks" :key="weekIndex" class="review-week-row">
            <button
                v-for="day in week"
                :key="day.key"
                type="button"
                class="review-day"
                :class="dayClasses(day)"
                :aria-label="`${day.label}: ${day.completed.length} completed, ${day.cancelled.length} will not do, ${day.due.length} due`"
                @click="selectBucket(day)"
            >
              <div class="review-day-head">
                <span class="review-day-number">{{ day.dayOfMonth }}</span>
                <span v-if="bucketTotal(day)" class="review-day-total">{{ bucketTotal(day) }}</span>
              </div>

              <div class="review-day-meter" aria-hidden="true">
                <span class="meter-fill done" :style="{ width: meterWidth(day.completed.length) }"></span>
                <span class="meter-fill dropped" :style="{ width: meterWidth(day.cancelled.length) }"></span>
                <span class="meter-fill open" :style="{ width: meterWidth(day.due.length) }"></span>
              </div>

              <div class="review-day-chips">
                <span v-if="day.completed.length" class="review-chip done">{{ day.completed.length }}</span>
                <span v-if="day.cancelled.length" class="review-chip dropped">{{ day.cancelled.length }}</span>
                <span v-if="day.due.length" class="review-chip open">{{ day.due.length }}</span>
              </div>
            </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="review-rail">
        <section class="review-card">
          <div class="review-card-head">
            <h2>Throughput</h2><span class="review-card-note out-of-scope">last 8 weeks</span>
          </div>
          <div class="review-trend">
            <div v-for="week in trend.buckets" :key="week.label" class="review-trend-col"
                 :title="`${week.label}: ${week.completed} done, ${week.cancelled} dropped`">
              <div class="review-trend-bars">
                <span class="review-trend-bar dropped" :style="{ height: trendHeight(week.cancelled) }"></span>
                <span class="review-trend-bar done" :style="{ height: trendHeight(week.completed) }"></span>
              </div>
              <div class="review-trend-label">{{ week.completed + week.cancelled }}</div>
            </div>
          </div>
        </section>

        <section v-if="model.topSections.length" class="review-card">
          <div class="review-card-head">
            <h2>Where work landed</h2><span class="review-card-note">this month</span>
          </div>
          <ul class="review-bar-list">
            <li v-for="section in model.topSections" :key="section.label" class="review-bar-row">
              <span class="review-bar-label" :title="section.label">{{ section.label }}</span>
              <span class="review-bar-track">
                <span class="review-bar-fill" :style="{ width: sectionBarWidth(section.count) }"></span>
              </span>
              <span class="review-bar-count">{{ section.count }}</span>
            </li>
          </ul>
        </section>

        <!-- Last in the rail: opening or closing a day must not shove the
             standing cards around. With no day picked, the same pane answers
             the month-level version of the question. -->
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
                  <span class="review-entry-text">{{ entry.task.displayText }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section v-else class="review-card review-day-detail">
          <div class="review-card-head">
            <h2>{{ selectedBucketHeading }}</h2>
            <button class="review-card-close" title="Close detail" @click="selectedBucketKey = null">✕</button>
          </div>
          <div v-if="!bucketTotal(selectedBucket)" class="review-empty">Nothing recorded on this day.</div>
          <div v-for="group in selectedBucketGroups" :key="group.key" class="review-group">
            <div class="review-group-title" :class="`bucket-${group.key}`">{{ group.label }} · {{ group.entries.length }}</div>
            <ul class="review-entry-list">
              <li v-for="entry in group.entries" :key="entry.task.id" class="review-entry">
                <span class="review-item-dot" :class="`bucket-${entry.bucket}`" aria-hidden="true"></span>
                <span class="review-entry-text">
                  {{ entry.task.displayText }}
                  <span class="review-entry-section">({{ entry.sectionName }})</span>
                </span>
              </li>
            </ul>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
  MONTHS_IN_YEAR,
  deriveCalendarYearBars,
  deriveReviewModel,
  deriveWeeklyTrend,
  shiftAnchor
} from '../utils/reviewModeHelpers';
import { formatDateForTooltip, formatWeekPeriodLabel } from '../utils/dateHelpers';

const props = defineProps({
  todoData: { type: Object, default: () => ({ columnOrder: [], columnStacks: {} }) },
  theme: { type: String, default: 'light' }
});

const anchor = ref(new Date());
const selectedBucketKey = ref(null);

const model = computed(() => deriveReviewModel(props.todoData, { anchor: anchor.value }));
const trend = computed(() => deriveWeeklyTrend(props.todoData, { anchor: anchor.value }));

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
  selectedBucketKey.value = selectedBucketKey.value === bucket.key ? null : bucket.key;
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
    { key: 'completed', label: 'Completed', entries: bucket.completed },
    { key: 'cancelled', label: 'Will not do', entries: bucket.cancelled },
    { key: 'queued', label: 'Due / scheduled', entries: bucket.due }
  ].filter(group => group.entries.length > 0);
});

// With no day picked, the pane answers for the whole month: everything finished
// in it, newest first, banded by the same Sunday-Saturday week label the due
// dates use, so the divider names a week the rest of the app also names.
const monthCompletionWeeks = computed(() => {
  const weeks = new Map();

  model.value.days
    .filter(day => !day.isOutsidePeriod && day.completed.length)
    .reverse()
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

const meterScale = computed(() => Math.max(1, model.value.totals.peakDayCount));
const meterWidth = (count) => `${Math.round((count / meterScale.value) * 100)}%`;

const trendHeight = (count) => `${Math.round((count / Math.max(1, trend.value.peak)) * 100)}%`;

const sectionBarWidth = (count) => {
  const top = model.value.topSections[0]?.count || 1;
  return `${Math.max(8, Math.round((count / top) * 100))}%`;
};

const dayClasses = (day) => ({
  'is-today': day.isToday,
  'is-future': day.isFuture,
  'is-outside': day.isOutsidePeriod,
  'is-selected': day.key === selectedBucketKey.value,
  'is-empty': bucketTotal(day) === 0
});

const statTiles = computed(() => {
  const totals = model.value.totals;
  return [
    {
      key: 'completed',
      label: 'Completed',
      value: totals.completed,
      hint: `${totals.dailyAverage}/day · ${totals.activeDays} active days`
    },
    { key: 'cancelled', label: 'Will not do', value: totals.cancelled, hint: totals.cancelled ? 'dropped deliberately' : 'nothing dropped' },
    { key: 'open', label: 'Still open', value: totals.due + totals.spanningDue, hint: `${totals.inProgress} in progress` },
    { key: 'rate', label: 'Completion', value: `${totals.completionRate}%`, hint: `${totals.completed} of ${totals.commitments} commitments` },
    { key: 'overdue', label: 'Overdue', value: totals.overdueOpen, hint: totals.overdueOpen ? 'past due, still open' : 'nothing late' },
    { key: 'peak', label: 'Best day', value: totals.busiestDayCount, hint: totals.busiestDayLabel }
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
  --review-done: #a5d6a7;
  --review-done-soft: #e8f5e9;
  --review-done-text: #397a43;
  --review-dropped: var(--ui-gray, #9aa4b2);
  --review-open: var(--ui-blue, #4d8fd6);
  --review-overdue: #e5534b;
  --review-accent: #81c784;

  display: flex;
  flex-direction: column;
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
  --review-done: #81c784;
  --review-done-soft: rgba(129, 199, 132, 0.18);
  --review-done-text: #a5d6a7;
  --review-open: var(--ui-blue, #4d8fd6);
  --review-overdue: #e5534b;
  --review-accent: #81c784;
}

/* --- Header: the year chart, with the date controls hard right --- */
.review-header {
  display: flex;
  align-items: stretch;
  gap: 18px;
  height: 82px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--review-border);
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.review-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3px 8px;
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
  display: flex;
  gap: 14px;
  flex: 1;
  min-height: 0;
  padding: 8px 20px 14px;
}

.review-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-grid-pane {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.review-grid-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.review-weekday-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  padding-bottom: 6px;
}

.review-weekday {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--review-muted);
  text-align: center;
}

.review-weeks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.review-week-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  flex: 1;
  min-height: 56px;
}

.review-strip {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex: none;
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
.review-side-label.month { font-size: 15px; letter-spacing: 3px; }

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
.review-year-col.is-anchor { border-color: var(--review-accent); background: var(--review-done-soft); }
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
  min-height: 0;
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  border-radius: 3px 3px 0 0;
  border-bottom: 1px solid var(--review-border);
  overflow: hidden;
}

.review-year-seg { width: 100%; }
.review-year-seg.done { background: var(--review-done); }
.review-year-seg.dropped { background: var(--review-dropped); }
.review-year-seg.open { background: var(--review-open); opacity: 0.55; }

.review-year-label { font-size: 11px; text-align: center; }

.review-legend-swatch { flex: none; width: 9px; height: 9px; border-radius: 2px; }
.review-legend-swatch.done { background: var(--review-done); }
.review-legend-swatch.dropped { background: var(--review-dropped); }
.review-legend-swatch.open { background: var(--review-open); opacity: 0.55; }

/* --- Day cells --- */
.review-day {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--review-border);
  border-radius: 8px;
  background: var(--review-surface);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.review-day:hover { border-color: var(--review-accent); }
.review-day.is-outside { opacity: 0.45; }
.review-day.is-empty { background: transparent; }
.review-day.is-today { border-color: var(--review-open); box-shadow: inset 0 0 0 1px var(--review-open); }
.review-day.is-selected { border-color: var(--review-accent); box-shadow: inset 0 0 0 2px var(--review-accent); }
.review-day.is-future .review-day-number { color: var(--review-muted); }

.review-day-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.review-day-number { font-size: 15px; font-weight: 600; }
.review-day-total { margin-left: auto; font-size: 11px; color: var(--review-muted); }

.review-day-meter {
  display: flex;
  height: 4px;
  border-radius: 2px;
  background: rgba(127, 143, 165, 0.16);
  overflow: hidden;
}

.meter-fill { height: 100%; }
.meter-fill.done { background: var(--review-done); }
.meter-fill.dropped { background: var(--review-dropped); }
.meter-fill.open { background: var(--review-open); opacity: 0.55; }

.review-item-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--review-open);
}

.review-item-dot.bucket-completed { background: var(--review-done); }
.review-item-dot.bucket-cancelled { background: var(--review-dropped); }

.review-day.is-empty .review-day-meter { visibility: hidden; }

.review-day-chips { display: flex; gap: 4px; flex-wrap: wrap; }

.review-chip {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.review-chip.done { color: var(--review-done-text); background: var(--review-done); }
.review-chip.dropped { background: var(--review-dropped); }
.review-chip.open { background: var(--review-open); }

/* --- Rail --- */
/* Every card keeps its header on screen: the rail itself never scrolls, cards
   shrink to share the height, and long lists scroll inside their own card. */
.review-rail {
  flex: none;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

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
  border-radius: 8px;
  background: var(--review-surface);
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

.review-card-head h2 { margin: 0; font-size: 13px; font-weight: 600; flex: 1; }
.review-card-note { font-size: 11px; color: var(--review-muted); }

.review-card-close {
  border: none;
  background: transparent;
  color: var(--review-muted);
  cursor: pointer;
  font-size: 12px;
}

.review-empty { font-size: 12px; color: var(--review-muted); }

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
.review-entry-text { font-size: 12px; line-height: 1.35; min-width: 0; }
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
.review-trend-bar.done { background: var(--review-done); }
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
.review-bar-fill { display: block; height: 100%; border-radius: 3px; background: var(--review-done); }
.review-bar-count { width: 18px; text-align: right; }

@media (max-width: 1100px) {
  .review-rail { width: 260px; }
  .review-header { height: 96px; }
  .review-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
