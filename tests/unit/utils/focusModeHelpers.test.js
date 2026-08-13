import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';
import { formatCompletionDate } from '../../../src/utils/completionDateHelpers';
import {
  deriveFocusModel,
  findQuickAddTarget,
  findActiveWipSection,
  endOfCurrentWeek,
  isOnDeckThisWeek,
  UP_NEXT_GROUP_ORDER
} from '../../../src/utils/focusModeHelpers';

// Wednesday 12 August 2026, so "this week" runs Sun 9th - Sat 15th
const WEDNESDAY = new Date(2026, 7, 12, 10, 0, 0);
const oldStamp = formatCompletionDate(new Date(2000, 0, 1));
const todayStamp = formatCompletionDate(WEDNESDAY);

const fixture = `# SELECTED
## Plans
* [~] Selected inflight due Friday !!(Aug 14)
* [ ] Selected due today !!(Aug 12)
* [ ] Selected overdue !!(Aug 5)
* [ ] Selected due next week !!(Aug 20)
* [ ] Selected undated
* [~] Selected inflight undated
* [x] Selected done ${oldStamp}
* [-] Selected cancelled

# WIP
### CURRENT
* [~] Wip inflight undated
* [~] Wip inflight due today !!(Aug 12)
* [ ] Wip queued undated
* [ ] Wip due Saturday !!(Aug 15)
* [x] Wip done ${oldStamp}
* [x] Wip completed due today !!(Aug 12) ${oldStamp}
* [-] Wip cancelled due today !!(Aug 12) ${oldStamp}

# TODO
## BACKLOG
* [ ] Backlog due today !!(Aug 12)

# ARCHIVE
## Old
* [x] Archived done ${oldStamp}
`;

const taskTexts = (entries) => entries.map(entry => entry.task.displayText);

