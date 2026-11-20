import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

describe('Focus Today / Overdue sections', () => {
  let wrapper;
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 9, 12)); });
  afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); });

  it('partitions tasks and children exactly once, with blocked taking precedence over priority', () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Parent\n'
      + '  - [ ] Child ! Nov 9 2026\n  - [!] Blocked child ! Nov 9 2026\n'
      + '# WIP\n* [~] Active ! Nov 9 2026\n- [ ] Low ! Nov 8 2026\n'
      + '- [!] Low blocked ! Nov 9 2026\n* [x] Done | Nov 9 2026\n'
      + '- [-] Low cancelled | Nov 9 2026\n* [!] Future blocked ! Nov 12 2026\n');
    const before = renderTodoMdFile(data);
    wrapper = mount(FocusMode, { props: { todoData: data } });
    const titles = key => wrapper.get(`[data-now-section="${key}"]`).findAll('.focus-row-title')
      .map(title => title.text());
    expect(titles('main')).toEqual(['Child', 'Done', 'Active']);
    expect(titles('low-priority')).toEqual(['Low cancelled', 'Low']);
    expect(titles('blocked-waiting')).toEqual(['Blocked child', 'Low blocked']);
    expect(wrapper.findAll('.panel-now .focus-task-row')).toHaveLength(7);
    expect(wrapper.get('.panel-now .panel-count').text()).toBe('7');
    expect(wrapper.get('.panel-in-progress-queued').text()).toContain('Future blocked');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('keeps three compact zero-count headings when no tasks are due', () => {
    wrapper = mount(FocusMode, { props: { todoData: parseTodoMdFile('# SELECTED\n* [ ] Undated\n') } });
    expect(wrapper.findAll('.panel-now .focus-day-header').map(header => header.text()))
      .toEqual(['MAIN0', 'LOW PRIO0', 'BLOCKED/WAITING0']);
    expect(wrapper.findAll('.panel-now .focus-task-row')).toHaveLength(0);
    expect(wrapper.get('#focus-left-tab-projects .focus-tab-count').text()).toBe('0');
  });

  it('defaults to Tasks and exposes selected projects in a separate keyboard-accessible tab without writes', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Today project ! Nov 9 2026\n  - [ ] Child\n'
      + '+ [ ] Week project ! Nov Week #2 2026\n  - [ ] Weekly child ! Nov Week #2 2026\n'
      + '+ [ ] Month project ! Nov 2026\n+ [ ] Tomorrow project ! Nov 10 2026\n'
      + '+ [ ] Later week ! Nov Week #3 2026\n+ [ ] Later month ! Dec 2026\n+ [ ] Undated project\n'
      + '+ [x] Completed project | Nov 1 2026\n* [ ] Weekly ! Nov Week #2 2026\n'
      + '# TODO\n+ [ ] Backlog project\n# ARCHIVE\n+ [ ] Archived project\n');
    const before = renderTodoMdFile(data);
    wrapper = mount(FocusMode, { props: { todoData: data } });
    expect(wrapper.get('#focus-left-tab-tasks').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('#focus-left-tab-projects .focus-tab-count').text()).toBe('3');
    expect(wrapper.find('#focus-left-tab-tasks .focus-tab-count').exists()).toBe(false);
    expect(wrapper.get('.panel-upnext').text()).toContain('Weekly');
    expect(wrapper.get('.panel-upnext').text()).not.toContain('Undated project');
    expect(wrapper.findAll('.panel-upnext .focus-row-title').map(row => row.text()))
      .toEqual(['Weekly child', 'Weekly']);
    expect(wrapper.find('.panel-upnext .focus-project-day-group').exists()).toBe(false);
    await wrapper.get('#focus-left-tab-tasks').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.get('#focus-left-tab-projects').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('#focus-left-tab-tasks .focus-tab-count').text()).toBe('2');
    expect(wrapper.find('#focus-left-tab-projects .focus-tab-count').exists()).toBe(false);
    expect(wrapper.findAll('.panel-upnext .focus-row-title').map(row => row.text()))
      .toEqual(['Today project', 'Week project', 'Month project']);
    expect(wrapper.findAll('.panel-upnext .focus-due-label').map(label => label.text()))
      .toEqual(['Nov 9', 'Nov Week #2', 'Nov']);
    expect(wrapper.find('.panel-upnext .focus-due-edit.clock-only').exists()).toBe(false);
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
    await wrapper.get('.panel-upnext .focus-row-title').trigger('click');
    expect(wrapper.get('.panel-upnext .focus-edit-name').element.value).toBe('Today project');
    expect(wrapper.find('.panel-upnext .subtask-editor').exists()).toBe(true);
    await wrapper.get('#focus-left-tab-tasks').trigger('click');
    expect(wrapper.find('.focus-inline-editor').exists()).toBe(false);
    await wrapper.get('#focus-left-tab-projects').trigger('click');
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
    expect(wrapper.findAll('.panel-upnext .focus-row-title').map(row => row.text()))
      .toEqual(['Week project', 'Month project', 'Tomorrow project']);
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-12-01');
    expect(wrapper.findAll('.panel-upnext .focus-row-title').map(row => row.text())).toEqual(['Later month']);
    expect(wrapper.get('#focus-left-tab-tasks .focus-tab-count').text()).toBe('0');
    await wrapper.get('#focus-left-tab-tasks').trigger('click');
    expect(wrapper.get('#focus-left-tab-projects .focus-tab-count').text()).toBe('1');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('groups only same-parent, same-day children and collapses without changing data or counts', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Trip\n'
      + '  - [ ] Pack ! Nov 9 2026\n  - [ ] Book ride (airport) ! Nov 9 2026\n'
      + '  - [x] Reserved hotel | Nov 9 2026\n  - [ ] Late ! Nov 8 2026\n'
      + '  - [!] Waiting ! Nov 9 2026\n  - [ ] Tomorrow ! Nov 10 2026\n  - [ ] Undated\n'
      + '+ [ ] Other project\n  - [ ] Other child ! Nov 9 2026\n'
      + '# WIP\n* [ ] Standalone ! Nov 9 2026\n');
    const before = renderTodoMdFile(data);
    wrapper = mount(FocusMode, { props: { todoData: data } });
    const groups = wrapper.findAll('[data-now-section="main"] .focus-project-day-group');
    expect(groups).toHaveLength(1);
    const trip = groups.find(group => group.findAll('.focus-task-row').length === 3);
    expect(trip.get('.focus-project-day-title').text()).toBe('Trip');
    expect(trip.get('.focus-project-day-count').text()).toBe('3 tasks');
    expect(trip.get('.focus-project-day-progress').text()).toBe('33%');
    expect(trip.get('.focus-project-day-status').classes()).toContain('inflight');
    expect(trip.get('.focus-project-day-bar').attributes('aria-label')).toBe('1 completed, 2 not started');
    expect(trip.find('.subtask-status-grid').exists()).toBe(false);
    expect(trip.findAll('.focus-subtask-parent')).toHaveLength(0);
    expect(trip.text()).not.toContain('Tomorrow');
    expect(trip.text()).not.toContain('Undated');
    expect(trip.findAll('.focus-row-check')).toHaveLength(3);
    expect(trip.get('.focus-row-note').text()).toBe('airport');
    expect(wrapper.get('.panel-now .panel-count').text()).toBe('7');
    expect(wrapper.findAll('[data-now-section="blocked-waiting"] .focus-project-day-group')).toHaveLength(0);
    const single = wrapper.findAll('.panel-now .focus-ungrouped-task .focus-task-row')
      .find(row => row.get('.focus-row-title').text() === 'Other child');
    expect(single.get('.focus-subtask-parent').text()).toContain('Other project');
    expect(single.find('.focus-due-edit').exists()).toBe(true);
    const toggle = trip.get('.focus-project-day-toggle');
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(trip.get('.focus-project-day-children').element.style.display).toBe('none');
    expect(wrapper.get('.panel-now .panel-count').text()).toBe('7');
    await toggle.trigger('click');
    expect(trip.get('.focus-project-day-children').element.style.display).not.toBe('none');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('keeps summaries and singleton project children together ahead of standalone tasks', () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Trip\n'
      + '  - [ ] Pack ! Nov 9 2026\n  - [ ] Ride ! Nov 9 2026\n'
      + '+ [ ] Ski\n  - [ ] Boots ! Nov 9 2026\n'
      + '# WIP\n* [x] Done | Nov 9 2026\n* [~] Active ! Nov 9 2026\n* [ ] Regular ! Nov 9 2026\n');
    const before = renderTodoMdFile(data);
    wrapper = mount(FocusMode, { props: { todoData: data } });
    const section = wrapper.get('[data-now-section="main"]');
    const cards = [...section.element.children].slice(1);
    expect(cards.map(card => card.querySelector('.focus-project-day-title, .focus-row-title').textContent))
      .toEqual(['Trip', 'Boots', 'Done', 'Active', 'Regular']);
    expect(cards[0].classList.contains('focus-project-day-group')).toBe(true);
    expect(cards[1].classList.contains('focus-ungrouped-task')).toBe(true);
    expect(cards[1].querySelector('.focus-subtask-parent').textContent).toContain('Ski');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('shows the remaining child when a collapsed group shrinks to one', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Trip\n'
      + '  - [ ] Pack ! Nov 9 2026\n  - [ ] Ride ! Nov 9 2026\n');
    wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('.focus-project-day-toggle').trigger('click');
    expect(wrapper.get('.focus-project-day-children').element.style.display).toBe('none');
    data.columnStacks.SELECTED.sections[0].items[0].children[1].text = 'Ride ! Nov 10 2026';
    await wrapper.setProps({ todoData: { ...data } });
    expect(wrapper.find('.panel-now .focus-project-day-toggle').exists()).toBe(false);
    expect(wrapper.get('.panel-now .focus-row-title').text()).toBe('Pack');
    expect(wrapper.get('.panel-now .focus-project-day-children').element.style.display).not.toBe('none');
    expect(wrapper.get('.panel-now .focus-subtask-parent').text()).toContain('Trip');
    expect(wrapper.get('.panel-now .panel-count').text()).toBe('1');
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('puts project summaries first and updates their status mix without changing the real project', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Trip ! Nov 9 2026\n'
      + '  - [~] Pack ! Nov 9 2026\n  - [ ] Ride ! Nov 9 2026\n'
      + '# WIP\n* [~] Standalone ! Nov 9 2026\n');
    const parent = data.columnStacks.SELECTED.sections[0].items[0];
    wrapper = mount(FocusMode, { props: { todoData: data } });
    const section = wrapper.get('[data-now-section="main"]');
    expect(section.element.children[1].classList.contains('focus-project-day-group')).toBe(true);
    expect(section.findAll('.focus-project-day-group')).toHaveLength(1);
    const group = section.get('.focus-project-day-group');
    expect(group.get('.focus-project-day-progress').text()).toBe('0%');
    expect(group.get('.focus-project-day-status').classes()).toContain('inflight');
    expect(group.get('.focus-project-day-bar .active').element.style.width).toBe('50%');
    await group.findAll('.focus-row-check')[0].trigger('click');
    expect(group.get('.focus-project-day-progress').text()).toBe('50%');
    expect(group.get('.focus-project-day-status').classes()).toContain('inflight');
    await vi.advanceTimersByTimeAsync(1600);
    expect(section.findAll('.focus-project-day-group')).toHaveLength(1);
    expect(group.get('.focus-project-day-count').text()).toBe('2 tasks');
    expect(parent.statusChar).toBe(' ');
    expect(parent.children).toHaveLength(2);
    await group.findAll('.focus-row-check')[1].trigger('click');
    expect(group.get('.focus-project-day-status').classes()).toContain('checked');
    expect(group.get('.focus-project-day-progress').text()).toBe('100%');
    expect(group.get('.focus-project-day-bar .done').element.style.width).toBe('100%');
    expect(parent.statusChar).toBe(' ');
  });
});
