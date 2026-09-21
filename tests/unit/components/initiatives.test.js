import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { cycleTaskPriority } from '../../../src/utils/priorityHelpers';
import FocusMode from '../../../src/components/FocusMode.vue';
import TaskCard from '../../../src/components/TaskCard.vue';

describe('Initiatives', () => {
  afterEach(() => vi.useRealTimers());
  it.each([
    ['.panel-now', ' ', ' ! Sep 21 2026'],
    ['.panel-upnext', ' ', ' ! Oct 2026'],
    ['.panel-in-progress-queued', '~', ''],
    ['.focus-week-day-column', ' ', ' ! Sep 22 2026']
  ])('uses handle-only sorting and blank-space editing in %s', async (selector, status, date) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    const data = parseTodoMdFile(`# WIP\n### Work\n* [${status}] First${date}\n* [${status}] Second${date}`);
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    try {
      const rows = wrapper.findAll(`${selector} .focus-task-row`);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0].attributes('draggable')).toBeUndefined();
      await rows[1].get('.focus-drag-handle').trigger('dragstart');
      await rows[0].trigger('drop', { clientY: -1 });
      expect(data.columnStacks.WIP.sections[0].items[0].text).toContain('Second');
      await rows[0].get('.focus-row-main').trigger('click');
      expect(wrapper.find('.focus-inline-editor').exists()).toBe(true);
    } finally { wrapper.unmount(); }
  });
  it('round trips plus markers and cycles priority without changing task data', () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Initiative (note) ! Dec 2099\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    expect(task.listMarker).toBe('+');
    expect(renderTodoMdFile(data)).toContain('+ [~] Initiative (note) ! Dec 2099');
    for (const marker of ['*', '-', '+']) {
      cycleTaskPriority(task);
      expect(task.listMarker).toBe(marker);
      expect(task.isLowPriority).toBe(marker === '-');
    }
    expect(task.text).toBe('Initiative (note) ! Dec 2099');
    expect(task.statusChar).toBe('~');
  });

  it('shows unfinished Focus initiatives exclusively in their panel', async () => {
    vi.useFakeTimers();
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Initiative ! Dec 2099\n+ [x] Finished\n'
      + '# TODO\n### Other\n+ [ ] Outside scope\n');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    expect(wrapper.get('.focus-initiatives').text()).toContain('Initiative');
    expect(wrapper.get('.focus-initiatives').text()).not.toContain('Finished');
    expect(wrapper.get('.focus-initiatives').text()).not.toContain('Outside scope');
    expect(wrapper.get('.focus-upnext-content').text()).not.toContain('Initiative');
    await wrapper.get('.focus-initiatives .priority-toggle').trigger('click');
    expect(wrapper.find('.focus-initiatives').exists()).toBe(true);
    expect(wrapper.get('.focus-initiatives .priority-toggle').text()).toBe('↕');
    await vi.advanceTimersByTimeAsync(700);
    await nextTick();
    expect(wrapper.find('.focus-initiatives').exists()).toBe(false);
    expect(wrapper.get('.panel-upnext').classes()).not.toContain('has-initiatives');
    expect(wrapper.get('.focus-upnext-content').text()).toContain('Initiative');
    wrapper.unmount();
  });

  it('waits for the last priority click before regrouping', async () => {
    vi.useFakeTimers();
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Task ! Dec 2099\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    const button = wrapper.get('.focus-upnext-content .priority-toggle');
    await button.trigger('click');
    expect(button.text()).toBe('LOW');
    expect(task.listMarker).toBe('*');
    await vi.advanceTimersByTimeAsync(500);
    await button.trigger('click');
    expect(button.text()).toBe('HIGH');
    await vi.advanceTimersByTimeAsync(500);
    expect(task.listMarker).toBe('*');
    expect(wrapper.find('.focus-initiatives').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await nextTick();
    expect(task.listMarker).toBe('+');
    expect(wrapper.find('.focus-initiatives').exists()).toBe(true);
    wrapper.unmount();
  });

  it('cycles board controls through low and high', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Task\n');
    const section = data.columnStacks.WIP.sections[0];
    const task = section.items[0];
    const wrapper = mount(TaskCard, { props: { task, section, column: 'WIP' } });
    await wrapper.get('.priority-toggle').trigger('click');
    expect(task.listMarker).toBe('-');
    await wrapper.get('.low-priority-badge').trigger('click');
    expect(task.listMarker).toBe('+');
    expect(wrapper.get('.priority-toggle').text()).toBe('HIGH');
    await wrapper.get('.priority-toggle').trigger('click');
    expect(task.listMarker).toBe('*');
    wrapper.unmount();
  });

  it('holds completed initiatives through the status debounce', async () => {
    vi.useFakeTimers();
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Initiative ! Dec 2099\n');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('.focus-initiatives .focus-row-check').trigger('click');
    expect(wrapper.get('.focus-initiatives').text()).toContain('Initiative');
    await vi.advanceTimersByTimeAsync(1499);
    expect(wrapper.get('.focus-initiatives').text()).toContain('Initiative');
    await vi.advanceTimersByTimeAsync(1000);
    await nextTick();
    expect(wrapper.find('.focus-initiatives').exists()).toBe(false);
    wrapper.unmount();
  });

  it('sorts initiatives within their source section without moving other tasks', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] First\n* [ ] Other\n+ [~] Second\n');
    const section = data.columnStacks.WIP.sections[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    const rows = wrapper.findAll('.initiative-row');
    expect(rows[0].attributes('draggable')).toBeUndefined();
    expect(rows[0].get('.focus-drag-handle').attributes('draggable')).toBe('true');
    await rows[1].get('.focus-drag-handle').trigger('dragstart');
    await rows[0].trigger('drop', { clientY: -1 });
    expect(section.items.map(task => task.text)).toEqual(['Second', 'Other', 'First']);
    expect(wrapper.emitted('update')).toHaveLength(1);
    await rows[0].trigger('click');
    expect(wrapper.find('.focus-inline-editor').exists()).toBe(true);
    wrapper.unmount();
  });

  it('saves initiative date changes immediately without a relocation animation', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Initiative ! Dec 2099\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data }, global: { stubs: { teleport: true } } });
    await wrapper.get('.focus-initiatives .focus-due-edit').trigger('click');
    const today = wrapper.findAll('.focus-date-option').find(button => button.text() === 'Today');
    await today.trigger('click');
    expect(task.text).not.toContain('Dec 2099');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(wrapper.get('.focus-initiatives').text()).toContain('Initiative');
    expect(wrapper.find('.transitioning').exists()).toBe(false);
    wrapper.unmount();
  });
});
