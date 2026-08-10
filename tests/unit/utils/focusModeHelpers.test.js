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
  });

  describe('deriveFocusModel', () => {
    const model = () => deriveFocusModel(parseTodoMdFile(fixture));

    it('combines in-progress and upcoming scheduled work, leaving urgent and general unstarted work in NOW', () => {
      expect(taskTexts(model().inProgressQueued)).toEqual([
        'Wip inflight undated',
        'Selected inflight due Friday',
        'Wip due Saturday'
      ]);

      expect(taskTexts(model().now)).toEqual([
        'Selected overdue',
        'Selected due today',
        'Wip inflight due today',
        'Wip completed due today',
        'Wip cancelled due today',
        'Wip queued undated'
      ]);
    });

    it('orders each execution bucket late -> today -> undated -> each upcoming day', () => {
      expect(model().now.map(entry => entry.dueGroup)).toEqual([
        'overdue',
        'today',
        'today',
        'today',
        'today',
        'undated'
      ]);
      expect(model().inProgressQueued.map(entry => entry.dueGroup)).toEqual([
        'undated',
        `day-${new Date(2026, 7, 14).getTime()}`,
        `day-${new Date(2026, 7, 15).getTime()}`
      ]);
    });

    it('leaves the rest of SELECTED in UP NEXT: in progress, dated, then undated', () => {
      expect(taskTexts(model().upNext)).toEqual([
        'Selected inflight undated',
        'Selected due next week',
        'Selected undated'
      ]);

      const groupSequence = model().upNext.map(entry => UP_NEXT_GROUP_ORDER.indexOf(entry.group));
      expect([...groupSequence].sort((a, b) => a - b)).toEqual(groupSequence);
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
      const entry = model().now.find(e => e.task.displayText === 'Wip queued undated');
      expect(entry.columnName).toBe('WIP');
      expect(entry.sectionName).toBe('CURRENT');
      expect(entry.section.items).toContain(entry.task);
    });

    it('keeps same-day work in file order so sections stay together', () => {
      const sameDay = deriveFocusModel(parseTodoMdFile(`# WIP
### MONDAY
* [ ] Monday A !!(Aug 14)
### FRIDAY
* [ ] Friday A !!(Aug 14)
* [ ] Friday B !!(Aug 14)
`));

      expect(taskTexts(sameDay.inProgressQueued)).toEqual(['Monday A', 'Friday A', 'Friday B']);
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
