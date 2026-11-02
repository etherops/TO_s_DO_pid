import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import TaskCard from '../../../src/components/TaskCard.vue';
import DetachSubtasksModal from '../../../src/components/DetachSubtasksModal.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Initiative demotion', () => {
  for (const surface of ['focus', 'board']) {
    it(`confirms and preserves detached child data in ${surface}`, async () => {
      vi.useFakeTimers();
      const data = parseTodoMdFile('# WIP\n### Work\n* [~] Parent\n'
        + '  - [~] Child (note) ! Oct 2026\n  * Unsupported\n  - [x] Finished | Sep 20 2026\n');
      const section = data.columnStacks.WIP.sections[0];
      const task = section.items[0];
      const wrapper = surface === 'focus'
        ? mount(FocusMode, { props: { todoData: data } })
        : mount(TaskCard, { props: { task, section, column: 'WIP' } });
      const before = renderTodoMdFile(data);
      await wrapper.get('[aria-label="Make low priority"]').trigger('click');
      wrapper.getComponent(DetachSubtasksModal).vm.$emit('cancel');
      await vi.advanceTimersByTimeAsync(800);
      expect(renderTodoMdFile(data)).toBe(before);
      await wrapper.get('[aria-label="Make low priority"]').trigger('click');
      wrapper.getComponent(DetachSubtasksModal).vm.$emit('confirm');
      await vi.advanceTimersByTimeAsync(800);
      expect(task.listMarker).toBe('-');
      expect(task.children.every(child => child.type !== 'subtask')).toBe(true);
      expect(section.items.slice(1).map(child => [child.type, child.statusChar, child.text])).toEqual([
        ['task', '~', 'Child (note) ! Oct 2026'], ['task', 'x', 'Finished | Sep 20 2026']
      ]);
      expect(renderTodoMdFile(data)).toContain('  * Unsupported');
      wrapper.unmount();
    });
  }
});
