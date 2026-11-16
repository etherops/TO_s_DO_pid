import { describe, expect, it } from 'vitest';
import { parseTodoMdFile, renderTodoMdFile } from '../../src/utils/TodoMdParser';
import { captureWorkflowState, reconcileWorkflowEdits, taskLocations } from '../../src/utils/taskWorkflow';
import { migratePaperWorkflow } from '../../src/utils/workflowMigration';
import { derivePlanningModel } from '../../src/utils/planningHelpers';
import { deriveFocusModel } from '../../src/utils/focusModeHelpers';
import { setDuePeriod } from '../../src/utils/dateHelpers';

describe('paper ownership and date projections', () => {
  it('round-trips direct H1 tasks, nested children, raw content, and legacy H2/H3 sections', () => {
    const source = '# SELECTED\nA column note\n+ [ ] Parent\n  - [~] Child (note) ! Nov 8 2026\n'
      + '  unsupported child\n- [ ] Low\n\n## Later\n* [ ] Named section\n\n# WIP\n* [!] Direct\n'
      + '\n# ARCHIVE\n### Old week\n* [x] Old | Nov 1 2026';
    const data = parseTodoMdFile(source);
    expect(data.columnStacks.SELECTED.sections[1].headerStyle).toBe('NONE');
    expect(taskLocations(data)).toHaveLength(5);
    expect(renderTodoMdFile(parseTodoMdFile(renderTodoMdFile(data)))).toBe(renderTodoMdFile(data));
    expect(renderTodoMdFile(data)).not.toContain('## \n');
    expect(renderTodoMdFile(data)).toContain('  unsupported child');
  });

  it.each(['*', '-'])('moves %s tasks to the WIP root on dating, and SELECTED root on clearing', marker => {
    const data = parseTodoMdFile(`# TODO\n## Backlog\n${marker} [ ] Task (note)\n`);
    const task = taskLocations(data)[0].task;
    let before = captureWorkflowState(data);
    task.text = setDuePeriod(task.text, '2026-11-08');
    reconcileWorkflowEdits(data, before);
    expect(data.columnStacks.WIP.sections[0].items).toContain(task);
    expect(data.columnStacks.WIP.sections[0].headerStyle).toBe('NONE');
    before = captureWorkflowState(data);
    task.text = setDuePeriod(task.text, '');
    reconcileWorkflowEdits(data, before);
    expect(data.columnStacks.SELECTED.sections[0].items).toContain(task);
    expect(task.text).toBe('Task (note)');
    expect(taskLocations(data)).toHaveLength(1);
  });

  it('keeps projects in SELECTED and scheduled children attached, even after their date is cleared', () => {
    const data = parseTodoMdFile('# TODO\n+ [ ] Parent\n  - [ ] Child (note)\n');
    const parent = taskLocations(data)[0].task, child = parent.children[0];
    let before = captureWorkflowState(data);
    parent.text = setDuePeriod(parent.text, 'month:2026-11');
    reconcileWorkflowEdits(data, before);
    expect(data.columnStacks.SELECTED.sections[0].items).toContain(parent);
    before = captureWorkflowState(data);
    child.text = setDuePeriod(child.text, '2026-11-08');
    reconcileWorkflowEdits(data, before);
    expect(derivePlanningModel(data, new Date(2026, 10, 8)).schedule[1].entries[0].task).toBe(child);
    expect(deriveFocusModel(data, new Date(2026, 10, 8)).now[0].task).toBe(child);
    child.text = setDuePeriod(child.text, '');
    reconcileWorkflowEdits(data, captureWorkflowState(data));
    expect(parent.children).toEqual([child]);
    expect(child.text).toBe('Child (note)');
    expect(derivePlanningModel(data).schedule.flatMap(group => group.entries).some(e => e.task === child)).toBe(false);
    expect(data.columnStacks.WIP).toBeUndefined();
  });

  it('projects dated backlog work without moving it on read and ignores archive/ice', () => {
    const data = parseTodoMdFile('# BACKLOG\n* [ ] Task ! Nov 8 2026\n+ [ ] Parent\n'
      + '  - [ ] Child ! Nov 8 2026\n# ICE\n* [ ] Frozen ! Nov 8 2026\n'
      + '# ARCHIVE\n* [ ] Old ! Nov 8 2026');
    const before = renderTodoMdFile(data), today = new Date(2026, 10, 8);
    expect(derivePlanningModel(data, today).schedule[1].entries.map(e => e.title)).toEqual(['Task', 'Child']);
    expect(deriveFocusModel(data, today).now.map(e => e.task.text.split(' ! ')[0])).toEqual(['Task', 'Child']);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('does not interpret completion stamping, unrelated edits or manual paper placement as scheduling', () => {
    const data = parseTodoMdFile('# WIP\n* [ ] Task ! Nov 8 2026\n# TODO\n* [ ] Backlog\n');
    const before = captureWorkflowState(data), task = taskLocations(data)[0].task;
    task.statusChar = 'x'; task.text = 'Task | Nov 8 2026';
    reconcileWorkflowEdits(data, before);
    expect(data.columnStacks.WIP.sections[0].items).toContain(task);
    expect(data.columnStacks.SELECTED).toBeUndefined();
  });

  it('migrates projects and flattens WIP without changing tasks, children or archive headings; is idempotent', () => {
    const source = '# TODO\n## Keep\n* [ ] Backlog\n# PROJECTS\n### Old project section\n'
      + '+ [~] First (note)\n  - [x] Child | Nov 1 2026\n  raw child\n'
      + '# SELECTED\n## Next\n* [ ] Selected\n# WIP\n### Week\n+ [ ] Second\n'
      + '  - [ ] Child ! Nov 9 2026\n* [!] Task ! Nov 8 2026\n## More\nRaw note\n'
      + '# ARCHIVE\n### Old week\n+ [x] Archived | Oct 1 2026';
    const result = migratePaperWorkflow(source), data = parseTodoMdFile(result.content);
    expect(result.projectsMoved).toBe(2);
    expect(result.wipHeadingsRemoved).toBe(2);
    expect(data.columnStacks.PROJECTS).toBeUndefined();
    expect(data.columnStacks.SELECTED.sections[0].items.map(task => task.text)).toEqual(['First (note)', 'Second']);
    expect(data.columnStacks.WIP.sections).toHaveLength(1);
    expect(result.content).toContain('Raw note');
    expect(result.content).toContain('  raw child');
    expect(result.content).toContain('# ARCHIVE\n### Old week\n+ [x] Archived | Oct 1 2026');
    expect(migratePaperWorkflow(result.content)).toEqual({ ...result, projectsMoved: 0, wipHeadingsRemoved: 0 });
  });
});
