const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const yaml = require('js-yaml');
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

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

// Load configuration from YAML file
let todoConfig = { directories: [], files: [] };
const configPath = path.join(__dirname, 'stupid.yaml');

try {
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    todoConfig = yaml.load(configContent) || { directories: [], files: [] };
    logger.info('Loaded stupid configuration:', {
      directories: todoConfig.directories?.length || 0,
      files: todoConfig.files?.length || 0
    });
  } else {
    logger.info('No stupid.yaml found, using default configuration');
  }
} catch (error) {
  logger.error('Error loading stupid.yaml:', error);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track connected clients and which files they're watching
const clients = new Map(); // clientId -> { ws, watchingFiles: Set }
let clientIdCounter = 0;

// Track file watchers
const fileWatchers = new Map(); // filePath -> FSWatcher

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '5mb'}));
app.use(express.static('dist'));


// Function to create a backup of a todo file
const createBackup = (filePath) => {
  try {
    logger.info('createBackup called with', {filePath});
    // Get the directory where the file is located
    const fileDir = path.dirname(filePath);
    logger.info('Using backup directory: ', { path: fileDir });

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

// WebSocket handling
wss.on('connection', (ws) => {
  const clientId = clientIdCounter++;
  clients.set(clientId, { ws, watchingFiles: new Set() });
  logger.info('WebSocket client connected', { clientId });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.debug('WebSocket message received', { clientId, type: data.type });

      if (data.type === 'watch') {
        const { filePath } = data;
        const client = clients.get(clientId);
        client.watchingFiles.add(filePath);
        
        // Start watching the file if not already watching
        if (!fileWatchers.has(filePath)) {
          startWatchingFile(filePath);
        }
        
        logger.info('Client watching file', { clientId, filePath });
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    logger.info('WebSocket client disconnected', { clientId });
    
    // Clean up file watchers if no clients are watching
    cleanupUnwatchedFiles();
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
});


// Start watching a file for changes
const startWatchingFile = (filePath) => {
  if (fileWatchers.has(filePath)) return;

  try {
    const watcher = fs.watch(filePath, (eventType, filename) => {
      logger.info('File changed', { filePath, eventType });
      
      // Read file content and compute checksum
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const checksum = crypto.createHash('md5').update(content).digest('hex');
        
        // Notify all clients watching this file with checksum
        notifyFileChange(filePath, checksum);
      } catch (err) {
        logger.error('Error reading file for checksum:', err);
        // Still notify even if we couldn't get checksum
        notifyFileChange(filePath, null);
      }
    });

    fileWatchers.set(filePath, watcher);
    logger.info('Started watching file', { filePath });
  } catch (error) {
    logger.error('Error watching file:', error);
  }
};

// Notify clients about file changes
const notifyFileChange = (filePath, checksum = null) => {
  const notification = JSON.stringify({
    type: 'fileChanged',
    filePath,
    checksum,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client, clientId) => {
    if (client.watchingFiles.has(filePath) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(notification);
      logger.debug('Notified client of file change', { clientId, filePath });
    }
  });
};

// Clean up file watchers that no clients are watching
const cleanupUnwatchedFiles = () => {
  fileWatchers.forEach((watcher, filePath) => {
    const hasWatchers = Array.from(clients.values()).some(client => 
      client.watchingFiles.has(filePath)
    );
    
    if (!hasWatchers) {
      watcher.close();
      fileWatchers.delete(filePath);
      logger.info('Stopped watching file', { filePath });
    }
  });
};

// Helper function to scan a directory for todo files
const scanDirectory = (dir, isBuiltIn = false) => {
  try {
    if (!fs.existsSync(dir)) {
      logger.warn('Directory does not exist:', dir);
      return [];
    }
    
    logger.info('Scanning directory:', dir);
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.todo.md'))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        isBuiltIn,
        source: 'directory',
        directory: dir
      }));
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, error);
    return [];
  }
};

// Helper function to add an individual file
const addFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn('File does not exist:', filePath);
      return null;
    }
    
    if (!filePath.endsWith('.todo.md') && !filePath.endsWith('TODO.md')) {
      logger.warn('File does not have .todo.md or TODO.md extension:', filePath);
      return null;
    }
    
    logger.info('Adding configured file:', filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      isBuiltIn: false,
      source: 'file'
    };
  } catch (error) {
    logger.error(`Error checking file ${filePath}:`, error);
    return null;
  }
};

// Get all .todo.md files from server directory, configured directories, and individual files
app.get('/api/files', (req, res) => {
  try {
    logger.info('Listing todo.md files from all configured sources');
    let files = [];

    // Get files from local server directory (built-in)
    files = scanDirectory(__dirname, true);

    // Get files from configured directories
    if (todoConfig.directories && Array.isArray(todoConfig.directories)) {
      todoConfig.directories.forEach(dir => {
        files = [...files, ...scanDirectory(dir, false)];
      });
    }

    // Add individual configured files
    if (todoConfig.files && Array.isArray(todoConfig.files)) {
      todoConfig.files.forEach(filePath => {
        const file = addFile(filePath);
        if (file) files.push(file);
      });
    }

    // Remove duplicates based on path
    const uniqueFiles = files.filter((file, index, self) =>
      index === self.findIndex((f) => f.path === file.path)
    );

    res.json({ files: uniqueFiles });
  } catch (error) {
    logger.error('Error listing todo.md files:', error);
    res.status(500).json({ error: 'Failed to list todo.md files' });
  }
});

// Get todo file content
app.get('/api/todos', (req, res) => {
  try {
    const filePath = req.query.path;
    
    logger.info('GET /api/todos received', {path: filePath});
    
    if (!filePath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    logger.info('Reading todo file', { path: filePath });
    
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
      content: fileContent
    });
  } catch (error) {
    logger.error('Error reading todo file:', error);
    res.status(500).json({ error: 'Failed to read todo file' });
  }
});

// Update todo file content - only endpoint for writing to file
app.post('/api/todos', (req, res) => {
  try {
    const { content, path: filePath } = req.body;

    logger.info('Received POST request to /api/todos', {
      path: filePath,
      contentLength: content ? content.length : 0
    });

    if (!content) {
      logger.error('Missing content in request');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (!filePath) {
      logger.error('Missing path in request');
      return res.status(400).json({ error: 'Path is required' });
    }

    // Create backup before writing to file
    logger.info('Creating backup for file', { filePath: filePath });
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
