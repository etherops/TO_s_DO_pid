// Completion date utilities for task and section completion tracking

// Format a date to the completion date format: | Thurs, March 21
export const formatCompletionDate = (date = new Date()) => {
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNumber = date.getDate();
  
  return `| ${dayName}, ${monthName} ${dayNumber}`;
};


// Extract completion date from text (looks for |... pattern at the end)
export const extractCompletionDate = (text) => {
  if (!text) return null;
  
  // Look for pipe followed by date at the end of string
  const match = text.match(/\|([^|]+)$/);
  return match ? match[1].trim() : null;
};


// Check if text has a completion date
export const hasCompletionDate = (text) => {
  return extractCompletionDate(text) !== null;
};

// Add completion date to text
export const addCompletionDate = (text, date = new Date()) => {
  if (!text) return formatCompletionDate(date);
  
  // Remove existing completion date if present
  const cleanText = removeCompletionDate(text);
  
  // Add new completion date at the end (space before pipe)
  return `${cleanText} ${formatCompletionDate(date)}`;
};

// Remove completion date from text
export const removeCompletionDate = (text) => {
  if (!text) return '';
  
  // Remove pipe and everything after it at the end of string
  return text.replace(/\s*\|[^|]*$/, '').trim();
};

// Get badge format from completion date text
export const getCompletionBadgeFromText = (text) => {
  const completionDateStr = extractCompletionDate(text);
  if (!completionDateStr) return null;

  return completionDateStr;
};