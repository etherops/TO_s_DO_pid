// Import commands
import './commands.js'
import '@4tw/cypress-drag-drop'
import 'cypress-real-events'

// Import helpers to make them globally available
import * as helpers from './helpers.js'

// Make helpers available globally
window.todoHelpers = helpers;

// Global hooks that run for all test files
// This approach creates unique test files for parallel execution

// Store test file info globally for cleanup
let testFileInfo = null;

beforeEach(() => {
  // Create test file based on spec name for this test
  cy.createTestFile().then((fileInfo) => {
    testFileInfo = fileInfo;
    
    // Wait to ensure backend file detection under parallel load
    cy.wait(500);
    
    // Visit the app and switch to our test file
    cy.visit('/');
    cy.contains('TO_s_DO_pid').should('be.visible');
    cy.switchToFile(fileInfo.fileName);
  });
});

afterEach(() => {
  // Clean up the test file
  if (testFileInfo) {
    cy.cleanupTestFile(testFileInfo.filePath);
    testFileInfo = null;
  }
});