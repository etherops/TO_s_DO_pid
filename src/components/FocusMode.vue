<!-- components/FocusMode.vue -->
<!-- Full-screen execution view with a single-panel spotlight carousel above
     an always-visible Sunday-Saturday strip. NOW is centered by default, with
     UP NEXT to its left and IN PROGRESS / WAITING to its right. -->
<template>
  <div ref="focusRoot" class="focus-mode" :class="`theme-${theme}`" @wheel="handleWheel">
    <header class="focus-header">
      <div class="focus-heading">
        <div class="focus-kicker">Focus</div>
        <h1 class="focus-date">This Week</h1>
      </div>
      <div v-if="totalCount > 0" class="focus-progress">
        <div class="focus-progress-text">{{ completedCount }} / {{ totalCount }} done</div>
        <div class="focus-progress-track">
          <div class="focus-progress-fill" :class="{ complete: completedCount === totalCount }"
               :style="{ width: progressPercent }"></div>
        </div>
      </div>
      <button v-if="quickAddTarget" class="focus-quick-add-btn" :class="{ active: showQuickAdd }"
              title="Add something for this week" @click="toggleQuickAdd">+ Add</button>
      <button class="focus-exit-btn" title="Back to board" @click="$emit('set-view-mode', 'normal')">✕</button>
      <div v-if="showQuickAdd && quickAddTarget" class="focus-quick-add-popover" @click.stop>
        <input
            ref="quickAddInput"
            v-model="quickAddText"
            class="focus-quick-add-input"
            :placeholder="`Add to ${quickAddTarget.columnName}`"
            @keydown.enter="quickAdd"
            @keydown.esc="showQuickAdd = false"
        />
      </div>
    </header>

    <div class="focus-stage has-week-strip">
      <div class="focus-carousel">
        <!-- UP NEXT panel: the SELECTED queue -->
        <section
            class="focus-panel panel-upnext"
            :class="{ 'is-focused': isFocused(0) }"
            :style="panelStyle(0)"
            @click="focusPanel(0)"
        >
          <header class="panel-header">
            <span class="panel-kicker upnext-kicker">‹ Up Next</span>
            <span class="panel-count">{{ upNextDisplayCount }}</span>
          </header>
          <div class="panel-body">
            <div v-if="!upNextDisplayCount" class="panel-empty">
              Nothing upcoming.<br>This week's schedule is below.
            </div>
            <template v-for="group in upNextDisplayGroups" :key="group.key">
              <div class="focus-day-header upnext-group-header"
                   :class="group.key === 'low-priority' ? 'day-low-priority' : 'day-upcoming'">
                <span class="day-name">{{ group.label }}</span>
                <span class="day-count">{{ group.entries.length }}</span>
              </div>
              <div v-for="entry in group.entries" :key="entry.task.id" class="focus-task-row"
                   :class="rowClasses(entry)" :data-task-id="entry.task.id">
              <button v-if="!isEditingEntry(entry)" class="focus-row-check" :class="checkClasses(entry)"
                      :title="statusTitle(entry)" :aria-label="statusTitle(entry)"
                      @click.stop="cycleEntryStatus(entry, 'upNext')"></button>
              <div v-if="isEditingEntry(entry)" class="focus-inline-editor" @click.stop>
                <input v-model="editTaskName" class="focus-edit-name"
                       aria-label="Task name" @keydown.enter="saveEntryEdits(entry)" @keydown.esc="cancelEntryEdit" />
                <button class="focus-edit-save" title="Save changes" @click="saveEntryEdits(entry)">Save</button>
                <button class="focus-edit-cancel" title="Cancel editing" @click="cancelEntryEdit">Cancel</button>
              </div>
              <div v-else class="focus-row-main">
                <button class="focus-row-title" :class="{ 'done-title': ['x', '-'].includes(entry.task.statusChar) }"
                        :title="`Edit name: ${entry.task.text}`"
                        @click.stop="startNameEdit(entry)">{{ cardTitle(entry) }}</button>
                <span class="focus-section-badge" :title="`${entry.columnName} · ${entry.sectionName}`">
                  {{ entry.sectionName }}
                </span>
              </div>
              <span v-if="!isEditingEntry(entry) && entryNote(entry)" class="focus-note-dot"
                    :title="entryNote(entry)">📋</span>
              <PriorityToggle v-if="!isEditingEntry(entry)" class="focus-priority-toggle"
                              :low="isLowPriorityEntry(entry)"
                              @toggle="toggleEntryPriority(entry)" />
              <button v-if="!isEditingEntry(entry)" class="focus-badge focus-due-edit"
                      :class="dueBadge(entry)?.kind || 'no-due-date'" :title="dateButtonTitle(entry)"
                      @click.stop="startDueDateEdit(entry, $event)">
                <span v-if="dueBadge(entry)" class="focus-due-label">{{ dueBadge(entry).label }}</span>
                <span class="focus-due-clock" aria-hidden="true">◷</span>
              </button>
              </div>
            </template>
          </div>
        </section>

        <!-- IN PROGRESS / WAITING: active and waiting/blocked work -->
        <section
            class="focus-panel panel-in-progress-queued"
            :class="{ 'is-focused': isFocused(2) }"
            :style="panelStyle(2)"
            @click="focusPanel(2)"
        >
          <header class="panel-header">
            <span class="panel-kicker in-progress-queued-kicker">In Progress / Waiting</span>
            <span class="panel-count">{{ inProgressQueued.length }}</span>
          </header>
          <div class="panel-body">
            <template v-if="inProgressQueued.length">
              <template v-for="group in inProgressQueuedGroups" :key="group.key">
                <div class="focus-day-header" :class="`day-${group.key}`">
                  <span class="day-name">{{ group.label }}</span>
                  <span class="day-count">{{ group.entries.length }}</span>
                </div>
                <div v-for="entry in group.entries" :key="entry.task.id" class="focus-task-row execution-row"
                     :class="[rowClasses(entry), {
                       'inflight-row': entry.task.statusChar === '~',
                       'overdue-row': entry.dueGroup === 'overdue'
                     }]"
                     :data-task-id="entry.task.id">
                  <button v-if="!isEditingEntry(entry)" class="focus-row-check" :class="checkClasses(entry)"
                          :title="statusTitle(entry)" :aria-label="statusTitle(entry)"
                          @click.stop="cycleEntryStatus(entry, 'inProgressQueued')"></button>
                  <div v-if="isEditingEntry(entry)" class="focus-inline-editor" @click.stop>
                    <input v-model="editTaskName" class="focus-edit-name"
                           aria-label="Task name" @keydown.enter="saveEntryEdits(entry)" @keydown.esc="cancelEntryEdit" />
                    <button class="focus-edit-save" title="Save changes" @click="saveEntryEdits(entry)">Save</button>
                    <button class="focus-edit-cancel" title="Cancel editing" @click="cancelEntryEdit">Cancel</button>
                  </div>
                  <div v-else class="focus-row-main">
                    <button class="focus-row-title execution-row-title"
                          :class="{ 'done-title': ['x', '-'].includes(entry.task.statusChar) }"
                          :title="`Edit name: ${entry.task.text}`"
                          @click.stop="startNameEdit(entry)">{{ cardTitle(entry) }}</button>
                    <span class="focus-section-badge" :title="`${entry.columnName} · ${entry.sectionName}`">
                      {{ entry.sectionName }}
                    </span>
                    <span v-if="entryNote(entry)" class="focus-row-note">{{ entryNote(entry) }}</span>
                  </div>
                  <PriorityToggle v-if="!isEditingEntry(entry)" class="focus-priority-toggle"
                                  :low="isLowPriorityEntry(entry)"
                                  @toggle="toggleEntryPriority(entry)" />
                  <button v-if="!isEditingEntry(entry)" class="focus-badge focus-due-edit"
                          :class="dueBadge(entry)?.kind || 'no-due-date'" :title="dateButtonTitle(entry)"
                          @click.stop="startDueDateEdit(entry, $event)">
                    <span v-if="dueBadge(entry)" class="focus-due-label">{{ dueBadge(entry).label }}</span>
                    <span class="focus-due-clock" aria-hidden="true">◷</span>
                  </button>
                </div>
              </template>
            </template>
            <div v-else-if="now.length || upNext.length" class="panel-empty">
              <div class="panel-empty-title">Nothing in progress or blocked</div>
              <div class="focus-subtext">Use a task's status control when you're ready to begin.</div>
            </div>
            <div v-else-if="done.length" class="panel-empty">
              <div class="panel-empty-title">That's a wrap 🎉</div>
              <div class="focus-subtext">{{ done.length }} task{{ done.length === 1 ? '' : 's' }} shipped. Go outside.</div>
            </div>
            <div v-else class="panel-empty">
              <div class="panel-empty-title">Nothing on deck this week</div>
              <button class="focus-plan-btn" @click.stop="$emit('set-view-mode', 'plan')">Plan your week</button>
            </div>
          </div>
        </section>

        <!-- NOW: all unstarted on-deck work, including this week's schedule -->
        <section
            class="focus-panel panel-now"
            :class="{ 'is-focused': isFocused(1) }"
            :style="panelStyle(1)"
            @click="focusPanel(1)"
        >
          <header class="panel-header">
            <span class="panel-kicker now-kicker">Now</span>
            <span class="panel-count">{{ immediateNow.length }}</span>
          </header>
          <div class="panel-body">
            <div v-if="!immediateNow.length" class="panel-empty">
              Nothing needs attention now.<br>Pull work in from Up next.
            </div>
            <template v-for="day in nowDays" :key="day.key">
              <div class="focus-day-header" :class="dayHeaderClass(day.key)">
                <span class="day-name">{{ day.label }}</span>
                <span class="day-count">{{ day.entries.length }}</span>
              </div>
              <div v-for="entry in day.entries" :key="entry.task.id" class="focus-task-row"
                   :class="[rowClasses(entry), { 'overdue-row': entry.dueGroup === 'overdue' }]"
                   :data-task-id="entry.task.id">
                <button v-if="!isEditingEntry(entry)" class="focus-row-check" :class="checkClasses(entry)"
                        :title="statusTitle(entry)" :aria-label="statusTitle(entry)"
                        @click.stop="cycleEntryStatus(entry, 'now')"></button>
                <div v-if="isEditingEntry(entry)" class="focus-inline-editor" @click.stop>
                  <input v-model="editTaskName" class="focus-edit-name"
                         aria-label="Task name" @keydown.enter="saveEntryEdits(entry)" @keydown.esc="cancelEntryEdit" />
                  <button class="focus-edit-save" title="Save changes" @click="saveEntryEdits(entry)">Save</button>
                  <button class="focus-edit-cancel" title="Cancel editing" @click="cancelEntryEdit">Cancel</button>
                </div>
                <div v-else class="focus-row-main">
                  <button class="focus-row-title" :class="{ 'done-title': ['x', '-'].includes(entry.task.statusChar) }"
                          :title="`Edit name: ${entry.task.text}`"
                          @click.stop="startNameEdit(entry)">{{ cardTitle(entry) }}</button>
                  <span class="focus-section-badge" :title="`${entry.columnName} · ${entry.sectionName}`">
                    {{ entry.sectionName }}
                  </span>
                </div>
                <span v-if="!isEditingEntry(entry) && entryNote(entry)" class="focus-note-dot"
                      :title="entryNote(entry)">📋</span>
                <PriorityToggle v-if="!isEditingEntry(entry)" class="focus-priority-toggle"
                                :low="isLowPriorityEntry(entry)"
                                @toggle="toggleEntryPriority(entry)" />
                <button v-if="!isEditingEntry(entry)" class="focus-badge focus-due-edit"
                        :class="dueBadge(entry)?.kind || 'no-due-date'" :title="dateButtonTitle(entry)"
                        @click.stop="startDueDateEdit(entry, $event)">
                  <span v-if="dueBadge(entry)" class="focus-due-label">{{ dueBadge(entry).label }}</span>
                  <span class="focus-due-clock" aria-hidden="true">◷</span>
                </button>
              </div>
            </template>
          </div>
        </section>

      </div>

      <section class="focus-week-strip">
        <header class="panel-header">
          <span class="panel-kicker week-strip-kicker">Week at a glance</span>
          <span class="panel-count">{{ weekStripCount }}</span>
        </header>
        <div class="panel-body week-strip-body">
          <div class="focus-week-day-columns" :class="{ 'has-expanded-day': expandedWeekDayIndex !== null }"
               @mousemove="magnifyWeekDays" @mouseleave="resetWeekDayMagnification">
            <div v-for="(day, dayIndex) in weekDays" :key="day.key" class="focus-week-day-slot"
                 :style="weekDayDockStyles[dayIndex]">
              <div class="focus-week-day-column"
                   :class="{
                     'is-this-week': day.isThisWeek,
                     'is-past': day.isPast,
                     'is-current': day.isToday,
                     'is-expanded': expandedWeekDayIndex === dayIndex,
                     'is-expanded-neighbor': expandedWeekDayIndex !== null && Math.abs(expandedWeekDayIndex - dayIndex) === 1
                   }">
                <div class="focus-week-day-content">
                  <div class="focus-day-header">
                    <span class="day-name">{{ day.label }}</span>
                    <span class="day-count">{{ day.entries.length }}</span>
                  </div>
                  <div v-if="day.isToday" class="focus-today-summary">
                    <div class="focus-today-callout">Today!</div>
                    <div class="focus-today-statuses">
                      <div v-for="status in day.statusSummary" :key="status.key"
                           class="focus-today-status" :class="`status-${status.key}`">
                        <span class="focus-row-check focus-today-status-mark"
                              :class="checkClasses({ task: { statusChar: status.statusChar } })"
                              aria-hidden="true"></span>
                        <span class="focus-today-status-copy">
                          <strong class="focus-today-status-count">{{ status.count }}</strong>
                          <span class="focus-today-status-label">{{ status.label }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <template v-else>
                  <div v-if="!day.entries.length" class="focus-week-day-empty">—</div>
                <div v-for="entry in day.entries" :key="entry.task.id" class="focus-task-row execution-row"
                     :class="rowClasses(entry)" :data-task-id="entry.task.id">
                <span v-if="day.isToday" class="focus-row-check" :class="checkClasses(entry)"
                      aria-hidden="true"></span>
                <button v-else-if="!isEditingEntry(entry)" class="focus-row-check" :class="checkClasses(entry)"
                        :title="statusTitle(entry)" :aria-label="statusTitle(entry)"
                        @click.stop="cycleEntryStatus(entry, entry.sourceBucket)"></button>
                <div v-if="!day.isToday && isEditingEntry(entry)" class="focus-inline-editor" @click.stop>
                  <input v-model="editTaskName" class="focus-edit-name"
                         aria-label="Task name" @keydown.enter="saveEntryEdits(entry)" @keydown.esc="cancelEntryEdit" />
                  <button class="focus-edit-save" title="Save changes" @click="saveEntryEdits(entry)">Save</button>
                  <button class="focus-edit-cancel" title="Cancel editing" @click="cancelEntryEdit">Cancel</button>
                </div>
                <div v-else class="focus-row-main">
                  <span v-if="day.isToday" class="focus-row-title execution-row-title"
                        :class="{ 'done-title': ['x', '-'].includes(entry.task.statusChar) }">
                    {{ cardTitle(entry) }}
                  </span>
                  <button v-else class="focus-row-title execution-row-title"
                          :class="{ 'done-title': ['x', '-'].includes(entry.task.statusChar) }"
                          :title="`Edit name: ${entry.task.text}`"
                          @click.stop="startNameEdit(entry)">{{ cardTitle(entry) }}</button>
                  <span class="focus-week-section-icon" tabindex="0"
                        :aria-label="`${entry.columnName} · ${entry.sectionName}`"
                        @mouseenter="showSectionTooltip(entry, $event)"
                        @mouseleave="hideSectionTooltip"
                        @focus="showSectionTooltip(entry, $event)"
                        @blur="hideSectionTooltip">
                    {{ sectionInitial(entry) }}
                  </span>
                  <span v-if="entryNote(entry)" class="focus-note-dot"
                        :title="entryNote(entry)">📋</span>
                  <button class="focus-week-priority-badge"
                          :class="{ active: isLowPriorityEntry(entry) }"
                          :title="isLowPriorityEntry(entry) ? 'Make normal priority' : 'Make low priority'"
                          :aria-label="isLowPriorityEntry(entry) ? 'Make normal priority' : 'Make low priority'"
                          @click.stop="toggleEntryPriority(entry, entry.sourceBucket)">
                    {{ isLowPriorityEntry(entry) ? 'LOW' : '↓' }}
                  </button>
                </div>
                  <button class="focus-week-clock" :title="dateButtonTitle(entry)" :aria-label="dateButtonTitle(entry)"
                          @pointerdown.stop.prevent="startDueDateEdit(entry, $event)"
                          @click.stop.prevent
                          @keydown.enter.stop.prevent="startDueDateEdit(entry, $event)"
                          @keydown.space.stop.prevent="startDueDateEdit(entry, $event)">◷</button>
                </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Cards in flight are cloned into this layer so they sail over the panels
         instead of being clipped by them -->
    <div ref="flightLayer" class="focus-flight-layer"></div>

    <nav class="focus-carousel-nav">
      <div class="focus-dots">
        <button
            v-for="(label, index) in ['upnext', 'now', 'inprogress']"
            :key="`dot-${label}`"
            class="focus-dot"
            :class="[`dot-${label}`, { active: activePanel === index }]"
            :title="label"
            @click="activePanel = index"
        ></button>
      </div>
    </nav>

    <Teleport to="body">
      <div v-if="dateMenuEntry" class="focus-date-menu" :class="`theme-${theme}`"
           :style="dateMenuStyle" role="dialog" :aria-label="dateMenuTitle" @click.stop>
        <div class="focus-date-menu-title">{{ dateMenuTitle }}</div>
        <div class="focus-date-options">
          <button v-for="option in dateShortcuts" :key="option.value" class="focus-date-option"
                  @click="setEntryDueDate(dateMenuEntry, option.value)">{{ option.label }}</button>
          <button class="focus-date-option focus-date-custom-trigger"
                  :class="{ active: customDatePickerOpen }"
                  @click="openCustomDatePicker">Custom…</button>
          <button class="focus-date-option focus-date-clear"
                  @click="setEntryDueDate(dateMenuEntry, '')">Clear</button>
        </div>
        <div v-if="customDatePickerOpen" class="focus-unified-date-picker">
          <div v-if="!isTerminalEntry(dateMenuEntry)" class="focus-period-kind-tabs" role="tablist" aria-label="Due date precision">
            <button v-for="kind in ['day', 'week', 'month']" :key="kind" type="button"
                    class="focus-period-kind-btn" :class="{ active: customDateKind === kind }"
                    role="tab" :aria-selected="customDateKind === kind"
                    @click="setCustomDateKind(kind)">{{ kind }}</button>
          </div>
          <input ref="customDateInput" :key="customDateKind" class="focus-custom-date-input"
                 :type="customDateInputType" :aria-label="customDateInputLabel"
                 :value="customDateInputValue"
                 @change="setCustomDuePeriod($event.target.value)" />
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="sectionTooltip" class="focus-section-tooltip" :class="`theme-${theme}`"
           :style="sectionTooltip.style" role="tooltip">
        {{ sectionTooltip.text }}
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import {
  deriveFocusModel,
  findQuickAddTarget,
  findActiveWipSection,
  endOfCurrentWeek
} from '../utils/focusModeHelpers';
import {
  extractDateFromText,
  extractDuePeriod,
  formatWeekPeriodLabel,
  formatDuePeriodValue,
  getDuePeriodLabel,
  isoWeekInputFromSunday,
  isToday,
  sundayValueFromIsoWeekInput,
  weekIdentity
} from '../utils/dateHelpers';
import {
  extractNoteFromText,
  getStrippedDisplayText,
  updateTaskNameAndDueDate
} from '../utils/taskTextHelpers';
import PriorityToggle from './PriorityToggle.vue';
import {
  extractCompletionDateValue,
  getCompletionBadgeFromText,
  reconcileLifecycleDateForStatus,
  setCompletionDate
} from '../utils/completionDateHelpers';
import { getStatusPriority, sortTaskToCorrectPosition } from '../utils/sortHelpers';

const props = defineProps({
  todoData: {
    type: Object,
    default: () => ({ columnOrder: [], columnStacks: {} })
  },
  theme: {
    type: String,
    default: 'dark',
    validator: (value) => ['dark', 'light'].includes(value)
  }
});

const emit = defineEmits(['update', 'set-view-mode']);

const quickAddText = ref('');
const quickAddInput = ref(null);
const showQuickAdd = ref(false);
const editingTaskId = ref(null);
const editTaskName = ref('');
const dateMenuTaskId = ref(null);
const dateMenuPosition = ref({ top: 0, left: 0 });
const customDatePickerOpen = ref(false);
const customDateKind = ref('day');
const customDateInput = ref(null);
const sectionTooltip = ref(null);
const expandedWeekDayIndex = ref(null);
const weekDayDockStyles = ref([]);

const resetWeekDayMagnification = () => {
  expandedWeekDayIndex.value = null;
  weekDayDockStyles.value = [];
};

const WEEK_DOCK_MAX_BOOST = 0.75;
const WEEK_DOCK_RADIUS_IN_PANES = 1.45;

// Dock-style magnification: scale each pane according to pointer distance and
// redistribute the fixed slots around the row's center. An inverse-scaled inner
// content layer cancels the type/icon enlargement while using the pane's wider
// logical layout, so more content appears without a second layout animation.
const magnifyWeekDays = (event) => {
  const container = event.currentTarget;
  const columns = [...container.children];
  if (!columns.length) return;

  const containerRect = container.getBoundingClientRect();
  const pointerX = event.clientX - containerRect.left;
  const centers = columns.map(column =>
    column.offsetLeft + column.offsetWidth / 2
  );
  const widths = columns.map(column => column.offsetWidth);
  const heights = columns.map(column => column.offsetHeight);
  const baseWidth = widths[0] || 1;
  const radius = baseWidth * WEEK_DOCK_RADIUS_IN_PANES;
  const gap = Number.parseFloat(getComputedStyle(container).columnGap) || 0;

  const scales = centers.map(center => {
    const normalizedDistance = Math.min(1, Math.abs(pointerX - center) / radius);
    const influence = (1 + Math.cos(Math.PI * normalizedDistance)) / 2;
    return 1 + WEEK_DOCK_MAX_BOOST * influence;
  });

  let closestIndex = 0;
  centers.forEach((center, index) => {
    if (Math.abs(pointerX - center) < Math.abs(pointerX - centers[closestIndex])) closestIndex = index;
  });
  expandedWeekDayIndex.value = closestIndex;

  const scaledWidths = widths.map((width, index) => width * scales[index]);
  const originalLeft = columns[0].offsetLeft;
  const originalRight = columns.at(-1).offsetLeft + columns.at(-1).offsetWidth;
  const originalCenter = (originalLeft + originalRight) / 2;
  const expandedWidth = scaledWidths.reduce((total, width) => total + width, 0)
      + gap * (columns.length - 1);
  let cursor = originalCenter - expandedWidth / 2;

  const targetCenters = scaledWidths.map(width => {
    const targetCenter = cursor + width / 2;
    cursor += width + gap;
    return targetCenter;
  });
  // The slot coordinates include the strip's 8px outer/padding offset; clamp
  // against 16px here to leave an actual 8px visual viewport margin.
  const viewportMargin = 16;
  const expandedLeft = containerRect.left + targetCenters[closestIndex] - scaledWidths[closestIndex] / 2;
  const expandedRight = containerRect.left + targetCenters[closestIndex] + scaledWidths[closestIndex] / 2;
  let viewportClamp = 0;
  if (expandedLeft < viewportMargin) viewportClamp = viewportMargin - expandedLeft;
  else if (expandedRight > window.innerWidth - viewportMargin) {
    viewportClamp = window.innerWidth - viewportMargin - expandedRight;
  }

  weekDayDockStyles.value = scaledWidths.map((width, index) => {
    return {
      '--dock-scale': scales[index].toFixed(4),
      '--dock-content-scale': (1 / scales[index]).toFixed(4),
      '--dock-content-width': `${width}px`,
      // Leave a small inverse-scale rounding buffer. Without it, a pane whose
      // content fits exactly can acquire a bogus vertical scrollbar at >1x.
      '--dock-content-min-height': `${Math.max(0, (heights[index] - 4) * scales[index])}px`,
      '--dock-shift-x': `${targetCenters[index] + viewportClamp - centers[index]}px`,
      '--dock-z': String(Math.round(scales[index] * 100))
    };
  });
};

const model = computed(() => deriveFocusModel(props.todoData));
const quickAddTarget = computed(() => findQuickAddTarget(props.todoData));

// ========================= Panel transitions =========================
// A change that relocates a task is staged: the card stays put in its original
// slot wearing its new state (held), then visibly flies toward its destination
// (whisking), and finally lands there with a highlight. Changes that leave the
// card in the same rendered slot update immediately without an animation.
const HOLD_MS = 700;
const WHISK_MS = 550;
const ARRIVE_MS = 900;

// Left-to-right panel order, used to work out which way a card should fly.
// Terminal work is rendered in the weekly strip below NOW, so it shares NOW's
// horizontal position for transition purposes.
const BUCKET_INDEX = { upNext: 0, now: 1, done: 1, inProgressQueued: 2 };

// taskId -> { source, index, entry, phase: 'held' | 'whisking', direction }
const transitions = ref(new Map());
// taskId -> travel direction, for the landing animation
const arrivals = ref(new Map());
// Status icons change immediately, but re-bucketing waits so the four-state
// control can be clicked repeatedly without the card moving out from under it.
const STATUS_DEBOUNCE_MS = 1500;
const pendingStatuses = ref(new Map());
const statusTimers = new Map();

const focusRoot = ref(null);
const flightLayer = ref(null);

const timers = new Set();

const schedule = (fn, delay) => {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, delay);
  timers.add(id);
};

