import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { nextTick, reactive } from 'vue';
import { parseTodoMdFile as parse, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { cycleTaskPriority } from '../../../src/utils/priorityHelpers';
import FocusMode from '../../../src/components/FocusMode.vue';
import TaskCard from '../../../src/components/TaskCard.vue';

const parseTodoMdFile = (text) => reactive(parse(text));

describe('Projects in date-oriented Focus', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 21)); });
  afterEach(() => vi.useRealTimers());
  it.each([
    ['.panel-now', ' ', ' ! Sep 21 2026'],
    ['.panel-upnext', ' ', ' ! Sep Week #4 2026'],
    ['.panel-in-progress-queued', '~', ' ! Sep 22 2026']
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
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Initiative (note) ! Sep Week #4 2026\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    expect(task.listMarker).toBe('+');
    expect(renderTodoMdFile(data)).toContain('+ [~] Initiative (note) ! Sep Week #4 2026');
    for (const marker of ['*', '-', '+']) {
      cycleTaskPriority(task);
      expect(task.listMarker).toBe(marker);
      expect(task.isLowPriority).toBe(marker === '-');
    }
    expect(task.text).toBe('Initiative (note) ! Sep Week #4 2026');
    expect(task.statusChar).toBe('~');
  });

  it('shows selected weekly projects only in the Projects tab and moves normal tasks back to Tasks', async () => {
    const data = parseTodoMdFile('# SELECTED\n### Work\n+ [~] Project ! Sep Week #4 2026\n'
      + '+ [x] Finished | Sep 20 2026\n# TODO\n### Other\n+ [ ] Outside scope ! Sep 21 2026');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    expect(wrapper.find('.panel-upnext .focus-task-row').exists()).toBe(false);
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    expect(wrapper.get('.panel-upnext').text()).toContain('Project');
    expect(wrapper.find('.focus-initiatives').exists()).toBe(false);
    expect(wrapper.get('.focus-carousel').text()).not.toContain('Finished');
    expect(wrapper.get('.panel-now').text()).toContain('Outside scope');
    await wrapper.get('.panel-upnext .priority-toggle').trigger('click');
    await vi.advanceTimersByTimeAsync(700);
    expect(data.columnStacks.SELECTED.sections[0].items[0].listMarker).toBe('*');
    await wrapper.get('#focus-left-tab-tasks').trigger('click');
    expect(wrapper.get('.panel-upnext').text()).toContain('Project');
    wrapper.unmount();
  });

  it('waits for the last priority click before regrouping', async () => {
    vi.useFakeTimers();
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Task ! Sep Week #4 2026\n');
    const task = data.columnStacks.WIP.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('.focus-upnext-content [aria-label="Make low priority"]').trigger('click');
    expect(wrapper.get('.focus-upnext-content .priority-toggle').text()).toBe('LOW');
    expect(task.listMarker).toBe('*');
    await vi.advanceTimersByTimeAsync(500);
    await wrapper.get('.focus-upnext-content .priority-toggle').trigger('click');
    expect(wrapper.get('.focus-upnext-content .priority-toggle').text()).toBe('HIGH');
    await vi.advanceTimersByTimeAsync(500);
    expect(task.listMarker).toBe('*');
    expect(wrapper.find('.initiative-row').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await nextTick();
    expect(task.listMarker).toBe('+');
    expect(wrapper.get('.panel-upnext').text()).toContain('Task');
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
    const data = parseTodoMdFile('# SELECTED\n### Work\n+ [~] Initiative ! Sep Week #4 2026\n');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    await wrapper.get('.panel-upnext .focus-row-check').trigger('click');
    expect(wrapper.get('.panel-upnext').text()).toContain('Initiative');
    await vi.advanceTimersByTimeAsync(1499);
    expect(wrapper.get('.panel-upnext').text()).toContain('Initiative');
    await vi.advanceTimersByTimeAsync(1000);
    await nextTick();
    expect(wrapper.find('.initiative-row').exists()).toBe(false);
    wrapper.unmount();
  });

  it('sorts initiatives within their source section without moving other tasks', async () => {
    const data = parseTodoMdFile('# SELECTED\n### Work\n+ [~] First ! Sep Week #4 2026\n* [ ] Other\n+ [~] Second ! Sep Week #4 2026\n');
    const section = data.columnStacks.SELECTED.sections[0];
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    const rows = wrapper.findAll('.panel-upnext .focus-task-row');
    expect(rows[0].attributes('draggable')).toBeUndefined();
    expect(rows[0].get('.focus-drag-handle').attributes('draggable')).toBe('true');
    await rows[1].get('.focus-drag-handle').trigger('dragstart');
    await rows[0].trigger('drop', { clientY: -1 });
    expect(section.items.map(task => task.displayText)).toEqual(['Second', 'Other', 'First']);
    expect(wrapper.emitted('update')).toHaveLength(1);
    await rows[0].trigger('click');
    expect(wrapper.find('.focus-inline-editor').exists()).toBe(true);
    wrapper.unmount();
  });

  it('saves project dates immediately and moves the card to its new date panel', async () => {
    const data = parseTodoMdFile('# SELECTED\n### Work\n+ [~] Initiative ! Sep Week #4 2026\n');
    const task = data.columnStacks.SELECTED.sections[0].items[0];
    const wrapper = mount(FocusMode, { props: { todoData: data }, global: { stubs: { teleport: true } } });
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    await wrapper.get('.panel-upnext .focus-due-edit').trigger('click');
    const today = wrapper.findAll('.focus-date-option').find(button => button.text() === 'Today');
    await today.trigger('click');
    expect(task.text).not.toContain('Sep Week #4 2026');
    expect(wrapper.emitted('update')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1300);
    expect(wrapper.get('.panel-now').text()).toContain('Initiative');
    wrapper.unmount();
  });
});
