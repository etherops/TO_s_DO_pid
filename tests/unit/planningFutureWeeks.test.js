import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PlanningWorkspace from '../../src/components/PlanningWorkspace.vue';
import { parseTodoMdFile, renderTodoMdFile } from '../../src/utils/TodoMdParser';
import { derivePlanningModel, groupPlanningFutureByWeek } from '../../src/utils/planningHelpers';

const source = '# WIP\n### Work\n+ [~] Parent ! Nov 2026\n'
  + '  - [ ] Week child ! Nov Week #2 2026\n  - [ ] Day child ! Nov 9 2026\n'
  + '* [ ] Friday ! Nov 13 2026\n* [ ] Monday ! Nov 9 2026\n'
  + '* [ ] Week task ! Nov Week #2 2026\n* [ ] Later ! Nov 16 2026\n'
  + '* [ ] December ! Dec 2026\n* [ ] Year end ! Dec 31 2026\n* [ ] New year ! Jan 1 2027\n';
const today = new Date(2026, 10, 7);

describe('Future schedule week groups', () => {
  afterEach(() => vi.useRealTimers());
  it('puts whole-week work before chronological weekday groups and preserves precision, identity and source', () => {
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const entries = derivePlanningModel(data, today).schedule.flatMap(group => group.entries);
    const groups = groupPlanningFutureByWeek(entries);
    const week = groups.find(group => group.id === 'week:2026-11-08');
    expect(week.label).toBe('Nov Week #2 2026');
    expect(week.subgroups.map(group => group.value)).toEqual(['week:2026-11-08', '2026-11-09', '2026-11-13']);
    expect(week.subgroups.map(group => group.label)).toEqual(['', 'Monday, Nov 9', 'Friday, Nov 13']);
    expect(week.subgroups[0].entries.map(entry => entry.title)).toEqual(['Week child', 'Week task']);
    expect(week.subgroups[1].entries.map(entry => entry.title)).toEqual(['Day child', 'Monday']);
    expect(week.subgroups[0].entries[0].parent).toBe(data.columnStacks.WIP.sections[0].items[0]);
    expect(groups.find(group => group.id === 'month:2026-11').subgroups[0].value).toBe('month:2026-11');
    const boundary = groups.find(group => group.id === 'week:2026-12-27');
    expect(boundary.subgroups.map(group => group.label)).toEqual(['Thursday, Dec 31', 'Friday, Jan 1']);
    expect(groups.flatMap(group => group.subgroups.flatMap(subgroup => subgroup.entries))).toHaveLength(entries.length);
    expect(new Set(groups.flatMap(group => group.entries)).size).toBe(entries.length);
    expect(groupPlanningFutureByWeek([])).toEqual([]);
    expect(renderTodoMdFile(data)).toBe(before);
  });

  it('renders week totals and weekday headings without writing data', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(today);
    const data = parseTodoMdFile(source);
    const before = renderTodoMdFile(data);
    const wrapper = mount(PlanningWorkspace, { props: { todoData: data } });
    const week = wrapper.get('.planning-scheduled [data-schedule-group="week:2026-11-08"]');
    expect(week.get('.planning-section-heading').text()).toBe('Nov Week #2 20265');
    expect(week.findAll('h4').map(heading => heading.text())).toEqual(['Monday, Nov 9', 'Friday, Nov 13']);
    expect(week.findAllComponents({ name: 'PlanningTaskRow' }).map(row => row.props('entry').title))
      .toEqual(['Week child', 'Week task', 'Day child', 'Monday', 'Friday']);
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(renderTodoMdFile(data)).toBe(before);
    wrapper.unmount();
  });
});
