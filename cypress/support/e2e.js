// Import commands
import './commands'
import '@4tw/cypress-drag-drop'
import 'cypress-real-events'

// Import helpers to make them globally available
import * as helpers from './helpers'

// Make helpers available globally
window.todoHelpers = helpers;

// Global hooks that run for all test files
// This ensures backup/restore always happens
before(() => {
  // Create initial backup before all tests in the file
  cy.backupTodoFile();
});

beforeEach(() => {
  // Visit the app and load example todo
  cy.visit('/');
  cy.contains('TO_s_DO_pid').should('be.visible');
  cy.contains('.file-tab', 'example todo').click();
  cy.wait(500); // Allow data to load
});

afterEach(() => {
  // Restore todo file after each test
  cy.restoreTodoFile();
});

after(() => {
  // Final restore after all tests in the file
  cy.restoreTodoFile();
});