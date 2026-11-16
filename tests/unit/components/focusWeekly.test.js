import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { deriveFocusModel } from '../../../src/utils/focusModeHelpers';

const source = '# WIP\n### Work\n'
  + '+ [ ] Weekly project ! Nov Week #2 2026\n'
  + '  - [ ] Weekly child ! Nov Week #2 2026\n'
  + '  - [!] Wednesday child ! Nov 11 2026\n'
  + '* [!] Late blocked ! Nov 9 2026\n'
  + '* [~] Today task ! Nov 10 2026\n'
  + '* [ ] Thursday task ! Nov 12 2026\n'
  + '* [x] Finished today | Nov 10 2026\n'
  + '* [x] Finished earlier | Nov 9 2026\n'
  + '* [ ] Month task ! Nov 2026\n'
  + '* [ ] Future task ! Nov 16 2026\n'
  + '* [ ] Undated task\n'
  + '# SELECTED\n### Ready\n* [~] Selected Friday ! Nov 13 2026\n'
  + '# BACKLOG\n### Ideas\n* [ ] Backlog dated ! Nov 10 2026\n';

describe('Focus weekly execution', () => {
  it('shows all seven day drop targets and reschedules a lone subtask without moving its parent', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [ ] Parent\n  - [ ] Child (Keep note) ! Nov Week #2 2026\n');
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
    expect(wrapper.get('.panel-upnext .panel-kicker').text()).toBe('THIS WEEK - UNSCHEDULED');
    expect(wrapper.get('.panel-in-progress-queued .panel-kicker').text()).toBe('THIS WEEK - SCHEDULED');
    expect(wrapper.findAll('[data-schedule-date]')).toHaveLength(7);
    const grip = wrapper.get('.panel-upnext .focus-drag-handle');
    expect(grip.attributes('disabled')).toBeUndefined();
    await grip.trigger('dragstart', { dataTransfer: { setData() {}, setDragImage() {} } });
    const friday = wrapper.get('[data-schedule-date="2026-11-13"]');
    await friday.trigger('dragover');
    expect(friday.classes()).toContain('is-schedule-target');
    await friday.trigger('drop');
    expect(renderTodoMdFile(data)).toContain('+ [ ] Parent\n  - [ ] Child (Keep note) ! Nov 13 2026');
    expect(wrapper.emitted('update')).toHaveLength(1);
    wrapper.unmount();
  });

  it('routes whole weeks left, today/overdue center and exact future days right without mutating source', () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const model = deriveFocusModel(data, new Date(2026, 10, 10), {});
    expect(model.upNext.map(entry => entry.task.text)).toEqual([
      'Weekly project ! Nov Week #2 2026', 'Weekly child ! Nov Week #2 2026'
    ]);
    expect(model.now.map(entry => entry.task.text)).toEqual([
      'Late blocked ! Nov 9 2026', 'Today task ! Nov 10 2026', 'Finished today | Nov 10 2026',
      'Backlog dated ! Nov 10 2026'
    ]);
    expect(model.inProgressQueued.map(entry => entry.task.text)).toEqual([
      'Wednesday child ! Nov 11 2026', 'Thursday task ! Nov 12 2026', 'Selected Friday ! Nov 13 2026'
    ]);
    expect(model.done).toEqual([]);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('tracks selected days and Sunday week boundaries, preserving future-preview suppression', () => {
    const data = parseTodoMdFile(source);
    const options = { hideOverdue: true };
    const nextDay = deriveFocusModel(data, new Date(2026, 10, 11), options);
    expect(nextDay.now.map(entry => entry.task.text)).toEqual(['Wednesday child ! Nov 11 2026']);
    const nextWeek = deriveFocusModel(data, new Date(2026, 10, 15), options);
    expect(nextWeek.upNext).toEqual([]);
    expect(nextWeek.now).toEqual([]);
    expect(nextWeek.inProgressQueued.map(entry => entry.task.text)).toEqual(['Future task ! Nov 16 2026']);
    const current = deriveFocusModel(data, new Date(2026, 10, 10));
    expect(current.now.some(entry => entry.task.text.startsWith('Late blocked'))).toBe(true);
    expect(current.upNext.some(entry => entry.task.text.startsWith('Weekly project'))).toBe(true);
  });

  it('distinguishes completed and cancelled calendar tasks and subtasks without edit controls or writes', async () => {
    const data = parseTodoMdFile('# WIP\n* [x] Finished | Nov 10 2026\n* [-] Cancelled | Nov 10 2026\n'
      + '* [ ] Still open ! Nov 10 2026\n+ [ ] Parent\n'
      + '  - [x] Finished child | Nov 10 2026\n  - [-] Cancelled child | Nov 10 2026\n');
    const before = renderTodoMdFile(data);
    const wrapper = mount(FocusMode, { props: { todoData: data, theme: 'light' } });
    try {
      await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
      const calendar = wrapper.get('.focus-week-strip-current');
      const done = calendar.findAll('.is-complete .focus-week-status');
      const cancelled = calendar.findAll('.is-cancelled .focus-week-status');
      expect(done).toHaveLength(2);
      expect(cancelled).toHaveLength(2);
      done.forEach(icon => { expect(icon.text()).toBe('✓'); expect(icon.attributes('aria-label')).toBe('Done'); });
      cancelled.forEach(icon => {
        expect(icon.text()).toBe('−'); expect(icon.attributes('aria-label')).toBe('Will not do');
      });
      const open = calendar.findAll('.focus-week-readonly-row').find(row => row.text().includes('Still open'));
      expect(open.find('.focus-week-status').exists()).toBe(false);
      expect(calendar.find('.focus-week-readonly-row button').exists()).toBe(false);
      await done[0].trigger('click');
      expect(wrapper.emitted('update')).toBeUndefined();
      expect(renderTodoMdFile(data)).toBe(before);
    } finally { wrapper.unmount(); }
  });

  it('omits old panels, retains editable cards and date navigation, and does not save navigation', async () => {
    const data = parseTodoMdFile(source);
    const wrapper = mount(FocusMode, { props: { todoData: data, theme: 'light' } });
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-11-10');
    expect(wrapper.find('.focus-queue-tabs, .focus-initiatives').exists()).toBe(false);
    expect(wrapper.findAll('.focus-week-strip-current .focus-week-day-column')).toHaveLength(7);
    expect(wrapper.get('.focus-week-strip-current').text()).toContain('Finished earlier');
    expect(wrapper.get('.focus-week-strip-current').text()).not.toContain('Weekly child');
    expect(wrapper.find('.focus-week-readonly-row button').exists()).toBe(false);
    await wrapper.get('[aria-label="Next week"]').trigger('click');
    expect(wrapper.get('.focus-week-strip-current').text()).toContain('Future task');
    expect(wrapper.get('.focus-week-strip-current').text()).not.toContain('Weekly project');
    expect(wrapper.get('.panel-upnext').text()).toContain('Weekly project');
    expect(wrapper.get('.panel-in-progress-queued').text()).toContain('Wednesday, Nov 11');
    expect(wrapper.get('.panel-now').text()).toContain('Today task');
    await wrapper.get('[aria-label="Preview next day"]').trigger('click');
    expect(wrapper.get('.panel-now').text()).toContain('Wednesday child');
    expect(wrapper.emitted('update')).toBeUndefined();
    await wrapper.get('.panel-upnext .focus-row-title').trigger('click');
    expect(wrapper.find('.focus-edit-name').exists()).toBe(true);
    wrapper.unmount();
  });
});
