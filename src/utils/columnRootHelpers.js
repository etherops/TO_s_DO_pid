// Keep the existing section-based editing APIs without inventing a Markdown heading.
export const ensureColumnRoot = column => {
  let root = column.sections.find(section => section.headerStyle === 'NONE');
  if (!root) {
    root = { type: 'section', name: '', headerStyle: 'NONE', archivable: false, items: [] };
    column.sections.unshift(root);
  }
  return root;
};
