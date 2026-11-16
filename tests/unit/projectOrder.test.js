import { describe, expect, it } from 'vitest';
import { parseTodoMdFile, renderTodoMdFile } from '../../src/utils/TodoMdParser';
import { derivePlanningModel } from '../../src/utils/planningHelpers';
import { moveProjectRelativeTo } from '../../src/utils/projectOrder';

const fixture = () => {
  const data = parseTodoMdFile('# SELECTED\n+ [ ] Alpha (note) ! Dec 2026\n  - [ ] Child\n'
    + '* [ ] Ordinary\nRaw metadata\n+ [ ] Beta\n## Later\n+ [ ] Gamma\n');
  return { data, entries: derivePlanningModel(data).projects };
};
describe('persistent project handle ordering', () => {
  it('moves down and up without losing other tasks, raw text, dates or children', () => {
    const { data, entries: [alpha, beta] } = fixture();
    const child = alpha.task.children[0];
    expect(moveProjectRelativeTo(alpha, beta, true)).toBe(true);
    expect(derivePlanningModel(data).projects.map(entry => entry.title)).toEqual(['Beta', 'Alpha', 'Gamma']);
    expect(alpha.task.children[0]).toBe(child);
    const saved = renderTodoMdFile(data);
    expect(saved).toContain('* [ ] Ordinary');
    expect(saved).toContain('Raw metadata');
    expect(saved).toContain('+ [ ] Alpha (note) ! Dec 2026\n  - [ ] Child');
    expect(moveProjectRelativeTo(alpha, beta)).toBe(true);
    expect(derivePlanningModel(data).projects.map(entry => entry.title)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
  it('moves across sections as one intact parent and persists that placement', () => {
    const { data, entries: [alpha, , gamma] } = fixture();
    expect(moveProjectRelativeTo(alpha, gamma, true)).toBe(true);
    expect(alpha.section.items).not.toContain(alpha.task);
    expect(gamma.section.items.at(-1)).toBe(alpha.task);
    const reread = derivePlanningModel(parseTodoMdFile(renderTodoMdFile(data)));
    expect(reread.projects.map(entry => entry.title)).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(reread.projects.at(-1).task.children[0].text).toBe('Child');
  });
  it('ignores self, adjacent no-op, frozen, stale and child drops', () => {
    const { data, entries: [alpha, beta] } = fixture();
    const before = renderTodoMdFile(data);
    expect(moveProjectRelativeTo(alpha, alpha)).toBe(false);
    expect(moveProjectRelativeTo(beta, alpha, true)).toBe(true);
    const adjacent = renderTodoMdFile(data);
    expect(moveProjectRelativeTo(beta, alpha, true)).toBe(false);
    expect(moveProjectRelativeTo({ ...alpha, frozen: true }, beta)).toBe(false);
    expect(moveProjectRelativeTo(alpha, { ...beta, frozen: true })).toBe(false);
    expect(moveProjectRelativeTo({ ...alpha, parent: beta.task }, beta)).toBe(false);
    expect(moveProjectRelativeTo({ ...alpha, task: { ...alpha.task } }, beta)).toBe(false);
    expect(renderTodoMdFile(data)).toBe(adjacent);
    expect(adjacent).not.toBe(before);
  });
});
