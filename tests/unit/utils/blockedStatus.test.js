import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { deriveFocusModel, groupInProgressQueuedEntries } from '../../../src/utils/focusModeHelpers';
import { groupTasksForArchive } from '../../../src/utils/archiveHelpers';
import { reconcileLifecycleDateForStatus } from '../../../src/utils/completionDateHelpers';
import FocusMode from '../../../src/components/FocusMode.vue';
import SubtaskEditor from '../../../src/components/SubtaskEditor.vue';
import SubtaskStatusGrid from '../../../src/components/SubtaskStatusGrid.vue';
import SubtaskIndicator from '../../../src/components/SubtaskIndicator.vue';

const source = `# SELECTED
### Plans
* [!] Blocked today ! Oct 21 2026
* [!] Blocked overdue ! Oct 20 2026
* [!] Blocked week ! Oct Week #4 2026
* [!] Blocked later ! Nov 2026
- [!] Low blocked
+ [!] Blocked initiative
  - [!] Blocked child (preserved)
  * [!] Unsupported child stays raw
# WIP
### Work
* [!] Blocked WIP
* [~] Active week ! Oct Week #4 2026
`;

describe('Blocked status', () => {
  it('round trips blocked tasks and children without losing metadata or raw children', () => {
    const data = parseTodoMdFile(source);
    expect(renderTodoMdFile(data)).toContain('* [!] Blocked today ! Oct 21 2026');
    expect(renderTodoMdFile(data)).toContain('  - [!] Blocked child (preserved)');
    expect(renderTodoMdFile(data)).toContain('  * [!] Unsupported child stays raw');
    expect(reconcileLifecycleDateForStatus('Task ! Nov 2026', '!')).toBe('Task ! Nov 2026');
    expect(groupTasksForArchive(data.columnStacks.SELECTED.sections[0].items)).toEqual([]);
  });

  it('routes blocked work right regardless of date and active weekly work to NOW', () => {
    const result = deriveFocusModel(parseTodoMdFile(source), new Date(2026, 9, 21));
    expect(result.inProgressQueued).toHaveLength(8);
    expect(result.inProgressQueued.every(entry => entry.task.statusChar === '!')).toBe(true);
    expect(result.now.map(entry => entry.task.displayText)).toEqual(['Active week']);
    expect(result.now[0].dueGroup).toBe('this-week');
    expect(result.upNext).toEqual([]);
    expect(result.done).toEqual([]);
    const groups = groupInProgressQueuedEntries(result.inProgressQueued);
    expect(groups.map(group => group.label)).toEqual(['Blocked', 'Low Priority']);
    expect(groups[0].entries).toHaveLength(7);
  });

  it('keeps future-view overdue suppression for blocked work', () => {
    const result = deriveFocusModel(parseTodoMdFile(source), new Date(2026, 10, 1), { hideOverdue: true });
    expect(result.inProgressQueued.some(entry => entry.task.text.includes('Blocked overdue'))).toBe(false);
    expect(result.inProgressQueued.some(entry => entry.task.text.includes('Blocked later'))).toBe(true);
  });

  it('shows blocked initiatives on the right instead of the exclusive initiative panel', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21));
    const wrapper = mount(FocusMode, { props: { todoData: parseTodoMdFile(source) } });
    try {
      expect(wrapper.find('.focus-initiatives').exists()).toBe(false);
      expect(wrapper.get('.panel-in-progress-queued').text()).toContain('Blocked initiative');
      expect(wrapper.findAll('.panel-in-progress-queued .status-blocked')).toHaveLength(8);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('cycles a nested child through blocked and preserves its due date during rapid clicks', async () => {
    const child = { id: 1, type: 'subtask', statusChar: '~', text: 'Child ! Nov 2026' };
    const wrapper = mount(SubtaskEditor, { props: { modelValue: [child] } });
    try {
      for (const status of ['x', '!', '-', ' ', '~']) {
        await wrapper.get('.subtask-status').trigger('click');
        const rows = wrapper.emitted('commit').at(-1)[0];
        expect(rows[0].statusChar).toBe(status);
        if (status === '!') expect(rows[0].text).toBe('Child ! Nov 2026');
        await wrapper.setProps({ modelValue: rows });
      }
    } finally { wrapper.unmount(); }
  });

  it('includes blocked children in the fixed-size status grid', () => {
    const wrapper = mount(SubtaskStatusGrid, { props: { task: { statusChar: '~', children: [
      { type: 'subtask', statusChar: '!' }, { type: 'subtask', statusChar: 'x' }
    ] } } });
    expect(wrapper.findAll('.subtask-status-block')).toHaveLength(16);
    expect(wrapper.findAll('.blocked')).toHaveLength(8);
    wrapper.unmount();
  });

  it('names blocked children in the subtask count tooltip', () => {
    const wrapper = mount(SubtaskIndicator, { props: { task: {
      children: [{ type: 'subtask', statusChar: '!' }]
    } } });
    expect(wrapper.get('.subtask-indicator').attributes('title')).toBe('1 total, 1 blocked');
    wrapper.unmount();
  });
});
