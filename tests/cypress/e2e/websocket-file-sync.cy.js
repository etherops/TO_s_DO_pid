import { refreshAndWait } from '../support/helpers.js';

describe('WebSocket File Sync', () => {
  let testFile;

  beforeEach(() => {
    cy.createTestFile().then(file => {
      testFile = file;
      cy.visit('/');
      cy.switchToFile(testFile.fileName);
      // Wait for WebSocket connection to establish
      cy.wait(1000);
    });
  });

  afterEach(() => {
    cy.cleanupTestFile(testFile.filePath);
  });

  it('should NOT reload when user makes changes (checksum matches)', () => {
    // Wait for initial load
    cy.get('.kanban-column').should('be.visible');
    cy.get('.task-card').should('exist');
    
    // Find a specific task to modify
    const taskText = 'Follow up with client';
    cy.contains('.task-card', taskText).should('exist');
    
    // Set up a spy to track if loadTodoData is called (which would indicate a reload)
    // We'll check console logs instead since we can't directly spy on Vue methods
    cy.window().then((win) => {
      // Clear any previous console logs
      win.console.clear && win.console.clear();
      cy.spy(win.console, 'log').as('consoleLog');
    });
    
    // Make a change via the UI - click the custom checkbox to mark task as in-progress
    cy.contains('.task-card', taskText)
      .find('.custom-checkbox')
      .click();
    
    // Wait for the change to be saved and WebSocket to process
    cy.wait(3000);
    
    // Check that the checksum match was logged
    cy.get('@consoleLog').should('have.been.calledWithMatch', 'Checksum comparison:');
    cy.get('@consoleLog').should('have.been.calledWith', 'Checksums match, skipping reload (our own change)');
    
    // Verify the task is still in progress (custom checkbox should have in-progress class)
    // This proves no reload happened - if it had reloaded, the checkbox would be unchecked
    cy.contains('.task-card', taskText)
      .find('.custom-checkbox')
      .should('have.class', 'in-progress');
    
    // Also verify we didn't see the "File changed externally, reloading" message
    cy.window().then((win) => {
      const logs = win.console.log.getCalls();
      const reloadLogs = logs.filter(call => 
        call.args[0] && call.args[0].includes('File changed externally, reloading')
      );
      expect(reloadLogs).to.have.length(0);
    });
  });

  it('should auto-reload file when changed externally', () => {
    // Wait for initial load and verify content
    cy.get('.kanban-column').should('be.visible');
    cy.get('.kanban-column').contains('Follow up with client').should('exist');

    // Simulate external file change by modifying the file directly
    const newContent = `# TODO

## PROJECTS
* [ ] A new task from external edit
* [ ] Buy milk
* [ ] Update website

## BILLS
* [ ] Phone bill
`;

    cy.task('writeFile', {
      path: testFile.filePath,
      content: newContent
    });

    // Wait for WebSocket notification and auto-reload
    cy.wait(3000); // Give WebSocket time to detect and notify

    // Verify the content has been reloaded
    cy.get('.kanban-column').should('contain', 'A new task from external edit');
    cy.get('.kanban-column').should('not.contain', 'Follow up with client');
  });

  it('should handle multiple rapid external changes', () => {
    // Wait for initial load and verify content
    cy.get('.kanban-column').should('be.visible');
    cy.get('.kanban-column').contains('Follow up with client').should('exist');

    // First change
    cy.task('writeFile', {
      path: testFile.filePath,
      content: `# TODO\n\n## PROJECTS\n* [ ] First external change`
    });

    cy.wait(500);

    // Second change
    cy.task('writeFile', {
      path: testFile.filePath,
      content: `# TODO\n\n## PROJECTS\n* [ ] Second external change`
    });

    cy.wait(3000);

    // Should show the latest content
    cy.get('.kanban-column').should('contain', 'Second external change');
    cy.get('.kanban-column').should('not.contain', 'First external change');
  });

  it('should handle WebSocket reconnection', () => {
    // Wait for initial load and verify content
    cy.get('.kanban-column').should('be.visible');
    cy.get('.kanban-column').contains('Follow up with client').should('exist');

    // Note: Testing actual WebSocket disconnection/reconnection would require
    // more complex test setup. This test verifies the basic functionality works.

    // Make a change after some time
    cy.wait(2000);

    const newContent = `# TODO

## PROJECTS
* [ ] Content after reconnection test
`;

    cy.task('writeFile', {
      path: testFile.filePath,
      content: newContent
    });

    cy.wait(3000);

    // Should still auto-reload
    cy.get('.kanban-column').should('contain', 'Content after reconnection test');
  });

  it('should only sync the currently selected file', () => {
    // Create a second test file
    const secondContent = `# TODO

## SECOND FILE
* [ ] Second file task`;
    const secondFileName = 'fixture-websocket-second.todo.md';

    cy.task('writeFile', {
      path: `./${secondFileName}`,
      content: secondContent
    });

    // Reload to see both files
    cy.reload();
    cy.wait(1000);

    // Verify we can see both files
    cy.get('.file-tab').should('have.length.at.least', 2);
    
    // Make sure we're on the first file
    cy.switchToFile(testFile.fileName);
    cy.get('.kanban-column').should('contain', 'Follow up with client');

    // Switch to second file
    cy.switchToFile(secondFileName);
    cy.get('.kanban-column').should('contain', 'Second file task');

    // Modify first file externally while viewing second file
    cy.task('writeFile', {
      path: testFile.filePath,
      content: `# TODO

## PROJECTS
* [ ] First file was modified externally`
    });

    cy.wait(1500);

    // Should not affect current view (we're viewing the second file)
    cy.get('.kanban-column').should('contain', 'Second file task');
    cy.get('.kanban-column').should('not.contain', 'First file was modified externally');

    // Switch back to first file
    cy.switchToFile(testFile.fileName);

    // Should show the updated content that was changed while we were away
    cy.get('.kanban-column').should('contain', 'First file was modified externally');

    // Cleanup second file
    cy.task('deleteFile', `./${secondFileName}`);
  });
});