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

// Function to get the default todo file path
const getDefaultTodoFilePath = () => {
  const todoFilePath = path.join(__dirname, 'todo.txt');
  const exampleTodoFilePath = path.join(__dirname, 'example_todo.txt');

  // Check if todo.txt exists, if not fallback to example_todo.txt
  if (fs.existsSync(todoFilePath)) {
    logger.info('Using todo.txt as default file');
    return todoFilePath;
  } else {
    logger.info('Fallback to example_todo.txt as default file');
    return exampleTodoFilePath;
  }
};

// Function to create a backup of a todo file
const createBackup = (filePath) => {
  try {
    // Get the directory where the file is located
    const fileDir = path.dirname(filePath);

    // Create backup directory path
    const backupDirName = '.TO_s_DO_pid.bak';
    const backupDirPath = path.join(fileDir, backupDirName);

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDirPath)) {
      logger.info('Creating backup directory', { path: backupDirPath });
      fs.mkdirSync(backupDirPath);
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create backup filename with today's date
    const fileName = path.basename(filePath);
    // Extract filename without extension
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const backupFileName = `${fileNameWithoutExt}.bak.${today}.txt`;
    const backupFilePath = path.join(backupDirPath, backupFileName);

    // Check if backup already exists for today
    if (fs.existsSync(backupFilePath)) {
      logger.info('Backup already exists for today', { path: backupFilePath });
      return;
    }

    // Create backup
    logger.info('Creating backup', { path: backupFilePath });
    fs.copyFileSync(filePath, backupFilePath);
    logger.info('Backup created successfully');
  } catch (error) {
    logger.error('Error creating backup:', error);
    // Don't throw the error, just log it - we don't want to prevent the main file write
  }
};

// Get todo file path from filename or use default
const getTodoFilePath = (filename) => {
  if (filename) {
    return path.join(__dirname, filename);
  }
  return getDefaultTodoFilePath();
};

// Get all .txt files in the server directory
app.get('/api/files', (req, res) => {
  try {
    logger.info('Listing text files in directory');
    const files = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.txt'))
      .map(file => ({ name: file }));

    res.json({ files });
  } catch (error) {
    logger.error('Error listing text files:', error);
    res.status(500).json({ error: 'Failed to list text files' });
  }
});

// Get todo file content
app.get('/api/todos', (req, res) => {
  try {
    const filename = req.query.filename;
    const filePath = getTodoFilePath(filename);

    logger.info('Reading todo file', { path: filePath });
    const fileContent = fs.readFileSync(filePath, 'utf8');
    res.json({ content: fileContent });
  } catch (error) {
    logger.error('Error reading todo file:', error);
    res.status(500).json({ error: 'Failed to read todo file' });
  }
});

// Update todo file content - only endpoint for writing to file
app.post('/api/todos', (req, res) => {
  try {
    const { content, filename } = req.body;

    if (!content) {
      logger.error('Missing content in request');
      return res.status(400).json({ error: 'Content is required' });
    }

    const filePath = getTodoFilePath(filename);

    // Create backup before writing to file
    createBackup(filePath);

    logger.info('Writing todo file', { path: filePath, contentLength: content.length });
    fs.writeFileSync(filePath, content, 'utf8');
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
