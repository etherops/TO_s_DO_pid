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
  
  // Default sections
  const createSection = (name, isArchive = false) => {
    return {
      name,
      isArchive,
      items: [], // All items in this section
      categories: [] // Categories in this section
    };
  };
  
  // Helper to get or create a section
  const getOrCreateSection = (name, isArchive = false) => {
    if (!sectionsMap.has(name)) {
      const newSection = createSection(name, isArchive);
      sectionsMap.set(name, newSection);
      sections.push(newSection);
    }
    return sectionsMap.get(name);
  };
  
  // Helper to get or create a category within a section
  const getOrCreateCategory = (section, categoryName) => {
    let category = section.categories.find(cat => cat.name === categoryName);
    if (!category) {
      category = {
        name: categoryName,
        items: []
      };
      section.categories.push(category);
    }
    return category;
  };
  
  // Create default sections for organization
  const mainSection = getOrCreateSection('Main');
  const archiveSection = getOrCreateSection('Archive', true);
  
  let currentSection = mainSection;
  let currentCategory = '';
  let inArchive = false;
  let itemId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if we're in the archive section
    if (trimmedLine.includes('ARCHIVE')) {
      inArchive = true;
      currentSection = archiveSection;
      continue;
    }
    
    // Skip section dividers and empty lines
    if (trimmedLine.match(/^#+$/) || trimmedLine === '') {
      continue;
    }
    
    // Parse category headers - more flexible to handle variations like "### CURRENT DAY (Thursday)"
    if (trimmedLine.startsWith('#')) {
      // Extract the section name from the header, handling formats with parentheses
      let sectionName = trimmedLine.replace(/#/g, '').trim();
      
      // If we're in archive, create sections for archive months/weeks
      if (inArchive) {
        currentSection = getOrCreateSection(sectionName, true);
      } else {
        // If not in archive, just update the current section
        currentSection = getOrCreateSection(sectionName);
      }
      
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
        const statusChar = statusMatch[1];
        const todoText = trimmedLine.substring(statusMatch[0].length).trim();
        
        const todoItem = {
          id: itemId++,
          statusChar,
          text: todoText,
          originalText: trimmedLine,
          category: currentCategory || currentSection.name,
          section: currentSection.name,
          lineIndex: i
        };
        
        // Add to the current section's items
        currentSection.items.push(todoItem);
        
        // Add to category within the section
        const categoryName = currentCategory || currentSection.name;
        const category = getOrCreateCategory(currentSection, categoryName);
        category.items.push(todoItem);
      }
    }
  }
  
  return sections;
}

/**
 * Updates the status of an item in the todo text file
 * @param {string} fileContent - The original content of the todo file
 * @param {Object} item - The item to update
 * @param {string} newStatusChar - The new status character (' ', '~', 'x')
 * @returns {string} Updated file content
 */
