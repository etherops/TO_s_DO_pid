import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskCard from '../../../src/components/TaskCard.vue';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';

afterEach(() => vi.useRealTimers());

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
      for (const status of ['x', '-', ' ', '~']) {
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
      expect(task.statusChar).toBe('-');
      wrapper.unmount();
    });
  });
}