// A bucket as rendered: in-transit cards stay in the panel they left from and
// are withheld from the panel they are headed to until they land.
const visibleBucket = (bucketName) => computed(() => {
  const entries = model.value[bucketName].filter(entry =>
    !transitions.value.has(entry.task.id) && !pendingStatuses.value.has(entry.task.id)
  );

  [...pendingStatuses.value.values()]
      .filter(pending => pending.source === bucketName)
      .sort((a, b) => a.index - b.index)
      .forEach(pending => entries.splice(Math.min(pending.index, entries.length), 0, pending.entry));

  [...transitions.value.values()]
      .filter(transition => transition.source === bucketName)
      .sort((a, b) => a.index - b.index)
      .forEach(transition => entries.splice(Math.min(transition.index, entries.length), 0, transition.entry));

  return entries;
});

// Preserve the panel's explicit grouping first (Today/General/due day in the
// execution panels and the UP NEXT groups), then use the main board's status
// priority inside that group. Section clustering remains the final tie-breaker,
// so cards from one section stay adjacent when they share a group and status.
const statusForOrdering = (entry, preservePendingState) => {
  if (!preservePendingState) return entry.task.statusChar;
  return pendingStatuses.value.get(entry.task.id)?.initialStatus
      ?? transitions.value.get(entry.task.id)?.sortStatus
      ?? entry.task.statusChar;
};