export function updateItemStatus(fileContent, item, newStatusChar) {
  console.log('==== UPDATE ITEM STATUS ====');
  console.log('Item to update:', item);
  console.log('New status char:', newStatusChar);
  
  const lines = fileContent.split('\n');
  console.log('Line count:', lines.length);
  
  // Find the line that contains the item
  console.log('Looking for text:', item.text);
  console.log('Looking for status char:', item.statusChar);
  
  // Try to find the exact line
  const lineToUpdate = lines.findIndex(line => 
    line.includes(item.text) && line.includes(`* [${item.statusChar}]`));
  
  console.log('Found line index:', lineToUpdate);
  
  if (lineToUpdate !== -1) {
    console.log('Original line:', lines[lineToUpdate]);
    
    // Replace the status character with the new one
    const oldStatusPattern = `* [${item.statusChar}]`;
    const newStatusPattern = `* [${newStatusChar}]`;
    
    console.log('Old status pattern:', oldStatusPattern);
    console.log('New status pattern:', newStatusPattern);
    
    lines[lineToUpdate] = lines[lineToUpdate].replace(oldStatusPattern, newStatusPattern);
    console.log('Updated line:', lines[lineToUpdate]);
  } else {
    console.error('Could not find the line to update!');
    
    // Debug info for finding the right line
    console.log('Looking for partial matches...');
    const textMatches = lines.filter(line => line.includes(item.text));
    console.log('Lines containing the text:', textMatches);
    
    const statusMatches = lines.filter(line => line.includes(item.status));
    console.log('Lines containing the status:', statusMatches);
    
    // Try alternative approach - just look for the text with any status marker
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(item.text) && line.match(/\* \[([ x~-])\]/)) {
        console.log('Found alternative match at line', i, ':', line);
        
        // Update this line instead
        lines[i] = line.replace(/\* \[([ x~-])\]/, `* [${newStatusChar}]`);
        console.log('Updated to:', lines[i]);
        break;
      }
    }
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
  
  // Escape special characters in the category name for regex
  const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Find the section for the category using multiple approaches
  let categoryHeaderIndex = -1;
  
  // Try different regex patterns
  const categoryPatterns = [
    new RegExp(`#+\\s*${escapedCategory}\\s*#+`),
    new RegExp(`^###\\s*${escapedCategory}`),
    new RegExp(`^##\\s*${escapedCategory}`),
    new RegExp(`^#\\s*${escapedCategory}`)
  ];
  
  // Try each pattern
  for (const pattern of categoryPatterns) {
    categoryHeaderIndex = lines.findIndex(line => pattern.test(line.trim()));
    if (categoryHeaderIndex !== -1) break;
  }
  
  // If not found, try a simple contains approach for special formats
  if (categoryHeaderIndex === -1) {
    categoryHeaderIndex = lines.findIndex(line => 
      line.trim().startsWith('#') && line.includes(category));
  }
  
  if (categoryHeaderIndex !== -1) {
    // Check if there's a decoration line below the header
    let insertIndex = categoryHeaderIndex + 1;
    if (insertIndex < lines.length && lines[insertIndex].trim().match(/^#+$/)) {
      insertIndex++;
    }
    
    // Insert the new item after the category header (and decoration if present)
    lines.splice(insertIndex, 0, newItem);
  } else {
    // If category doesn't exist, add it before the archive section
    const archiveIndex = lines.findIndex(line =>
      line.match(/#+\s*ARCHIVE\s*#+/) || (line.startsWith('#') && line.includes('ARCHIVE')));

    if (archiveIndex !== -1) {
      const newCategory = [
        '',
        `#########`,
        `# ${category} #`,
        `#########`,
        newItem
      ];

      lines.splice(archiveIndex, 0, ...newCategory);
    } else {
      // If no archive section, add to the end
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

/**
 * Reorders items within a category and status
 * @param {string} fileContent - The original content of the todo file
 * @param {Array} items - The items in their new order
 * @param {string} category - The category containing the items
 * @param {string} status - The status column ('todo', 'wip', 'done')
 * @returns {string} Updated file content
 */
export function reorderItems(fileContent, items, category, status) {
  console.log('==== REORDERING ITEMS ====');
  console.log('Items to reorder:', items);
  console.log('Category:', category);
  console.log('Status:', status);
  
  // Check if any items have a different category than the passed category parameter
  // This indicates the items have been moved to a new category
  const itemCategories = new Set(items.map(item => item.category));
  console.log('Item categories:', Array.from(itemCategories));
  
  // Check for category change using either originalCategory or item.category
  const hasCategoryChangeWithOriginal = items.length > 0 && 
                                      items.some(item => item.originalCategory && 
                                                item.originalCategory !== category);
                                                
  const hasCategoryChangeInItem = items.length > 0 && itemCategories.size === 1 && 
                               items[0].category !== category && items[0].category !== undefined;
  
  const hasCategoryChange = hasCategoryChangeWithOriginal || hasCategoryChangeInItem;
  
  if (hasCategoryChange) {
    // Use the category from the items instead
    const newCategory = hasCategoryChangeWithOriginal ? 
                     items[0].category : 
                     items[0].category;
    
    console.log(`Category change detected: from ${category} to ${newCategory}`);
    category = newCategory;
  }
  
  const lines = fileContent.split('\n');
  console.log('Total lines in file:', lines.length);
  
  // Map status to character
  let statusChar = ' ';
  if (status === 'wip') statusChar = '~';
  if (status === 'done') statusChar = 'x';
  console.log('Status character for matching:', statusChar);
  
  // Find the category header using multiple approaches
  let categoryHeaderIndex = -1;
  
  // Escape special regex characters in the category name
  const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  console.log('Escaped category for regex:', escapedCategory);
  
  // Method 1: Try different regex patterns for category headers
  const categoryPatterns = [
    // Standard format: "# CATEGORY #"
    new RegExp(`^#+\\s*${escapedCategory}\\s*#+$`),
    // Format with no spaces: "#CATEGORY#"
    new RegExp(`^#+${escapedCategory}#+$`),
    // Format with spaces and no trailing #: "# CATEGORY"
    new RegExp(`^#+\\s*${escapedCategory}$`),
    // H3 format: "### CATEGORY"
    new RegExp(`^###\\s*${escapedCategory}\\b`),
    // Any header with the category name
    new RegExp(`^#+.*${escapedCategory}.*#+$`)
  ];
  
  // Try each pattern
  for (const pattern of categoryPatterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i].trim())) {
        categoryHeaderIndex = i;
        console.log('Found category header at line', i, 'with pattern:', pattern);
        console.log('Header line:', lines[i]);
        break;
      }
    }
    if (categoryHeaderIndex !== -1) break;
  }
  
  // Method 2: Simple contains check for special formats
  if (categoryHeaderIndex === -1) {
    console.log('Trying simple contains check for special formats');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Check if line starts with #, contains the category name, and ends with # or contains characters like ()
      if (line.startsWith('#') && line.includes(category)) {
        categoryHeaderIndex = i;
        console.log('Found category with simple contains at line', i, ':', line);
        break;
      }
    }
  }
  
  // Method 3: Look for exact section header format (useful for categories like "CURRENT DAY (Thursday May 1)")
  if (categoryHeaderIndex === -1) {
    console.log('Trying exact section header check');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === `### ${category}` || line === `## ${category}` || line === `# ${category}`) {
        categoryHeaderIndex = i;
        console.log('Found exact section header at line', i, ':', line);
        break;
      }
    }
  }
  
  // Method 4: Last resort - check items' category field
  if (categoryHeaderIndex === -1 && items.length > 0) {
    console.log('Trying to find section based on item category');
    // Get the section from the first item
    const itemCategory = items[0].category || category;
    
    // Try to find a header that contains this section name
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#') && line.includes(itemCategory)) {
        categoryHeaderIndex = i;
        console.log('Found section header based on item category at line', i, ':', line);
        break;
      }
    }
  }
  
  if (categoryHeaderIndex === -1) {
    console.error('Category not found for reordering:', category);
    console.log('Lines containing similar text:');
    
    // Find similar lines for debugging
    const similarLines = lines
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => line.startsWith('#') && 
               category.split(' ').some(word => line.includes(word)))
      .slice(0, 5);
    
    similarLines.forEach(({ line, idx }) => {
      console.log(`Line ${idx}: "${line}"`);
    });
    
    console.log('All category headers in file:');
    lines.forEach((line, idx) => {
      if (line.trim().match(/^#+.*#+$/) || (line.trim().startsWith('#') && line.trim().length > 1)) {
        console.log(`Line ${idx}: "${line}"`);
      }
    });
    
    return fileContent;
  }
  
  console.log('Category header line:', lines[categoryHeaderIndex]);
  
  // Check for header decoration lines
  let headerTopDecoration = -1;
  let headerBottomDecoration = -1;
  
  // Check if we have a decoration line above the header
  if (categoryHeaderIndex > 0 && lines[categoryHeaderIndex - 1].trim().match(/^#+$/)) {
    headerTopDecoration = categoryHeaderIndex - 1;
    console.log('Found top decoration line:', lines[headerTopDecoration]);
  }
  
  // Check if we have a decoration line below the header
  if (categoryHeaderIndex < lines.length - 1 && lines[categoryHeaderIndex + 1].trim().match(/^#+$/)) {
    headerBottomDecoration = categoryHeaderIndex + 1;
    console.log('Found bottom decoration line:', lines[headerBottomDecoration]);
  }
  
  // Calculate the actual content start index (after header and decorations)
  let contentStartIndex = categoryHeaderIndex + 1;
  if (headerBottomDecoration !== -1) {
    contentStartIndex = headerBottomDecoration + 1;
  }
  console.log('Content starts at line:', contentStartIndex);
  
  // Find all items in this category with the matching status
  const categoryItems = [];
  const categoryItemIndices = [];
  
  // Scan all lines after content start index
  console.log('Scanning for category items...');
  
  for (let i = contentStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Stop if we hit another category header or decoration line
    if (line.match(/^#+/) && !line.match(/^#+$/)) {
      console.log('Reached next section at line', i, ':', line);
      break;
    }
    
    // Also stop at decoration lines that might indicate a new section
    if (line.match(/^#+$/)) {
      // Check if the next line is a header
      if (i + 1 < lines.length && lines[i + 1].match(/^#+/) && !lines[i + 1].match(/^#+$/)) {
        console.log('Reached section decoration at line', i, ':', line);
        break;
      }
    }
    
    console.log(`Line ${i}: "${line}" - Status check:`, line.includes(`[${statusChar}]`));
    
    // Match items with the correct status character
    if (line.startsWith('* ') && line.includes(`[${statusChar}]`)) {
      console.log('Found item with matching status at line', i);
      
      let matched = false;
      for (const item of items) {
        // Clean text for comparison
        const itemText = item.text.trim();
        const lineText = line.replace(/^\* \[[x~ ]\]\s*/, '').trim();
        
        // Check if line contains item text (more flexible matching)
        if (line.includes(itemText) || lineText.includes(itemText) || 
            itemText.includes(lineText) || lineText === itemText) {
          console.log('Matched with item:', itemText);
          categoryItems.push(item);
          categoryItemIndices.push(i);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        console.log('No match found for line', i, 'in the provided items list');
      }
    }
  }
  
  console.log('Found category items:', categoryItems.length);
  console.log('Item indices:', categoryItemIndices);
  
  if (categoryItems.length === 0 || categoryItemIndices.length === 0) {
    // If this is a category change, we might need to add items to the new category
    if (hasCategoryChange) {
      console.log('Category change detected but no matching items found in new category.');
      console.log('Will add the items to the new category.');
      
      // Create a new array of lines for this section
      const newLines = [...lines];
      
      // Log what we're adding
      console.log('Adding items to new category:');
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const newLine = `* [${statusChar}] ${item.text}`;
        // Insert at the proper position after content start index
        const insertPosition = contentStartIndex + i;
        console.log(`Adding at position ${insertPosition}: "${newLine}"`);
        newLines.splice(insertPosition, 0, newLine);
      }
      
      console.log('Category change complete');
      return newLines.join('\n');
    } else {
      console.error('No matching items found in category');
      
      // Debug which items we're looking for
      console.log('Items we are looking for:');
      items.forEach((item, idx) => {
        console.log(`Item ${idx}:`, item.text);
      });
      
      // Show the category contents for debugging
      console.log('Category content:');
      let nextCategoryIndex = lines.findIndex((line, idx) => 
        idx > contentStartIndex && (line.trim().match(/^#+\s*[A-Z]/) || line.trim().match(/^#+$/)));
      
      if (nextCategoryIndex === -1) nextCategoryIndex = lines.length;
      
      console.log(lines.slice(contentStartIndex, nextCategoryIndex).join('\n'));
      return fileContent;
    }
  }
  
  // Create a new array of lines for this section
  const newLines = [...lines];
  
  // Log what we're removing
  console.log('Removing old items:');
  for (let i = categoryItemIndices.length - 1; i >= 0; i--) {
    const lineIdx = categoryItemIndices[i];
    console.log(`Removing line ${lineIdx}: "${lines[lineIdx]}"`);
  }
  
  // Remove all the existing items (going backwards to not mess up indices)
  for (let i = categoryItemIndices.length - 1; i >= 0; i--) {
    newLines.splice(categoryItemIndices[i], 1);
  }
  
  // Log what we're adding back
  console.log('Adding items in new order:');
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const newLine = `* [${statusChar}] ${item.text}`;
    // Insert at the proper position after content start index
    const insertPosition = contentStartIndex + i;
    console.log(`Adding at position ${insertPosition}: "${newLine}"`);
    newLines.splice(insertPosition, 0, newLine);
  }
  
  console.log('Reordering complete');
  return newLines.join('\n');
}
