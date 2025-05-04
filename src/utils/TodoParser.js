/**
 * Parses a todo text file into structured data
 * @param {string} fileContent - The content of the todo text file
 * @returns {Array} Array of sections, each containing categories and items
 */
export function parseTodoFile(fileContent) {
  console.log('==== PARSING TODO FILE ====');
  console.log('File content length:', fileContent?.length || 0);
  
  if (!fileContent) {
    console.error('Empty file content provided to parser');
    return [];
  }
  
  const lines = fileContent.split('\n');
  console.log('Number of lines:', lines.length);
  
  // Array to store all sections
  const sections = [];
  
  // Map to track sections by name
  const sectionsMap = new Map();
  
  // Create a section with the given name, column, and style
  const createSection = (name, column, headerStyle) => {
    return {
      name,
      column, // Which column this section belongs to (TODO, WIP, DONE)
      headerStyle, // Style of the section header: "LARGE" or "SMALL"
      items: [] // All items in the section
    };
  };
  
  // Track column state
  let foundWipSection = false;
  let foundArchiveSection = false;

  // Helper to get or create a section
  const getOrCreateSection = (name, column, headerStyle) => {
    if (!sectionsMap.has(name)) {
      const newSection = createSection(name, column, headerStyle);
      sectionsMap.set(name, newSection);
      sections.push(newSection);
    }
    return sectionsMap.get(name);
  };
  
  // Create a default uncategorized section with TODO column and SMALL style
  const defaultSection = getOrCreateSection('Uncategorized', 'TODO', 'SMALL');
  let currentSection = defaultSection;
  let itemId = 1;
  
  // Check if line is a section divider (a line of #)
  const isSectionDivider = (line) => {
    return line.trim().match(/^#+$/) !== null;
  };
  
  // Parse the lines to identify sections and categories
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line === '') {
      continue;
    }
    
    // Process section headers (format: ### surrounded by divider lines)
    if (line.startsWith('#')) {
      let sectionName
      let sectionHeaderStyle
      if (isSectionDivider(line)) {
        // Section with LARGE header
        if (i + 1 >= lines.length) {
          continue;
        }
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith('# ') && nextLine.length > 2) {
          // Check if line after title is a divider too
          if (i + 2 < lines.length && isSectionDivider(lines[i + 2])) {
            // Extract section name, removing the "# " prefix and any trailing "#"
            sectionName = nextLine.substring(2).trim(); // Remove "# " prefix
            // Remove any trailing "#" characters and trim
            sectionName = sectionName.replace(/#*$/, '').trim();
            sectionHeaderStyle = 'LARGE'
          }
        }
        i += 2; // Skip the section title and the closing divider
      } else {
        // Section with SMALL header
        sectionName = line.substring(3).trim();
        sectionHeaderStyle = 'SMALL'
      }
      // Determine which column this section belongs to
      let sectionColumn = 'TODO'; // Default column

      if (sectionName === 'WIP') {
        sectionColumn = 'WIP';
        foundWipSection = true;
      } else if (sectionName === 'ARCHIVE') {
        sectionColumn = 'DONE';
        foundArchiveSection = true;
      } else if (sectionName.toUpperCase().startsWith('CURRENT')) {
        // Sections that start with "CURRENT" (case insensitive) go to WIP column
        sectionColumn = 'WIP';
      } else if (foundWipSection && !foundArchiveSection) {
        // After WIP but before ARCHIVE
        sectionColumn = 'TODO';
      } else if (foundArchiveSection) {
        // After ARCHIVE
        sectionColumn = 'DONE';
      } else {
        // Before WIP
        sectionColumn = 'TODO';
      }

      // Create or get the section with the determined column and LARGE style
      currentSection = getOrCreateSection(sectionName, sectionColumn, sectionHeaderStyle);
      continue;
    }
    
    // Process plain text line that could be a month or other marker (not starting with *)
    if (!line.startsWith('*') && !line.startsWith('#')) {
      // This is a text label, not a task - could be a month in the archive section or other marker
      continue;
    }
    
    // Parse todo items
    if (line.startsWith('* ')) {
      const statusMatch = line.match(/\* \[([ x~-])\]/);
      
      if (statusMatch) {
        const statusChar = statusMatch[1];
        const todoText = line.substring(statusMatch[0].length).trim();
        
        const todoItem = {
          id: itemId++,
          statusChar,
          text: todoText,
          lineIndex: i
        };

        // Add item to the current section
        currentSection.items.push(todoItem);
      }
    }
  }
  
  // If the default section has no items, remove it
  if (defaultSection.items.length === 0) {
    const index = sections.indexOf(defaultSection);
    if (index > -1) {
      sections.splice(index, 1);
    }
  }
  
  return sections;
}

/**
 * Renders sections and items back into todo file format
 * @param {Array} sections - Array of section objects with items
 * @returns {string} The formatted text content of the todo file
 */
export function renderTodoFile(sections) {
  console.log('==== RENDERING TODO FILE ====');
  console.log('Sections count:', sections.length);
  
  if (!sections || !sections.length) {
    console.error('No sections provided to render');
    return '';
  }
  
  let outputContent = '';
  
  // Render each section in the original array order
  sections.forEach((section, index) => {
    // Add a space between sections
    if (index > 0) {
      outputContent += '\n';
    }
    
    // Render section header based on style
    if (section.headerStyle === 'LARGE') {
      // Create a divider line of # characters matching the section name length
      const dividerLine = '#'.repeat(section.name.length + 4); // +4 to account for "# " on each side
      
      outputContent += `${dividerLine}\n`;
      outputContent += `# ${section.name} #\n`;
      outputContent += `${dividerLine}\n`;
    } else {
      // Small header style
      outputContent += `### ${section.name}\n`;
    }
    
    // Render items in this section
    if (section.items && section.items.length > 0) {
      section.items.forEach(item => {
        outputContent += `* [${item.statusChar}] ${item.text}\n`;
      });
    }
  });
  
  console.log('Generated content length:', outputContent.length);
  return outputContent;
}