const clusterBySection = (entries, { preservePendingState = true } = {}) => {
  const groups = new Map();

  entries.forEach(entry => {
    const dueGroup = entry.dueGroup === 'overdue' ? 'today' : entry.dueGroup;
    const groupKey = dueGroup ?? entry.group ?? '';
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(entry);
  });

  return [...groups.values()].flatMap(groupEntries => {
    const statusOrdered = [...groupEntries].sort((a, b) =>
      getStatusPriority(statusForOrdering(b, preservePendingState))
      - getStatusPriority(statusForOrdering(a, preservePendingState))
    );
    const sections = new Map();

    statusOrdered.forEach(entry => {
      const status = statusForOrdering(entry, preservePendingState);
      const key = `${status}::${entry.columnName}::${entry.sectionName}`;
      if (!sections.has(key)) sections.set(key, []);
      sections.get(key).push(entry);
    });

    return [...sections.values()].flat();
  });
};

const panelCards = (bucketName) => {
  const visible = visibleBucket(bucketName);
  return computed(() => clusterBySection(visible.value));
};

const upNext = panelCards('upNext');
const inProgressQueued = panelCards('inProgressQueued');
const now = panelCards('now');
const done = panelCards('done');
const isLowPriorityEntry = (entry) => entry.task.isLowPriority || entry.task.listMarker === '-';
const upNextDisplayGroups = computed(() => {
  const monthGroups = new Map();
  const weekGroups = new Map();
  const unscheduled = [];
  const lowPriority = [];
  const today = new Date();
  const weekStart = startOfThisWeek();
  const weekEnd = endOfCurrentWeek();

  upNext.value.forEach(entry => {
    const period = extractDuePeriod(entry.task.text);

    // Current-week day and whole-week work is represented only in Week at a
    // glance, including low-priority work.
    if (period && period.kind !== 'month' && period.start <= weekEnd) return;

    if (isLowPriorityEntry(entry)) {
      lowPriority.push(entry);
      return;
    }
    if (!period) {
      unscheduled.push(entry);
      return;
    }

    if (period.kind === 'month') {
      const key = `month-${period.start.getTime()}`;
      const label = period.start.getFullYear() === today.getFullYear() && period.start.getMonth() === today.getMonth()
          ? 'This Month'
          : period.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!monthGroups.has(key)) monthGroups.set(key, {
        key,
        label,
        monthTime: period.start.getTime(),
        kindRank: 0,
        sortTime: period.start.getTime(),
        entries: []
      });
      monthGroups.get(key).entries.push(entry);
      return;
    }

    // Anything later is summarized by its Sunday-Saturday week here.
    const sunday = new Date(period.start);
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(period.start.getDate() - period.start.getDay());
    const key = `week-${sunday.getTime()}`;
    const label = formatWeekPeriodLabel(sunday);
    if (!weekGroups.has(key)) {
      const owner = weekIdentity(sunday);
      weekGroups.set(key, {
        key,
        label,
        monthTime: new Date(owner.year, owner.monthIndex, 1).getTime(),
        kindRank: 1,
        sortTime: sunday.getTime(),
        entries: []
      });
    }
    weekGroups.get(key).entries.push(entry);
  });

  // Present one chronological month timeline: the broad month commitment,
  // then its individual weeks, before moving on to the following month.
  const groups = [...monthGroups.values(), ...weekGroups.values()].sort((a, b) =>
    a.monthTime - b.monthTime || a.kindRank - b.kindRank || a.sortTime - b.sortTime
  );
  if (unscheduled.length) groups.push({ key: 'unscheduled', label: 'Unscheduled', entries: unscheduled });
  if (lowPriority.length) groups.push({ key: 'low-priority', label: 'Low Priority', entries: lowPriority });
  return groups;
});
const upNextDisplayCount = computed(() =>
  upNextDisplayGroups.value.reduce((total, group) => total + group.entries.length, 0)
);
const dateMenuEntry = computed(() => Object.values(model.value)
    .flat()
    .find(entry => entry?.task?.id === dateMenuTaskId.value) || null);
const dateMenuStyle = computed(() => ({
  top: `${dateMenuPosition.value.top}px`,
  left: `${dateMenuPosition.value.left}px`
}));
const isTerminalEntry = (entry) => entry?.task?.statusChar === 'x' || entry?.task?.statusChar === '-';
const dateMenuTitle = computed(() => isTerminalEntry(dateMenuEntry.value) ? 'Set completion date' : 'Set due date');
const dateButtonTitle = (entry) => isTerminalEntry(entry) ? 'Edit completion date' : 'Edit due date';

// The two execution panels spell dates out as day sections rather than per-card badges:
// Today (carrying anything overdue with it), then undated work, then the days
// still to come. The cards arrive already in that order.
const dayLabel = (dueGroup, entry) => {
  if (dueGroup === 'today') return 'Today';
  if (dueGroup === 'undated') return 'General';

  const period = extractDuePeriod(entry.task.text);
  const dueDate = period?.start;
  // During a whisk-away after clearing a date, the departing card briefly
  // retains its old group metadata while its task text is already undated.
  if (!dueDate) return 'General';
  if (period.kind === 'week') return 'This week';
  if (period.kind === 'month') return getDuePeriodLabel(entry.task.text);
  return dueDate <= endOfCurrentWeek()
      ? dueDate.toLocaleDateString('en-US', { weekday: 'long' })
      : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const groupByDueDay = (entries) => {
  const days = [];
  const dayIndex = new Map();

  entries.forEach(entry => {
    // Overdue work is today's problem, so it rides in the Today section
    const key = entry.dueGroup === 'overdue' ? 'today' : entry.dueGroup;
    if (!dayIndex.has(key)) {
      dayIndex.set(key, days.length);
      days.push({ key, label: dayLabel(key, entry), entries: [] });
    }
    days[dayIndex.get(key)].entries.push(entry);
  });

  return days;
};

const dayHeaderClass = (key) => `day-${key === 'today' ? 'today' : key === 'undated' ? 'general' : 'upcoming'}`;

const inProgressQueuedGroups = computed(() => {
  const lowPriority = inProgressQueued.value.filter(isLowPriorityEntry);
  const normalPriority = inProgressQueued.value.filter(entry => !isLowPriorityEntry(entry));
  const inProgress = normalPriority.filter(entry => entry.group !== 'waiting');
  const waiting = normalPriority.filter(entry => entry.group === 'waiting');
  return [
    { key: 'in-progress-this-week', label: 'In Progress This Week', entries: inProgress },
    { key: 'waiting-blocked', label: 'Waiting / Blocked', entries: waiting },
    { key: 'low-priority', label: 'Low Priority', entries: lowPriority }
  ].filter(group => group.entries.length);
});
const isScheduledThisWeek = (entry) => {
  if (!String(entry.dueGroup).startsWith('day-')) return false;
  const dueDate = extractDateFromText(entry.task.text);
  return Boolean(dueDate) && dueDate <= endOfCurrentWeek();
};
const immediateNow = computed(() => now.value.filter(entry =>
  !isScheduledThisWeek(entry)
));
const nowDays = computed(() => {
  const lowPriority = immediateNow.value.filter(isLowPriorityEntry);
  const groups = groupByDueDay(immediateNow.value.filter(entry => !isLowPriorityEntry(entry)));
  if (lowPriority.length) groups.push({ key: 'low-priority', label: 'Low Priority', entries: lowPriority });
  return groups;
});

const startOfThisWeek = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const weeklySourceEntries = computed(() => {
  const entries = [];
  const seen = new Set();
  const addEntries = (bucketEntries, sourceBucket) => bucketEntries.forEach(entry => {
    if (seen.has(entry.task.id)) return;
    seen.add(entry.task.id);
    entries.push({ ...entry, sourceBucket });
  });

  addEntries(upNext.value, 'upNext');
  addEntries(inProgressQueued.value, 'inProgressQueued');
  addEntries(now.value, 'now');
  addEntries(done.value, 'done');
  return entries;
});

const weekDays = computed(() => {
  const start = startOfThisWeek();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.getTime(),
      date,
      label: date.toLocaleDateString('en-US', { weekday: 'long' }),
      isPast: date < today,
      isToday: date.getTime() === today.getTime(),
      entries: []
    };
  });

  const thisWeek = {
    key: 'this-week',
    date: start,
    label: 'This Week',
    isThisWeek: true,
    isPast: false,
    isToday: false,
    entries: []
  };

  weeklySourceEntries.value.forEach(entry => {
    const isTerminal = entry.task.statusChar === 'x' || entry.task.statusChar === '-';
    const period = extractDuePeriod(entry.task.text);
    if (period?.kind === 'week' && period.start.getTime() === start.getTime()) {
      thisWeek.entries.push(entry);
      return;
    }
    const dueDate = period?.kind === 'day' ? period.start : null;
    const dueThisWeek = dueDate && dueDate >= start && dueDate <= end;
    // Completion history owns terminal placement. A task completed Wednesday
    // belongs under Wednesday even when its original due date was Thursday.
    const completionDate = isTerminal ? extractCompletionDateValue(entry.task.text) : null;
    const slotDate = isTerminal ? (completionDate || (dueThisWeek ? dueDate : null)) : dueThisWeek ? dueDate : null;
    if (!slotDate || slotDate < start || slotDate > end) return;

    const dayIndex = Math.round((slotDate - start) / 86400000);
    if (days[dayIndex].isToday) return;
    if (days[dayIndex].isPast && !isTerminal) return;
    days[dayIndex].entries.push(entry);
  });

  // Today is a compact mirror of the complete NOW panel rather than another
  // scheduling slice. That includes overdue, undated, due-today, and today's
  // terminal work, while the main panel remains the authoritative workspace.
  const currentDay = days.find(day => day.isToday);
  if (currentDay) {
    currentDay.entries = immediateNow.value.map(entry => ({ ...entry, sourceBucket: 'now' }));
    const counts = { 'not-started': 0, 'in-progress': 0, done: 0, 'will-not-do': 0 };
    currentDay.entries.forEach(entry => {
      const key = entry.task.statusChar === '~' ? 'in-progress'
        : entry.task.statusChar === 'x' ? 'done'
          : entry.task.statusChar === '-' ? 'will-not-do' : 'not-started';
      counts[key] += 1;
    });
    currentDay.statusSummary = [
      { key: 'not-started', statusChar: ' ', label: 'Not started', count: counts['not-started'] },
      { key: 'in-progress', statusChar: '~', label: 'In progress', count: counts['in-progress'] },
      { key: 'done', statusChar: 'x', label: 'Done', count: counts.done },
      { key: 'will-not-do', statusChar: '-', label: 'Won’t do', count: counts['will-not-do'] }
    ].filter(status => status.count > 0);
  }

  days.forEach(day => {
    day.entries = clusterBySection(day.entries);
  });
  thisWeek.entries = clusterBySection(thisWeek.entries);
  return [thisWeek, ...days];
});
const weekStripCount = computed(() => weekDays.value.reduce((total, day) => total + day.entries.length, 0));

