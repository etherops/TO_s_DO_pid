import { refreshAndWait, findSection, findTask, withRefresh } from '../support/helpers.js';

describe('Notes Feature', () => {

  it('should add and edit notes on existing tasks', () => {
    // Find a task without a note
    const taskText = 'Follow up with client';

    // Verify task exists and doesn't have a note
    findTask(taskText).within(() => {
      cy.get('.notes-btn').should('not.have.class', 'has-notes');
      cy.get('.notes-btn').should('have.attr', 'title', 'Add note');

      // Click to enter edit mode
      cy.get('.notes-btn').click();
    });

    // Wait for edit mode
    cy.get('.task-text-edit').should('be.visible');
    cy.get('.note-text-edit').should('be.visible');

    // Add a note
    cy.get('.note-text-edit').type('Need to include API examples');
    cy.get('.confirm-edit-btn').click();

    // Verify note was added and persists after refresh
    withRefresh(() => {
      findTask(taskText).within(() => {
        cy.get('.notes-btn').should('have.class', 'has-notes');
        cy.get('.notes-btn').should('have.attr', 'title', 'Need to include API examples');
      });
    }, 'Note persistence');
  });

  it('should edit existing notes', () => {
    // Use a task without an existing note
    const taskText = 'Follow up with client';

    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    // Add initial note
    cy.get('.note-text-edit').type('Check mobile breakpoints');
    cy.get('.confirm-edit-btn').click();

    // Now edit the note
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').should('have.value', 'Check mobile breakpoints');
    cy.get('.note-text-edit').clear().type('Also check tablet view');
    cy.get('.confirm-edit-btn').click();

    // Verify note was updated and persists after refresh
    withRefresh(() => {
      findTask(taskText).within(() => {
        cy.get('.notes-btn').should('have.attr', 'title', 'Also check tablet view');
      });
    }, 'Note update persistence');
  });

  it('should remove notes when cleared', () => {
    // First add a note
    const taskText = 'Garden maintenance';

    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').type('Use JWT tokens');
    cy.get('.confirm-edit-btn').click();

    // Now remove the note
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').clear();
    cy.get('.confirm-edit-btn').click();

    // Verify note was removed and stays removed after refresh
    withRefresh(() => {
      findTask(taskText).within(() => {
        cy.get('.notes-btn').should('not.have.class', 'has-notes');
        cy.get('.notes-btn').should('have.attr', 'title', 'Add note');
      });
    }, 'Note removal persistence');
  });

  it('should handle keyboard shortcuts', () => {
    const taskText = 'Lawn care';

    // Test Enter key saves from title field
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    // Add a note first
    cy.get('.note-text-edit').type('Use REST conventions');
    cy.get('.task-text-edit').clear().type('Lawn care - updated');
    cy.get('.task-text-edit').type('{enter}');

    // Verify task was saved with Enter key from title field
    findTask('Lawn care - updated').should('exist');
    findTask('Lawn care - updated').within(() => {
      cy.get('.notes-btn').should('have.class', 'has-notes');
      cy.get('.notes-btn').should('have.attr', 'title', 'Use REST conventions');
    });

    // Test Enter key saves from notes field
    findTask('Lawn care - updated').within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').clear().type('Updated REST conventions');
    cy.get('.note-text-edit').type('{enter}');

    // Verify note was saved
    withRefresh(() => {
      findTask('Lawn care - updated').within(() => {
        cy.get('.notes-btn').should('have.attr', 'title', 'Updated REST conventions');
      });
    }, 'Enter key save persistence');

    // Test Escape cancels edits
    findTask('Lawn care - updated').within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.task-text-edit').clear().type('This should not be saved');
    cy.get('.note-text-edit').clear().type('This note should not be saved');
    cy.get('.note-text-edit').type('{esc}');

    // Verify changes were not saved
    findTask('Lawn care - updated').within(() => {
      cy.get('.task-title').should('have.text', 'Lawn care - updated');
      cy.get('.notes-btn').should('have.attr', 'title', 'Updated REST conventions');
    });
  });

  it('should support multiline notes', () => {
    const taskText = 'Schedule service appointment';

    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    // Add multiline note with Shift+Enter
    cy.get('.note-text-edit').type('Step 1: Install dependencies{shift+enter}Step 2: Add tsconfig{shift+enter}Step 3: Convert files');
    cy.get('.confirm-edit-btn').click();

    // Verify note was saved and persists with multiline content
    withRefresh(() => {
      findTask(taskText).within(() => {
        cy.get('.notes-btn').should('have.class', 'has-notes');
        cy.get('.notes-btn').click();
      });

      // Verify multiline content is preserved after refresh
      cy.get('.note-text-edit').invoke('val').should('include', 'Step 1: Install dependencies');
      cy.get('.note-text-edit').invoke('val').should('include', 'Step 2: Add tsconfig');
      cy.get('.note-text-edit').invoke('val').should('include', 'Step 3: Convert files');

      cy.get('.cancel-edit-btn').click();
    }, 'Multiline note persistence');
  });

  it('should toggle note visibility correctly', () => {
    const taskText = 'Research classes';

    // Add a note
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').type('Look into code splitting');
    cy.get('.confirm-edit-btn').click();

    // Hover to see preview
    findTask(taskText).realHover();

    // Verify preview is visible
    findTask(taskText).within(() => {
      cy.get('.hover-preview-container').should('be.visible');
      cy.get('.note-preview').should('be.visible');
      cy.get('.note-display-text').should('contain', 'Look into code splitting');
    });

    // Un-hover by hovering on something else
    cy.get('body').realHover({ position: { x: 0, y: 0 } });

    // Verify preview is hidden
    findTask(taskText).within(() => {
      cy.get('.hover-preview-container').should('not.be.visible');
    });
  });

  it('should maintain proper layout when note editor is expanded', () => {
    const taskText = 'Schedule appointment';

    // Get reference to task card before editing
    const taskCard = findTask(taskText);

    // Enter edit mode
    taskCard.within(() => {
      cy.get('.notes-btn').click();
    });

    // Verify we're in edit mode using the same task card reference
    taskCard.within(() => {
      cy.get('.task-edit-wrapper').should('exist');
      cy.get('.task-text-edit').should('be.visible');
      cy.get('.note-text-edit').should('be.visible');

      // Type a long note to test textarea expansion
      cy.get('.note-text-edit').type('This is a longer note that might cause the textarea to expand. It should maintain proper layout and not break the card structure. The textarea should resize properly.');

      // Verify we can still interact with all elements
      cy.get('.task-text-edit').should('be.visible');
      cy.get('.note-text-edit').should('be.visible');

      // Verify we can save (the actual functional test)
      cy.get('.confirm-edit-btn').click();
    });

    // Verify the long note was saved correctly (after save, text is visible again)
    findTask(taskText).within(() => {
      cy.get('.notes-btn').should('have.class', 'has-notes');
    });
  });

  it('should not interfere with other task operations', () => {
    const taskText = 'Lawn care';

    // Add a note
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').type('Use try-catch blocks');
    cy.get('.confirm-edit-btn').click();

    // Get reference to task card before other operations
    const taskCard = findTask(taskText);

    // Verify we can still edit the task title via edit button
    taskCard.within(() => {
      cy.get('.edit-btn').click();
    });

    // Use the same task card reference for edit mode checks
    taskCard.within(() => {
      cy.get('.task-text-edit').should('be.visible');
      cy.get('.cancel-edit-btn').click();
    });

    // Verify we can still toggle task status
    // Note: Since adding a note automatically sets status to in-progress [~],
    // clicking once should move it to checked [x]
    findTask(taskText).within(() => {
      cy.get('.custom-checkbox').should('have.class', 'in-progress'); // Status should be in-progress after adding note
      cy.get('.custom-checkbox').click();
      cy.get('.custom-checkbox').should('have.class', 'checked'); // Should move to checked after one click
    });

    // Verify note is still there
    findTask(taskText).within(() => {
      cy.get('.notes-btn').should('have.class', 'has-notes');
      cy.get('.notes-btn').should('have.attr', 'title', 'Use try-catch blocks');
    });
  });

  it('should handle creating new tasks with notes', () => {
    const sectionName = 'BACKLOG';
    const taskTitle = 'New task with note from start';
    const noteText = 'Important implementation detail';
    const fullTaskText = `${taskTitle} (${noteText})`;

    // Create new task with note in parentheses format
    findSection(sectionName).within(() => {
      cy.get('.add-task-btn').click();
      cy.get('.new-task-input').type(fullTaskText);
      cy.get('.confirm-edit-btn').click();
    });

    // Verify task was created with note parsed correctly
    findTask(taskTitle).should('exist');
    findTask(taskTitle).within(() => {
      cy.get('.task-title').should('have.text', taskTitle); // Title without note
      cy.get('.notes-btn').should('have.class', 'has-notes');
      cy.get('.notes-btn').should('have.attr', 'title', noteText);
    });

    // Verify persistence after refresh
    withRefresh(() => {
      findTask(taskTitle).should('exist');
      findTask(taskTitle).within(() => {
        cy.get('.task-title').should('have.text', taskTitle);
        cy.get('.notes-btn').should('have.class', 'has-notes');
        cy.get('.notes-btn').should('have.attr', 'title', noteText);
      });
    }, 'New task with note persistence');
  });

  it('should display notes correctly in hover preview', () => {
    const taskText = 'Phone bill really really really really really really really really really really really really really really really really really long';

    // Verify task has a note from the example file
    findTask(taskText).within(() => {
      cy.get('.notes-btn').should('have.class', 'has-notes');
    });

    // Hover to see preview
    findTask(taskText).realHover();

    // Verify preview structure
    findTask(taskText).within(() => {
      cy.get('.hover-preview-container').should('be.visible');
      cy.get('.note-preview').should('be.visible');
      cy.get('.preview-display-label').should('contain', 'Notes');
      cy.get('.note-display-text').should('be.visible').and('contain', 'Jan 14, follow up about refund');

      // Due date preview section exists but should show placeholder since no due date
      cy.get('.due-date-preview').should('exist');
      cy.get('.mini-calendar').should('not.exist');
    });
  });

  it('should preserve notes when editing task title', () => {
    const taskText = 'Phone bill really really really really really really really really really really really really really really really really really long';
    const newTaskText = 'Phone bill - updated';

    // Get task card reference first
    const taskCard = findTask(taskText);
    
    // Edit the task title using edit button
    taskCard.within(() => {
      cy.get('.edit-btn').click();
    });

    // Change title but leave note unchanged
    taskCard.within(() => {
      cy.get('.task-text-edit').clear().type(newTaskText);
      cy.get('.confirm-edit-btn').click();
    });

    // Verify task title changed but note preserved
    findTask(newTaskText).should('exist');
    findTask(newTaskText).within(() => {
      cy.get('.notes-btn').should('have.class', 'has-notes');
      cy.get('.notes-btn').should('have.attr', 'title', 'Jan 14, follow up about refund');
    });
  });

  it('should display inline note preview', () => {
    const taskText = 'Garden maintenance';

    // Add a note to the task
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').type('Check sprinkler system and trim hedges');
    cy.get('.confirm-edit-btn').click();

    // Verify inline note preview exists and contains text
    findTask(taskText).within(() => {
      cy.get('.inline-note-preview').should('exist');
      cy.get('.inline-note-preview').should('contain', 'Check sprinkler system and trim hedges');
    });

    // Verify persistence after refresh
    withRefresh(() => {
      findTask(taskText).within(() => {
        cy.get('.inline-note-preview').should('exist');
        cy.get('.inline-note-preview').should('contain', 'Check sprinkler system and trim hedges');
      });
    }, 'Inline note preview persistence');
  });

  it('should automatically set status to in-progress when note is added', () => {
    const taskText = 'HEALTH - Research classes';

    // Verify task starts as unchecked
    findTask(taskText).within(() => {
      cy.get('.custom-checkbox').should('have.class', 'unchecked');
      cy.get('.notes-btn').should('not.have.class', 'has-notes');
    });

    // Add a note to the task
    findTask(taskText).within(() => {
      cy.get('.notes-btn').click();
    });

    cy.get('.note-text-edit').type('Look into yoga and pilates options');
    cy.get('.confirm-edit-btn').click();

    // Verify status automatically changed to in-progress
    findTask(taskText).within(() => {
      cy.get('.custom-checkbox').should('have.class', 'in-progress');
      cy.get('.notes-btn').should('have.class', 'has-notes');
    });

    // Verify persistence after refresh
    withRefresh(() => {
      findTask(taskText).within(() => {
        cy.get('.custom-checkbox').should('have.class', 'in-progress');
        cy.get('.notes-btn').should('have.class', 'has-notes');
      });
    }, 'Auto-status change persistence');
  });

  it('should auto-status work for new tasks with notes', () => {
    const sectionName = 'BACKLOG';
    const taskTitle = 'New task with note';
    const fullTaskWithNote = 'New task with note (important detail)';

    // Create new task with note in simple edit mode
    findSection(sectionName).within(() => {
      cy.get('.add-task-btn').click();
    });

    // Task should start in edit mode, type text with note
    cy.get('.new-task-input').type(fullTaskWithNote);
    cy.get('.confirm-edit-btn').click();

    // Verify the task was created with in-progress status due to the note
    // Use the title part for finding since the note gets parsed out for display
    findTask(taskTitle).within(() => {
      cy.get('.custom-checkbox').should('have.class', 'in-progress');
      cy.get('.notes-btn').should('have.class', 'has-notes');
      cy.get('.notes-btn').should('have.attr', 'title', 'important detail');
    });

    // Verify persistence after refresh
    withRefresh(() => {
      findTask(taskTitle).within(() => {
        cy.get('.custom-checkbox').should('have.class', 'in-progress');
        cy.get('.notes-btn').should('have.class', 'has-notes');
        cy.get('.notes-btn').should('have.attr', 'title', 'important detail');
      });
    }, 'New task auto-status persistence');
  });
});