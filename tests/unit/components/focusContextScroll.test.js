import { mount, DOMWrapper } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Focus conversion picker scrolling', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 12, 12)); });
  afterEach(() => vi.useRealTimers());

  it('offers completed projects outside Archive and preserves their status during conversion', async () => {
    const data = reactive(parseTodoMdFile('# SELECTED\n'
      + '+ [x] DB: SCHOOL - Shadow HSs ! Nov 2026\n'
      + '+ [-] Cancelled project | Nov 1 2026\n'
      + '* [x] Completed regular | Nov 1 2026\n'
      + '# WIP\n* [ ] Convert me (keep note) ! Nov 12 2026\n'
      + '# ARCHIVE\n+ [x] Archived project | Nov 1 2026\n+ [ ] Archived open project\n'
      + '# ICE\n+ [ ] Frozen project\n'));
    const target = data.columnStacks.SELECTED.sections[0].items[0];
    const wrapper = mount(FocusMode, { attachTo: document.body, props: { todoData: data } });
    try {
      await wrapper.get('.panel-now .focus-task-row').trigger('contextmenu', { clientX: 100, clientY: 100 });
      const menu = new DOMWrapper(document.querySelector('.focus-task-context-menu'));
      await menu.get('.focus-task-context-convert').trigger('click');
      expect(menu.findAll('.initiative-parent-options button').map(button => button.text()))
        .toEqual(['DB: SCHOOL - Shadow HSs', 'Cancelled project']);
      await menu.get('.initiative-search').setValue('Shadow');
      await menu.get('.initiative-parent-options button').trigger('click');
      expect(target.statusChar).toBe('x');
      expect(target.text).toBe('DB: SCHOOL - Shadow HSs ! Nov 2026');
      expect(target.children[0].text).toBe('Convert me (keep note) ! Nov 12 2026');
      expect(data.columnStacks.WIP.sections[0].items).toHaveLength(0);
      expect(wrapper.emitted('update')).toHaveLength(1);
    } finally { wrapper.unmount(); }
  });

  it.each(['projects', 'regular tasks'])('keeps %s open on internal scroll and closes on outside scroll', async kind => {
    const source = '# SELECTED\n' + Array.from({ length: 30 }, (_, i) =>
      `+ [ ] Project ${i}\n* [ ] Regular ${i}\n`).join('')
      + '# WIP\n* [ ] Convert me (keep note) ! Nov 12 2026\n';
    const data = reactive(parseTodoMdFile(source));
    const before = renderTodoMdFile(data);
    const wrapper = mount(FocusMode, { attachTo: document.body, props: { todoData: data } });
    try {
      await wrapper.get('.panel-now .focus-task-row').trigger('contextmenu', { clientX: 100, clientY: 100 });
      const menu = new DOMWrapper(document.querySelector('.focus-task-context-menu'));
      await menu.get('.focus-task-context-convert').trigger('click');
      if (kind === 'regular tasks') await menu.get('.choose-regular-task').trigger('click');
      await menu.get('.initiative-parent-options').trigger('scroll');
      expect(document.querySelector('.focus-task-context-menu')).not.toBeNull();
      await menu.trigger('scroll');
      expect(document.querySelector('.focus-task-context-menu')).not.toBeNull();
      await menu.get('.initiative-search').setValue('29');
      expect(menu.findAll('.initiative-parent-options button')).toHaveLength(1);
      expect(wrapper.emitted('update')).toBeUndefined();
      expect(renderTodoMdFile(data)).toBe(before);
      await wrapper.get('.panel-now .panel-body').trigger('scroll');
      await nextTick();
      expect(document.querySelector('.focus-task-context-menu')).toBeNull();
    } finally { wrapper.unmount(); }
  });
});
