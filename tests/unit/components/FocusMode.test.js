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
