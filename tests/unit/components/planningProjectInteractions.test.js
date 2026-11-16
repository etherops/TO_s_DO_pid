import { mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlanningWorkspace from '../../../src/components/PlanningWorkspace.vue';
import KanbanSection from '../../../src/components/KanbanSection.vue';
import draggable from 'vuedraggable';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Plan project interactions and priority groups', () => {
  beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() }));
  afterEach(() => vi.unstubAllGlobals());
  it('expands on title activation, edits on the next click and offers Close, including empty projects', async () => {
    const data = reactive(parseTodoMdFile('# SELECTED\n+ [ ] Empty project\n'));
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    try {
      expect(wrapper.find('.planning-project-caret').exists()).toBe(false);
      await wrapper.get('.projects-stack .task-title').trigger('keydown', { key: 'Enter' });
      expect(wrapper.find('.planning-project-children').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Add subtask to Empty project"]').exists()).toBe(true);
      expect(wrapper.find('.task-text-edit').exists()).toBe(false);
      await wrapper.get('.projects-stack .task-title').trigger('click');
      expect(wrapper.get('.task-text-edit').element.value).toBe('Empty project');
      await wrapper.get('.edit-actions-row .cancel-edit-btn').trigger('click');
      await wrapper.get('.planning-project-close').trigger('click');
      expect(wrapper.find('.planning-project-children').exists()).toBe(false);
      expect(wrapper.emitted('update')).toBeUndefined();
    } finally { wrapper.unmount(); }
  });

  it('reorders projects using the grip and persists their complete subtree', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Unstarted\n+ [ ] Partial\n  - [~] Started child\n'
      + '+ [x] Done | Nov 1 2026\n+ [~] Active\n');
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    try {
      expect(wrapper.find('.planning-projects-sort').exists()).toBe(false);
      const rows = wrapper.findAll('.planning-project');
      const dataTransfer = { setData: vi.fn() };
      await rows[2].get('.planning-task-grip').trigger('dragstart', { dataTransfer });
      await rows[0].trigger('dragover', { dataTransfer, clientY: -1 });
      expect(rows[0].classes()).toContain('project-drop-before');
      await rows[0].trigger('drop', { dataTransfer });
      expect(wrapper.findAll('.projects-stack .task-title').map(row => row.text()))
        .toEqual(['Done', 'Unstarted', 'Partial', 'Active']);
      const saved = renderTodoMdFile(data);
      expect(saved).not.toBe(before);
      expect(saved).toContain('+ [ ] Partial\n  - [~] Started child');
      expect(saved.indexOf('+ [x] Done')).toBeLessThan(saved.indexOf('+ [ ] Unstarted'));
      expect(wrapper.emitted('update')).toHaveLength(1);
      await wrapper.setProps({ todoData: parseTodoMdFile(saved) });
      expect(wrapper.findAll('.projects-stack .task-title').map(row => row.text()))
        .toEqual(['Done', 'Unstarted', 'Partial', 'Active']);
    } finally { wrapper.unmount(); }
  });

  it('cancels handle drags without saving or changing the order', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Quarter\n  - [x] One\n  - [ ] Two\n  - [ ] Three\n  - [ ] Four\n'
      + '+ [ ] Nearly done\n  - [x] One\n  - [x] Two\n  - [x] Three\n  - [ ] Four\n'
      + '+ [ ] Half later ! Dec 2026\n  - [x] One\n  - [ ] Two\n'
      + '+ [ ] Half sooner ! Nov 2026\n  - [x] One\n  - [ ] Two\n');
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    try {
      const grip = wrapper.get('.projects-stack .planning-task-grip');
      const dataTransfer = { setData: vi.fn() };
      await grip.trigger('dragstart', { dataTransfer });
      await wrapper.findAll('.planning-project')[1].trigger('dragover', { dataTransfer, clientY: 20 });
      await grip.trigger('dragend');
      expect(wrapper.find('.project-drop-after').exists()).toBe(false);
      expect(wrapper.findAll('.projects-stack .task-title').map(row => row.text()))
        .toEqual(['Quarter', 'Nearly done', 'Half later', 'Half sooner']);
      expect(renderTodoMdFile(data)).toBe(before);
      expect(wrapper.emitted('update')).toBeUndefined();
    } finally { wrapper.unmount(); }
  });

  it('cycles expanded subtasks, saves completion dates and holds scheduled copies during the debounce', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 2, 12));
    const data = reactive(parseTodoMdFile('# SELECTED\n+ [~] Project (parent note)\n'
      + '  - [ ] Child (keep note) ! Nov 3 2026\n  - [ ] Sibling\n'));
    const parent = data.columnStacks.SELECTED.sections[0].items[0];
    const child = parent.children[0];
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    try {
      await wrapper.get('.projects-stack .task-title').trigger('click');
      const status = () => wrapper.get('.planning-project-children .planning-child-status');
      await status().trigger('click');
      expect(child.statusChar).toBe('x');
      expect(child.text).toBe('Child (keep note) | Nov 2 2026');
      expect(wrapper.get('[data-schedule-day="2026-11-03"]').text()).toContain('Child');
      await status().trigger('click');
      expect(child.statusChar).toBe('~');
      expect(child.text).toBe('Child (keep note) ! Nov 3 2026');
      await status().trigger('click');
      expect(child.statusChar).toBe('!');
      await status().trigger('click');
      expect(child.statusChar).toBe('-');
      expect(wrapper.emitted('update')).toHaveLength(4);
      vi.advanceTimersByTime(1501); await nextTick();
      expect(wrapper.find('[data-schedule-day="2026-11-03"]').exists()).toBe(false);
      expect(parent.children[0]).toBe(child);
      expect(parent.statusChar).toBe('~');
      expect(parent.text).toBe('Project (parent note)');
      expect(parent.children[1].text).toBe('Sibling');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('groups low-priority source cards without changing source order, hidden projects or raw metadata', async () => {
    const data = reactive(parseTodoMdFile('# SELECTED\n- [ ] Low first\n+ [ ] Hidden project\n'
      + '  - [ ] Attached\n* [ ] Main\nRaw metadata\n- [ ] Low last\n'));
    const section = data.columnStacks.SELECTED.sections[0];
    const before = renderTodoMdFile(data);
    const wrapper = mount(KanbanSection, { props: { section, columnType: 'SELECTED', column: 'SELECTED', hideProjects: true },
      global: { provide: { planningWorkspace: true } } });
    try {
      expect(wrapper.findAll('.task-title').map(row => row.text())).toEqual(['Main', 'Low first', 'Low last']);
      expect(wrapper.get('.planning-low-priority-heading').text()).toBe('LOW PRIO 2');
      expect(renderTodoMdFile(data)).toBe(before);
      const list = wrapper.getComponent(draggable);
      const items = [...list.props('modelValue')];
      const lowIndex = items.findIndex(item => item.text === 'Low first');
      [items[lowIndex], items[lowIndex + 1]] = [items[lowIndex + 1], items[lowIndex]];
      list.vm.$emit('update:modelValue', items); await nextTick();
      expect(section.items).toHaveLength(items.length);
      expect(renderTodoMdFile(data)).toContain('+ [ ] Hidden project\n  - [ ] Attached');
      expect(renderTodoMdFile(data)).toContain('Raw metadata');
      expect(wrapper.findAll('.task-title').map(row => row.text())).toEqual(['Main', 'Low last', 'Low first']);
    } finally { wrapper.unmount(); }
  });
});
