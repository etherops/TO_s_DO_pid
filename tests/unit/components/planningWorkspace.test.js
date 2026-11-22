import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import PlanningWorkspace from '../../../src/components/PlanningWorkspace.vue';
import TaskCard from '../../../src/components/TaskCard.vue';
import KanbanSection from '../../../src/components/KanbanSection.vue';
import PlanningArchiveWeeks from '../../../src/components/PlanningArchiveWeeks.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser';
import { derivePlanningModel, groupPlanningEntriesByDuePeriod,
  schedulePlanningEntry, reconcilePlanningDate } from '../../../src/utils/planningHelpers';

const today = new Date(2026, 10, 2);
const source = '# TODO\n### Inbox\n* [ ] Inbox task (note)\nA raw line\n'
  + '# PROJECTS\n### Ideas\n+ [ ] Project\n  - [ ] Child ! Nov 3 2026\n  * [~] Unsupported child\n'
  + '# SELECTED\n### Next\n* [ ] Selected task ! Nov Week #1 2026\n* [ ] Paper selection\n'
  + '# WIP\n### Work\n+ [~] Parent (preserve note) ! Nov 2026\n'
  + '  - [ ] Child ! Nov 1 2026\n  * [~] Unsupported child ! Nov 1 2026\n'
  + '* [x] Finished | Oct 31 2026\n'
  + '# ICE\n### Frozen\n* [ ] Frozen task ! Nov 1 2026\n'
  + '# ARCHIVE\n### Old\n* [ ] Archived task ! Nov 1 2026\n';
const mountPlan = (data, realRows = false) => mount(PlanningWorkspace, { props: { todoData: data },
  slots: { column: ({ column }) => h('div', { class: 'source-column' },
    column.sections.map(section => h('section', [
      h('h3', section.name), ...(section.items || []).map(task => h('p', task.text))
    ]))) },
  global: { stubs: { Teleport: true, PlanningTaskRow: !realRows } } });
const allEntries = model => [...model.backlog.flatMap(c => c.sections.flatMap(s => s.entries)),
  ...model.schedule.flatMap(g => g.entries), ...model.needsDate];

