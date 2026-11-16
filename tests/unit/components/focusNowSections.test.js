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
    expect(titles('main')).toEqual(['Done', 'Active', 'Child']);
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
});
