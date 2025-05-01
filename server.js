const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// Add a logger function to help with debugging
const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${message}`, data || '');
  },
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error || '');
    if (error && error.stack) {
      console.error(`[STACK] ${error.stack}`);
    }
  },
  debug: (message, data) => {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '5mb'}));
app.use(express.static('dist'));

const TODO_FILE_PATH = path.join(__dirname, 'example_todo.txt');

// Get todo file content
app.get('/api/todos', (req, res) => {
  try {
    logger.info('Reading todo file', { path: TODO_FILE_PATH });
    const fileContent = fs.readFileSync(TODO_FILE_PATH, 'utf8');
    res.json({ content: fileContent });
  } catch (error) {
    logger.error('Error reading todo file:', error);
    res.status(500).json({ error: 'Failed to read todo file' });
  }
});

// Update todo file content - only endpoint for writing to file
app.post('/api/todos', (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      logger.error('Missing content in request');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    logger.info('Writing todo file', { path: TODO_FILE_PATH, contentLength: content.length });
    fs.writeFileSync(TODO_FILE_PATH, content, 'utf8');
    logger.info('Todo file successfully written');
    res.json({ success: true });
  } catch (error) {
    logger.error('Error writing todo file:', error);
    res.status(500).json({ error: 'Failed to write todo file' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
