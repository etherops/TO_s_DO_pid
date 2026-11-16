import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';
import { formatCompletionDate } from '../../../src/utils/completionDateHelpers';
import {
  deriveFocusModel,
  orderEntriesBySourcePosition,
  reorderTaskSubsetInSection,
  findQuickAddTarget,
  findActiveWipSection,
  endOfCurrentWeek,
  isOnDeckThisWeek
} from '../../../src/utils/focusModeHelpers';

// Wednesday 12 August 2026, so "this week" runs Sun 9th - Sat 15th
const WEDNESDAY = new Date(2026, 7, 12, 10, 0, 0);
const oldStamp = formatCompletionDate(new Date(2000, 0, 1));
const todayStamp = formatCompletionDate(WEDNESDAY);

const fixture = `# SELECTED
## Plans
* [~] Selected inflight due Friday ! Aug 14 2026
* [ ] Selected due today ! Aug 12 2026
* [ ] Selected overdue ! Aug 5 2026
* [ ] Selected due next week ! Aug 20 2026
* [ ] Selected undated
* [~] Selected inflight undated
* [x] Selected done ${oldStamp}
* [-] Selected cancelled

# WIP
### CURRENT
* [~] Wip inflight undated
* [~] Wip inflight due today ! Aug 12 2026
* [ ] Wip queued undated
* [ ] Wip due Saturday ! Aug 15 2026
* [x] Wip done ${oldStamp}
* [x] Wip completed due today ${todayStamp}
* [-] Wip cancelled due today ${todayStamp}

# TODO
## BACKLOG
* [ ] Backlog due today ! Aug 12 2026

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
      expect(isOnDeckThisWeek('Task ! Aug 12 2026')).toBe(true);
      expect(isOnDeckThisWeek('Task ! Aug 15 2026')).toBe(true);
      expect(isOnDeckThisWeek('Task ! Aug 5 2026')).toBe(true);
    });

    it('leaves work past Saturday and undated work off deck', () => {
      expect(isOnDeckThisWeek('Task ! Aug 16 2026')).toBe(false);
      expect(isOnDeckThisWeek('Task with no date')).toBe(false);
    });

    it('puts whole current-week periods on deck but leaves month periods in planning', () => {
      expect(isOnDeckThisWeek('Task ! Aug Week #2 2026')).toBe(true);
      expect(isOnDeckThisWeek('Task ! Aug Week #3 2026')).toBe(false);
      expect(isOnDeckThisWeek('Task ! Aug 2026')).toBe(false);
    });
  });

  describe('deriveFocusModel', () => {
    const model = () => deriveFocusModel(parseTodoMdFile(fixture));

    it('orders overdue before today and exact future days chronologically', () => {
      expect(taskTexts(model().now)).toEqual(['Selected overdue', 'Selected due today',
        'Wip inflight due today', 'Wip completed due today', 'Wip cancelled due today', 'Backlog due today']);
      expect(taskTexts(model().inProgressQueued)).toEqual(['Selected inflight due Friday', 'Wip due Saturday']);
      expect(model().upNext).toEqual([]);
    });

    it('puts whole-week work on the left regardless of status, priority or parenthood', () => {
      const result = deriveFocusModel(parseTodoMdFile('# WIP\n### Work\n'
        + '* [~] Active week ! Aug Week #2 2026\n- [ ] Low week ! Aug Week #2 2026\n'
        + '+ [!] Parent ! Aug Week #2 2026\n  - [~] Child ! Aug Week #2 2026\n'));
      expect(result.upNext.map(entry => entry.task.text.split(' ! ')[0]))
        .toEqual(['Active week', 'Low week', 'Parent', 'Child']);
      expect(result.upNext.every(entry => entry.dueGroup === 'this-week')).toBe(true);
      expect(result.upNext[1].task.isLowPriority).toBe(true);
      expect(result.upNext[3].parentTask).toBe(result.upNext[2].task);
      expect(result.now).toEqual([]);
    });

    it('excludes undated, current month, future week and archived work, but includes dated backlog', () => {
      const result = deriveFocusModel(parseTodoMdFile(fixture + '\n# WIP MORE\n### More\n'
        + '* [~] Month ! Aug 2026\n* [!] Future ! Aug Week #3 2026\n'));
      const titles = taskTexts(Object.values(result).flat());
      for (const excluded of ['Selected undated', 'Wip inflight undated', 'Selected due next week',
        'Archived done', 'Month', 'Future']) expect(titles).not.toContain(excluded);
      expect(titles).toContain('Backlog due today');
    });

    it('shows terminal work only on its completion day in upper panels', () => {
      expect(taskTexts(model().now)).toContain('Wip completed due today');
      expect(taskTexts(model().now)).toContain('Wip cancelled due today');
      expect(model().done).toEqual([]);
      const prior = deriveFocusModel(parseTodoMdFile('# WIP\n### Work\n'
        + '* [x] Finished | Aug 11 2026\n* [-] No recorded date\n'));
      expect(Object.values(prior).flat()).toEqual([]);
    });

    it('keeps source references and does not rewrite source data', () => {
      const data = parseTodoMdFile(fixture);
      const before = JSON.stringify(data);
      const entry = deriveFocusModel(data).inProgressQueued.find(e => e.task.displayText === 'Wip due Saturday');
      expect(entry.columnName).toBe('WIP');
      expect(entry.sectionName).toBe('CURRENT');
      expect(entry.section.items).toContain(entry.task);
      expect(JSON.stringify(data)).toBe(before);
    });

    it('preserves file order within a shared date', () => {
      const result = deriveFocusModel(parseTodoMdFile('# WIP\n### One\n* [ ] A ! Aug 14 2026\n'
        + '### Two\n* [ ] B ! Aug 14 2026\n* [ ] C ! Aug 14 2026\n'));
      expect(taskTexts(result.inProgressQueued)).toEqual(['A', 'B', 'C']);
    });

    it('waits until a whole week or month ends before treating it as overdue', () => {
      const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Week ! Aug Week #2 2026\n'
        + '* [ ] Month ! Aug 2026\n');
      expect(deriveFocusModel(data, new Date(2026, 7, 15)).now).toEqual([]);
      expect(taskTexts(deriveFocusModel(data, new Date(2026, 7, 16)).now)).toEqual(['Week']);
      expect(taskTexts(deriveFocusModel(data, new Date(2026, 8, 1)).now)).toEqual(['Month', 'Week']);
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

  describe('reorderTaskSubsetInSection', () => {
    it('uses Markdown order inside each source-section cluster', () => {
      const section = { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
      const entries = [
        { task: section.items[2], section },
        { task: section.items[0], section },
        { task: section.items[1], section }
      ];
      expect(orderEntriesBySourcePosition(entries).map(entry => entry.task.id)).toEqual(['a', 'b', 'c']);
    });

    it('reorders only eligible task slots and preserves intervening source items', () => {
      const taskA = { id: 'a', type: 'task' };
      const raw = { id: 'raw', type: 'raw-text' };
      const hiddenTask = { id: 'hidden', type: 'task' };
      const taskB = { id: 'b', type: 'task' };
      const taskC = { id: 'c', type: 'task' };
      const items = [taskA, raw, hiddenTask, taskB, taskC];

      expect(reorderTaskSubsetInSection(items, ['a', 'b', 'c'], 'c', 'a')).toBe(true);
      expect(items).toEqual([taskC, raw, hiddenTask, taskA, taskB]);
    });

    it('rejects drops outside the eligible subset', () => {
      const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      expect(reorderTaskSubsetInSection(items, ['a', 'b'], 'a', 'c')).toBe(false);
      expect(items.map(item => item.id)).toEqual(['a', 'b', 'c']);
    });
  });
});
