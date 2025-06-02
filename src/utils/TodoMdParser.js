import { getStrippedDisplayText } from './noteHelpers';

// Column mapping to visual columns in the UI
const COLUMN_CATEGORIES = {
  TODO: ['TODO', 'BACKLOG', 'INBOX', 'LATER', 'SOMEDAY', 'IDEAS', 'ICE'],
  WIP: ['WIP', 'SCHEDULED', 'IN PROGRESS', 'IN-PROGRESS', 'DOING', 'CURRENT', 'ACTIVE', 'ONGOING'],
  DONE: ['DONE', 'COMPLETE', 'COMPLETED', 'ARCHIVE', 'FINISHED', 'RESOLVED']
};

// Helper to map H1 column names to visual columns (TODO/WIP/DONE)
function mapColumnToVisualColumn(columnName) {
  const upperName = columnName.toUpperCase();
  
  // Check each column category
  for (const [column, keywords] of Object.entries(COLUMN_CATEGORIES)) {
    if (keywords.some(keyword => upperName.includes(keyword))) {
      return column;
    }
  }
  
  // Default to TODO if no match
  return 'TODO';
}

/**
 * Parses a todo markdown file into structured data
 * @param {string} fileContent - The content of the todo markdown file
 * @returns {Array} Array of sections with their items
 * 
 * File format:
 * - H1 (#) defines columns (e.g., # TODO, # SCHEDULED, # ARCHIVE)
 * - H2 (##) defines large sections within columns
 * - H3 (###) defines small sections within columns
 * - Columns are mapped to visual columns (TODO/WIP/DONE) based on keywords
 */
export function parseTodoMdFile(fileContent) {
  console.log('==== PARSING TODO MD FILE ====');
  console.log('File content length:', fileContent?.length || 0);

  if (!fileContent) {
    console.error('Empty file content provided to parser');
    return [];
  }

  const lines = fileContent.split('\n');
  console.log('Number of lines:', lines.length);

  // Array to store all sections (not columns - columns are H1 markers)
  const sections = [];

  // Track current parsing context
  let currentColumn = null;  // Current H1 column we're in
  let currentSection = null; // Current H2/H3 section we're in
  let itemId = 1;

  // Helper to create a section (H2 or H3 in the markdown)
  const createSection = (name, visualColumn, headerStyle, fileColumn = null) => {
    const newSection = {
      name,
      column: visualColumn,  // Which visual column (TODO/WIP/DONE) this section appears in
      headerStyle,           // 'LARGE' for H2, 'SMALL' for H3
      fileColumn,          // The H1 column this section belongs to in the file
      archivable: false,
      hidden: false,
      on_ice: false,  // Not used in new format
      items: []
    };
    
    // Small sections (H3) are archivable
    if (headerStyle === 'SMALL') {
      newSection.archivable = true;
    }
    
    sections.push(newSection);
    return newSection;
  };

  // No default section - items must be in a section

  // Parse the lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      continue;
    }

    // H1 - Column header (# COLUMN_NAME)
    if (trimmedLine.match(/^# /)) {
      currentColumn = trimmedLine.substring(2).trim();
      
      // H1 headers are column markers, not sections
      // Reset current section
      currentSection = null;
      continue;
    }

    // H2 - Large section header (## SECTION_NAME)
    if (trimmedLine.match(/^## [^#]/)) {
      const sectionName = trimmedLine.substring(3).trim();
      
      // If we have a current column, use its visual column, otherwise determine from section name
      const visualColumn = currentColumn ? mapColumnToVisualColumn(currentColumn) : mapColumnToVisualColumn(sectionName);
      
      currentSection = createSection(sectionName, visualColumn, 'LARGE', currentColumn);
      continue;
    }

    // H3 - Small section header (### SECTION_NAME)
    if (trimmedLine.match(/^### [^#]/)) {
      const sectionName = trimmedLine.substring(4).trim();
      
      // Small sections inherit the visual column from the current H1 column
      const visualColumn = currentColumn ? mapColumnToVisualColumn(currentColumn) : 'TODO';
      
      currentSection = createSection(sectionName, visualColumn, 'SMALL', currentColumn);
      continue;
    }

    // Parse todo items
    if (trimmedLine.startsWith('* ')) {
      const statusMatch = trimmedLine.match(/\* \[([ x~-])\]/);

      if (statusMatch) {
        const statusChar = statusMatch[1];
        const todoText = trimmedLine.substring(statusMatch[0].length).trim();

        const todoItem = {
          id: itemId++,
          statusChar,
          text: todoText,
          displayText: getStrippedDisplayText(todoText),
          lineIndex: i
        };

        // Add item to the current section (items must be in a section)
        if (currentSection) {
          currentSection.items.push(todoItem);
        } else {
          console.warn(`Skipping item at line ${i + 1}: "${todoText}" - items must be inside a section`);
        }
      }
    }
  }


  console.log('Parsed sections:', sections.map(s => `${s.name} (${s.column})`));
  return sections;
}

/**
 * Renders sections and items back into todo markdown format
 * @param {Array} sections - Array of section objects with items
 * @returns {string} The formatted text content of the todo markdown file
 */
export function renderTodoMdFile(sections) {
  console.log('==== RENDERING TODO MD FILE ====');
  
  if (!sections) {
    console.error('No sections provided to render');
    return '';
  }
  
  console.log('Sections count:', sections.length);

  if (!sections.length) {
    console.error('No sections provided to render');
    return '';
  }

  let outputContent = '';
  let currentColumn = null;

  // Sections are already in order from parsing
  sections.forEach((section, index) => {
    // Add spacing between sections
    if (index > 0) {
      outputContent += '\n';
    }

    // Check if we need to render an H1 column header
    if (section.fileColumn && section.fileColumn !== currentColumn) {
      if (currentColumn !== null) {
        outputContent += '\n';
      }
      outputContent += `# ${section.fileColumn}\n`;
      currentColumn = section.fileColumn;
    }

    // Render section header based on style
    if (section.headerStyle === 'LARGE') {
      outputContent += `## ${section.name}\n`;
    } else if (section.headerStyle === 'SMALL') {
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