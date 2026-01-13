import { refreshAndWait, findSection, findTask } from '../support/helpers.js';

describe('Focus Mode', () => {
  it('should toggle focus mode and interact with WIP tasks', () => {
    // Use existing WIP tasks from example.todo.md
    const existingWipTask = 'BILLS - Phone bill really really really really really really really really really really really really really really really really really long';

    // Verify task is visible in normal mode
    cy.get('.wip-column').should('contain', existingWipTask);

    // Enable focus mode
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Verify toggle is checked
    cy.get('.focus-mode-toggle').should('be.checked');

    // Verify WIP tasks are still visible and we can interact with them
    cy.get('.wip-column').should('contain', existingWipTask);

    // Create a new task to test checkbox interaction
    cy.get('.wip-column').contains('.section-header', 'CURRENT WEEK').parent().within(() => {
      cy.get('.add-task-btn').click();
      cy.get('.new-task-input').type('Test checkbox task');
      cy.get('.confirm-edit-btn').click();
    });

    // Now test the checkbox on the new task
    findTask('Test checkbox task').parent().within(() => {
      // First verify it's unchecked
      cy.get('.custom-checkbox').should('have.class', 'unchecked');
      // Click to mark as in-progress
      cy.get('.custom-checkbox').click();
      // Verify it's now in-progress
      cy.get('.custom-checkbox').should('have.class', 'in-progress');
    });
  });

  it('should allow interaction with TODO column after hover in focus mode', () => {
    // Enable focus mode
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Create a new task in TODO after hovering
    cy.get('.todo-stack').trigger('mouseenter');
    cy.wait(1100); // Wait for 1 second hover delay

    // Scroll to the PROJECTS section to ensure it's visible
    findSection('PROJECTS').scrollIntoView();
    cy.wait(100);

    // Add new task to PROJECTS section
    findSection('PROJECTS').within(() => {
      cy.get('.add-task-btn').click({ force: true });
      cy.get('.new-task-input').type('New task in focus mode');
      cy.get('.confirm-edit-btn').click();
    });

    // Verify task was created
    findTask('New task in focus mode').should('exist');

    // Move mouse away and verify TODO column still contains our task
    cy.get('.todo-stack').trigger('mouseleave');
    cy.wait(100);

    // Task should still be there even when column is partially hidden
    cy.get('.todo-column').should('contain', 'New task in focus mode');
  });

  it('should allow task management across columns in focus mode', () => {
    // Enable focus mode
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Verify we can see sections in partially hidden TODO column
    cy.get('.todo-column').should('contain', 'PROJECTS');

    // Hover over TODO to expand it
    cy.get('.todo-stack').trigger('mouseenter');
    cy.wait(1100);

    // Create a new task in TODO
    findSection('PROJECTS').scrollIntoView();
    findSection('PROJECTS').within(() => {
      cy.get('.add-task-btn').click({ force: true });
      cy.get('.new-task-input').type('New TODO task in focus mode');
      cy.get('.confirm-edit-btn').click();
    });

    // Verify task was created
    cy.get('.todo-column').should('contain', 'New TODO task in focus mode');

    // Move mouse away to collapse TODO
    cy.get('.todo-stack').trigger('mouseleave');
    cy.wait(100);

    // Create a task in expanded WIP column
    cy.get('.wip-column').contains('.section-header', 'CURRENT WEEK').parent().within(() => {
      cy.get('.add-task-btn').click();
      cy.get('.new-task-input').type('New WIP task in focus mode');
      cy.get('.confirm-edit-btn').click();
    });

    // Verify both columns have their tasks
    cy.get('.todo-column').should('contain', 'New TODO task in focus mode');
    cy.get('.wip-column').should('contain', 'New WIP task in focus mode');
  });

  it('should persist focus mode across page reload', () => {
    // Enable focus mode
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Verify it's enabled - toggle is checked and drawers are collapsed
    cy.get('.focus-mode-toggle').should('be.checked');
    cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
    cy.get('.done-stack').should('have.class', 'drawer-collapsed');

    // Reload and verify persistence
    refreshAndWait();

    // Verify focus mode is still enabled
    cy.get('.focus-mode-toggle').should('be.checked');
    cy.get('.todo-stack').should('have.class', 'drawer-collapsed');

    // Verify we can still interact with tasks
    findTask('TECH - Schedule service appointment').should('be.visible');

    // Disable focus mode
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Reload and verify it stays disabled
    refreshAndWait();

    cy.get('.focus-mode-toggle').should('not.be.checked');
    cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
  });

  it('should add new sections in focus mode', () => {
    // Enable focus mode
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Add new section to WIP
    cy.get('.wip-column .add-section-btn').click();
    cy.wait(100);

    // Find the new section and rename it by double-clicking
    cy.get('.wip-column .section').last().within(() => {
      // Double-click the section header to edit
      cy.get('.section-header').dblclick();
      cy.get('.section-name-edit').clear().type('Focus Mode Test Section{enter}');
    });

    // Add a task to the new section
    cy.get('.wip-column').contains('.section-header', 'Focus Mode Test Section').parent().within(() => {
      cy.get('.add-task-btn').click();
      cy.get('.new-task-input').type('Task in new section');
      cy.get('.confirm-edit-btn').click();
    });

    // Verify section and task exist
    cy.get('.wip-column').should('contain', 'Focus Mode Test Section');
    cy.get('.wip-column').should('contain', 'Task in new section');

    // Toggle focus mode off and on
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);
    cy.get('.toggle-switch').contains('Focus Mode').click();
    cy.wait(100);

    // Verify content still exists
    cy.get('.wip-column').should('contain', 'Focus Mode Test Section');
    cy.get('.wip-column').should('contain', 'Task in new section');
  });
});