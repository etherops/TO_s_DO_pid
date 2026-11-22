import { describe, expect, it } from 'vitest';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { deriveReviewModel, rescheduleCalendarTask } from '../../../src/utils/reviewModeHelpers';
import { extractDuePeriod } from '../../../src/utils/dateHelpers';

const date = new Date(2026, 10, 22);
const source = `# TODO
+ [ ] Backlog project ! Nov 2026
# SELECTED
+ [~] Month project (keep note) ! Nov 2026
  - [ ] Child (child note) ! Nov Week #4 2026
  - [x] Finished child | Nov 20 2026
+ [ ] Week project ! Nov Week #4 2026
+ [ ] Day project ! Nov 24 2026
+ [x] Done project | Nov 20 2026
+ [ ] Future project ! Dec 2026
* [ ] Month task ! Nov 2026
* [ ] Stale completion marker ! Nov 24 2026 | Nov 20 2026
# WIP
* [!] Weekly task ! Nov Week #4 2026
* [ ] Adjacent month ! Dec Week #1 2026
* [ ] Daily task ! Nov 24 2026
# ICE
+ [ ] Frozen project ! Nov 2026
# ARCHIVE
* [ ] Archived open ! Nov 24 2026
* [-] Cancelled | Nov 20 2026
`;
const modelFor = data => deriveReviewModel(data, { anchor: date, today: date });
const renderedSource = renderTodoMdFile(parseTodoMdFile(source));
const allEntries = model => [...model.days.flatMap(day => [...day.due, ...day.completed, ...day.cancelled]),
  ...model.spanning];

describe('Calendar selected work and scheduling', () => {
  it('scopes projects to SELECTED and the displayed month, and keeps a list for every visible week', () => {
    const data = parseTodoMdFile(source);
    const model = modelFor(data);
    expect(model.selectedProjects.map(entry => entry.title))
      .toEqual(['Month project', 'Week project', 'Day project']);
    expect(model.selectedWeeks).toHaveLength(model.weeks.length);
    expect(model.selectedWeeks.find(week => week.key === '2026-11-22').entries
      .map(entry => entry.title)).toEqual(['Child', 'Week project', 'Weekly task']);
    expect(model.selectedWeeks[0].entries).toEqual([]);
    expect(model.monthTasks.map(entry => entry.title)).toEqual(['Month task']);
    expect(renderTodoMdFile(data)).toBe(renderedSource);
  });

  it('includes real subtask completions, never open work with an old completion marker', () => {
    const model = modelFor(parseTodoMdFile(source));
    const completed = model.days.flatMap(day => day.completed);
    expect(completed.map(entry => entry.title)).toEqual(['Finished child', 'Done project']);
    expect(completed.some(entry => entry.title === 'Stale completion marker')).toBe(false);
    expect(model.undated.open
      .some(entry => entry.title === 'Stale completion marker')).toBe(true);
  });

  it('sorts month tasks by status without changing their source order or project placement', () => {
    const data = parseTodoMdFile('# SELECTED\n* [ ] Open first ! Nov 2026\n'
      + '* [~] Started first ! Nov 2026\n* [!] Blocked ! Nov 2026\n'
      + '* [~] Started second ! Nov 2026\n* [ ] Open second ! Nov 2026\n');
    const before = renderTodoMdFile(data);
    expect(modelFor(data).monthTasks.map(entry => entry.title))
      .toEqual(['Started first', 'Started second', 'Blocked', 'Open first', 'Open second']);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('changes only the dragged child date, preserving its project, sibling and note', () => {
    const data = parseTodoMdFile(source);
    const child = allEntries(modelFor(data)).find(entry => entry.title === 'Child');
    const parent = child.parent;
    expect(rescheduleCalendarTask(data, child.task.id, '2026-11-25')).toBe(true);
    expect(parent.children).toContain(child.task);
    expect(renderTodoMdFile(data)).toBe(renderedSource.replace('Child (child note) ! Nov Week #4 2026',
      'Child (child note) ! Nov 25 2026'));
    expect(rescheduleCalendarTask(data, child.task.id, '2026-11-25')).toBe(false);
  });

  it('uses the shared workflow when scheduling a task, but keeps projects in SELECTED', () => {
    const data = parseTodoMdFile(source);
    const model = modelFor(data);
    const task = model.monthTasks[0].task;
    const project = model.selectedProjects[0].task;
    expect(rescheduleCalendarTask(data, task.id, '2026-12-01')).toBe(true);
    expect(data.columnStacks.WIP.sections.flatMap(section => section.items)).toContain(task);
    expect(rescheduleCalendarTask(data, project.id, '2026-12-02')).toBe(true);
    expect(data.columnStacks.SELECTED.sections.flatMap(section => section.items)).toContain(project);
    expect(extractDuePeriod(project.text).kind).toBe('day');
    expect(modelFor(data).selectedProjects).toHaveLength(2);
  });

  it('refuses terminal, frozen, archived, stale and invalid-date drops', () => {
    const data = parseTodoMdFile(source);
    const entries = allEntries(modelFor(data));
    for (const title of ['Finished child', 'Done project', 'Cancelled', 'Frozen project', 'Archived open']) {
      expect(rescheduleCalendarTask(data, entries.find(entry => entry.title === title).task.id,
        '2026-11-25')).toBe(false);
    }
    expect(rescheduleCalendarTask(data, 'missing', '2026-11-25')).toBe(false);
    const open = entries.find(entry => entry.title === 'Daily task');
    expect(rescheduleCalendarTask(data, open.task.id, '2026-02-30')).toBe(false);
    expect(rescheduleCalendarTask(data, open.task.id, 'anything')).toBe(false);
    expect(renderTodoMdFile(data)).toBe(renderedSource);
  });
});
