import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FocusMode from '../../../src/components/FocusMode.vue';
import { parseTodoMdFile } from '../../../src/utils/TodoMdParser';
import { serializeDuePeriodValue, startOfSundayWeek } from '../../../src/utils/dateHelpers';

const dateInputValue = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

const weekDue = `! ${serializeDuePeriodValue(`week:${dateInputValue(startOfSundayWeek(new Date()))}`)}`;
const todayDue = `! ${serializeDuePeriodValue(dateInputValue(new Date()))}`;

const mountWeeklyTasks = (tasks) => mount(FocusMode, {
  props: { todoData: parseTodoMdFile(`# SELECTED\n### Weekly plans\n${tasks.join('\n')}\n`), theme: 'light' }
});

describe('FocusMode NOW weekly priority groups', () => {
  it('puts low-priority whole-week tasks after normal weekly tasks, before Today', () => {
    const wrapper = mountWeeklyTasks([
      `* [ ] Normal weekly task ${weekDue}`,
      `- [ ] Low weekly task one ${weekDue}`,
      `- [ ] Low weekly task two ${weekDue}`,
      `* [ ] Today task ${todayDue}`
    ]);

    expect(wrapper.findAll('.panel-now .focus-day-header').map(header => header.text())).toEqual([
      'This week3', 'Low Priority2', 'Today1'
    ]);
    expect(wrapper.find('.panel-now .day-this-week-low-priority').exists()).toBe(true);
    expect(wrapper.findAll('.panel-now .focus-task-row').map(row => row.find('.focus-row-title').text())).toEqual([
      'Normal weekly task', 'Low weekly task one', 'Low weekly task two', 'Today task'
    ]);
    expect(wrapper.findAll('.panel-now .focus-task-row.low-priority-row')).toHaveLength(2);
    wrapper.unmount();
  });

  it('keeps the This Week header when every weekly task is low priority', () => {
    const wrapper = mountWeeklyTasks([
      `- [ ] Low weekly task ${weekDue}`,
      `* [ ] Today task ${todayDue}`
    ]);

    expect(wrapper.findAll('.panel-now .focus-day-header').map(header => header.text())).toEqual([
      'This week1', 'Low Priority1', 'Today1'
    ]);
    expect(wrapper.findAll('.panel-now .focus-task-row').map(row => row.find('.focus-row-title').text())).toEqual([
      'Low weekly task', 'Today task'
    ]);
    wrapper.unmount();
  });
});

describe('FocusMode overdue rollover', () => {
  it('moves all overdue unfinished Focus tasks to today in one update', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const previousWeek = startOfSundayWeek(today);
    previousWeek.setDate(previousWeek.getDate() - 7);
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const yesterdayDue = `! ${serializeDuePeriodValue(dateInputValue(yesterday))}`;
    const todoData = parseTodoMdFile(`# TODO
## Later
* [ ] Other-column overdue ${yesterdayDue}
# SELECTED
## Ready
* [ ] Old day (keep this note) ${yesterdayDue}
* [ ] Due today ${todayDue}
* [ ] Current week ${weekDue}
* [x] Already completed | ${serializeDuePeriodValue(dateInputValue(yesterday))}
# WIP
## Active
- [~] Old week ! ${serializeDuePeriodValue(`week:${dateInputValue(previousWeek)}`)}
* [ ] Old month ! ${serializeDuePeriodValue(`month:${dateInputValue(previousMonth).slice(0, 7)}`)}
`);
    const wrapper = mount(FocusMode, { props: { todoData, theme: 'light' } });
    const findTask = (name) => todoData.columnOrder
      .flatMap(columnName => todoData.columnStacks[columnName].sections)
      .flatMap(section => section.items)
      .find(task => task.text?.startsWith(name));

    expect(wrapper.get('.focus-overdue-btn').text()).toContain('3');
    await wrapper.get('.focus-overdue-btn').trigger('click');

    expect(findTask('Old day').text).toBe(`Old day (keep this note) ${todayDue}`);
    expect(findTask('Old week').text).toBe(`Old week ${todayDue}`);
    expect(findTask('Old month').text).toBe(`Old month ${todayDue}`);
    expect(findTask('Old week').listMarker).toBe('-');
    expect(findTask('Other-column overdue').text).toBe(`Other-column overdue ${yesterdayDue}`);
    expect(findTask('Due today').text).toBe(`Due today ${todayDue}`);
    expect(findTask('Current week').text).toBe(`Current week ${weekDue}`);
    expect(findTask('Already completed').text).toContain(' | ');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(wrapper.find('.focus-overdue-btn').exists()).toBe(false);
    wrapper.unmount();
  });

  it('hides the action when no unfinished Focus task is overdue', () => {
    const wrapper = mountWeeklyTasks([
      `* [ ] Due today ${todayDue}`,
      `* [ ] Current week ${weekDue}`
    ]);

    expect(wrapper.find('.focus-overdue-btn').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe('FocusMode task column chooser', () => {
  it('follows the board stack order, then file order within each stack', async () => {
    const todoData = parseTodoMdFile(`# TODO
## Main
* [ ] Todo task
# PROJECTS
## Main
* [ ] Project task
# SELECTED
## Ready
* [ ] Move me ${todayDue}
# WIP
## Active
* [~] Work task
# BACKLOG
## Later
* [ ] Backlog task
# ARCHIVE
## Done
* [x] Archived task
# ICE
## Frozen
* [ ] Frozen task
`);
    const wrapper = mount(FocusMode, { props: { todoData, theme: 'light' } });

    await wrapper.get('.panel-now .focus-task-row').trigger('contextmenu', { clientX: 100, clientY: 100 });
    const menu = document.body.querySelector('.focus-task-context-menu');
    expect(menu).not.toBeNull();
    menu.querySelector('.focus-task-context-column').click();
    await wrapper.vm.$nextTick();

    const choices = [...document.body.querySelectorAll('.focus-task-context-column-choice')]
      .map(choice => choice.firstElementChild.textContent);
    expect(choices).toEqual(['TODO', 'BACKLOG', 'ICE', 'PROJECTS', 'SELECTED', 'WIP', 'ARCHIVE']);
    wrapper.unmount();
  });
});
