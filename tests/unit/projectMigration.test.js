import { describe, expect, it } from 'vitest';
import { migrateProjectSections, parseTodoMdFile, renderTodoMdFile } from '../../src/utils/TodoMdParser';

describe('explicit project-section migration', () => {
  it('preserves every status, note and lifecycle date, and leaves other columns byte-identical', () => {
    const prefix = '# TODO\n### Inbox\n* [ ] Leave alone\n\n';
    const suffix = '\n# WIP\n### Week\n+ [~] Existing project\n  - [ ] Existing child\n';
    const source = prefix + '# PROJECTS\n## First\n* [~] Work (hidden note) ! Nov 2026\n'
      + '* [x] Done | Nov 2 2026\n* [!] Blocked\n* [-] Cancelled | Oct 1 2026\n'
      + '## Second\n* [ ] More ! Nov Week #1 2026\n## Empty\n' + suffix;
    const result = migrateProjectSections(source);
    expect(result.converted).toEqual([{ title: 'First', tasks: 4 }, { title: 'Second', tasks: 1 }]);
    expect(result.content.startsWith(prefix)).toBe(true);
    expect(result.content.endsWith(suffix)).toBe(true);
    expect(result.content).toContain('## Empty\n');
    const data = parseTodoMdFile(result.content);
    const projects = data.columnStacks.PROJECTS.sections.flatMap(section => section.items);
    expect(projects.map(task => task.text)).toEqual(['First', 'Second']);
    expect(projects.every(task => task.listMarker === '+')).toBe(true);
    expect(projects[0].children.map(child => [child.statusChar, child.text])).toEqual([
      ['~', 'Work (hidden note) ! Nov 2026'], ['x', 'Done | Nov 2 2026'], ['!', 'Blocked'],
      ['-', 'Cancelled | Oct 1 2026']
    ]);
    expect(renderTodoMdFile(data)).toContain('  - [x] Done | Nov 2 2026');
    expect(migrateProjectSections(result.content)).toEqual({ content: result.content, converted: [] });
  });

  it.each(['  - [ ] Existing child', 'Unsupported line', '- [ ] Low priority'])
    ('refuses potentially lossy conversion: %s', extra => {
      const source = `# PROJECTS\n## Project\n* [ ] Task\n${extra}\n`;
      expect(() => migrateProjectSections(source)).toThrow('Cannot safely convert');
    });
});
