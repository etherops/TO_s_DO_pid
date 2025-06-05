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
 * - Any unparsable lines become "raw-text" items within sections
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
      type: 'section',       // Regular section
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
  
  // Helper to create a raw-text section from a single line
  const createRawTextSection = (line, lineIndex) => {
    const rawTextSection = {
      name: '', // RawText sections don't have names
      type: 'raw-text',
      headerStyle: 'RAW-TEXT',
      archivable: false,
      on_ice: false,
      text: line,  // Store the full line including indentation
      displayText: line.trim(),  // For display purposes
      lineIndex: lineIndex,
      id: itemId++
    };
    
    // Add to current column
    if (currentColumn && fileColumns.has(currentColumn)) {
      fileColumns.get(currentColumn).sections.push(rawTextSection);
    }
    
    return rawTextSection;
  };

  // Helper to create a raw-text column from a single line (for lines before first H1)
  const createRawTextColumn = (line, lineIndex) => {
    const columnName = `raw-text-${itemId++}`;
    
    // Create a raw-text column - the COLUMN itself is raw-text, not containing sections
    fileColumns.set(columnName, {
      visualColumn: 'TODO', // Raw-text columns display in TODO stack
      type: 'raw-text', // The column itself is raw-text
      text: line,  // Store the full line including indentation
      displayText: line.trim(),  // For display purposes
      lineIndex: lineIndex,
      sections: [] // Raw-text columns have no sections
    });
    
    return columnName;
  };

  // Parse the lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines - we'll add standard spacing when rendering
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

      if (statusMatch && currentSection) {
        const statusChar = statusMatch[1];
        const todoText = trimmedLine.substring(statusMatch[0].length).trim();

        const todoItem = {
          id: itemId++,
          type: 'task',
          statusChar,
          text: todoText,
          displayText: getStrippedDisplayText(todoText),
          lineIndex: i
        };

        currentSection.items.push(todoItem);
        continue;
      }
    }

    // Any line that doesn't match our expected format becomes an raw-text item
    if (!currentSection) {
      // If we have a current column but no section, this is a column-level raw-text section
      if (currentColumn) {
        createRawTextSection(line, i);
        console.log(`Added column-level raw-text section at line ${i + 1}: "${line.trim()}"`);
      } else {
        // No current column - this is a raw-text line before the first column
        createRawTextColumn(line, i);
        console.log(`Added raw-text column for line ${i + 1}: "${line.trim()}"`);
      }
      continue;
    }

    const rawTextItem = {
      id: itemId++,
      type: 'raw-text',
      text: line,  // Store the full line including indentation
      displayText: line.trim(),  // For display purposes
      lineIndex: i
    };
    
    currentSection.items.push(rawTextItem);
    console.log(`Added section-level raw-text at line ${i + 1}: "${line.trim()}"`);
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

  const outputLines = [];
  
  fileColumnOrder.forEach((columnName, columnIndex) => {
    const columnData = columns[columnName];
    if (!columnData) return;
    
    // Handle raw-text columns (the column itself is raw-text)
    if (columnData.type === 'raw-text') {
      // For raw-text columns, just output the text without any header
      if (columnIndex > 0) {
        outputLines.push('');
      }
      outputLines.push(columnData.text);
      return;
    }
    
    // Regular columns - add spacing between columns
    if (columnIndex > 0) {
      outputLines.push('');
    }
    
    // Render H1 column header
    outputLines.push(`# ${columnName}`);
    
    // Render sections in this column
    columnData.sections.forEach((section, sectionIndex) => {
      if (section.type === 'raw-text') {
        // raw-text section - render text directly without section header
        outputLines.push(section.text);
      } else {
        // Regular section
        // Add spacing between sections (but not before the first section in a column)
        if (sectionIndex > 0) {
          outputLines.push('');
        }
        
        // Render section header based on style
        if (section.headerStyle === 'LARGE') {
          outputLines.push(`## ${section.name}`);
        } else if (section.headerStyle === 'SMALL') {
          outputLines.push(`### ${section.name}`);
        }
        
        // Render items in this section
        if (section.items && section.items.length > 0) {
          section.items.forEach(item => {
            if (item.type === 'raw-text') {
              // Render raw-text items as-is
              outputLines.push(item.text);
            } else {
              // Render task items
              outputLines.push(`* [${item.statusChar}] ${item.text}`);
            }
          });
        }
      }
    });
  });

  const outputContent = outputLines.join('\n');
  console.log('Generated content length:', outputContent.length);
  return outputContent;
}