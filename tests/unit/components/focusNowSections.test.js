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
    expect(groups).toHaveLength(3);
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
    expect(wrapper.findAll('[data-now-section="blocked-waiting"] .focus-project-day-group')).toHaveLength(1);
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