// The panels clip their contents, so a card can't visibly leave one. Clone it
// into the fixed overlay at the moment it takes off - the clone sails above
// every panel while the original collapses out of the list behind it.
const launchFlight = (taskId, direction) => {
  const row = focusRoot.value?.querySelector(`.focus-stage .focus-task-row[data-task-id="${taskId}"]`);
  if (!row || !flightLayer.value) return;

  const { top, left, width, height } = row.getBoundingClientRect();
  const flier = row.cloneNode(true);

  flier.classList.remove('transitioning', 'phase-held', 'arriving');
  flier.classList.add('flight-card', `fly-${direction}`);
  Object.assign(flier.style, {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`
  });

  flightLayer.value.appendChild(flier);
  schedule(() => flier.remove(), WHISK_MS);
};

const cardPlacement = (focusModel, bucketName, taskId, preservePendingState = true) => {
  const entries = clusterBySection(focusModel[bucketName] || [], { preservePendingState });
  const index = entries.findIndex(candidate => candidate.task.id === taskId);
  if (index === -1) return null;

  const dueGroup = entries[index].dueGroup === 'overdue' ? 'today' : entries[index].dueGroup;
  return { index, dueGroup: dueGroup || null };
};

const moveWithTransition = (entry, sourceBucket, destinationBucket, applyChange) => {
  const taskId = entry.task.id;
  if (transitions.value.has(taskId)) return;

  const index = model.value[sourceBucket].findIndex(candidate => candidate.task.id === taskId);
  const sourcePlacement = cardPlacement(model.value, sourceBucket, taskId);
  let direction = sourceBucket === destinationBucket
      ? 'within'
      : BUCKET_INDEX[destinationBucket] > BUCKET_INDEX[sourceBucket] ? 'right' : 'left';

  transitions.value.set(taskId, { source: sourceBucket, index: Math.max(index, 0), entry, phase: 'held', direction });

  // The data (and the file) change immediately - only the card's travel is staged
  applyChange();
  emit('update');

  const updatedModel = deriveFocusModel(props.todoData);
  const resolvedDestination = Object.keys(BUCKET_INDEX).find(bucketName =>
    updatedModel[bucketName].some(candidate => candidate.task.id === taskId)
  ) || destinationBucket;
  const destinationPlacement = cardPlacement(updatedModel, resolvedDestination, taskId);
  const staysPut = sourceBucket === resolvedDestination
      && sourcePlacement?.index === destinationPlacement?.index
      && sourcePlacement?.dueGroup === destinationPlacement?.dueGroup;

  if (staysPut) {
    transitions.value.delete(taskId);
    return;
  }

  direction = sourceBucket === resolvedDestination
      ? 'within'
      : BUCKET_INDEX[resolvedDestination] > BUCKET_INDEX[sourceBucket] ? 'right' : 'left';
  const staged = transitions.value.get(taskId);
  transitions.value.set(taskId, { ...staged, direction });

  schedule(() => {
    const transition = transitions.value.get(taskId);
    if (!transition) return;
    launchFlight(taskId, direction);
    transitions.value.set(taskId, { ...transition, phase: 'whisking' });
  }, HOLD_MS);

  schedule(() => {
    transitions.value.delete(taskId);
    arrivals.value.set(taskId, direction);
    schedule(() => arrivals.value.delete(taskId), ARRIVE_MS);
  }, HOLD_MS + WHISK_MS);
};

const rowClasses = (entry) => {
  const priorityClass = isLowPriorityEntry(entry) ? 'low-priority-row' : null;
  const transition = transitions.value.get(entry.task.id);
  if (transition) return [priorityClass, 'transitioning', `phase-${transition.phase}`, `whisk-${transition.direction}`].filter(Boolean);

  const arrivalDirection = arrivals.value.get(entry.task.id);
  return [priorityClass, ...(arrivalDirection ? ['arriving', `arrive-${arrivalDirection}`] : [])].filter(Boolean);
};

const toggleEntryPriority = (entry) => {
  const makeLow = !isLowPriorityEntry(entry);
  entry.task.listMarker = makeLow ? '-' : '*';
  entry.task.isLowPriority = makeLow;
  emit('update');
};

const checkClasses = (entry) => ({
  unchecked: entry.task.statusChar === ' ',
  inflight: entry.task.statusChar === '~',
  'in-progress': entry.task.statusChar === '~',
  checked: entry.task.statusChar === 'x',
  cancelled: entry.task.statusChar === '-',
  pending: pendingStatuses.value.has(entry.task.id)
});

const STATUS_LABELS = { ' ': 'Queued', '~': 'In progress', x: 'Completed', '-': 'Cancelled' };
const NEXT_STATUS = { ' ': '~', '~': 'x', x: '-', '-': ' ' };

const statusTitle = (entry) => {
  const current = STATUS_LABELS[entry.task.statusChar] || STATUS_LABELS[' '];
  const next = STATUS_LABELS[NEXT_STATUS[entry.task.statusChar] || '~'];
  return `${current} — click for ${next}`;
};

const totalCount = computed(() =>
  inProgressQueued.value.length + now.value.length + upNext.value.length + done.value.length
);
const completedCount = computed(() =>
  [...inProgressQueued.value, ...now.value, ...upNext.value, ...done.value]
      .filter(entry => entry.task.statusChar === 'x').length
);
const progressPercent = computed(() =>
  totalCount.value === 0 ? '0%' : `${Math.round((completedCount.value / totalCount.value) * 100)}%`
);

// ========================= Carousel =========================
// Three panels in logical order [up next, now, in progress / waiting]. Exactly
// one panel is spotlighted; NOW owns the center by default while the other two
// peek from the edges. The former DONE panel's right-hand slot now belongs to
// IN PROGRESS / WAITING because terminal work lives in the weekly strip below.
const DEFAULT_PANEL = 1;
const MAX_PANEL = 2;
const activePanel = ref(DEFAULT_PANEL);

const isFocused = (panelIndex) => panelIndex === activePanel.value;

const panelStyle = (panelIndex) => {
  if (isFocused(panelIndex)) {
    return {
      transform: 'translate(-50%, -50%) translateX(0) rotateY(0deg) scale(1.02)',
      zIndex: 50,
      opacity: 1,
      pointerEvents: 'auto'
    };
  }

  // The carousel is linear, not circular. Adjacent panels occupy the visible
  // side slots; a panel two positions away remains beyond that same edge.
  const relativePosition = panelIndex - activePanel.value;
  const leftSide = relativePosition < 0;
  const distance = Math.abs(relativePosition);
  const x = `${(leftSide ? -1 : 1) * 34 * distance}vw`;

  return {
    transform: `translate(-50%, -48%) translateX(${x}) rotateY(${leftSide ? 7 : -7}deg) scale(0.94)`,
    zIndex: distance === 1 ? 40 : 30,
    opacity: distance === 1 ? 0.88 : 0.35,
    pointerEvents: distance === 1 ? 'auto' : 'none'
  };
};

const focusPanel = (panelIndex) => {
  activePanel.value = panelIndex;
};

const step = (direction) => {
  activePanel.value = Math.min(Math.max(activePanel.value + direction, 0), MAX_PANEL);
};

const isEditableTarget = (target) => target?.closest?.('input, textarea, select, [contenteditable="true"]');

const handleKeydown = (event) => {
  if (event.key === 'Escape' && dateMenuTaskId.value !== null) {
    dateMenuTaskId.value = null;
    return;
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
  step(event.key === 'ArrowLeft' ? -1 : 1);
};

// Two-finger trackpad swipes arrive as wheel events with horizontal deltas.
// Step once per gesture: fire as soon as the swipe is unambiguous, then stay
// disarmed until the deltas (including the momentum tail) go quiet.
let wheelAccum = 0;
let wheelArmed = true;
let wheelIdleTimer = null;

const handleWheel = (event) => {
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
  event.preventDefault();

  clearTimeout(wheelIdleTimer);
  wheelIdleTimer = setTimeout(() => {
    wheelArmed = true;
    wheelAccum = 0;
  }, 180);

  if (!wheelArmed) return;

  wheelAccum += event.deltaX;
  if (Math.abs(wheelAccum) < 30) return;

  wheelArmed = false;
  step(wheelAccum > 0 ? 1 : -1);
  wheelAccum = 0;
};

const closeDateMenu = () => {
  dateMenuTaskId.value = null;
  customDatePickerOpen.value = false;
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', closeDateMenu);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', closeDateMenu);
  clearTimeout(wheelIdleTimer);
  timers.forEach(clearTimeout);
  timers.clear();
  statusTimers.forEach(clearTimeout);
  statusTimers.clear();
});

// ========================= Row content =========================
const cardTitle = (entry) => entry.task.displayText || entry.task.text;

const entryNote = (entry) => extractNoteFromText(entry.task.text);
const sectionInitial = (entry) => entry.sectionName?.trim().charAt(0).toUpperCase() || '?';
const showSectionTooltip = (entry, event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  sectionTooltip.value = {
    text: `${entry.columnName} · ${entry.sectionName}`,
    style: {
      top: `${rect.top - 7}px`,
      left: `${Math.min(Math.max(rect.left + rect.width / 2, 100), window.innerWidth - 100)}px`
    }
  };
};
const hideSectionTooltip = () => {
  sectionTooltip.value = null;
};

const isEditingEntry = (entry) => editingTaskId.value === entry.task.id;

const formatDateInputValue = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const focusEditNameInput = (select = false) => {
  const input = focusRoot.value?.querySelector('.focus-edit-name');
  input?.focus();
  if (select) input?.select();
};

const startNameEdit = async (entry) => {
  if (transitions.value.has(entry.task.id)) return;
  closeDateMenu();
  editingTaskId.value = entry.task.id;
  editTaskName.value = getStrippedDisplayText(entry.task.text);
  await nextTick();
  focusEditNameInput(true);
};

const startDueDateEdit = (entry, event) => {
  if (transitions.value.has(entry.task.id)) return;
  cancelEntryEdit();
  if (dateMenuTaskId.value === entry.task.id) {
    closeDateMenu();
    return;
  }

  const badgeRect = event.currentTarget.getBoundingClientRect();
  const menuWidth = Math.min(280, window.innerWidth - 32);
  const estimatedMenuHeight = 230;
  dateMenuPosition.value = {
    top: badgeRect.bottom + estimatedMenuHeight + 8 <= window.innerHeight
        ? badgeRect.bottom + 8
        : Math.max(8, badgeRect.top - estimatedMenuHeight - 8),
    left: Math.min(Math.max(8, badgeRect.right - menuWidth), window.innerWidth - menuWidth - 8)
  };
  dateMenuTaskId.value = dateMenuTaskId.value === entry.task.id ? null : entry.task.id;
};

const cancelEntryEdit = () => {
  editingTaskId.value = null;
  editTaskName.value = '';
};

const saveEntryEdits = (entry) => {
  if (!editTaskName.value.trim()) {
    focusEditNameInput();
    return;
  }

  const currentDueDate = formatDuePeriodValue(extractDuePeriod(entry.task.text));
  let updatedText = updateTaskNameAndDueDate(entry.task.text, editTaskName.value, currentDueDate);
  if (isTerminalEntry(entry)) {
    const completion = extractCompletionDateValue(entry.task.text);
    const completionValue = formatDateInputValue(completion);
    updatedText = setCompletionDate(updatedText, completionValue);
  }
  cancelEntryEdit();
  if (updatedText === entry.task.text) return;

  entry.task.text = updatedText;
  entry.task.displayText = getStrippedDisplayText(updatedText);
  resortInSection(entry);
  emit('update');
};

const dateShortcuts = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = endOfCurrentWeek();
  const options = [];

  const addOption = (label, date) => options.push({
    label,
    value: formatDateInputValue(date)
  });

  addOption('Today', today);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  addOption('Tomorrow', tomorrow);

  const remainingDate = new Date(tomorrow);
  remainingDate.setDate(remainingDate.getDate() + 1);
  while (remainingDate <= endOfWeek) {
    addOption(remainingDate.toLocaleDateString('en-US', { weekday: 'long' }), new Date(remainingDate));
    remainingDate.setDate(remainingDate.getDate() + 1);
  }

  // A completed/not-completing task always records one exact completion day.
  if (isTerminalEntry(dateMenuEntry.value)) {
    const nextMonday = new Date(endOfWeek);
    nextMonday.setDate(endOfWeek.getDate() + 2);
    addOption('Next week', nextMonday);
    return options;
  }

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  options.push({ label: 'This week', value: `week:${formatDateInputValue(weekStart)}` });
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  options.push({ label: 'Next week', value: `week:${formatDateInputValue(nextWeek)}` });
  options.push({ label: 'This month', value: `month:${formatDateInputValue(today).slice(0, 7)}` });
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  options.push({ label: 'Next month', value: `month:${formatDateInputValue(nextMonth).slice(0, 7)}` });
  return options;
});

const customDateInputValue = computed(() => {
  if (isTerminalEntry(dateMenuEntry.value)) {
    return formatDateInputValue(extractCompletionDateValue(dateMenuEntry.value.task.text));
  }
  const period = dateMenuEntry.value ? extractDuePeriod(dateMenuEntry.value.task.text) : null;
  if (!period || period.kind !== customDateKind.value) return '';
  if (period.kind === 'week') return isoWeekInputFromSunday(period.start);
  if (period.kind === 'month') return formatDateInputValue(period.start).slice(0, 7);
  return formatDateInputValue(period.start);
});

const customDateInputType = computed(() => customDateKind.value === 'day' ? 'date' : customDateKind.value);
const customDateInputLabel = computed(() => `Custom ${isTerminalEntry(dateMenuEntry.value) ? 'completion' : 'due'} ${customDateKind.value}`);

const showCustomDatePicker = async () => {
  await nextTick();
  customDateInput.value?.focus();
  try {
    customDateInput.value?.showPicker?.();
  } catch {
    // The visible native input remains usable where programmatic opening is restricted.
  }
};

const openCustomDatePicker = () => {
  if (!customDatePickerOpen.value) {
    const existingKind = isTerminalEntry(dateMenuEntry.value)
      ? 'day'
      : dateMenuEntry.value && extractDuePeriod(dateMenuEntry.value.task.text)?.kind;
    customDateKind.value = existingKind || 'day';
    customDatePickerOpen.value = true;
  }
  showCustomDatePicker();
};

const setCustomDateKind = (kind) => {
  if (isTerminalEntry(dateMenuEntry.value) && kind !== 'day') return;
  customDateKind.value = kind;
  showCustomDatePicker();
};

const setCustomDuePeriod = (value) => {
  if (!value || !dateMenuEntry.value) return;
  const dueValue = customDateKind.value === 'week'
      ? `week:${sundayValueFromIsoWeekInput(value)}`
      : customDateKind.value === 'month' ? `month:${value}` : value;
  setEntryDueDate(dateMenuEntry.value, dueValue);
};

const setEntryDueDate = (entry, dateValue) => {
  const taskName = getStrippedDisplayText(entry.task.text);
  const updatedText = isTerminalEntry(entry)
    ? setCompletionDate(entry.task.text, dateValue)
    : updateTaskNameAndDueDate(entry.task.text, taskName, dateValue);
  closeDateMenu();
  if (updatedText === entry.task.text) return;

  const bucketNames = ['upNext', 'inProgressQueued', 'now', 'done'];
  const findTaskBucket = (focusModel) => bucketNames.find(bucketName =>
    focusModel[bucketName].some(candidate => candidate.task.id === entry.task.id)
  );
  const sourceBucket = findTaskBucket(model.value);

  // Preview the new derivation synchronously so the existing transition system
  // knows where the edited card will land before the reactive model re-buckets it.
  const previousText = entry.task.text;
  entry.task.text = updatedText;
  const destinationBucket = findTaskBucket(deriveFocusModel(props.todoData));
  entry.task.text = previousText;

  const applyDateChange = () => {
    entry.task.text = updatedText;
    entry.task.displayText = getStrippedDisplayText(updatedText);
    resortInSection(entry);
  };

  if (sourceBucket && destinationBucket) {
    moveWithTransition(entry, sourceBucket, destinationBucket, applyDateChange);
  } else {
    applyDateChange();
    emit('update');
  }
};

const dueBadge = (entry) => {
  if (isTerminalEntry(entry)) {
    const label = getCompletionBadgeFromText(entry.task.text);
    return label ? { kind: 'completion-date', label } : null;
  }
  const period = extractDuePeriod(entry.task.text);
  const dueDate = period?.start;
  if (!period) return null;
  if (isToday(entry.task.text)) return { kind: 'due-today', label: 'today' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(period.end);
  endDay.setHours(0, 0, 0, 0);
  const daysLate = Math.round((today - endDay) / 86400000);
  if (daysLate > 0) return { kind: 'overdue', label: `${daysLate}d late` };

  // A whole-week commitment is a period (purple), distinct from an exact day
  // that merely happens to fall later this week (blue).
  if (period.kind === 'week') return { kind: 'due-week-period', label: getDuePeriodLabel(entry.task.text).toUpperCase() };
  if (period.kind === 'month') return { kind: 'due-month', label: getDuePeriodLabel(entry.task.text) };

  // Still to come: name the weekday while it is this week, then fall back to a date
  const label = dueDate <= endOfCurrentWeek()
      ? dueDate.toLocaleDateString('en-US', { weekday: 'short' })
      : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { kind: dueDate <= endOfCurrentWeek() ? 'due-week' : 'due-later', label };
};

// ========================= Actions =========================
const resortInSection = (entry) => {
  sortTaskToCorrectPosition(entry.section.items, entry.task, () => {});
};

// Starting or reopening work puts it in IN PROGRESS / WAITING, and active work
// lives in WIP: tasks elsewhere get pulled into the active WIP section.
const moveToActiveWip = (entry) => {
  if (entry.stackName === 'WIP') return entry.section;

  const target = findActiveWipSection(props.todoData);
  if (!target) return entry.section;

  const index = entry.section.items.findIndex(item => item.id === entry.task.id);
  if (index !== -1) entry.section.items.splice(index, 1);
  target.section.items.push(entry.task);
  return target.section;
};

const finishPendingStatus = (taskId) => {
  const pending = pendingStatuses.value.get(taskId);
  if (!pending) return;
  statusTimers.delete(taskId);

  const { entry, source, index, sourcePlacement, initialStatus } = pending;
  const finalStatus = entry.task.statusChar;
  const section = initialStatus === ' ' && finalStatus === '~'
      ? moveToActiveWip(entry)
      : entry.section;

  entry.task.text = reconcileLifecycleDateForStatus(entry.task.text, finalStatus);
  entry.task.displayText = getStrippedDisplayText(entry.task.text);
  sortTaskToCorrectPosition(section.items, entry.task, () => {});

  const updatedModel = deriveFocusModel(props.todoData);
  const destination = Object.keys(BUCKET_INDEX).find(bucketName =>
    updatedModel[bucketName].some(candidate => candidate.task.id === taskId)
  );
  const destinationPlacement = destination
      ? cardPlacement(updatedModel, destination, taskId, false)
      : null;
  const staysPut = source === destination
      && sourcePlacement?.index === destinationPlacement?.index
      && sourcePlacement?.dueGroup === destinationPlacement?.dueGroup;

  if (!destination || staysPut) {
    pendingStatuses.value.delete(taskId);
    emit('update');
    return;
  }

  const direction = source === destination
      ? 'within'
      : BUCKET_INDEX[destination] > BUCKET_INDEX[source] ? 'right' : 'left';
  transitions.value.set(taskId, {
    source,
    index,
    entry,
    phase: 'held',
    direction,
    sortStatus: initialStatus
  });
  pendingStatuses.value.delete(taskId);
  emit('update');

  nextTick(() => {
    launchFlight(taskId, direction);
    const transition = transitions.value.get(taskId);
    if (transition) transitions.value.set(taskId, { ...transition, phase: 'whisking' });
  });

  schedule(() => {
    transitions.value.delete(taskId);
    arrivals.value.set(taskId, direction);
    schedule(() => arrivals.value.delete(taskId), ARRIVE_MS);
  }, WHISK_MS);

  activePanel.value = destination === 'upNext'
      ? 0
      : destination === 'inProgressQueued' ? 2 : DEFAULT_PANEL;
};

const cycleEntryStatus = (entry, sourceBucket) => {
  const taskId = entry.task.id;
  if (transitions.value.has(taskId)) return;

  let pending = pendingStatuses.value.get(taskId);
  if (!pending) {
    const index = model.value[sourceBucket].findIndex(candidate => candidate.task.id === taskId);
    pending = {
      source: sourceBucket,
      index: Math.max(index, 0),
      entry,
      initialStatus: entry.task.statusChar,
      sourcePlacement: cardPlacement(model.value, sourceBucket, taskId)
    };
    pendingStatuses.value.set(taskId, pending);
  }

  const existingTimer = statusTimers.get(taskId);
  if (existingTimer) clearTimeout(existingTimer);

  entry.task.statusChar = NEXT_STATUS[entry.task.statusChar] || '~';
  entry.task.displayText = getStrippedDisplayText(entry.task.text);
  emit('update');

  const timer = setTimeout(() => finishPendingStatus(taskId), STATUS_DEBOUNCE_MS);
  statusTimers.set(taskId, timer);
};

const quickAdd = () => {
  const taskName = quickAddText.value.trim();
  if (!taskName || !quickAddTarget.value) return;
  const text = updateTaskNameAndDueDate('', taskName, formatDateInputValue(new Date()));

  quickAddTarget.value.section.items.push({
    id: Date.now(),
    type: 'task',
    listMarker: '*',
    isLowPriority: false,
    statusChar: ' ',
    text,
    displayText: getStrippedDisplayText(text)
  });
  quickAddText.value = '';
  showQuickAdd.value = false;
  emit('update');
};

const toggleQuickAdd = async () => {
  showQuickAdd.value = !showQuickAdd.value;
  if (!showQuickAdd.value) return;
  await nextTick();
  quickAddInput.value?.focus();
};
</script>

<style scoped>
.focus-mode {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: radial-gradient(1200px 500px at 50% -10%, #1d232e 0%, #14171c 55%);
  color: #e8eaed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ========================= */
/* Header                    */
/* ========================= */
.focus-header {
  position: relative;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  gap: 18px;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 10px 24px 0;
}

.focus-heading {
  flex: 1;
}

.focus-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #ffb347;
  margin-bottom: 1px;
}

.focus-date {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  color: #f4f6f8;
  letter-spacing: -0.5px;
}

.focus-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding-bottom: 2px;
}

.focus-progress-text {
  font-size: 13px;
  font-weight: 600;
  color: #9aa4b2;
  white-space: nowrap;
}

.focus-progress-track {
  width: 160px;
  height: 5px;
  border-radius: 3px;
  background: #262c36;
  overflow: hidden;
}

.focus-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: #ffb347;
  transition: width 0.4s ease;
}

.focus-progress-fill.complete {
  background: #4caf50;
}

.focus-exit-btn {
  background: transparent;
  border: 1px solid #333c49;
  border-radius: 6px;
  color: #9aa4b2;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 2px;
  transition: all 0.2s ease;
}

.focus-exit-btn:hover {
  color: #f4f6f8;
  border-color: #556070;
  background: #262c36;
}

/* ========================= */
/* Stage + panels            */
/* ========================= */
.focus-stage {
  position: relative;
  height: calc(100vh - 125px);
  min-height: 480px;
  margin-top: 4px;
}

.focus-carousel {
  position: absolute;
  inset: 0;
  perspective: 1500px;
}

.focus-stage.has-week-strip .focus-carousel {
  position: relative;
  inset: auto;
  flex: 1;
  height: auto;
  min-height: 300px;
}

.focus-stage.has-week-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.focus-panel {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28vw;
  height: 98%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #1a1f26;
  border: 1px solid #232a35;
  border-radius: 14px;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  overflow: hidden;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.22, 0.9, 0.34, 1), width 0.45s cubic-bezier(0.22, 0.9, 0.34, 1), height 0.45s cubic-bezier(0.22, 0.9, 0.34, 1),
              opacity 0.35s ease,
              border-color 0.3s ease, box-shadow 0.3s ease;
}

.focus-panel.is-focused {
  width: 38vw;
  height: 100%;
  cursor: default;
  background: #1c212a;
  border-color: #2c3340;
}

.focus-panel.is-focused {
  box-shadow: 0 0 80px rgba(255, 179, 71, 0.08), 0 18px 44px rgba(0, 0, 0, 0.55);
}

.focus-panel.panel-in-progress-queued.is-focused {
  box-shadow: 0 0 90px rgba(255, 179, 71, 0.13), 0 18px 44px rgba(0, 0, 0, 0.55);
}

.focus-week-strip {
  position: relative;
  z-index: 60;
  left: 50%;
  top: auto;
  width: calc(100vw - 24px);
  height: min(25vh, 220px);
  max-height: min(25vh, 220px);
  margin-top: 0;
  flex: 0 0 min(25vh, 220px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  transform: translateX(-50%);
  overflow: visible;
  background: #1a1f26;
  border: 1px solid #2c3340;
  border-radius: 14px;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.48);
}

.week-strip-kicker {
  color: #7fb2e5;
}

.panel-body.week-strip-body {
  min-height: 0;
  overflow: visible;
}

.focus-week-day-columns {
  display: flex;
  justify-content: center;
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  gap: 6px;
  padding: 6px;
  overflow: visible;
}

.focus-week-day-slot {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  position: relative;
  transform: translateX(var(--dock-shift-x, 0px));
  transition: transform 0.18s cubic-bezier(0.22, 0.9, 0.34, 1);
  z-index: var(--dock-z, 1);
}

.focus-week-day-column {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: #171c23;
  border: 1px solid #2b3441;
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: #364152 transparent;
  transform-origin: center bottom;
  transform: translateX(-50%) scale(var(--dock-scale, 1));
  transition: transform 0.18s cubic-bezier(0.22, 0.9, 0.34, 1),
              border-color 0.18s ease, box-shadow 0.18s ease;
}

.focus-week-day-content {
  width: var(--dock-content-width, 100%);
  min-height: var(--dock-content-min-height, 100%);
  box-sizing: border-box;
  padding: 5px 6px 7px;
  transform-origin: left top;
  transform: scale(var(--dock-content-scale, 1));
  transition: transform 0.18s cubic-bezier(0.22, 0.9, 0.34, 1);
}

.focus-week-day-columns.has-expanded-day .focus-week-day-column.is-expanded {
  border-color: #4f6f92;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.36);
  /* Magnification's inverse-scaled content can create a synthetic scrollbar
     even when all tasks fit. Keep scrolling functional, but hide that rail. */
  scrollbar-width: none;
}

.focus-week-day-columns.has-expanded-day .focus-week-day-column.is-expanded::-webkit-scrollbar {
  display: none;
}

.focus-week-day-column .focus-day-header {
  position: sticky;
  top: -5px;
  z-index: 2;
  padding: 2px 2px 3px;
  background: #171c23;
}

.focus-week-day-column .focus-task-row {
  gap: 3px;
  margin-top: 2px;
  padding: 1px 4px;
}

.focus-week-day-column .focus-row-check {
  width: 14px;
  height: 14px;
  min-width: 14px;
}

.focus-week-day-column .focus-row-title {
  font-size: 10px;
}

.focus-week-section-icon {
  flex: 0 0 14px;
  display: none;
  width: 14px;
  height: 14px;
  box-sizing: border-box;
  place-items: center;
  color: #8a93a3;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #354050;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 800;
  line-height: 1;
  cursor: help;
}

.focus-week-day-column .focus-note-dot {
  flex: 0 0 auto;
  font-size: 9px;
}

.focus-week-clock {
  position: relative;
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  min-width: 14px;
  display: none;
  box-sizing: border-box;
  padding: 0;
  place-items: center;
  background: transparent;
  border: 1px solid #8a93a3;
  border-radius: 50%;
  color: transparent;
  font-family: inherit;
  font-size: 0;
  line-height: 1;
}

.focus-week-day-column.is-expanded .focus-week-section-icon,
.focus-week-day-column.is-expanded .focus-week-clock {
  display: grid;
}

.focus-week-day-column.is-this-week {
  background: #1d202a;
  border-color: #514666;
}

.focus-week-day-column.is-this-week .focus-day-header {
  color: #b9a6d8;
  background: #1d202a;
}

.focus-week-clock::before,
.focus-week-clock::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  height: 1px;
  background: #8a93a3;
  border-radius: 1px;
  transform-origin: left center;
}

.focus-week-clock::before {
  width: 4px;
  transform: rotate(-90deg);
}

.focus-week-clock::after {
  width: 3px;
  transform: rotate(28deg);
}

button.focus-week-clock {
  cursor: pointer;
}

button.focus-week-clock:hover {
  border-color: #ffb347;
}

button.focus-week-clock:hover::before,
button.focus-week-clock:hover::after {
  background: #ffb347;
}

.focus-week-day-column.is-past {
  background: #181d24;
}

.focus-week-day-column.is-past .focus-task-row {
  opacity: 0.78;
}

.focus-week-day-column.is-current {
  background: #242930;
  border-color: #353b45;
}

.focus-week-day-column.is-current .focus-day-header {
  background: #242930;
}

.focus-today-summary {
  display: flex;
  min-height: 72px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 4px;
}

.focus-today-callout {
  color: #7fb2e5;
  font-size: 21px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.focus-today-statuses {
  display: flex;
  width: min(100%, 122px);
  flex-direction: column;
  gap: 5px;
}

.focus-today-status {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: #8f99a8;
  font-size: 9px;
  line-height: 14px;
}

.focus-today-status-mark {
  flex: 0 0 14px;
}

.focus-today-status-count {
  color: #c4cad2;
  font-size: 9px;
  font-weight: 800;
}

.focus-today-status-copy {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: baseline;
  gap: 3px;
}

.focus-today-status-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.focus-week-day-empty {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  color: #647087;
  font-size: 11px;
}

.focus-week-day-column.is-current .focus-task-row {
  opacity: 0.88;
}

/* Keep side-panel rows safe from accidental status changes while still
   allowing quick edits without first moving the panel into the spotlight. */
.focus-panel:not(.is-focused) .panel-body button {
  pointer-events: none;
}

.focus-panel:not(.is-focused) .panel-body .focus-row-title,
.focus-panel:not(.is-focused) .panel-body .focus-due-edit,
.focus-panel:not(.is-focused) .panel-body .focus-priority-toggle,
.focus-panel:not(.is-focused) .panel-body .focus-inline-editor button {
  pointer-events: auto;
}

.focus-panel:not(.is-focused) .panel-body .focus-row-title,
.focus-panel:not(.is-focused) .panel-body .focus-due-edit,
.focus-panel:not(.is-focused) .panel-body .focus-priority-toggle {
  cursor: pointer;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 7px;
  border-bottom: 1px solid #232a35;
}

.panel-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
}

.upnext-kicker {
  color: #8a93a3;
}

.now-kicker {
  color: #7ba3c8;
}

.in-progress-queued-kicker {
  color: #ffb347;
}

.done-kicker {
  color: #4caf50;
}

.panel-count {
  font-size: 12px;
  font-weight: 700;
  color: #6f7a88;
  background: #232a35;
  border-radius: 10px;
  padding: 2px 9px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  scrollbar-color: #2c3340 transparent;
}

.panel-body::-webkit-scrollbar {
  width: 8px;
}

.panel-body::-webkit-scrollbar-thumb {
  background: #2c3340;
  border-radius: 4px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;
  color: #6f7a88;
}

.panel-empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #8a93a3;
}

.focus-subtext {
  font-size: 14px;
  color: #9aa4b2;
}

/* ========================= */
/* Task rows                 */
/* ========================= */
.focus-task-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #20262f;
  border: 1px solid #2a3240;
  border-radius: 7px;
  padding: 3px 8px;
  transition: all 0.15s ease;
}

.is-focused .focus-task-row:hover {
  background: #242b36;
  border-color: #333c49;
}

.focus-task-row.execution-row {
  padding: 3px 8px;
}

.focus-task-row.inflight-row {
  background: #232936;
  border-color: #334056;
}

.focus-task-row.done-row {
  background: #1b2026;
  border-color: #222933;
  opacity: 0.8;
}

.focus-task-row.low-priority-row {
  background: #1b2027;
  border-color: #29303a;
  opacity: 0.78;
}

.focus-panel .focus-task-row.low-priority-row {
  gap: 4px;
  min-height: 20px;
  padding: 1px 6px;
}

.focus-panel .focus-task-row.low-priority-row .focus-row-title {
  color: #9aa2ad;
  font-size: 11px;
}

.focus-panel .focus-task-row.low-priority-row .focus-row-check {
  width: 15px;
  height: 14px;
  min-width: 15px;
}

.focus-panel .focus-task-row.low-priority-row .focus-section-badge,
.focus-panel .focus-task-row.low-priority-row .focus-row-note {
  font-size: 8px;
}

.focus-week-priority-badge {
  flex: 0 0 auto;
  padding: 1px 3px;
  color: #8c96a3;
  border: 1px solid #566171;
  border-radius: 3px;
  font-size: 6px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.3px;
  background: transparent;
  cursor: pointer;
}

.focus-week-priority-badge:not(.active) {
  display: none;
}

.focus-week-day-column.is-expanded .focus-week-priority-badge {
  display: inline-grid;
}

.focus-row-check {
  width: 18px;
  height: 16px;
  min-width: 18px;
  border-radius: 3px;
  border: 2px solid #4a5568;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.focus-row-check:hover {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
}

.focus-row-check.pending {
  animation: focusStatusPulse 0.6s ease-in-out infinite;
}

@keyframes focusStatusPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.32); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 7px rgba(255, 152, 0, 0); }
}

.focus-row-check.inflight {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.12);
}

.focus-row-check.inflight:after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: #ff9800;
  transform: translate(-50%, -50%);
}

.focus-row-check.checked {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.focus-row-check.checked:after {
  content: '';
  position: absolute;
  top: 1px;
  left: 4px;
  width: 3px;
  height: 7px;
  border: solid #4caf50;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.focus-row-check.cancelled {
  border-color: #757575;
  background: rgba(117, 117, 117, 0.16);
}

.focus-row-check.cancelled:after {
  content: '';
  position: absolute;
  top: 50%;
  left: 2px;
  right: 2px;
  height: 2px;
  background: #9e9e9e;
  transform: translateY(-50%);
}

.focus-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
}

.focus-row-title {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #dfe3e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.focus-row-title.execution-row-title {
  font-size: 13px;
  font-weight: 700;
  color: #f4f6f8;
}

.focus-row-title.done-title {
  color: #8a93a3;
  text-decoration: line-through;
  font-weight: 500;
}

.focus-inline-editor {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.focus-edit-name {
  min-width: 0;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid #465266;
  border-radius: 5px;
  background: #171b21;
  color: #e8eaed;
  font-family: inherit;
  font-size: 12px;
  outline: none;
}

.focus-edit-name {
  flex: 1;
  padding: 2px 7px;
}

.focus-edit-name:focus {
  border-color: #ffb347;
  box-shadow: 0 0 0 1px rgba(255, 179, 71, 0.2);
}

.focus-edit-save,
.focus-edit-cancel {
  height: 24px;
  padding: 0 7px;
  border: 1px solid #3a4356;
  border-radius: 5px;
  background: #262c36;
  color: #9aa4b2;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.focus-edit-save {
  color: #ffb347;
}

.focus-edit-save:hover,
.focus-edit-cancel:hover {
  border-color: #647087;
  color: #f4f6f8;
}

/* Day sections delineate dates without spending a badge on every card */
.focus-day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 3px 2px;
  margin-bottom: 1px;
  border-bottom: 1px solid #2a3240;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: #6f7a88;
}

.focus-day-header:first-child {
  padding-top: 0;
}

.focus-day-header .day-count {
  font-weight: 600;
  opacity: 0.7;
}

.focus-day-header.day-today {
  color: #ffb347;
  border-bottom-color: rgba(255, 179, 71, 0.4);
}

.focus-day-header.day-upcoming {
  color: #7fb2e5;
  border-bottom-color: rgba(64, 137, 209, 0.3);
}

.focus-day-header.day-low-priority {
  color: #8993a0;
  border-bottom-color: rgba(137, 147, 160, 0.35);
}

/* Late work sits in Today, wearing the urgency on its sleeve */
.focus-task-row.overdue-row {
  background: rgba(244, 67, 54, 0.12);
  border-color: rgba(244, 67, 54, 0.45);
}

/* The card's board section, worn as a badge instead of a group header */
.focus-section-badge {
  flex: 0 1 auto;
  max-width: 34%;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  color: #8a93a3;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #2f3846;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-row-note {
  flex: 0 1 36%;
  font-size: 11px;
  line-height: 1.35;
  color: #9fb3c8;
  background: #171b21;
  border-left: 2px solid #3b82c4;
  border-radius: 3px;
  padding: 1px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.focus-note-dot {
  font-size: 12px;
  opacity: 0.7;
  cursor: default;
}

.focus-badge {
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}

.focus-due-edit {
  position: relative;
  min-height: 18px;
  padding-right: 12px;
  cursor: pointer;
  overflow: visible;
  transition: filter 0.15s ease, border-color 0.15s ease;
}

.focus-due-edit:hover {
  filter: brightness(1.25);
}

.focus-due-clock {
  position: absolute;
  top: -5px;
  right: -4px;
  display: grid;
  width: 12px;
  height: 12px;
  place-items: center;
  border-radius: 50%;
  background: #1a1f26;
  font-size: 11px;
  line-height: 1;
}

.focus-badge.no-due-date {
  width: 22px;
  min-width: 22px;
  padding: 0;
  color: #6f7a88;
  background: rgba(255, 255, 255, 0.025);
  border-color: #303846;
}

.focus-badge.no-due-date .focus-due-clock {
  position: static;
  width: auto;
  height: auto;
  background: transparent;
  font-size: 14px;
}

.focus-date-menu {
  position: fixed;
  z-index: 3000;
  width: min(280px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #3a4352;
  border-radius: 10px;
  background: #171b21;
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.55);
}

.focus-section-tooltip {
  position: fixed;
  z-index: 3100;
  max-width: 190px;
  padding: 5px 8px;
  transform: translate(-50%, -100%);
  color: #e8eaed;
  background: #101419;
  border: 1px solid #465266;
  border-radius: 5px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  pointer-events: auto;
  white-space: nowrap;
}

.focus-section-tooltip.theme-light {
  color: #333;
  background: #fff;
  border-color: #ccc;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
}

.focus-date-menu-title {
  padding: 0 2px 8px;
  color: #8e99a8;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.focus-date-options {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.focus-date-option {
  position: relative;
  width: auto;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 7px;
  border: 1px solid #303847;
  border-radius: 5px;
  background: #20262f;
  color: #dfe3e8;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.focus-date-option:hover {
  border-color: #ffb347;
  background: #282f3a;
}

.focus-date-custom-trigger.active {
  color: #ffb347;
  border-color: #ffb347;
}

.focus-unified-date-picker {
  width: 100%;
  box-sizing: border-box;
  display: grid;
  gap: 7px;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid #303847;
}

.focus-period-kind-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.focus-period-kind-btn {
  padding: 4px 6px;
  border: 1px solid #303847;
  border-radius: 5px;
  color: #9ca7b6;
  background: #20262f;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: capitalize;
  cursor: pointer;
}

.focus-period-kind-btn.active {
  color: #ffb347;
  border-color: #ffb347;
  background: rgba(255, 179, 71, 0.1);
}

.focus-custom-date-input {
  width: 100%;
  min-height: 30px;
  box-sizing: border-box;
  padding: 4px 7px;
  border: 1px solid #465266;
  border-radius: 5px;
  color: #e5e9ef;
  background: #20262f;
  color-scheme: dark;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.focus-date-clear {
  color: #ff8a80;
}

.focus-badge.overdue {
  color: #ff6b5e;
  background: rgba(244, 67, 54, 0.14);
  border: 1px solid rgba(244, 67, 54, 0.35);
}

.focus-badge.due-today {
  color: #ffb347;
  background: rgba(255, 179, 71, 0.12);
  border: 1px solid rgba(255, 179, 71, 0.35);
}

.focus-badge.due-week {
  color: #7fb2e5;
  background: rgba(64, 137, 209, 0.12);
  border: 1px solid rgba(64, 137, 209, 0.35);
  letter-spacing: 0.55px;
  text-transform: uppercase;
}

.focus-badge.due-month {
  color: #b9a6d8;
  background: rgba(139, 103, 177, 0.12);
  border: 1px solid rgba(139, 103, 177, 0.35);
}

.focus-badge.due-week-period {
  color: #c4ace5;
  background: rgba(139, 103, 177, 0.24);
  border: 1px solid rgba(169, 130, 211, 0.58);
  letter-spacing: 0.55px;
  text-transform: uppercase;
}

.focus-badge.due-later {
  color: #8a93a3;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #2f3846;
}

/* ========================= */
/* Panel-to-panel transit    */
/* ========================= */
/* A moved card holds its place wearing its new status, then flies toward the
   panel it belongs to and lands there with a highlight. */
.focus-task-row.transitioning {
  pointer-events: none;
}

.focus-task-row.phase-held {
  animation: focusHold 0.7s ease-out;
}

@keyframes focusHold {
  0% { transform: scale(1); }
  22% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

/* The original hands off to the flying clone and folds out of the list, so the
   rows below close the gap while the clone is still in the air */
.focus-task-row.phase-whisking {
  overflow: hidden;
  animation: rowFold 0.36s ease-in forwards;
}

@keyframes rowFold {
  0% { max-height: 90px; opacity: 0; }
  100% { max-height: 0; opacity: 0;
         padding-top: 0; padding-bottom: 0; border-width: 0; margin-bottom: -4px; }
}

/* Flight layer: above every panel, ignores pointer input */
.focus-flight-layer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.flight-card {
  position: fixed;
  box-sizing: border-box;
  margin: 0;
  pointer-events: none;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.flight-card.fly-right {
  animation: flyRight 0.55s cubic-bezier(0.45, 0, 0.72, 0.3) forwards;
}

.flight-card.fly-left {
  animation: flyLeft 0.55s cubic-bezier(0.45, 0, 0.72, 0.3) forwards;
}

.flight-card.fly-within {
  animation: flyWithin 0.55s cubic-bezier(0.45, 0, 0.72, 0.3) forwards;
}

@keyframes flyRight {
  0% { transform: translateX(0) scale(1) rotate(0deg); opacity: 1; }
  15% { transform: translateX(-22px) scale(1.03) rotate(-1deg); opacity: 1; }
  100% { transform: translateX(46vw) scale(0.68) rotate(3deg); opacity: 0; }
}

@keyframes flyLeft {
  0% { transform: translateX(0) scale(1) rotate(0deg); opacity: 1; }
  15% { transform: translateX(22px) scale(1.03) rotate(1deg); opacity: 1; }
  100% { transform: translateX(-46vw) scale(0.68) rotate(-3deg); opacity: 0; }
}

@keyframes flyWithin {
  0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
  18% { transform: translateY(8px) scale(1.03) rotate(0.5deg); opacity: 1; }
  100% { transform: translateY(-72px) scale(0.72) rotate(-2deg); opacity: 0; }
}

/* Landing: slide in from the side the card travelled from, with a green flash */
.focus-task-row.arriving.arrive-right {
  animation: arriveFromLeft 0.9s ease-out;
}

.focus-task-row.arriving.arrive-left {
  animation: arriveFromRight 0.9s ease-out;
}

.focus-task-row.arriving.arrive-within {
  animation: arriveWithin 0.9s ease-out;
}

@keyframes arriveFromLeft {
  0% { transform: translateX(-34px) scale(0.94); opacity: 0; }
  38% { transform: translateX(0) scale(1); opacity: 1; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.55); }
  100% { transform: translateX(0) scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
}

@keyframes arriveFromRight {
  0% { transform: translateX(34px) scale(0.94); opacity: 0; }
  38% { transform: translateX(0) scale(1); opacity: 1; box-shadow: 0 0 0 2px rgba(255, 179, 71, 0.55); }
  100% { transform: translateX(0) scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 179, 71, 0); }
}

@keyframes arriveWithin {
  0% { transform: translateY(-22px) scale(0.94); opacity: 0; }
  38% { transform: translateY(0) scale(1); opacity: 1; box-shadow: 0 0 0 2px rgba(255, 179, 71, 0.55); }
  100% { transform: translateY(0) scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 179, 71, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .focus-task-row.phase-held,
  .focus-task-row.phase-whisking,
  .focus-task-row.arriving,
  .flight-card {
    animation-duration: 0.01s;
  }
}

.focus-start-next-btn,
.focus-plan-btn {
  background: #262c36;
  color: #ffb347;
  border: 1px solid #3a4356;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 650;
  padding: 9px 16px;
  cursor: pointer;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.focus-start-next-btn:hover,
.focus-plan-btn:hover {
  background: #2d3542;
  transform: translateY(-1px);
}

/* ========================= */
/* Nav: dots + prev/next     */
/* ========================= */
.focus-carousel-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 3px 0 2px;
  line-height: 0;
}

.focus-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}

.focus-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: #333c49;
  cursor: pointer;
  transition: all 0.2s ease;
}

.focus-dot:hover {
  background: #4a5568;
}

.focus-dot.dot-now {
  background: rgba(123, 163, 200, 0.55);
}

.focus-dot.active {
  background: #ffb347;
  transform: scale(1.35);
}

.focus-dot.dot-now.active {
  background: #7fb2e5;
}

/* ========================= */
/* Quick add                 */
/* ========================= */
.focus-quick-add-btn {
  height: 30px;
  padding: 0 10px;
  margin-bottom: 2px;
  border: 1px solid #333c49;
  border-radius: 6px;
  background: transparent;
  color: #9aa4b2;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.focus-quick-add-btn:hover,
.focus-quick-add-btn.active {
  color: #ffb347;
  border-color: #556070;
  background: #262c36;
}

.focus-quick-add-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 54px;
  width: min(320px, calc(100vw - 48px));
  padding: 7px;
  border: 1px solid #333c49;
  border-radius: 10px;
  background: #1a1f26;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.45);
}

.focus-quick-add-input {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: 1px dashed #333c49;
  border-radius: 10px;
  color: #dfe3e8;
  font-size: 14px;
  padding: 8px 12px;
  outline: none;
  transition: all 0.15s ease;
}

.focus-quick-add-input::placeholder {
  color: #5f6a78;
}

.focus-quick-add-input:focus {
  border-style: solid;
  border-color: #ffb347;
  background: #1a1f26;
}

/* ========================= */
/* Light theme               */
/* ========================= */
.focus-mode.theme-light {
  background: radial-gradient(1200px 500px at 50% -10%, #ffffff 0%, #ededed 55%);
  color: #333;
}

.theme-light .focus-kicker {
  color: #e08900;
}

.theme-light .focus-date {
  color: #333;
}

.theme-light .focus-progress-text {
  color: #666;
}

.theme-light .focus-progress-track {
  background: #e0e0e0;
}

.theme-light .focus-exit-btn {
  border-color: #ccc;
  color: #666;
}

.theme-light .focus-exit-btn:hover {
  color: #333;
  border-color: #aaa;
  background: #e8e8e8;
}

.theme-light .focus-quick-add-btn {
  color: #666;
  border-color: #ccc;
}

.theme-light .focus-quick-add-btn:hover,
.theme-light .focus-quick-add-btn.active {
  color: #e08900;
  border-color: #aaa;
  background: #e8e8e8;
}

.theme-light .focus-quick-add-popover {
  border-color: #ccc;
  background: #fff;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.16);
}

.theme-light .focus-panel {
  background: #ffffff;
  border-color: #e0e0e0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.theme-light .focus-panel.is-focused {
  background: #ffffff;
  border-color: #d5d5d5;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.16);
}

.theme-light .focus-panel.panel-in-progress-queued.is-focused {
  box-shadow: 0 0 60px rgba(255, 152, 0, 0.14), 0 10px 32px rgba(0, 0, 0, 0.16);
}

.theme-light .focus-week-strip {
  background: #fff;
  border-color: #ddd;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.15);
}

.theme-light .focus-week-day-column {
  background: #fff;
  border-color: #dedede;
  scrollbar-color: #ccc transparent;
}

.theme-light .focus-week-day-column .focus-day-header {
  background: #fff;
}

.theme-light .focus-week-day-column.is-past {
  background: #f8f8f8;
}

.theme-light .focus-week-day-column.is-current {
  background: #e8e8e8;
  border-color: #d3d3d3;
}

.theme-light .focus-week-day-column.is-current .focus-day-header {
  background: #e8e8e8;
}

.theme-light .focus-today-status-count {
  color: #555;
}

.theme-light .focus-week-day-column.is-this-week {
  background: #f7f3fb;
  border-color: #cbbdde;
}

.theme-light .focus-week-day-column.is-this-week .focus-day-header {
  color: #73588f;
  background: #f7f3fb;
}

.theme-light .panel-header {
  border-bottom-color: #e8e8e8;
}

.theme-light .upnext-kicker {
  color: #888;
}

.theme-light .now-kicker {
  color: #4a7dab;
}

.theme-light .in-progress-queued-kicker {
  color: #e08900;
}

.theme-light .panel-count {
  background: #eeeeee;
  color: #777;
}

.theme-light .panel-body {
  scrollbar-color: #ccc transparent;
}

.theme-light .panel-body::-webkit-scrollbar-thumb {
  background: #ccc;
}

.theme-light .panel-empty {
  color: #999;
}

.theme-light .panel-empty-title {
  color: #777;
}

.theme-light .focus-subtext {
  color: #777;
}

.theme-light .focus-task-row {
  background: #fafafa;
  border-color: #e8e8e8;
}

.theme-light .is-focused .focus-task-row:hover {
  background: #f0f0f0;
  border-color: #ddd;
}

.theme-light .focus-task-row.inflight-row {
  background: #fff8e1;
  border-color: #ffd57e;
}

.theme-light .focus-task-row.done-row {
  background: #f7f7f7;
  border-color: #ececec;
}

.theme-light .focus-task-row.low-priority-row {
  color: #777;
  background: #f5f5f5;
  border-color: #e3e3e3;
}

.theme-light .focus-row-check {
  border-color: #aaa;
}

.theme-light .focus-row-check:hover {
  border-color: #4caf50;
  background: #e8f5e9;
}

.theme-light .focus-row-check.inflight {
  border-color: #ff9800;
  background: #fff3d6;
}

.theme-light .focus-row-check.checked {
  border-color: #4caf50;
  background: #e8f5e9;
}

.theme-light .focus-row-title {
  color: #333;
}

.theme-light .focus-row-title.execution-row-title {
  color: #222;
}

.theme-light .focus-row-title.done-title {
  color: #999;
}

.theme-light .focus-section-badge {
  color: #888;
  background: #f0f0f0;
  border-color: #e0e0e0;
}

.theme-light .focus-day-header {
  color: #888;
  border-bottom-color: #e8e8e8;
}

.theme-light .focus-day-header.day-today {
  color: #e08900;
  border-bottom-color: rgba(255, 152, 0, 0.45);
}

.theme-light .focus-day-header.day-upcoming {
  color: #1976d2;
  border-bottom-color: rgba(33, 150, 243, 0.35);
}

.theme-light .focus-task-row.overdue-row {
  background: #ffebee;
  border-color: rgba(244, 67, 54, 0.4);
}

.theme-light .focus-row-note {
  color: #555;
  background: #f5f5f5;
  border-left-color: #2196f3;
}

.theme-light .focus-badge.overdue {
  color: #d32f2f;
  background: #ffebee;
  border-color: rgba(244, 67, 54, 0.4);
}

.theme-light .focus-badge.due-today {
  color: #e08900;
  background: #fff8e1;
  border-color: rgba(255, 152, 0, 0.4);
}

.theme-light .focus-badge.due-week {
  color: #1976d2;
  background: #e3f2fd;
  border-color: rgba(33, 150, 243, 0.35);
}

.theme-light .focus-badge.due-month {
  color: #73588f;
  background: #f4ecfb;
  border-color: rgba(115, 88, 143, 0.35);
}

.theme-light .focus-badge.due-week-period {
  color: #684387;
  background: #eadcf6;
  border-color: rgba(115, 88, 143, 0.52);
}

.theme-light .focus-badge.due-later {
  color: #888;
  background: #f0f0f0;
  border-color: #e0e0e0;
}

.theme-light .focus-edit-name {
  color: #333;
  border-color: #ccc;
  background: #fff;
}

.theme-light .focus-edit-save,
.theme-light .focus-edit-cancel {
  color: #666;
  border-color: #ccc;
  background: #f5f5f5;
}

.theme-light .focus-edit-save {
  color: #e08900;
}

.theme-light .focus-badge.no-due-date {
  color: #888;
  background: #f5f5f5;
  border-color: #ddd;
}

.theme-light .focus-due-clock {
  background: #fff;
}

.theme-light .focus-badge.no-due-date .focus-due-clock {
  background: transparent;
}

.focus-date-menu.theme-light {
  border-color: #ccc;
  background: #fff;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
}

.focus-date-menu.theme-light .focus-date-menu-title {
  color: #777;
}

.focus-date-menu.theme-light .focus-date-option {
  border-color: #ddd;
  background: #f7f7f7;
  color: #333;
}

.focus-date-menu.theme-light .focus-date-option:hover {
  border-color: #e08900;
  background: #fff8e8;
}

.focus-date-menu.theme-light .focus-unified-date-picker {
  border-top-color: #ddd;
}

.focus-date-menu.theme-light .focus-period-kind-btn {
  color: #555;
  border-color: #ddd;
  background: #f7f7f7;
}

.focus-date-menu.theme-light .focus-period-kind-btn.active {
  color: #d97700;
  border-color: #e08900;
  background: #fff8e8;
}

.focus-date-menu.theme-light .focus-custom-date-input {
  color: #333;
  border-color: #ccc;
  background: #fff;
  color-scheme: light;
}

.focus-date-menu.theme-light .focus-date-clear {
  color: #d32f2f;
}

.theme-light .focus-start-next-btn,
.theme-light .focus-plan-btn,
.theme-light .focus-reopen-btn {
  background: #f5f5f5;
  border-color: #ccc;
  color: #e08900;
}

.theme-light .focus-reopen-btn {
  color: #666;
}

.theme-light .focus-start-next-btn:hover,
.theme-light .focus-plan-btn:hover,
.theme-light .focus-reopen-btn:hover {
  background: #e8e8e8;
}

.theme-light .focus-dot {
  background: #ccc;
}

.theme-light .focus-dot:hover {
  background: #aaa;
}

.theme-light .focus-dot.dot-done {
  background: rgba(76, 175, 80, 0.45);
}

.theme-light .focus-dot.active {
  background: #ff9800;
}

.theme-light .focus-dot.dot-done.active {
  background: #4caf50;
}

.theme-light .focus-quick-add-input {
  border-color: #ccc;
  color: #333;
}

.theme-light .focus-quick-add-input::placeholder {
  color: #999;
}

.theme-light .focus-quick-add-input:focus {
  border-color: #ff9800;
  background: #ffffff;
}
</style>
