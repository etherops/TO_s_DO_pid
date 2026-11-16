// Move the original parent and its entire subtree, never a filtered view copy.
export const moveProjectRelativeTo = (source, target, after = false) => {
  if (!source || !target || source.frozen || target.frozen || source.parent || target.parent
    || source.task.listMarker !== '+' || target.task.listMarker !== '+' || source.task === target.task) return false;
  const from = source.section.items;
  const to = target.section.items;
  const sourceIndex = from.indexOf(source.task);
  const targetIndex = to.indexOf(target.task);
  if (sourceIndex < 0 || targetIndex < 0) return false;
  let insertionIndex = targetIndex + Number(after);
  if (from === to && sourceIndex < insertionIndex) insertionIndex--;
  if (from === to && sourceIndex === insertionIndex) return false;
  from.splice(sourceIndex, 1);
  to.splice(insertionIndex, 0, source.task);
  return true;
};
