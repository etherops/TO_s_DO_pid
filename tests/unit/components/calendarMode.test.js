import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewMode from '../../../src/components/ReviewMode.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { derivePlanningModel } from '../../../src/utils/planningHelpers';

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

  it('keeps a low-priority month-dated WIP task visible in Calendar and the Plan month schedule', () => {
    const content = '# WIP\n- [ ] DATA: whitepages opt-out ! Nov 2026\n';
    const data = parseTodoMdFile(content);
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    expect(wrapper.get('.calendar-month-tasks').text()).toContain('DATA: whitepages opt-out');
    const month = derivePlanningModel(data, new Date(2026, 10, 22)).schedule.find(group => group.id === 'month');
    expect(month.entries).toHaveLength(1);
    expect(month.entries[0].task.isLowPriority).toBe(true);
    expect(renderTodoMdFile(data)).toContain('- [ ] DATA: whitepages opt-out ! Nov 2026');
    wrapper.unmount();
  });

  it('lists open then terminal tasks on their authoritative day with accessible status markers', () => {
    const wrapper = mount(ReviewMode, { props: { todoData: parseTodoMdFile(source) } });
    const day = wrapper.get('[data-date="2026-11-02"]');
    expect(day.findAll('.calendar-task-title').map(row => row.text()))
      .toEqual(['Scheduled', 'Started', 'Blocked', 'Finished', 'Dropped']);
    expect(day.findAll('.calendar-task-status').map(icon => icon.attributes('aria-label')))
      .toEqual(['Not started', 'In progress', 'Blocked', 'Done', 'Will not do']);
    expect(day.get('.calendar-day-tasks').attributes('tabindex')).toBe('0');
    expect(day.get('.review-day-total').text()).toBe('5');
    expect(wrapper.findAll('.review-day .calendar-day-task').some(row => /Weekly|Monthly|Undated/.test(row.text())))
      .toBe(false);
    expect(wrapper.get('[data-date="2026-11-03"]').find('.calendar-day-tasks').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps day selection and month navigation read-only', async () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    const selectDay = wrapper.get('[data-date="2026-11-02"] .review-day-meter');
    await selectDay.trigger('click');
    expect(selectDay.attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('.review-day-detail').text()).toContain('Finished');
    expect(wrapper.get('.review-day-detail').text()).not.toContain('Scheduled');
    expect(wrapper.get('.review-day-detail').text()).not.toContain('Dropped');
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

  it('opens Focus only from the day heading, without editing the file', async () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    const day = wrapper.get('[data-date="2026-11-02"]');
    await day.trigger('click');
    await day.get('.calendar-day-task').trigger('click');
    expect(wrapper.emitted('open-focus')).toBeUndefined();
    await day.get('.review-day-summary').trigger('click');
    expect(wrapper.emitted('open-focus')).toEqual([['2026-11-02']]);
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });

  it('groups only matching month subtasks under collapsible project headers and preserves date moves', async () => {
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Project ! Dec 2026\n'
      + '  - [ ] Pending child ! Nov 2026\n  - [~] Started child (note) ! Nov 2026\n'
      + '  - [ ] Weekly sibling ! Nov Week #1 2026\n* [~] Standalone ! Nov 2026\n');
    const before = renderTodoMdFile(data);
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    const list = wrapper.get('.calendar-month-tasks');
    expect(list.findAll('.review-card-head').map(header => header.text())).toEqual(['Tasks3']);
    expect(wrapper.get('.calendar-month-summary .calendar-month-heading').text()).toBe('November 2026');
    expect(wrapper.get('.calendar-month-summary').findAll('.review-stat')).toHaveLength(5);
    expect(wrapper.get('.calendar-month-summary').text()).not.toContain('Best day');
    expect(wrapper.get('.calendar-selection-pane').find('.calendar-month-heading').exists()).toBe(false);
    expect(list.get('.calendar-project-group-count').text()).toBe('2');
    const toggle = list.get('.calendar-project-group-toggle');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(list.find('.calendar-project-group-children').exists()).toBe(false);
    await toggle.trigger('click');
    expect(list.findAll('.calendar-task-title').map(row => row.text()))
      .toEqual(['Started child', 'Pending child', 'Standalone']);
    expect(list.text()).not.toContain('Weekly sibling');
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(list.find('.calendar-project-group-children').exists()).toBe(false);
    expect(renderTodoMdFile(data)).toBe(before);
    await toggle.trigger('click');
    await list.get('.calendar-project-group .calendar-day-task').trigger('keydown', { key: ' ', code: 'Space' });
    await wrapper.get('[data-date="2026-11-05"] .review-day-summary').trigger('click');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(renderTodoMdFile(data)).toBe(before.replace('Started child (note) ! Nov 2026',
      'Started child (note) ! Nov 5 2026'));
    expect(list.get('.calendar-project-group-count').text()).toBe('1');
    wrapper.unmount();
  });

  it('keeps the completed drawer inert until opened and orders completion dates ascending', async () => {
    const data = parseTodoMdFile(source + '* [x] Later | Nov 20 2026\n* [x] First | Nov 1 2026\n');
    const wrapper = mount(ReviewMode, { props: { todoData: data } });
    const grip = wrapper.get('.calendar-completed-toggle');
    expect(grip.attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('.calendar-completed-content').attributes()).toHaveProperty('inert');
    await grip.trigger('click');
    expect(wrapper.get('.calendar-completed-content').attributes()).not.toHaveProperty('inert');
    expect(wrapper.findAll('.review-day-detail .review-entry-text').map(row => row.text()))
      .toEqual(['First', 'Finished', 'Later']);
    await wrapper.get('.calendar-drawer-close').trigger('keydown', { key: 'Escape' });
    expect(grip.attributes('aria-expanded')).toBe('false');
    expect(wrapper.emitted('update')).toBeUndefined();
    wrapper.unmount();
  });

  it('cancels a keyboard move from a focused day list and ignores Escape while idle', async () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(ReviewMode, { props: { todoData: data }, attachTo: document.body });
    const dayButton = wrapper.get('[data-date="2026-11-02"] .review-day-summary').element;
    dayButton.focus();
    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.get('[role="status"]').text()).toBe('');
    expect(document.activeElement).toBe(dayButton);
    await wrapper.get('[data-date="2026-11-02"] .calendar-day-task').trigger('click');
    expect(wrapper.get('.calendar-completed-toggle').attributes('aria-expanded')).toBe('false');
    await wrapper.get('[data-date="2026-11-02"] .calendar-day-task')
      .trigger('keydown', { key: ' ', code: 'Space' });
    expect(wrapper.get('[role="status"]').text()).toContain('Move Scheduled');
    await wrapper.get('[data-date="2026-11-02"] .calendar-day-tasks').trigger('keydown', { key: 'Escape' });
    expect(wrapper.get('[role="status"]').text()).toBe('Move cancelled.');
    await wrapper.get('[data-date="2026-11-03"] .review-day-summary').trigger('click');
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });
});
