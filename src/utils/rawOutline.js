import { mapColumnToColumnStack } from './TodoMdParser';

// Source offsets are retained verbatim; navigation never parses and re-renders the file.
export function rawOutline(source) {
  const headings = [];
  let offset = 0;
  let fence = null;
  let tone = 'TODO';
  source.split('\n').forEach((line, index) => {
    const text = line.replace(/\r$/, '');
    const marker = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) {
        fence = null;
      }
    } else if (marker) {
      fence = marker[1];
    } else {
      const heading = text.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?)|[ \t]*)$/);
      if (heading) {
        const title = (heading[2] || '').replace(/[ \t]+#+[ \t]*$/, '').trim() || 'Untitled heading';
        if (heading[1].length === 1) tone = mapColumnToColumnStack(title);
        headings.push({
          level: heading[1].length,
          title,
          tone,
          line: index,
          start: offset,
          end: offset + text.length
        });
      }
    }
    offset += line.length + 1;
  });
  return headings;
}
