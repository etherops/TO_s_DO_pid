import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SubtaskIndicator from '../../../src/components/SubtaskIndicator.vue';
import SubtaskStatusGrid from '../../../src/components/SubtaskStatusGrid.vue';

describe('Subtask status counts', () => {
  it('counts only subtasks, hides zero counts, and opens editing without changing status', async () => {
    const task = { statusChar: '~', children: [
      ...[' ', '~', 'x', 'x', '-'].map(statusChar => ({ type: 'subtask', statusChar })),
      { type: 'raw-text', statusChar: 'x' }
    ] };
    const wrapper = mount(SubtaskIndicator, { props: { task } });
    const grid = mount(SubtaskStatusGrid, { props: { task } });
    expect(wrapper.find('.subtask-status-grid').exists()).toBe(false);
    expect(wrapper.get('.subtask-total').text()).toBe('5 subtasks');
    expect(grid.findAll('.subtask-status-block').map(item => item.attributes('data-status')))
      .toEqual([...Array(3).fill(' '), ...Array(3).fill('-'), ...Array(3).fill('~'), ...Array(7).fill('x')]);
    expect(wrapper.get('button').attributes('aria-label'))
      .toBe('Edit subtasks: 5 total, 2 done, 1 in progress, 1 not started, 1 will not do');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);
    expect(task.statusChar).toBe('~');
    await wrapper.setProps({ task: { children: [{ type: 'subtask', statusChar: 'x' }] } });
    await grid.setProps({ task: { children: [{ type: 'subtask', statusChar: 'x' }] } });
    expect(grid.findAll('.subtask-status-block')).toHaveLength(16);
    expect(grid.get('.subtask-status-block').attributes('data-status')).toBe('x');
    await wrapper.setProps({ task: { children: [{ type: 'subtask', statusChar: ' ' }] } });
    expect(wrapper.get('.subtask-total').text()).toBe('1 subtask');
    await grid.setProps({ task: { children: [{ type: 'subtask', statusChar: ' ' }] } });
    expect(grid.get('.subtask-status-block').attributes('data-status')).toBe(' ');
    await wrapper.setProps({ task: { children: [{ type: 'raw-text' }] } });
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
