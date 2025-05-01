/**
 * Parses a todo text file into structured data
 * @param {string} fileContent - The content of the todo text file
 * @returns {Object} Structured todo data
 */
export function parseTodoFile(fileContent) {
  const lines = fileContent.split('\n');
  
  const result = {
    todos: [],
    inProgress: [],
    done: [],
    archive: [],
    notes: '',
    categories: new Set(),
    raw: fileContent
  };

  let currentSection = '';
  let currentCategory = '';
  let inArchive = false;
  let inNotes = false;
  let notesContent = [];
  let itemId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if we're in the archive section
    if (trimmedLine.includes('ARCHIVE')) {
      inArchive = true;
      inNotes = false;
      continue;
    }
    
    // Check if we're in the notes section
    if (trimmedLine.match(/#+\s*NOTES\s*#+/)) {
      inNotes = true;
      inArchive = false;
      
      // Collect all lines until we hit another section or the archive
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Stop if we've reached the archive or another section header
        if (nextLine.match(/#+\s*[A-Z]+\s*#+/) || nextLine.includes('ARCHIVE')) {
          break;
        }
        
        if (nextLine !== '') {
          notesContent.push(lines[j]);
        }
        
        j++;
      }
      
      // Skip the lines we've already processed
      i = j - 1;
      continue;
    }
    
    // Skip section dividers and empty lines
    if (trimmedLine.match(/^#+$/) || trimmedLine === '') {
      continue;
    }
    
    // Parse category headers
    if (trimmedLine.startsWith('#')) {
      currentSection = trimmedLine.replace(/#/g, '').trim();
      result.categories.add(currentSection);
      continue;
    }
    
    // If it's a subcategory header that doesn't start with #
    if (trimmedLine.startsWith('* ') === false && trimmedLine !== '') {
      currentCategory = trimmedLine;
      continue;
    }
    
    // Parse todo items
    if (trimmedLine.startsWith('* ')) {
      const statusMatch = trimmedLine.match(/\* \[([ x~-])\]/);
      
      if (statusMatch) {
        const status = statusMatch[0];
        const statusChar = statusMatch[1];
        const todoText = trimmedLine.substring(statusMatch[0].length).trim();
        
        const todoItem = {
          id: itemId++,
          status,
          statusChar,
          text: todoText,
          originalText: trimmedLine,
          category: currentCategory || currentSection,
          section: currentSection,
          lineIndex: i
        };
        
        if (inArchive) {
          result.archive.push(todoItem);
        } else {
          // Determine status and add to appropriate array
          if (statusChar === 'x') {
            result.done.push(todoItem);
          } else if (statusChar === '~') {
            result.inProgress.push(todoItem);
          } else if (statusChar === ' ') {
            result.todos.push(todoItem);
          }
        }
      }
    }
  }
  
  // Join notes content
  result.notes = notesContent.join('\n');
  
  // Convert categories to array
  result.categories = Array.from(result.categories);
  
  return result;
}

/**
 * Updates the status of an item in the todo text file
 * @param {string} fileContent - The original content of the todo file
 * @param {Object} item - The item to update
 * @param {string} newStatusChar - The new status character (' ', '~', 'x')
 * @returns {string} Updated file content
 */
export function updateItemStatus(fileContent, item, newStatusChar) {
  const lines = fileContent.split('\n');
  
  // Find the line that contains the item
  const lineToUpdate = lines.findIndex(line => 
    line.includes(item.text) && line.includes(item.status));
  
  if (lineToUpdate !== -1) {
    // Replace the status character with the new one
    const newStatus = item.status.replace(
      `[${item.statusChar}]`,
      `[${newStatusChar}]`
    );
    
    lines[lineToUpdate] = lines[lineToUpdate].replace(item.status, newStatus);
  }
  
  return lines.join('\n');
}

/**
 * Adds a new item to the todo text file
 * @param {string} fileContent - The original content of the todo file
 * @param {string} text - The text of the new item
 * @param {string} statusChar - The status character (' ', '~', 'x')
 * @param {string} category - The category to add the item to
 * @returns {string} Updated file content
 */
export function addNewItem(fileContent, text, statusChar, category) {
  const lines = fileContent.split('\n');
  const newItem = `* [${statusChar}] ${text}`;
  
  // Find the section for the category
  const categoryHeaderIndex = lines.findIndex(line => 
    line.match(new RegExp(`#+\\s*${category}\\s*#+`)));
  
  if (categoryHeaderIndex !== -1) {
    // Insert the new item after the category header
    lines.splice(categoryHeaderIndex + 1, 0, newItem);
  } else {
    // If category doesn't exist, add it before the notes section
    const notesIndex = lines.findIndex(line => 
      line.match(/#+\s*NOTES\s*#+/));
    
    if (notesIndex !== -1) {
      const newCategory = [
        '',
        `#########`,
        `# ${category} #`,
        `#########`,
        newItem
      ];
      
      lines.splice(notesIndex, 0, ...newCategory);
    } else {
      // If no notes section, add to the end
      lines.push(
        '',
        `#########`,
        `# ${category} #`,
        `#########`,
        newItem
      );
    }
  }
  
  return lines.join('\n');
}