describe('focusModeHelpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(WEDNESDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('endOfCurrentWeek', () => {
    it('runs to the Saturday of the week containing today', () => {
      const end = endOfCurrentWeek();
      expect(end.getDay()).toBe(6);
      expect(end.getDate()).toBe(15);
    });

    it('treats Saturday itself as the last day of its own week', () => {
      const end = endOfCurrentWeek(new Date(2026, 7, 15, 9, 0, 0));
      expect(end.getDate()).toBe(15);
    });

    it('starts the week on Sunday, so Sunday sees the whole week ahead', () => {
      const end = endOfCurrentWeek(new Date(2026, 7, 9, 9, 0, 0));
      expect(end.getDate()).toBe(15);
    });
  });

  describe('isOnDeckThisWeek', () => {
    it('takes anything due by the end of this week, including work already late', () => {
      expect(isOnDeckThisWeek('Task !!(Aug 12)')).toBe(true);
      expect(isOnDeckThisWeek('Task !!(Aug 15)')).toBe(true);
      expect(isOnDeckThisWeek('Task !!(Aug 5)')).toBe(true);
    });

    it('leaves work past Saturday and undated work off deck', () => {
      expect(isOnDeckThisWeek('Task !!(Aug 16)')).toBe(false);
      expect(isOnDeckThisWeek('Task with no date')).toBe(false);
    });

    it('puts whole current-week periods on deck but leaves month periods in planning', () => {
      expect(isOnDeckThisWeek('Task !!(week Aug 9 2026)')).toBe(true);
      expect(isOnDeckThisWeek('Task !!(week Aug 16 2026)')).toBe(false);
      expect(isOnDeckThisWeek('Task !!(month Aug 2026)')).toBe(false);
    });
  });

  describe('deriveFocusModel', () => {
    const model = () => deriveFocusModel(parseTodoMdFile(fixture));

    it('keeps active and waiting work on the right while scheduled work goes left and urgent/general work stays in NOW', () => {
      expect(taskTexts(model().inProgressQueued)).toEqual([
        'Selected inflight undated',
        'Wip inflight undated'
      ]);

      expect(taskTexts(model().now)).toEqual([
        'Selected overdue',
        'Selected due today',
        'Wip inflight due today',
        'Wip completed due today',
        'Wip cancelled due today'
      ]);
    });

    it('orders each execution bucket late -> today -> undated -> each upcoming day', () => {
      expect(model().now.map(entry => entry.dueGroup)).toEqual([
        'overdue',
        'today',
        'today',
        'today',
        'today'
      ]);
      expect(model().inProgressQueued.map(entry => entry.dueGroup)).toEqual([
        'undated',
        'undated'
      ]);
    });

    it('puts unstarted scheduled work in UP NEXT by period precision', () => {
      expect(taskTexts(model().upNext)).toEqual([
        'Selected inflight due Friday',
        'Wip due Saturday',
        'Selected due next week',
        'Selected undated',
        'Wip queued undated'
      ]);

      const groupSequence = model().upNext.map(entry => UP_NEXT_GROUP_ORDER.indexOf(entry.group));
      expect([...groupSequence].sort((a, b) => a - b)).toEqual(groupSequence);
    });

    it('keeps month and current-week queued work in UP NEXT', () => {
      const periods = deriveFocusModel(parseTodoMdFile(`# SELECTED
## Ready
* [ ] Whole August !!(month Aug 2026)
* [ ] Whole current week !!(week Aug 9 2026)
`));
      expect(taskTexts(periods.upNext)).toEqual(['Whole August', 'Whole current week']);
      expect(periods.inProgressQueued).toEqual([]);
      expect(periods.upNext[1].dueGroup).toBe(`week-${new Date(2026, 7, 9).getTime()}`);
    });

    it('still only pulls from SELECTED and WIP - a due date cannot drag in backlog or archive', () => {
      const everything = taskTexts([
        ...model().inProgressQueued, ...model().now, ...model().upNext, ...model().done
      ]);
      expect(everything).not.toContain('Backlog due today');
      expect(everything).not.toContain('Archived done');
    });

    it('keeps completed and cancelled due-today work in NOW and other terminal work in DONE', () => {
      expect(taskTexts(model().now)).toContain('Wip completed due today');
      expect(taskTexts(model().now)).toContain('Wip cancelled due today');
      expect(taskTexts(model().done)).toEqual(['Selected done', 'Selected cancelled', 'Wip done']);
    });

    it('keeps work completed or cancelled today in NOW regardless of due date', () => {
      const stamped = deriveFocusModel(parseTodoMdFile(`# SELECTED
## Ready
* [x] Completed today ${todayStamp}
* [-] Will not do today ${todayStamp}
* [x] Completed earlier ${oldStamp}
`));

      expect(taskTexts(stamped.now)).toEqual(['Completed today', 'Will not do today']);
      expect(taskTexts(stamped.done)).toEqual(['Completed earlier']);
    });

    it('carries section references so entries can be mutated in place', () => {
      const entry = model().upNext.find(e => e.task.displayText === 'Wip queued undated');
      expect(entry.columnName).toBe('WIP');
      expect(entry.sectionName).toBe('CURRENT');
      expect(entry.section.items).toContain(entry.task);
    });

    it('allows only in-progress status in the right panel and groups other undated work as unscheduled', () => {
      expect(model().inProgressQueued.every(entry => entry.task.statusChar === '~')).toBe(true);
      const unscheduled = model().upNext.filter(entry => entry.group === 'unscheduled');
      expect(taskTexts(unscheduled)).toEqual(['Selected undated', 'Wip queued undated']);
      expect(unscheduled.every(entry => entry.task.statusChar !== '~')).toBe(true);
    });

    it('carries low-priority list-marker metadata into Focus entries', () => {
      const priorityModel = deriveFocusModel(parseTodoMdFile(`# SELECTED
## Waiting
- [~] Low blocked
- [ ] Low unscheduled
`));
      expect(priorityModel.inProgressQueued[0].task.isLowPriority).toBe(true);
      expect(priorityModel.upNext[0].task.isLowPriority).toBe(true);
    });

    it('keeps same-day queued work in UP NEXT file order so sections stay together', () => {
      const sameDay = deriveFocusModel(parseTodoMdFile(`# WIP
### MONDAY
* [ ] Monday A !!(Aug 14)
### FRIDAY
* [ ] Friday A !!(Aug 14)
* [ ] Friday B !!(Aug 14)
`));

      expect(taskTexts(sameDay.upNext)).toEqual(['Monday A', 'Friday A', 'Friday B']);
    });
  });

  describe('findActiveWipSection', () => {
    it('picks the WIP section holding the most inflight tasks', () => {
      const target = findActiveWipSection(parseTodoMdFile(`# WIP
### MONDAY
* [ ] a
### THE ZONE
* [~] b
* [~] c
* [ ] d
### FRIDAY
* [~] e
`));
      expect(target.section.name).toBe('THE ZONE');
    });

    it('falls back to the first WIP section when nothing is inflight', () => {
      const target = findActiveWipSection(parseTodoMdFile(`# WIP
### MONDAY
* [ ] a
### FRIDAY
* [ ] b
`));
      expect(target.section.name).toBe('MONDAY');
    });

    it('returns null when no WIP column exists', () => {
      expect(findActiveWipSection(parseTodoMdFile(`# SELECTED
## Ready
* [~] a
`))).toBeNull();
    });
  });

  describe('findQuickAddTarget', () => {
    it('prefers the active WIP section', () => {
      const target = findQuickAddTarget(parseTodoMdFile(fixture));
      expect(target.columnName).toBe('WIP');
      expect(target.section.name).toBe('CURRENT');
    });

    it('falls back to SELECTED when no WIP column exists', () => {
      const target = findQuickAddTarget(parseTodoMdFile(`# SELECTED
## Ready
* [ ] A task
`));
      expect(target.columnName).toBe('SELECTED');
      expect(target.section.name).toBe('Ready');
    });

    it('returns null when neither WIP nor SELECTED columns exist', () => {
      expect(findQuickAddTarget(parseTodoMdFile(`# TODO
## BACKLOG
* [ ] A task
`))).toBeNull();
    });
  });
});
