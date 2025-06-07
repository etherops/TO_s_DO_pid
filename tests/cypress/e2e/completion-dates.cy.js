import { findSection, findTask } from '../support/helpers.js';

describe('Completion Date Feature', () => {
  it('should add completion date after timeout when task marked as completed', () => {
    // Mark "Follow up with client" task as completed
    findTask('WORK - Follow up with client').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
      
      // Should show pending completion animation
      cy.get('.custom-checkbox').should('have.class', 'pending-completion');
    });
    
    // Wait for completion timeout (1.5 seconds)
    cy.wait(2000);
    
    // Should no longer have pending completion class
    findTask('WORK - Follow up with client').within(() => {
      cy.get('.custom-checkbox').should('not.have.class', 'pending-completion');
    });
    
    // Task should now have completion date in text (check via save)
    findTask('WORK - Follow up with client').within(() => {
      cy.get('.edit-btn').click();
    });
    
    // Should show completion date section in edit mode
    cy.get('.completion-date-row').should('exist');
    cy.get('.completion-date-badge').should('exist');
    
    // Cancel edit to close
    cy.get('.cancel-edit-btn').click();
  });

  it('should show completion badge for completed tasks', () => {
    // Mark "Mountain trip planning" task as completed and wait
    findTask('PROJECT - Mountain trip planning').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
    });
    
    cy.wait(2000); // Wait for completion date to be added
    
    // Should show completion badge
    findTask('PROJECT - Mountain trip planning').within(() => {
      cy.get('.completion-badge').should('exist');
      // Should contain current month name
      cy.get('.completion-badge').should(($badge) => {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        expect($badge.text()).to.contain(currentMonth);
      });
    });
  });

  it('should allow clearing completion date in edit mode', () => {
    // Mark HOME task as completed and wait
    findTask('HOME - Garden maintenance').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
    });
    
    cy.wait(2000);
    
    // Edit the task
    findTask('HOME - Garden maintenance').within(() => {
      cy.get('.edit-btn').click();
    });
    
    // Should show completion date section
    cy.get('.completion-date-row').should('exist');
    cy.get('.clear-completion-btn').should('exist');
    
    // Click clear button
    cy.get('.clear-completion-btn').click();
    
    // Completion date section should be gone
    cy.get('.completion-date-row').should('not.exist');
    
    // Save and verify badge is gone
    cy.get('.confirm-edit-btn').click();
    
    findTask('HOME - Garden maintenance').within(() => {
      cy.get('.completion-badge').should('not.exist');
    });
  });

  it('should prevent completion date timeout if user continues clicking', () => {
    // Mark as completed
    findTask('HOME - Lawn care').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
      
      // Immediately click again before timeout to cancelled
      cy.get('.custom-checkbox').click(); // completed -> cancelled
      
      // Immediately click again before timeout to unchecked
      cy.get('.custom-checkbox').click(); // cancelled -> unchecked
    });
    
    // Wait longer than timeout
    cy.wait(2000);
    
    // Should not have completion badge since it was changed to unchecked before timeout
    findTask('HOME - Lawn care').within(() => {
      cy.get('.completion-badge').should('not.exist');
    });
  });

  it('should add completion date for cancelled tasks', () => {
    // Mark SOCIAL task as cancelled (it starts as in-progress [~])
    findTask('SOCIAL - Event coordination for friends').within(() => {
      cy.get('.custom-checkbox').click(); // in-progress -> completed
      cy.get('.custom-checkbox').click(); // completed -> cancelled
    });
    
    cy.wait(2000); // Wait for completion date to be added
    
    // Should show completion badge with cancelled styling
    findTask('SOCIAL - Event coordination for friends').within(() => {
      cy.get('.completion-badge').should('exist');
      cy.get('.completion-badge').should('have.class', 'completion-badge-cancelled');
      // Should contain current month name
      cy.get('.completion-badge').should(($badge) => {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        expect($badge.text()).to.contain(currentMonth);
      });
    });
  });


  it('should preserve completion dates when editing task text', () => {
    // Mark HEALTH task as completed and wait
    findTask('HEALTH - Research classes').within(() => {
      cy.get('.custom-checkbox').click(); // unchecked -> in-progress  
      cy.get('.custom-checkbox').click(); // in-progress -> completed
    });
    
    cy.wait(2000);
    
    // Edit the task text
    findTask('HEALTH - Research classes').within(() => {
      cy.get('.edit-btn').click();
    });
    
    // Change task text
    cy.get('.task-text-edit').clear().type('Modified health research task');
    
    // Save
    cy.get('.confirm-edit-btn').click();
    
    // Completion badge should still be there
    findTask('Modified health research task').within(() => {
      cy.get('.completion-badge').should('exist');
    });
  });

  it('should handle multiple rapid status changes correctly', () => {
    // Rapidly cycle through statuses with HEALTH appointment task
    findTask('HEALTH - Schedule appointment').within(() => {
      cy.get('.custom-checkbox').click(); // unchecked -> in-progress
      cy.wait(100);
      cy.get('.custom-checkbox').click(); // in-progress -> completed  
      cy.wait(100);
      cy.get('.custom-checkbox').click(); // completed -> cancelled
      cy.wait(100);
      cy.get('.custom-checkbox').click(); // cancelled -> unchecked
      cy.wait(100);
      cy.get('.custom-checkbox').click(); // unchecked -> in-progress
      cy.wait(100);
      cy.get('.custom-checkbox').click(); // in-progress -> completed
    });
    
    // Wait for final completion timeout
    cy.wait(2000);
    
    // Should have completion badge for final completed state
    findTask('HEALTH - Schedule appointment').within(() => {
      cy.get('.completion-badge').should('exist');
    });
  });
});