import { describe, expect, it } from 'vitest';
import { parseTodoMdFile, renderTodoMdFile } from '../../src/utils/TodoMdParser';
import { applySubtaskAction, eligibleSubtaskParents, findSubtask } from '../../src/utils/subtaskActions';

const sourceText = '# PROJECTS\n### Work\n+ [~] Source (parent note)\n'
  + '  - [~] Child (hidden note) ! Nov Week #2 2026\n  * [ ] Unsupported child\n'
  + '  - [x] Sibling | Nov 1 2026\n+ [ ] Project target\n  - [ ] Existing\n'
  + '* [!] Regular target\n- [ ] Low\n+ [x] Closed | Nov 1 2026\n'
  + '+ [-] Cancelled project | Nov 2 2026\n* [x] Closed task | Nov 1 2026\n'
  + '# ARCHIVE\n### Old\n+ [ ] Archived\n# ICE\n### Frozen\n+ [ ] Frozen\n';
const fixture = () => {
  const data = parseTodoMdFile(sourceText);
  const section = data.columnStacks.PROJECTS.sections[0];
  return { data, section, parent: section.items[0], child: section.items[0].children[0] };
};

describe('subtask context actions', () => {
  it('offers non-archived projects regardless of status and only open regular parents', () => {
    const { data, child } = fixture();
    expect(eligibleSubtaskParents(data, child.id).map(entry => entry.task.text))
      .toEqual(['Project target', 'Regular target', 'Closed | Nov 1 2026', 'Cancelled project | Nov 2 2026']);
  });

  it('moves to a completed project without reopening it or changing completion metadata', () => {
    const { data, section, child } = fixture();
    const target = section.items.find(task => task.text === 'Closed | Nov 1 2026');
    const original = { ...child };
    expect(applySubtaskAction(data, child.id, 'move', target.id)).toBeTruthy();
    expect(target.children.at(-1)).toBe(child);
    expect(child).toEqual(original);
    expect(target.statusChar).toBe('x');
    expect(target.text).toBe('Closed | Nov 1 2026');
  });

  it('moves the original child without changing metadata, siblings or parent status', () => {
    const { data, section, parent, child } = fixture();
    const childSnapshot = { ...child };
    const unsupported = parent.children[1];
    const target = section.items[1];
    expect(applySubtaskAction(data, child.id, 'move', target.id)).toBeTruthy();
    expect(target.children.at(-1)).toBe(child);
    expect(child).toEqual(childSnapshot);
    expect(parent.children).toHaveLength(2);
    expect(parent.children[0]).toBe(unsupported);
    expect(parent.statusChar).toBe('~');
    const rendered = renderTodoMdFile(data);
    expect(rendered).toContain('+ [ ] Project target\n  - [ ] Existing\n'
      + '  - [~] Child (hidden note) ! Nov Week #2 2026');
    expect(renderTodoMdFile(parseTodoMdFile(rendered))).toBe(rendered);
  });

  it('detaches directly after the parent, preserving completion and hidden source content', () => {
    const { data, section, parent } = fixture();
    const child = parent.children[2];
    applySubtaskAction(data, child.id, 'detach');
    expect(section.items[1]).toBe(child);
    expect(child).toMatchObject({ type: 'task', listMarker: '*', statusChar: 'x', text: 'Sibling | Nov 1 2026' });
    expect(renderTodoMdFile(data)).toContain('  * [ ] Unsupported child\n* [x] Sibling | Nov 1 2026');
  });

  it('deletes only the selected child and does nothing for stale or invalid requests', () => {
    const { data, child, parent } = fixture();
    const before = renderTodoMdFile(data);
    expect(applySubtaskAction(data, child.id, 'move', parent.id)).toBeNull();
    expect(applySubtaskAction(data, child.id, 'move', -100)).toBeNull();
    expect(applySubtaskAction(data, child.id, 'unknown')).toBeNull();
    expect(renderTodoMdFile(data)).toBe(before);
    expect(applySubtaskAction(data, child.id, 'delete')).toBeTruthy();
    expect(findSubtask(data, child.id)).toBeNull();
    expect(applySubtaskAction(data, child.id, 'delete')).toBeNull();
    expect(renderTodoMdFile(data)).toContain('  * [ ] Unsupported child\n  - [x] Sibling | Nov 1 2026');
  });

  it('rejects frozen sources and destinations even if they changed while the menu was open', () => {
    const { data, section, child } = fixture();
    section.on_ice = true;
    expect(applySubtaskAction(data, child.id, 'detach')).toBeNull();
    expect(eligibleSubtaskParents(data, child.id)).toEqual([]);
    section.on_ice = false;
    const target = section.items[1];
    section.items.splice(1, 1);
    data.columnStacks.ARCHIVE.sections[0].items.push(target);
    expect(applySubtaskAction(data, child.id, 'move', target.id)).toBeNull();
  });
});
