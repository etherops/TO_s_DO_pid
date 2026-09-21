import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { deriveFocusModel } from '../../../src/utils/focusModeHelpers';

const source = '# WIP\n### Work\n* [ ] Future day ! Sep 26 2026\n'
  + '* [~] Future week ! Sep Week #4 2026\n* [~] Future month ! Oct 2026\n'
  + '* [x] Completed then | Sep 26 2026\n';

afterEach(() => vi.useRealTimers());

describe('Focus date navigation', () => {
  it('hides predicted overdue days and periods only when requested for future preview', () => {
    const data = parseTodoMdFile('# WIP\n### Work\n'
      + '* [ ] Old day ! Sep 1 2026\n* [~] Old week ! Sep Week #2 2026\n'
      + '* [ ] Old month ! Aug 2026\n* [~] Current month ! Sep 2026\n* [ ] Undated\n');
    const date = new Date(2026, 8, 26);
    expect(deriveFocusModel(data, date).now).toHaveLength(3);
    const preview = deriveFocusModel(data, date, { hideOverdue: true });
    expect(preview.now).toHaveLength(0);
    expect(preview.inProgressQueued).toHaveLength(1);
    expect(preview.upNext).toHaveLength(1);
  });

  it('routes day, week, month and completion dates against the selected date', () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const model = deriveFocusModel(data, new Date(2026, 8, 26));
    expect(model.now.map(e => e.task.text)).toEqual(expect.arrayContaining([
      expect.stringContaining('Future day'), expect.stringContaining('Completed then')
    ]));
    expect(model.inProgressQueued.some(e => e.task.text.includes('Future week'))).toBe(true);
    expect(model.upNext.some(e => e.task.text.includes('Future month'))).toBe(true);
    const october = deriveFocusModel(data, new Date(2026, 9, 3));
    expect(october.inProgressQueued.some(e => e.task.text.includes('Future month'))).toBe(true);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('navigates by day or date, disables mutation, and restores live mode', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 19, 12));
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(FocusMode, { props: { todoData: data } });
    await wrapper.get('[aria-label="Preview next day"]').trigger('click');
    expect(wrapper.get('.focus-date').text()).toContain('Sep 20th, 2026');
    await wrapper.get('[aria-label="Preview previous day"]').trigger('click');
    expect(wrapper.get('.focus-date').text()).toContain('Sep 19th');
    expect(wrapper.find('.focus-preview-label').exists()).toBe(false);
    await wrapper.get('[aria-label="Focus date"]').setValue('2026-09-26');
    expect(wrapper.get('.focus-date').text()).toContain('Sep 26th, 2026');
    expect(wrapper.get('.panel-now').text()).toContain('Future day');
    expect(wrapper.get('.panel-now').text()).toContain('Today');
    expect(wrapper.get('.focus-current-day-label').text()).toBe('Today!');
    expect(wrapper.get('.focus-week-range').text()).toContain('This week');
    expect(wrapper.text()).not.toContain('As of');
    expect(wrapper.get('.focus-preview-label').text()).toBe('Read-only');
    expect(wrapper.find('.focus-quick-add-btn').exists()).toBe(false);
    expect(wrapper.find('.focus-overdue-btn').exists()).toBe(false);
    for (const button of wrapper.findAll('.focus-task-row button')) {
      expect(button.attributes('disabled')).toBeDefined();
      await button.trigger('click');
    }
    await wrapper.get('.focus-task-row').trigger('contextmenu');
    expect(wrapper.find('.focus-task-context-menu').exists()).toBe(false);
    expect(wrapper.find('[draggable="true"]').exists()).toBe(false);
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(renderTodoMdFile(data)).toBe(before);
    await wrapper.get('[aria-label="Focus date"]').setValue('2027-01-03');
    expect(wrapper.get('.focus-date').text()).toContain('Jan 3rd, 2027');
    await wrapper.findAll('.focus-as-of button').find(b => b.text() === 'Back to today').trigger('click');
    expect(wrapper.find('.focus-preview-label').exists()).toBe(false);
    expect(wrapper.find('.focus-quick-add-btn').exists()).toBe(true);
    expect(wrapper.get('button.focus-row-check').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });
});
