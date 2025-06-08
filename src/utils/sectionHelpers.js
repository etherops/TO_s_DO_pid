// utils/sectionHelpers.js

/**
 * Generate a leftovers section name from the archived section
 * @param {string} archivedSectionName - Name of the section being archived
 * @returns {string} Leftovers section name (e.g., "Leftovers from 'Original Section'")
 */
export const generateLeftoversSectionName = (archivedSectionName) => {
  return `Leftovers from "${archivedSectionName}"`;
};