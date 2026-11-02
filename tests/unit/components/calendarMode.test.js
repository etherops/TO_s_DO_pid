import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewMode from '../../../src/components/ReviewMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';

const source = `# SELECTED
### Ready
* [ ] Scheduled ! Nov 2 2026
* [~] Started ! Nov 2 2026
* [!] Blocked ! Nov 2 2026
* [ ] Weekly ! Nov Week #1 2026
* [ ] Monthly ! Nov 2026
* [ ] Undated
* [ ] December work ! Dec 3 2026
# ARCHIVE
### History
* [x] Finished ! Oct 20 2026 | Nov 2 2026
* [-] Dropped | Nov 2 2026
`;

describe('Calendar day task lists', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 2, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('lists open then terminal tasks on their authoritative day with accessible status markers', () => {
    const wrapper = mount(ReviewMode, { props: { todoData: parseTodoMdFile(source) } });
    const day = wrapper.get('[data-date="2026-11-02"]');
    expect(day.findAll('.calendar-task-title').map(row => row.text()))
      .toEqual(['Scheduled', 'Started', 'Blocked', 'Finished', 'Dropped']);
    expect(day.findAll('.calendar-task-status').map(icon => icon.attributes('aria-label')))
      .toEqual(['Not started', 'In progress', 'Blocked', 'Done', 'Will not do']);
    expect(day.get('.calendar-day-tasks').attributes('tabindex')).toBe('0');
    expect(day.get('.review-day-total').text()).toBe('5');
    expect(wrapper.findAll('.calendar-day-task').some(row => /Weekly|Monthly|Undated/.test(row.text())))
      .toBe(false);
    expect(wrapper.get('[data-date="2026-11-03"]').find('.calendar-day-tasks').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps day selection and month navigation read-only', async () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    const selectDay = wrapper.get('[data-date="2026-11-02"] .review-day-summary');
    await selectDay.trigger('click');
    expect(selectDay.attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('.review-day-detail').text()).toContain('Scheduled');
    await wrapper.get('[title="Next month"]').trigger('click');
    expect(wrapper.get('[data-date="2026-12-03"] .calendar-task-title').text()).toBe('December work');
    expect(wrapper.find('.review-day.is-selected').exists()).toBe(false);
    await wrapper.get('.review-this-month-btn').trigger('click');
    expect(wrapper.get('.review-step-value.month').text()).toBe('November');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted()).not.toHaveProperty('update:todoData');
    wrapper.unmount();
  });

  it('retains every task in a busy day rather than slicing to a preview', () => {
    const tasks = Array.from({ length: 30 }, (_, i) => `* [ ] Task ${i + 1} ! Nov 2 2026`);
    const data = parseTodoMdFile(`# WIP\n### Work\n${tasks.join('\n')}\n`);
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    expect(wrapper.get('[data-date="2026-11-02"]').findAll('.calendar-day-task')).toHaveLength(30);
    wrapper.unmount();
  });
});
