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
 * @returns {Object} Nested structure with fileColumnOrder and columns
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
    return { fileColumnOrder: [], columns: {} };
  }

  const lines = fileContent.split('\n');
  console.log('Number of lines:', lines.length);

  // Object to store sections organized by file column
  const fileColumns = new Map();  // Map<columnName, {visualColumn, sections}>
  
  // Track seen column names to handle duplicates
  const seenColumns = new Set();

  // Track current parsing context
  let currentColumn = null;  // Current H1 column we're in
  let currentSection = null; // Current H2/H3 section we're in
  let itemId = 1;

  // Helper to create a section (H2 or H3 in the markdown)
  const createSection = (name, headerStyle) => {
    const newSection = {
      name,
      headerStyle,           // 'LARGE' for H2, 'SMALL' for H3
      archivable: false,
      on_ice: false,  // Not used in new format
      items: []
    };
    
    // Small sections (H3) are archivable
    if (headerStyle === 'SMALL') {
      newSection.archivable = true;
    }
    
    // Add section to current column
    if (currentColumn && fileColumns.has(currentColumn)) {
      fileColumns.get(currentColumn).sections.push(newSection);
    }
    
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
      let columnName = trimmedLine.substring(2).trim();
      
      // Handle duplicate column names
      if (seenColumns.has(columnName)) {
        let counter = 2;
        while (seenColumns.has(`${columnName}-${counter}`)) {
          counter++;
        }
        columnName = `${columnName}-${counter}`;
        console.log(`Duplicate column renamed: ${trimmedLine.substring(2).trim()} -> ${columnName}`);
      }
      seenColumns.add(columnName);
      
      currentColumn = columnName;
      
      // Initialize the file column if it doesn't exist
      if (!fileColumns.has(currentColumn)) {
        fileColumns.set(currentColumn, {
          visualColumn: mapColumnToVisualColumn(currentColumn),
          sections: []
        });
      }
      
      // H1 headers are column markers, not sections
      // Reset current section
      currentSection = null;
      continue;
    }

    // H2 - Large section header (## SECTION_NAME)
    if (trimmedLine.match(/^## [^#]/)) {
      const sectionName = trimmedLine.substring(3).trim();
      
      currentSection = createSection(sectionName, 'LARGE');
      continue;
    }

    // H3 - Small section header (### SECTION_NAME)
    if (trimmedLine.match(/^### [^#]/)) {
      const sectionName = trimmedLine.substring(4).trim();
      
      currentSection = createSection(sectionName, 'SMALL');
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


  console.log('Parsed file columns:', Array.from(fileColumns.keys()));
  
  // Convert Map to the expected structure
  const fileColumnOrder = Array.from(fileColumns.keys());
  const columns = {};
  
  fileColumns.forEach((columnData, columnName) => {
    columns[columnName] = columnData;
  });
  
  console.log('Generated structure:', { fileColumnOrder, columns });
  
  // Return nested structure
  return {
    fileColumnOrder,
    columns
  };
}

/**
 * Renders sections and items back into todo markdown format
 * @param {Object} data - Nested structure with fileColumnOrder and columns
 * @returns {string} The formatted text content of the todo markdown file
 */
export function renderTodoMdFile(data) {
  console.log('==== RENDERING TODO MD FILE ====');
  
  if (!data || !data.fileColumnOrder || !data.columns) {
    console.error('Invalid data provided to render - must have fileColumnOrder and columns');
    return '';
  }
  
  const { fileColumnOrder, columns } = data;
  console.log('File columns:', fileColumnOrder);

  let outputContent = '';
  
  // Render from nested structure
    fileColumnOrder.forEach((columnName, columnIndex) => {
      const columnData = columns[columnName];
      if (!columnData) return;
      
      // Add spacing between columns
      if (columnIndex > 0) {
        outputContent += '\n';
      }
      
      // Render H1 column header
      outputContent += `# ${columnName}\n`;
      
      // Render sections in this column
      columnData.sections.forEach((section, sectionIndex) => {
        // Add spacing between sections
        if (sectionIndex > 0) {
          outputContent += '\n';
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
    });

  console.log('Generated content length:', outputContent.length);
  return outputContent;
}