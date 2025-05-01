const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('dist'));

const TODO_FILE_PATH = path.join(__dirname, 'example_todo.txt');

// Get todo file content
app.get('/api/todos', (req, res) => {
  try {
    const fileContent = fs.readFileSync(TODO_FILE_PATH, 'utf8');
    res.json({ content: fileContent });
  } catch (error) {
    console.error('Error reading todo file:', error);
    res.status(500).json({ error: 'Failed to read todo file' });
  }
});

// Update todo file content
app.post('/api/todos', (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    fs.writeFileSync(TODO_FILE_PATH, content, 'utf8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing todo file:', error);
    res.status(500).json({ error: 'Failed to write todo file' });
  }
});

// Update item status (move between columns)
app.post('/api/todos/update-status', (req, res) => {
  try {
    const { itemId, newStatus, category, text } = req.body;
    
    if (!itemId || !newStatus) {
      return res.status(400).json({ error: 'ItemId and newStatus are required' });
    }
    
    let fileContent = fs.readFileSync(TODO_FILE_PATH, 'utf8');
    
    // Build the pattern to match the item based on the text
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\* \\[([\\sx~-])\\] ${escapedText}`);
    
    // Replace the status marker with the new status
    fileContent = fileContent.replace(pattern, `* [${newStatus}] ${text}`);
    
    fs.writeFileSync(TODO_FILE_PATH, fileContent, 'utf8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ error: 'Failed to update item status' });
  }
});

// Add new todo item
app.post('/api/todos/add-item', (req, res) => {
  try {
    const { text, status, category } = req.body;
    
    if (!text || !status || !category) {
      return res.status(400).json({ error: 'Text, status, and category are required' });
    }
    
    let fileContent = fs.readFileSync(TODO_FILE_PATH, 'utf8');
    
    // Find the category section in the file
    const categoryPattern = new RegExp(`#+\\s*${category}\\s*#+`);
    const categoryMatch = fileContent.match(categoryPattern);
    
    if (!categoryMatch) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Find the position to insert the new item (after the category header)
    const insertPosition = categoryMatch.index + categoryMatch[0].length;
    
    // Insert the new item
    const newItem = `\n* [${status}] ${text}`;
    fileContent = fileContent.slice(0, insertPosition) + newItem + fileContent.slice(insertPosition);
    
    fs.writeFileSync(TODO_FILE_PATH, fileContent, 'utf8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding new item:', error);
    res.status(500).json({ error: 'Failed to add new item' });
  }
});

// Add new category
app.post('/api/todos/add-category', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    let fileContent = fs.readFileSync(TODO_FILE_PATH, 'utf8');
    
    // Create the new category section
    const newCategory = `\n\n#########\n# ${name.toUpperCase()} #\n#########\n`;
    
    // Add the new category before the NOTES section or at the end if no NOTES section
    const notesPattern = /#+ NOTES #+/;
    const notesMatch = fileContent.match(notesPattern);
    
    if (notesMatch) {
      const insertPosition = notesMatch.index;
      fileContent = fileContent.slice(0, insertPosition) + newCategory + fileContent.slice(insertPosition);
    } else {
      fileContent += newCategory;
    }
    
    fs.writeFileSync(TODO_FILE_PATH, fileContent, 'utf8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding new category:', error);
    res.status(500).json({ error: 'Failed to add new category' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
