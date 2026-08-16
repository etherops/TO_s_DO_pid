// utils/sectionHelpers.js

/**
 * Extract all sections from todoData structure
 * @param {Object} todoData - The todo data object containing columns and sections
 * @returns {Array} Array of section objects with metadata
 */
export const extractAllSections = (todoData) => {
  const sections = [];
  
  if (!todoData || !todoData.columnOrder || !todoData.columnStacks) {
    return sections;
  }
  
  for (const columnName of todoData.columnOrder) {
    const columnStack = todoData.columnStacks[columnName];
    if (columnStack?.sections) {
      columnStack.sections.forEach((section, index) => {
        sections.push({
          sectionName: section.name,
          sectionIndex: index,
          columnName: columnName,
          stackType: columnStack.name, // TODO/WIP/DONE
          path: `${columnName} → ${section.name}`,
          section: section // Include full section object for reference
        });
      });
    }
  }
  
  return sections;
};

/**
 * Group sections by column for hierarchical display
 * @param {Array} sections - Array of section objects from extractAllSections
 * @returns {Object} Sections grouped by column
 */
export const groupSectionsByColumn = (sections) => {
  const grouped = {};
  
  sections.forEach(section => {
    if (!grouped[section.columnName]) {
      grouped[section.columnName] = {
        columnName: section.columnName,
        stackType: section.stackType,
        sections: []
      };
    }
    grouped[section.columnName].sections.push(section);
  });
  
  return grouped;
};
