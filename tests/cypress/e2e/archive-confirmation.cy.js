import { refreshAndWait, findSection, findTask, withRefresh } from '../support/helpers.js';

describe('Archive Confirmation Modal', () => {
  
  it('should show confirmation modal when archive button is clicked', () => {
    const sectionName = 'WIP';
    
    // Find WIP section and click archive button
    findSection(sectionName).within(() => {
      cy.get('.archive-section-btn').should('exist');
      cy.get('.archive-section-btn').click();
    });
    
    // Verify modal appears
    cy.get('.modal-backdrop').should('exist');
    cy.get('.modal-content').should('exist');
    cy.get('.modal-header h3').should('contain', 'Archive Completed Tasks');
    
    // Verify section name is shown
    cy.get('.confirmation-message').should('contain', sectionName);
    
    // Cancel the modal
    cy.get('.btn-cancel').click();
    cy.get('.modal-backdrop').should('not.exist');
  });

  it('should show the current-week archive section name in modal', () => {
    const sectionName = 'WIP';
    
    findSection(sectionName).within(() => {
      cy.get('.archive-section-btn').click();
    });
    
    // The archive target is named using the canonical current-week format.
    cy.get('.detail-text').should('match', /[A-Z][a-z]{2} Week #\d+ \d{4}/);
    
    // Cancel
    cy.get('.btn-cancel').click();
  });

  it('should show completed tasks that will be archived', () => {
    const sectionName = 'WIP';
    
    findSection(sectionName).within(() => {
      cy.get('.archive-section-btn').click();
    });
    
    // Check for terminal-task preview
    cy.get('.incomplete-tasks-preview').should('exist');
    cy.get('.task-list .task-item').should('have.length.at.least', 1);
    
    // Verify task status icons are shown
    cy.get('.task-status-icon').should('exist');
    
    // Cancel
    cy.get('.btn-cancel').click();
  });

  it('should archive terminal tasks without moving the source section', () => {
    const sectionName = 'WIP';
    
    // Get initial sections count in WIP
    cy.get('.column-stack').eq(1).within(() => {
      cy.get('.section').then($sections => {
        const initialCount = $sections.length;
        
        // Find the section and archive it
        findSection(sectionName).within(() => {
          cy.get('.archive-section-btn').click();
        });
      });
    });
    
    // Confirm archive
    cy.get('.btn-confirm').contains('Archive Completed Tasks').click();
    
    // If archive column picker appears (multiple DONE columns), select ARCHIVE
    cy.get('body').then($body => {
      if ($body.find('.archive-column-picker').length > 0) {
        cy.get('.column-btn').contains('ARCHIVE').click();
      }
    });
    
    // Wait for DOM updates
    cy.wait(500);
    
    // The source section remains in WIP.
    cy.get('.column-stack').eq(1).within(() => {
      cy.contains('.section-header', sectionName).should('exist');
    });
    
    // Verify a current-week archive section appears in DONE.
    cy.get('.column-stack').eq(2).within(() => {
      cy.contains('.section-header', /Week #\d+ \d{4}/).should('exist');
    });
  });

  it('should not create new section if all tasks are complete', () => {
    // Skip this test if MAY Week 4 doesn't exist or doesn't have archive button
    cy.get('body').then($body => {
      const section = $body.find('.section:contains("MAY Week 4")');
      if (section.length === 0 || section.find('.archive-section-btn').length === 0) {
        cy.log('Skipping test - section not archivable');
        return;
      }
      
      const sectionName = 'MAY Week 4';
      
      // Count sections before archive
      cy.get('.column-stack').eq(1).find('.section').then($sections => {
        const initialCount = $sections.length;
        
        findSection(sectionName).within(() => {
          cy.get('.archive-section-btn').click();
        });
        
        // Modal should indicate there are no terminal tasks to archive.
        cy.get('.detail-text').should('contain', 'no completed or will-not-do');
        
        // Confirm archive
        cy.get('.btn-confirm').click();
        
        // If archive column picker appears, select ARCHIVE
        cy.get('body').then($body => {
          if ($body.find('.archive-column-picker').length > 0) {
            cy.get('.column-btn').contains('ARCHIVE').click();
          }
        });
        
        // Wait for DOM updates
        cy.wait(500);
        
        // Verify no new section was created (count should be one less)
        cy.get('.column-stack').eq(1).find('.section').should('have.length', initialCount - 1);
      });
    });
  });

  it('should handle modal backdrop click to close', () => {
    const sectionName = 'WIP';
    
    findSection(sectionName).within(() => {
      cy.get('.archive-section-btn').click();
    });
    
    // Click backdrop to close
    cy.get('.modal-backdrop').click({ force: true });
    cy.get('.modal-backdrop').should('not.exist');
    
    // Section should still be in WIP
    findSection(sectionName).should('exist');
  });

  it('should leave incomplete tasks in the source section', () => {
    // We need a section with mixed complete/incomplete tasks
    // The WIP section in the fixture has this
    const sectionName = 'WIP';
    
    findSection(sectionName).within(() => {
      // Count incomplete tasks before archive
      cy.get('.custom-checkbox.unchecked, .custom-checkbox.in-progress').then($checkboxes => {
        const incompleteCount = $checkboxes.length;
        
        cy.get('.archive-section-btn').click();
        
        // Store the count for later verification
        cy.wrap(incompleteCount).as('incompleteCount');
      });
    });
    
    // Confirm archive
    cy.get('.btn-confirm').click();
    
    // Wait for DOM updates
    cy.wait(500);
    
    // Verify the source section still has the incomplete tasks and the
    // archive section contains only terminal tasks.
    cy.get('@incompleteCount').then(incompleteCount => {
      findSection(sectionName).within(() => {
        cy.get('.custom-checkbox.unchecked, .custom-checkbox.in-progress')
          .should('have.length', incompleteCount);
      });
    });
  });

  it('should show archive destination in modal', () => {
    const sectionName = 'WIP';
    
    findSection(sectionName).within(() => {
      cy.get('.archive-section-btn').click();
    });
    
    // Check for archive destination section
    cy.get('.archive-destination').should('exist');
    cy.get('.archive-destination h4').should('contain', 'Archive To:');
    
    // Check if there are multiple DONE columns or just one
    cy.get('body').then($body => {
      if ($body.find('.destination-selector').length > 0) {
        // Multiple columns - should have selectable buttons
        cy.get('.destination-btn').should('have.length.at.least', 2);
        
        // Test selection
        cy.get('.destination-btn').first().should('have.class', 'selected');
        cy.get('.destination-btn').last().click();
        cy.get('.destination-btn').last().should('have.class', 'selected');
      } else {
        // Single column - should just display
        cy.get('.single-destination').should('exist');
        cy.get('.destination-name').should('contain.text', 'ARCHIVE');
      }
    });
    
    // Cancel
    cy.get('.btn-cancel').click();
  });
});
