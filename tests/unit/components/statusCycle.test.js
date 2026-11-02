import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskCard from '../../../src/components/TaskCard.vue';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';

afterEach(() => vi.useRealTimers());

describe('Focus status movement', () => {
  it('reorders completed work within NOW without disappearance or arrival effects', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1));
    const data = reactive(parseTodoMdFile('# WIP\n### Current\n* [~] Staying ! Oct 1 2026\n'
      + '* [~] Moving ! Oct 1 2026'));
    const task = data.columnStacks.WIP.sections[0].items[1];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    const row = () => wrapper.get(`.panel-now [data-task-id="${task.id}"]`);
    try {
      const originalElement = row().element;
      await row().get('.focus-row-check').trigger('click');
      await vi.advanceTimersByTimeAsync(1500);
      expect(task.statusChar).toBe('x');
      expect(row().element).toBe(originalElement);
      expect(wrapper.find('.transitioning, .arriving, .flight-card').exists()).toBe(false);
      expect(wrapper.findAll('.panel-now .focus-row-title').map(title => title.text()))
        .toEqual(['Moving', 'Staying']);
      await vi.advanceTimersByTimeAsync(600);
      expect(wrapper.find('.transitioning, .arriving, .flight-card').exists()).toBe(false);
    } finally { wrapper.unmount(); }
  });

  it('retains departure animation when completing parked work into NOW', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1));
    const data = reactive(parseTodoMdFile('# WIP\n### Current\n* [~] Parked'));
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    try {
      await wrapper.get('.panel-in-progress-queued .focus-row-check').trigger('click');
      await vi.advanceTimersByTimeAsync(1500);
      expect(wrapper.find('.panel-in-progress-queued .transitioning').exists()).toBe(true);
      await vi.advanceTimersByTimeAsync(600);
      expect(wrapper.get('.panel-now').text()).toContain('Parked');
    } finally { wrapper.unmount(); }
  });
});

for (const surface of ['board', 'focus']) {
  describe(`${surface} status click sequence`, () => {
    it('anchors rapid clicks and resets the anchor once settled', async () => {
      vi.useFakeTimers();
      const data = parseTodoMdFile('# WIP\n### Current\n* [~] Cycle task\n');
      const section = data.columnStacks.WIP.sections[0];
      const task = section.items[0];
      const wrapper = surface === 'board'
        ? mount(TaskCard, { props: { task, section, column: 'WIP' } })
        : mount(FocusMode, { props: { todoData: data } });
      const checkbox = () => wrapper.get(surface === 'board' ? '.custom-checkbox' : 'button.focus-row-check');
      for (const status of ['x', '!', '-', ' ', '~']) {
        await checkbox().trigger('click');
        expect(task.statusChar).toBe(status);
      }
      await vi.advanceTimersByTimeAsync(1600);
      await checkbox().trigger('click');
      expect(task.statusChar).toBe('x');
      await vi.advanceTimersByTimeAsync(2500);
      await checkbox().trigger('click');
      expect(task.statusChar).toBe('~');
      await checkbox().trigger('click');
      expect(task.statusChar).toBe('!');
      wrapper.unmount();
    });
  });
}