describe('Date-oriented Plan', () => {
  it('holds archive previews and disables archiving a task while its status is settling', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# WIP\n### Work\n* [x] Old completion | Oct 31 2026\n');
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data },
      slots: { 'archive-weeks': () => h(PlanningArchiveWeeks, {
        todoData: data, sections: data.columnStacks.WIP.sections
      }) }, global: { stubs: { Teleport: true } } });
    try {
      expect(wrapper.get('.planning-archive-week').text()).toContain('Old completion');
      await wrapper.get('[data-completion-day="2026-10-31"] .custom-checkbox').trigger('click');
      expect(wrapper.get('.planning-archive-week .archive-week-action').element.disabled).toBe(true);
      await vi.advanceTimersByTimeAsync(1499);
      expect(wrapper.get('.planning-archive-week').text()).toContain('Old completion');
      await vi.advanceTimersByTimeAsync(1);
      expect(wrapper.find('.planning-archive-week').exists()).toBe(false);
      expect(wrapper.get('[data-schedule-group="overdue"]').text()).toContain('Old completion');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('holds completed-day membership through rapid reopening and restarts the pause after every click', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# WIP\n### Work\n* [x] Finished | Nov 1 2026\n');
    const wrapper = mountPlan(data, true);
    try {
      const group = '[data-completion-day="2026-11-01"]';
      await wrapper.get(`${group} .custom-checkbox`).trigger('click');
      expect(wrapper.get(`${group} .custom-checkbox`).classes()).toContain('in-progress');
      expect(wrapper.find('[data-completion-day="undated"]').exists()).toBe(false);
      expect(renderTodoMdFile(data)).toContain('* [~] Finished ! Nov 1 2026');
      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.get(`${group} .custom-checkbox`).trigger('click');
      await vi.advanceTimersByTimeAsync(1499);
      expect(wrapper.get(`${group} .custom-checkbox`).classes()).toContain('status-blocked');
      await vi.advanceTimersByTimeAsync(1);
      expect(wrapper.find(group).exists()).toBe(false);
      expect(wrapper.get('[data-schedule-group="overdue"]').text()).toContain('Finished');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('shares a single cycle between Projects and scheduled copies and retains children until it settles', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# SELECTED\n### Work\n+ [~] Parent ! Nov 2 2026\n'
      + '  - [ ] Child ! Nov 3 2026\n');
    const wrapper = mountPlan(data, true);
    try {
      await wrapper.get('[data-planning-lane="PROJECTS"] .custom-checkbox').trigger('click');
      expect(wrapper.get('.planning-scheduled-projects .custom-checkbox').classes()).toContain('checked');
      expect(wrapper.find('[data-schedule-day="2026-11-03"]').exists()).toBe(true);
      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.get('.planning-scheduled-projects .custom-checkbox').trigger('click');
      expect(data.columnStacks.SELECTED.sections[0].items[0].statusChar).toBe('!');
      await vi.advanceTimersByTimeAsync(1000);
      expect(wrapper.get('[data-planning-lane="PROJECTS"] .custom-checkbox').classes())
        .toContain('pending-completion');
      await vi.advanceTimersByTimeAsync(500);
      expect(wrapper.get('[data-planning-lane="PROJECTS"] .custom-checkbox').classes())
        .not.toContain('pending-completion');
      expect(wrapper.find('.planning-completed').exists()).toBe(false);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('holds source-column collapse membership and sorting until status settles', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    const data = parseTodoMdFile('# SELECTED\n### Next\n* [ ] First\n* [ ] Second\n');
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data },
      slots: { column: ({ column }) => h(KanbanSection, {
        section: column.sections[0], column: column.key, columnType: column.name
      }) }, global: { stubs: { Teleport: true } } });
    try {
      await wrapper.get('.caret-toggle-btn').trigger('click');
      const cards = wrapper.findAll('.planning-selected .custom-checkbox');
      await cards[1].trigger('click');
      expect(wrapper.find('.collapsed-completed').exists()).toBe(false);
      await vi.advanceTimersByTimeAsync(1499);
      expect(wrapper.find('.collapsed-completed').exists()).toBe(false);
      expect(data.columnStacks.SELECTED.sections[0].items[0].text).toBe('First');
      await vi.advanceTimersByTimeAsync(1);
      expect(wrapper.find('.collapsed-completed').exists()).toBe(true);
      expect(data.columnStacks.SELECTED.sections[0].items[0].text).toBe('Second | Nov 2 2026');
      await cards[0].trigger('click');
      await cards[0].trigger('click');
      await vi.advanceTimersByTimeAsync(1500);
      expect(data.columnStacks.SELECTED.sections[0].items.map(task => task.statusChar)).toEqual(['x', '~']);
    } finally { wrapper.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); }
  });

  it('persists the final lifecycle date when leaving Plan and cancels timers on file changes', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Task ! Nov 2 2026\n');
    const wrapper = mountPlan(data, true);
    try {
      await wrapper.get('.custom-checkbox').trigger('click');
      expect(renderTodoMdFile(data)).toContain('* [x] Task | Nov 2 2026');
      const updates = wrapper.emitted('update').length;
      await wrapper.setProps({ todoData: parseTodoMdFile('# TODO\n* [ ] Other file\n') });
      await vi.advanceTimersByTimeAsync(2000);
      expect(wrapper.emitted('update')).toHaveLength(updates);
      expect(wrapper.text()).not.toContain('Task');
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('places week-only work before the upcoming days and drops into exact dates without bubbling to the week', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# WIP\n### Work\n* [~] Today ! Nov 2 2026\n'
      + '* [ ] Tuesday ! Nov 3 2026\n* [ ] Weekly ! Nov Week #1 2026\n'
      + '+ [~] Parent (note) ! Nov 2026\n  - [ ] Child (hidden note) ! Nov 4 2026\n'
      + '  * [~] Unsupported child stays\n');
    const parent = data.columnStacks.WIP.sections[0].items.at(-1);
    const originalParentText = parent.text;
    const child = parent.children[0];
    const wrapper = mountPlan(data, true);
    const transfer = { effectAllowed: '', setData: vi.fn() };
    const row = title => wrapper.findAll('.planning-scheduled .planning-task-row')
      .find(candidate => candidate.text().includes(title));
    try {
      expect(wrapper.findAll('[data-schedule-group="week"] [data-schedule-day]')
        .map(group => group.attributes('data-schedule-day')))
        .toEqual(['week:2026-11-01', '2026-11-03', '2026-11-04']);
      await row('Today').get('.planning-task-grip').trigger('dragstart', { dataTransfer: transfer });
      await wrapper.get('[data-schedule-day="2026-11-03"] h4').trigger('drop');
      expect(wrapper.emitted('update')).toHaveLength(1);
      expect(renderTodoMdFile(data)).toContain('* [~] Today ! Nov 3 2026');
      await row('Child').get('.planning-task-grip').trigger('dragstart', { dataTransfer: transfer });
      await wrapper.get('[data-schedule-day="2026-11-03"] h4').trigger('drop');
      expect(child.text).toBe('Child (hidden note) ! Nov 3 2026');
      expect(parent.text).toBe(originalParentText);
      expect(parent.children[0]).toBe(child);
      expect(renderTodoMdFile(data)).toContain('  * [~] Unsupported child stays');
      await row('Child').get('.planning-task-grip').trigger('dragstart', { dataTransfer: transfer });
      await wrapper.get('[data-schedule-day="week:2026-11-01"] h4').trigger('drop');
      expect(child.text).toBe('Child (hidden note) ! Nov Week #1 2026');
      await row('Child').get('.planning-task-grip').trigger('dragstart', { dataTransfer: transfer });
      await wrapper.get('[data-planning-lane="WIP-MONTH"] > .planning-lane-header').trigger('drop');
      expect(child.text).toBe('Child (hidden note) ! Nov 2026');
      await row('Child').get('.planning-task-grip').trigger('dragstart', { dataTransfer: transfer });
      await wrapper.get('[data-schedule-group="today"] h3').trigger('drop');
      expect(child.text).toBe('Child (hidden note) ! Nov 2 2026');
      expect(wrapper.emitted('update')).toHaveLength(5);
      await row('Child').get('.planning-task-grip').trigger('dragstart', { dataTransfer: transfer });
      await wrapper.get('[data-schedule-group="overdue"]').trigger('drop');
      expect(wrapper.emitted('update')).toHaveLength(5);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('saves quick date choices immediately, but not tab switches, Escape or opening the picker', async () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Today (note) ! Nov 2 2026\n');
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data, true);
    try {
      await wrapper.get('.planning-scheduled .clock-btn').trigger('click');
      const picker = wrapper.get('.planning-date-popover');
      expect(picker.find('.planning-confirm').exists()).toBe(false);
      await picker.findAll('.custom-date button').find(button => button.text() === 'week').trigger('click');
      expect(renderTodoMdFile(data)).toBe(before);
      await picker.trigger('keydown', { key: 'Escape' });
      expect(wrapper.find('.planning-date-popover').exists()).toBe(false);
      expect(wrapper.emitted('update')).toBeUndefined();
      await wrapper.get('.planning-scheduled .clock-btn').trigger('click');
      await wrapper.get('[aria-label="Task due day"]').setValue('2026-11-05');
      expect(renderTodoMdFile(data)).toContain('* [ ] Today (note) ! Nov 5 2026');
      expect(wrapper.find('.planning-date-popover').exists()).toBe(false);
      expect(wrapper.emitted('update')).toHaveLength(1);
      await wrapper.get('.planning-scheduled .clock-btn').trigger('click');
      await wrapper.findAll('.planning-date-popover .shortcuts button')
        .find(button => button.text() === 'This week').trigger('click');
      expect(renderTodoMdFile(data)).toContain('* [ ] Today (note) ! Nov Week #1 2026');
      expect(wrapper.emitted('update')).toHaveLength(2);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });

  it('keeps completed and cancelled work expanded by completion day, newest first and undated last', () => {
    const data = parseTodoMdFile('# WIP\n### Work\n* [x] Older | Nov 1 2026\n'
      + '* [-] Cancelled | Nov 2 2026\n* [x] Finished | Nov 2 2026\n* [x] No date\n'
      + '* [x] Last year | Nov 2 2025\n');
    const before = renderTodoMdFile(data), wrapper = mountPlan(data, true);
    try {
      expect(wrapper.get('.planning-completed').element.tagName).toBe('SECTION');
      expect(wrapper.findAll('[data-completion-day]').map(group => group.attributes('data-completion-day')))
        .toEqual(['2026-11-02', '2026-11-01', '2025-11-02', 'undated']);
      const latest = wrapper.get('[data-completion-day="2026-11-02"]');
      expect(latest.get('h4').text()).toBe('Monday, Nov 2, 2026');
      expect(latest.findAll('.planning-task-row')).toHaveLength(2);
      expect(latest.findAll('.planning-task-grip')).toHaveLength(0);
      expect(wrapper.get('[data-completion-day="undated"] h4').text()).toBe('No completion date');
      expect(renderTodoMdFile(data)).toBe(before);
    } finally { wrapper.unmount(); }
  });

  it('groups later tasks and subtasks by exact due period without merging precision or years', () => {
    const data = parseTodoMdFile('# WIP\n### Work\n+ [~] Parent ! Nov 2026\n'
      + '  - [ ] Child ! Nov Week #2 2026\n* [ ] Same week ! Nov Week #2 2026\n'
      + '* [ ] Day ! Nov 13 2026\n* [ ] Week end ! Nov 14 2026\n'
      + '* [ ] December day ! Dec 6 2026\n* [ ] December month ! Dec 2026\n'
      + '* [ ] Next year ! Nov 2027\n');
    const before = renderTodoMdFile(data);
    const entries = derivePlanningModel(data, today).schedule.flatMap(group => group.entries);
    const groups = groupPlanningEntriesByDuePeriod(entries);
    expect(groups.map(group => group.value)).toEqual(['2026-11-13', '2026-11-14', 'week:2026-11-08',
      'month:2026-11', '2026-12-06', 'month:2026-12', 'month:2027-11']);
    expect(groups.map(group => group.label)).toEqual(['Nov 13, 2026', 'Nov 14, 2026', 'Nov Week #2 2026',
      'November 2026', 'Dec 6, 2026', 'December 2026', 'November 2027']);
    expect(groups[2].entries.map(entry => entry.title)).toEqual(['Child', 'Same week']);
    expect(groups[2].entries[0].parent).toBe(data.columnStacks.WIP.sections[0].items[0]);
    expect(groups.flatMap(group => group.entries)).toHaveLength(entries.length);
    expect(groupPlanningEntriesByDuePeriod([])).toEqual([]);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('expands projects individually or together without changing Markdown, and resets for another file', async () => {
    const data = parseTodoMdFile((source + '# SELECTED EXTRA\n+ [ ] Second selection\n').replace('  - [ ] Child ! Nov 3 2026',
      '  - [ ] Child ! Nov 3 2026\n  - [x] Finished child | Nov 1 2026\n  - [~] Undated child'));
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data, true);
    const lane = wrapper.get('[data-planning-lane="PROJECTS"]');
    expect(lane.findAll('.planning-project-children')).toHaveLength(0);
    expect(lane.findAll('.planning-project-caret')).toHaveLength(0);
    await lane.findAll('.task-title')[0].trigger('click');
    const children = lane.get('.planning-project-children').findAllComponents({ name: 'PlanningTaskRow' });
    expect(children.map(row => row.props('entry').title)).toEqual(['Child', 'Finished child', 'Undated child']);
    expect(children[1].props('entry').dateLabel).toBeTruthy();
    expect(lane.get('.planning-projects-toggle').text()).toBe('Expand all');
    await lane.get('.planning-projects-toggle').trigger('click');
    expect(lane.findAll('.planning-project-children')).toHaveLength(2);
    expect(lane.get('.planning-projects-toggle').text()).toBe('Collapse all');
    await lane.get('.planning-projects-toggle').trigger('click');
    expect(lane.findAll('.planning-project-children')).toHaveLength(0);
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
    await lane.get('.planning-projects-toggle').trigger('click');
    await wrapper.setProps({ todoData: parseTodoMdFile(source) });
    expect(lane.findAll('.planning-project-children')).toHaveLength(0);
    wrapper.unmount();
  });

  it('indexes all live projects across source columns without moving or cloning their tasks', () => {
    const data = parseTodoMdFile(source + '# BACKLOG\n### Later\n+ [ ] Backlog project\n'
      + '# SELECTED OTHER\n### Future\n+ [~] Selected project\n'
      + '# PROJECTS OTHER\n### Legacy\n* [ ] Legacy project task\n');
    const before = renderTodoMdFile(data);
    const model = derivePlanningModel(data, today);
    expect(model.projects.map(entry => entry.title)).toEqual([
      'Project', 'Parent', 'Backlog project', 'Selected project'
    ]);
    expect(model.projects.every(entry => entry.section.items.includes(entry.task))).toBe(true);
    expect(new Set(model.projects.map(entry => entry.task.id)).size).toBe(model.projects.length);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('shows only SELECTED-category projects in the selected pane without changing schedule projections', async () => {
    const data = parseTodoMdFile('# TODO\n+ [ ] Backlog project ! Nov 3 2026\n'
      + '  - [ ] Backlog child ! Nov 3 2026\n# SELECTED\n+ [ ] Chosen\n  - [ ] Chosen child\n'
      + '# HOLD\n+ [x] Completed selection | Nov 1 2026\n'
      + '# PROJECTS\n+ [ ] Legacy selection\n# WIP\n+ [ ] WIP project ! Nov 3 2026\n'
      + '# ICE\n+ [ ] Frozen backlog\n# ARCHIVE\n+ [ ] Archived project\n');
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data, true);
    try {
      const pane = wrapper.get('.projects-stack');
      expect(pane.findAll('.task-title').map(title => title.text()))
        .toEqual(['Chosen', 'Completed selection', 'Legacy selection']);
      expect(pane.get('.planning-lane-header h2 span').text()).toBe('3');
      await pane.get('.planning-projects-toggle').trigger('click');
      expect(pane.findAll('.planning-project-children')).toHaveLength(3);
      expect(pane.text()).not.toContain('Backlog child');
      const scheduled = derivePlanningModel(data, today).schedule.flatMap(group => group.entries);
      expect(scheduled.map(entry => entry.title)).toEqual(['Backlog project', 'Backlog child', 'WIP project']);
      expect(renderTodoMdFile(data)).toBe(before);
      expect(wrapper.emitted('update')).toBeUndefined();
      await wrapper.setProps({ todoData: parseTodoMdFile('# TODO\n+ [ ] Only backlog project\n') });
      expect(pane.findAll('.planning-project')).toHaveLength(0);
      expect(pane.get('.planning-lane-header h2 span').text()).toBe('0');
      expect(pane.find('.planning-projects-toggle').exists()).toBe(false);
      expect(pane.text()).toContain('No projects yet.');
    } finally { wrapper.unmount(); }
  });

  it('splits current week, rest of month and after while leaving source data unchanged', () => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Week ! Nov Week #1 2026\n'
      + '* [ ] Month ! Nov 2026\n* [ ] Future ! Dec 2026\n* [ ] Undated\n');
    const wrapper = mountPlan(data);
    const before = renderTodoMdFile(data);
    try {
      const titles = lane => wrapper.get(`[data-planning-lane="${lane}"]`)
        .findAllComponents({ name: 'PlanningTaskRow' }).map(row => row.props('entry').title);
      expect(titles('WIP')).toEqual(['Week', 'Undated']);
      expect(titles('WIP-MONTH')).toEqual(['Month']);
      expect(titles('WIP-AFTER')).toEqual(['Future']);
      expect(wrapper.get('.planning-scheduled-count').text()).toBe('4');
      expect(renderTodoMdFile(data)).toBe(before);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('keeps a cross-month current week together and separates month-only deadlines', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 30));
    const data = parseTodoMdFile('# WIP\n* [ ] Due today ! Nov 30 2026\n'
      + '* [ ] This week in December ! Dec 2 2026\n* [ ] Whole November ! Nov 2026\n'
      + '* [ ] Whole December ! Dec 2026\n* [ ] Later December ! Dec 8 2026\n');
    const wrapper = mountPlan(data);
    try {
      const titles = lane => wrapper.get(`[data-planning-lane="${lane}"]`)
        .findAllComponents({ name: 'PlanningTaskRow' }).map(row => row.props('entry').title);
      expect(titles('WIP')).toEqual(['Due today', 'This week in December']);
      expect(titles('WIP-MONTH')).toEqual(['Whole November']);
      expect(titles('WIP-AFTER')).toEqual(['Later December', 'Whole December']);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it.each([
    ['Nov 2 2026', 'WIP'], ['Nov 2026', 'WIP-MONTH'], ['Dec 2026', 'WIP-AFTER']
  ])('groups projects first in scheduled %s without moving source tasks', (date, lane) => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile(`# SELECTED\n* [ ] Task first ! ${date}\n`
      + `- [ ] Low first ! ${date}\n+ [ ] Project one ! ${date}\n  - [ ] Child ! ${date}\n`
      + `* [ ] Task second ! ${date}\n+ [ ] Project two ! ${date}\n`);
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data);
    try {
      const column = wrapper.get(`[data-planning-lane="${lane}"]`);
      expect(column.findAllComponents({ name: 'PlanningTaskRow' }).map(row => row.props('entry').title))
        .toEqual(['Project one', 'Project two', 'Task first', 'Child', 'Task second', 'Low first']);
      expect(column.findAll('[data-entry-group]').map(group => group.attributes('data-entry-group')))
        .toEqual(['projects', 'low']);
      expect(column.get('.planning-lane-body').element.firstElementChild.classList
        .contains('planning-scheduled-projects')).toBe(true);
      expect(column.get('.planning-scheduled-projects').findAllComponents({ name: 'PlanningTaskRow' }))
        .toHaveLength(2);
      expect(column.findAll('.planning-date-group [data-entry-group="projects"]')).toHaveLength(0);
      expect(renderTodoMdFile(data)).toBe(before);
      expect(wrapper.emitted('update')).toBeUndefined();
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('collects projects across future dates once and leaves only tasks in date groups', () => {
    vi.useFakeTimers(); vi.setSystemTime(today);
    const data = parseTodoMdFile('# SELECTED\n+ [ ] January project ! Jan 9 2027\n'
      + '* [ ] December task ! Dec 8 2026\n+ [ ] December project ! Dec 8 2026\n'
      + '  - [ ] Attached child ! Dec 9 2026\n');
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data);
    try {
      const lane = wrapper.get('[data-planning-lane="WIP-AFTER"]');
      expect(lane.findAll('.planning-scheduled-projects')).toHaveLength(1);
      const titles = selector => lane.get(selector).findAllComponents({ name: 'PlanningTaskRow' })
        .map(row => row.props('entry').title);
      expect(titles('.planning-scheduled-projects')).toEqual(['December project', 'January project']);
      expect(titles('.planning-date-group')).toEqual(['December task', 'Attached child']);
      expect(lane.get('.planning-lane-activate').text()).toContain('4');
      expect(lane.findAll('.planning-date-group')).toHaveLength(1);
      expect(renderTodoMdFile(data)).toBe(before);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it('activates one schedule lane and keeps date pickers as clocks without changing project dates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
    const data = parseTodoMdFile('# SELECTED\n+ [ ] Project ! Dec 2026\n  - [ ] Child ! Nov 9 2026\n'
      + '# WIP\n* [ ] Today ! Nov 2 2026\n* [ ] Later ! Dec 2026\n');
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data, true);
    try {
      const active = () => wrapper.findAll('.planning-scheduled.is-active')
        .map(lane => lane.attributes('data-planning-lane'));
      expect(active()).toEqual(['WIP']);
      await wrapper.get('[data-planning-lane="WIP-MONTH"] .planning-lane-activate').trigger('click');
      expect(active()).toEqual(['WIP-MONTH']);
      expect(wrapper.get('[data-planning-lane="WIP-MONTH"] .planning-lane-activate')
        .attributes('aria-pressed')).toBe('true');
      await wrapper.get('[data-planning-lane="WIP-AFTER"] .planning-preview-activate').trigger('click');
      expect(active()).toEqual(['WIP-AFTER']);
      expect(wrapper.find('.task-text-edit').exists()).toBe(false);
      expect(wrapper.emitted('update')).toBeUndefined();
      expect(wrapper.findAll('.planning-date-group .clock-btn, .planning-date-group .planning-child-date')
        .map(button => button.text())).toEqual(['◷', '◷', '◷']);
      expect(wrapper.get('.planning-scheduled-projects .clock-btn').text()).toBe('Dec');
      expect(wrapper.get('.projects-stack .clock-btn').text()).toBe('Dec');
      expect(renderTodoMdFile(data)).toBe(before);
    } finally { wrapper.unmount(); vi.useRealTimers(); }
  });
  it.each([true, false])('persists dates before leaving Plan and restores due precision (quick picker: %s)', async quickSchedule => {
    vi.useFakeTimers();
    vi.setSystemTime(today);
    const task = { id: 'cycle', type: 'task', text: 'Task (note) ! Dec 2026', statusChar: ' ', priority: 'normal' };
    const section = { items: [task] };
    const wrapper = mount(TaskCard, { props: { task, section, column: 'SELECTED', quickSchedule },
      global: { provide: { planningWorkspace: true } } });
    try {
      await wrapper.get('.custom-checkbox').trigger('click');
      expect(task.text).toBe('Task (note) | Nov 2 2026');
      await wrapper.get('.custom-checkbox').trigger('click');
      expect(task.text).toBe('Task (note) ! Dec 2026');
      await wrapper.get('.custom-checkbox').trigger('click');
      expect(task.statusChar).toBe('!');
      expect(task.text).toBe('Task (note) ! Dec 2026');
      await wrapper.get('.custom-checkbox').trigger('click');
      expect(task.text).toBe('Task (note) | Nov 2 2026');
      wrapper.unmount();
      expect(task.text).toBe('Task (note) | Nov 2 2026');
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });
  it('shows Backlog, SELECTED and WIP without rewriting data or adding headings', async () => {
    const data = parseTodoMdFile(source), before = renderTodoMdFile(data);
    const wrapper = mountPlan(data);
    expect(wrapper.findAll('.planning-columns > section')).toHaveLength(5);
    expect(wrapper.findAll('[data-planning-lane]').map(el => el.attributes('data-planning-lane')))
      .toEqual(['PROJECTS', 'SELECTED', 'WIP', 'WIP-MONTH', 'WIP-AFTER']);
    expect(wrapper.get('#planning-scheduled-title').text()).toBe('SCHEDULED');
    expect(wrapper.get('.planning-commitment-title').text()).toBe('SELECTED');
    expect(wrapper.get('[data-planning-lane="SELECTED"]').attributes('aria-label')).toBe('TASKS');
    expect(wrapper.get('.planning-toc .planning-backlog').exists()).toBe(true);
    expect(wrapper.get('.planning-outline').text()).not.toMatch(/WIP|PROJECTS|ARCHIVE|SELECTED/);
    expect(wrapper.findAll('.planning-heading-link')[0].text()).toContain('TODO');
    expect(wrapper.get('.planning-outline').text()).toContain('Inbox1');
    expect(wrapper.get('[data-planning-lane="SELECTED"]').text()).toContain('NextSelected task');
    await wrapper.findAll('.planning-heading-link')[1].trigger('click');
    expect(wrapper.get('[data-planning-column="ICE"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-planning-column="TODO"]').attributes('style') || '').not.toContain('display: none');
    expect(wrapper.get('[data-planning-column="ICE"]').attributes('style') || '').not.toContain('display: none');
    expect(wrapper.findAll('[data-planning-column]').map(el => el.attributes('data-planning-column')))
      .toEqual(['TODO', 'ICE', 'PROJECTS', 'SELECTED']);
    expect(wrapper.get('.planning-backlog > [data-planning-column]').attributes('data-planning-column'))
      .toBe('TODO');
    expect(wrapper.find('.planning-split-handle').exists()).toBe(false);
    expect(wrapper.get('.outline-drawer-panel').classes()).toContain('is-open');
    await wrapper.get('.planning-toc').trigger('mouseleave');
    expect(wrapper.get('.outline-drawer-panel').classes()).toContain('is-open');
    await wrapper.get('[aria-label="Close backlog"]').trigger('click');
    expect(wrapper.get('.outline-drawer-panel').classes()).not.toContain('is-open');
    expect(wrapper.get('#planning-toc-panel').attributes('aria-hidden')).toBe('true');
    await wrapper.get('.outline-drawer-grip').trigger('click');
    expect(wrapper.get('#planning-toc-panel').attributes('aria-hidden')).toBe('false');
    await wrapper.get('.planning-open-archive').trigger('click');
    expect(wrapper.get('.planning-archive-drawer [data-planning-column]').attributes('data-planning-column'))
      .toBe('ARCHIVE');
    expect(renderTodoMdFile(data)).toBe(before);
    expect(wrapper.emitted('update')).toBeUndefined();
    wrapper.unmount();
  });

  it('keeps undated active work, completed work and ice accessible; dates are explicit and exclusive', () => {
    const data = parseTodoMdFile(source), before = renderTodoMdFile(data);
    const model = derivePlanningModel(data, today);
    expect(model.needsDate.map(e => e.title)).toEqual(['Project', 'Paper selection']);
    expect(model.completed.map(e => e.title)).toEqual(['Finished']);
    expect(model.schedule.flatMap(g => g.entries.map(e => e.title)))
      .toEqual(['Child', 'Child', 'Selected task', 'Parent']);
    expect(model.backlog.flatMap(c => c.sections.flatMap(s => s.entries.map(e => e.title))))
      .toEqual(['Inbox task', 'Frozen task']);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('orders dates by urgency and precision at week/month/year boundaries', () => {
    const data = parseTodoMdFile('# SELECTED\n### Dates\n* [ ] Month ! Nov 2026\n'
      + '* [ ] Week ! Nov Week #1 2026\n* [ ] Day ! Nov 7 2026\n* [ ] Now ! Nov 2 2026\n'
      + '* [ ] Later ! Dec 2026\n* [ ] Old ! Oct 2026\n* [ ] Other day ! Nov 20 2026\n');
    const model = derivePlanningModel(data, today);
    expect(model.schedule.map(g => [g.id, g.entries.map(e => e.title)]))
      .toEqual([['overdue', ['Old']], ['today', ['Now']], ['week', ['Day', 'Week']],
        ['month', ['Other day', 'Month']], ['future', ['Later']]]);
    const yearEnd = parseTodoMdFile('# WIP\n### Work\n* [ ] Week ! Dec Week #5 2026\n* [ ] Month ! Dec 2026\n');
    expect(derivePlanningModel(yearEnd, new Date(2026, 11, 31)).schedule.find(g => g.id === 'week').entries)
      .toHaveLength(1);
  });

  it('keeps a project in its SELECTED source on scheduling, preserving all nested and raw content', () => {
    const data = parseTodoMdFile(source);
    const entry = allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Project');
    const parent = entry.task, children = JSON.stringify(parent.children);
    expect(schedulePlanningEntry(data, entry, '2026-11-05')).toBe(true);
    expect(data.columnStacks.PROJECTS.name).toBe('SELECTED');
    expect(data.columnStacks.SELECTED.sections[0].items).toContain(parent);
    expect(JSON.stringify(parent.children)).toBe(children);
    const text = renderTodoMdFile(data);
    expect(text).toContain('  * [~] Unsupported child');
    expect(text).toContain('A raw line');
    expect(text).toContain('Inbox task (note)');
    expect(text.match(/\+ \[ \] Project/g)).toHaveLength(1);
  });

  it('keeps dated and cleared projects in SELECTED without duplication', () => {
    const data = parseTodoMdFile(source);
    let entry = allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Parent');
    schedulePlanningEntry(data, entry, 'month:2026-12');
    expect(data.columnStacks.SELECTED.sections[0].items).toContain(entry.task);
    entry = allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Parent');
    schedulePlanningEntry(data, entry, '');
    expect(data.columnStacks.SELECTED.sections[0].items).toContain(entry.task);
    expect(entry.task.text).toBe('Parent (preserve note)');
    const undated = derivePlanningModel(data, today).needsDate.find(item => item.title === 'Paper selection');
    expect(schedulePlanningEntry(data, undated, '')).toBe(false);
    expect(undated.section.items).toContain(undated.task);
  });

  it('never moves a subtask independently, frozen work, or unchanged dates', () => {
    const data = parseTodoMdFile(source);
    const entries = allEntries(derivePlanningModel(data, today));
    const child = entries.find(e => e.parent && e.parent.text.includes('Project'));
    const original = child.parent.children;
    schedulePlanningEntry(data, child, 'month:2026-12');
    expect(child.parent.children).toBe(original);
    expect(child.task.text).toContain('! Dec 2026');
    expect(data.columnStacks.PROJECTS.sections[0].items).toContain(child.parent);
    expect(reconcilePlanningDate(data, entries.find(e => e.title === 'Parent'))).toBe(false);
    expect(schedulePlanningEntry(data, entries.find(e => e.frozen), '2026-11-05')).toBe(false);
  });

  it('rejects invalid dates and creates missing destinations only on a real scheduling action', () => {
    const data = parseTodoMdFile('# TODO\n### Inbox\n* [ ] Task (note)\n');
    const entry = derivePlanningModel(data, today).backlog[0].sections[0].entries[0];
    const before = renderTodoMdFile(data);
    for (const invalid of ['2026-02-30', 'month:invalid-11', 'week:2026-11-03']) {
      expect(schedulePlanningEntry(data, entry, invalid)).toBe(false);
      expect(renderTodoMdFile(data)).toBe(before);
    }
    expect(schedulePlanningEntry(data, entry, 'month:2027-01')).toBe(true);
    expect(data.columnOrder).toEqual(['TODO', 'WIP']);
    expect(data.columnStacks.WIP.sections[0].headerStyle).toBe('NONE');
    expect(entry.task.text).toBe('Task (note) ! Jan 2027');
  });

  it('holds grouping until the status lifecycle date is committed', async () => {
    const data = parseTodoMdFile('# WIP\n### Work\n* [ ] Task ! Nov 2 2026\n');
    const wrapper = mountPlan(data);
    const row = wrapper.findComponent({ name: 'PlanningTaskRow' });
    const entry = row.props('entry');
    entry.task.statusChar = 'x';
    row.vm.$emit('update', entry, { pendingStatus: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.planning-completed').exists()).toBe(false);
    entry.task.text = 'Task | Nov 2 2026';
    row.vm.$emit('update', entry, { statusSettled: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.planning-completed').text()).toContain('Completed');
    wrapper.unmount();
  });

  it('renders missing-column and empty archive states without mutation', async () => {
    const data = parseTodoMdFile('# TODO\n* [ ] Only backlog\n');
    const before = renderTodoMdFile(data), wrapper = mountPlan(data);
    expect(wrapper.findAll('.planning-columns > section')).toHaveLength(5);
    expect(wrapper.get('.planning-selected .planning-empty').text()).toContain('No selected tasks yet');
    await wrapper.get('.planning-open-archive').trigger('click');
    expect(wrapper.get('.planning-archive-drawer .planning-empty').text()).toContain('No archived tasks yet');
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });

  it('opens the archive drawer after pending status settles without unmounting Plan', async () => {
    const data = parseTodoMdFile(source);
    const wrapper = mountPlan(data);
    const row = wrapper.findAllComponents({ name: 'PlanningTaskRow' })
      .find(candidate => candidate.props('entry').task.text.includes('Parent'));
    const entry = row.props('entry');
    entry.task.statusChar = 'x';
    entry.task.text = 'Parent (preserve note) | Nov 2 2026';
    row.vm.$emit('update', entry, { pendingStatus: true });
    await wrapper.vm.$nextTick();
    await wrapper.get('.planning-open-archive').trigger('click');
    expect(wrapper.find('.planning-archive-drawer').exists()).toBe(false);
    row.vm.$emit('update', entry, { statusSettled: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.planning-archive-drawer').exists()).toBe(true);
    await wrapper.get('[aria-label="Close archive"]').trigger('click');
    expect(wrapper.get('.planning-completed').text()).toContain('Completed / will not do');
    const matches = wrapper.findAllComponents({ name: 'PlanningTaskRow' })
      .filter(candidate => candidate.props('entry').task.id === entry.task.id);
    expect(matches).toHaveLength(1); // A WIP project appears only in the completed group, not SELECTED.
    expect(matches[0].props('entry').layoutStatus).toBe('x');
    wrapper.unmount();
  });

  it('keeps actual source buckets, including started SELECTED work and dated backlog work', () => {
    const data = parseTodoMdFile('# TODO\n### Inbox\n* [~] Dated backlog ! Nov 2 2026\n'
      + '# SELECTED\n### Ready\n* [~] Started selection ! Nov 2 2026\n'
      + '# WIP\n### Work\n* [ ] Unstarted WIP ! Nov 2 2026\n');
    const before = renderTodoMdFile(data);
    const wrapper = mountPlan(data);
    expect(wrapper.get('.planning-backlog').text()).toContain('Dated backlog');
    expect(wrapper.get('[data-planning-lane="SELECTED"]').text()).toContain('Started selection');
    expect(wrapper.get('[data-planning-lane="WIP"]').findAllComponents({ name: 'PlanningTaskRow' })
      .map(row => row.props('entry').title)).toEqual(['Dated backlog', 'Started selection', 'Unstarted WIP']);
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });

  it('adds only on confirmation, defaults to the chosen source, and cancels without writing', async () => {
    const data = parseTodoMdFile(source), wrapper = mountPlan(data);
    const before = renderTodoMdFile(data);
    await wrapper.findAll('.planning-heading-link').find(link => link.text().startsWith('TODO')).trigger('click');
    await wrapper.get('.planning-add-task').trigger('click');
    await wrapper.get('[aria-label="Task title"]').setValue('New project');
    expect(renderTodoMdFile(data)).toBe(before);
    await wrapper.get('.planning-add-dialog [aria-label="Close"]').trigger('click');
    expect(renderTodoMdFile(data)).toBe(before);
    await wrapper.get('.planning-add-task').trigger('click');
    await wrapper.get('[aria-label="Task title"]').setValue('New project');
    await wrapper.get('.planning-add-dialog').trigger('submit');
    expect(data.columnStacks.TODO.sections[0].items.at(-1).text).toBe('New project');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(wrapper.find('.planning-add-dialog').exists()).toBe(false);
    wrapper.unmount();
  });

  it('routes dated regular tasks to WIP regardless of an obsolete target-column hint', () => {
    const data = parseTodoMdFile(source);
    let entry = allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Inbox task');
    schedulePlanningEntry(data, entry, '2026-11-05', 'WIP');
    expect(entry.task.statusChar).toBe(' ');
    entry = allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Inbox task');
    expect(entry.columnType).toBe('WIP');
    schedulePlanningEntry(data, entry, '2026-11-06');
    entry = allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Inbox task');
    expect(entry.columnType).toBe('WIP');
    schedulePlanningEntry(data, entry, '2026-11-06', 'SELECTED');
    expect(allEntries(derivePlanningModel(data, today)).find(e => e.title === 'Inbox task').columnType).toBe('WIP');
  });
});
