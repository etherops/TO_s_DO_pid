const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
// Add dotenv for environment variables
require('dotenv').config();

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

// Get the custom todo directory from environment variables
const TODO_CUSTOM_DIR = process.env.TODO_CUSTOM_DIR;
if (TODO_CUSTOM_DIR) {
  logger.info('Custom todo directory configured:', TODO_CUSTOM_DIR);
  // Check if the directory exists
  if (!fs.existsSync(TODO_CUSTOM_DIR)) {
    logger.error('Custom todo directory does not exist:', TODO_CUSTOM_DIR);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '5mb'}));
app.use(express.static('dist'));

// Function to get the default todo file path
const getDefaultTodoFilePath = () => {
  const todoFilePath = path.join(__dirname, 'todo.todo.md');
  const exampleTodoFilePath = path.join(__dirname, 'example.todo.md');

  // Check if todo.todo.md exists, if not fallback to example.todo.md
  if (fs.existsSync(todoFilePath)) {
    logger.info('Using todo.todo.md as default file');
    return todoFilePath;
  } else {
    logger.info('Fallback to example.todo.md as default file');
    return exampleTodoFilePath;
  }
};

// Function to create a backup of a todo file
const createBackup = (filePath, isCustom) => {
  try {
    logger.info('createBackup called with', {filePath, isCustom});
    // Get the directory where the file is located
    let fileDir;

    // If it's a custom file, use the custom directory
    fileDir = isCustom && TODO_CUSTOM_DIR ? TODO_CUSTOM_DIR : path.dirname(filePath)
    logger.info('Using backupup directory: ', { path: fileDir });

    // Create main backup directory path
    const backupDirName = '.TO_s_DO_pid.bak';
    const mainBackupDirPath = path.join(fileDir, backupDirName);

    // Create main backup directory if it doesn't exist
    if (!fs.existsSync(mainBackupDirPath)) {
      logger.info('Creating main backup directory', { path: mainBackupDirPath });
      fs.mkdirSync(mainBackupDirPath);
    }

    // Get the filename and create a file-specific backup directory
    const fileName = path.basename(filePath);
    // Extract filename without extension for the directory name
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const fileBackupDirPath = path.join(mainBackupDirPath, fileNameWithoutExt);

    // Create file-specific backup directory if it doesn't exist
    if (!fs.existsSync(fileBackupDirPath)) {
      logger.info('Creating file-specific backup directory', { path: fileBackupDirPath });
      fs.mkdirSync(fileBackupDirPath);
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toLocaleDateString('en-CA');

    // Create backup filename with today's date, preserving original extension
    const fileExt = path.extname(fileName);
    const backupFileName = `${fileNameWithoutExt}.bak.${today}${fileExt}`;
    const backupFilePath = path.join(fileBackupDirPath, backupFileName);

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
const getTodoFilePath = (filename, isCustom = false) => {
  logger.info('getTodoFilePath called with', {filename, isCustom});
  if (!filename) {
    return getDefaultTodoFilePath()
  }

  let thedir = isCustom && TODO_CUSTOM_DIR ? TODO_CUSTOM_DIR : __dirname
  logger.info('Using directory for file path', { path: thedir });
  return path.join(thedir, filename);
};

// Get all .todo.md files in the server directory and custom directory
app.get('/api/files', (req, res) => {
  try {
    logger.info('Listing todo.md files in directories');
    let files = [];

    // Get files from local directory
    const localFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.todo.md'))
      .map(file => ({ name: file, isCustom: false }));

    files = [...localFiles];

    // Get files from custom directory if configured
    if (TODO_CUSTOM_DIR && fs.existsSync(TODO_CUSTOM_DIR)) {
      logger.info('Listing todo.md files in custom directory', TODO_CUSTOM_DIR);
      const customFiles = fs.readdirSync(TODO_CUSTOM_DIR)
        .filter(file => file.endsWith('.todo.md'))
        .map(file => ({ name: file, isCustom: true }));

      files = [...files, ...customFiles];
    }

    res.json({ files });
  } catch (error) {
    logger.error('Error listing todo.md files:', error);
    res.status(500).json({ error: 'Failed to list todo.md files' });
  }
});

// Get todo file content
app.get('/api/todos', (req, res) => {
  try {
    const filename = req.query.filename;
    const isCustom = req.query.isCustom === 'true';

    logger.info('GET /api/todos received', {filename, isCustom,});
    const filePath = getTodoFilePath(filename, isCustom);

    logger.info('Reading todo file', { path: filePath, isCustom });
    
    // Check if file exists before trying to read it
    if (!fs.existsSync(filePath)) {
      logger.info('Todo file not found', { path: filePath });
      res.status(404).json({ 
        error: 'Todo file not found',
        message: 'The requested file no longer exists'
      });
      return;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    res.json({ 
      content: fileContent,
      isCustom: isCustom
    });
  } catch (error) {
    logger.error('Error reading todo file:', error);
    res.status(500).json({ error: 'Failed to read todo file' });
  }
});

// Update todo file content - only endpoint for writing to file
app.post('/api/todos', (req, res) => {
  try {
    const { content, filename, isCustom } = req.body;

    logger.info('Received POST request to /api/todos', {filename, isCustom,
      contentLength: content ? content.length : 0
    });

    if (!content) {
      logger.error('Missing content in request');
      return res.status(400).json({ error: 'Content is required' });
    }

    // Convert isCustom to boolean if it's a string
    const isCustomBoolean = isCustom === 'true' ? true : Boolean(isCustom);
    const filePath = getTodoFilePath(filename, isCustomBoolean);

    // Create backup before writing to file
    logger.info('Creating backup for file', { filePath, isCustomBoolean });
    createBackup(filePath, isCustomBoolean);

    logger.info('Writing todo file', { path: filePath, isCustomBoolean, contentLength: content.length });
    fs.writeFileSync(filePath, content, 'utf8');
    logger.info('Todo file successfully written');
    res.json({ success: true, isCustom: isCustomBoolean });
  } catch (error) {
    logger.error('Error writing todo file:', error);
    res.status(500).json({ error: 'Failed to write todo file' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
