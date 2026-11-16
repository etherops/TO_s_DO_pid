import { parseTodoMdFile, renderTodoMdFile } from './TodoMdParser';
import { ensureWorkflowRoot, taskLocations } from './taskWorkflow';
import { ensureColumnRoot } from './columnRootHelpers';

// Explicit migration only. Never call from the parser, loading, or navigation.
export const migratePaperWorkflow = source => {
  const data = parseTodoMdFile(source);
  let projectsMoved = 0;
  let wipHeadingsRemoved = 0;
  const projectColumns = data.columnOrder.filter(key => /^PROJECTS?$/i.test(key));
  // Ensure the destination isn't a legacy # PROJECTS alias of SELECTED.
  for (const key of projectColumns) data.columnStacks[key].name = 'LEGACY_PROJECTS';
  for (const entry of taskLocations(data)) {
    if (entry.column.name === 'DONE' || entry.columnKey.toUpperCase().includes('ICE')) continue;
    if (entry.task.listMarker !== '+' || entry.column.name === 'SELECTED') continue;
    entry.section.items.splice(entry.section.items.indexOf(entry.task), 1);
    ensureWorkflowRoot(data, 'SELECTED').items.push(entry.task);
    projectsMoved++;
  }
  for (const key of projectColumns) {
    // Preserve any remaining tasks, notes, raw lines and their section headings.
    const remaining = data.columnStacks[key].sections.filter(section =>
      section.type === 'raw-text' || section.items?.length);
    const root = ensureWorkflowRoot(data, 'SELECTED');
    const selected = Object.values(data.columnStacks).find(column => column.sections?.includes(root));
    for (const section of remaining) {
      if (section.headerStyle === 'NONE') root.items.push(...section.items);
      else selected.sections.push(section);
    }
    data.columnOrder.splice(data.columnOrder.indexOf(key), 1);
    delete data.columnStacks[key];
  }
  for (const column of Object.values(data.columnStacks)) {
    if (column.name !== 'WIP') continue;
    const items = [];
    for (const section of column.sections) {
      if (section.type === 'raw-text') items.push(section);
      else {
        if (section.headerStyle !== 'NONE') wipHeadingsRemoved++;
        items.push(...section.items);
      }
    }
    column.sections = [];
    ensureColumnRoot(column).items.push(...items);
  }
  const content = renderTodoMdFile(data);
  // Compare complete task subtrees, not just counts: status, text, order of children,
  // indentation and unsupported nested lines must survive unchanged.
  const signatures = text => taskLocations(parseTodoMdFile(text)).map(({ task }) => JSON.stringify([
    task.listMarker, task.statusChar, task.text,
    (task.children || []).map(child => [child.type, child.statusChar, child.text, child.indent])
  ])).sort();
  if (JSON.stringify(signatures(source)) !== JSON.stringify(signatures(content))) {
    throw new Error('Migration refused: task content or nesting changed');
  }
  return { content, projectsMoved, wipHeadingsRemoved };
};
