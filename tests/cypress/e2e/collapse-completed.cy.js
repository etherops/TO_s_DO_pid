import { refreshAndWait, findSection, findTask, withRefresh } from '../support/helpers.js';

describe('Collapse Completed Tasks Feature', () => {
  
  it('should show collapse button when section has completed tasks', () => {
    const sectionName = 'test archive';
    
    // Find section with completed tasks
    findSection(sectionName).within(() => {
      // Verify collapse button exists
      cy.get('.collapse-completed-btn').should('exist');
      cy.get('.collapse-completed-btn').should('be.visible');
      cy.get('.collapse-icon').should('contain', '▼');
    });
  });

  it('should collapse and expand completed tasks when toggled', () => {
    const sectionName = 'test archive';
    
    findSection(sectionName).scrollIntoView().within(() => {
      // Count completed tasks
      cy.get('.task-card').then($cards => {
        const totalCards = $cards.length;
        
        // Click collapse button
        cy.get('.collapse-completed-btn').click();
        
        // Verify icon changed
        cy.get('.collapse-icon').should('contain', '▶');
        
        // Verify completed tasks are collapsed
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        
        // Verify summary card exists
        cy.get('.task-card-wrapper.collapsed-summary').should('exist');
        cy.get('.summary-card').should('exist');
        
        // All original cards plus summary card should be in DOM
        cy.get('.task-card').should('have.length', totalCards + 1);
        
        // Click to expand again
        cy.get('.collapse-completed-btn').click();
        
        // Verify icon changed back
        cy.get('.collapse-icon').should('contain', '▼');
        
        // Verify no collapsed classes
        cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
        cy.get('.task-card-wrapper.collapsed-summary').should('not.exist');
        
        // Should be back to original count
        cy.get('.task-card').should('have.length', totalCards);
      });
    });
  });

  it('should persist collapse state after refresh', () => {
    const sectionName = 'test archive';
    
    // Collapse the section
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.collapse-completed-btn').click();
      cy.get('.collapse-icon').should('contain', '▶');
    });
    
    // Refresh and verify state persisted
    refreshAndWait();
    
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.collapse-icon').should('contain', '▶');
      cy.get('.task-card-wrapper.collapsed-completed').should('exist');
    });
    
    // Clean up - expand again
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.collapse-completed-btn').click();
    });
  });

  it('should not show collapse button for sections without completed tasks', () => {
    const sectionName = 'BACKLOG';
    
    findSection(sectionName).within(() => {
      // Verify no collapse button exists
      cy.get('.collapse-completed-btn').should('not.exist');
    });
  });

  it('should maintain proper z-index stacking for collapsed cards', () => {
    const sectionName = 'test archive';
    
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.collapse-completed-btn').click();
      
      // Check that completed tasks have proper stacking
      cy.get('.task-card-wrapper.collapsed-completed').each(($el, index) => {
        // Each card should have a z-index
        cy.wrap($el).should('have.css', 'z-index');
      });
      
      // Clean up
      cy.get('.collapse-completed-btn').click();
    });
  });

  it('should keep non-completed tasks visible when collapsed', () => {
    const sectionName = 'test archive'; // This section has mixed completed and incomplete tasks
    
    // Check if section exists and has collapse button
    findSection(sectionName).then($section => {
      if ($section.find('.collapse-completed-btn').length > 0) {
        findSection(sectionName).scrollIntoView().within(() => {
          cy.get('.collapse-completed-btn').click();
          
          // Non-completed tasks should be visible
          cy.get('.task-card-wrapper:not(.collapsed-completed)').should('exist');
          cy.get('.task-card-wrapper:not(.collapsed-completed)').should('be.visible');
          
          // Clean up
          cy.get('.collapse-completed-btn').click();
        });
      }
    });
  });

  it('should maintain collapsed state during interactions', () => {
    const sectionName = 'test archive';
    
    findSection(sectionName).scrollIntoView().within(() => {
      // Collapse the section
      cy.get('.collapse-completed-btn').click();
      
      // Verify collapsed state
      cy.get('.task-card-wrapper.collapsed-completed').should('have.length.at.least', 1);
      
      // Try to interact with a collapsed task (should still be clickable)
      cy.get('.task-card-wrapper.collapsed-completed').first().within(() => {
        cy.get('.custom-checkbox').should('be.visible');
      });
      
      // Verify state persists
      cy.get('.collapse-icon').should('contain', '▶');
      
      // Clean up
      cy.get('.collapse-completed-btn').click();
    });
  });

  it('should show summary card with correct counts', () => {
    const sectionName = 'test archive';
    
    findSection(sectionName).scrollIntoView().within(() => {
      // Collapse the section
      cy.get('.collapse-completed-btn').click();
      
      // Verify summary card exists and is visible
      cy.get('.task-card-wrapper.collapsed-summary').should('exist');
      cy.get('.summary-card').should('be.visible');
      
      // Check that summary shows visual checkboxes and text
      cy.get('.summary-card .custom-checkbox.checked').should('exist');
      cy.get('.summary-card .summary-text').should('contain', 'completed');
      
      // Clean up
      cy.get('.collapse-completed-btn').click();
    });
  });

  it('should default to collapsed for sections in DONE/ARCHIVE column', () => {
    // Clear localStorage to test default behavior
    cy.clearLocalStorage();
    
    // Refresh to get clean state
    refreshAndWait();
    
    // Find the ARCHIVE column specifically and check sections
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // MAY Week 4 is in the ARCHIVE column
      cy.contains('.section', 'MAY Week 4').within(() => {
        // Should be collapsed by default
        cy.get('.collapse-icon').should('contain', '▶');
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        cy.get('.summary-card').should('exist');
      });
      
      // MAY Week 3 is also in ARCHIVE column
      cy.contains('.section', 'MAY Week 3').within(() => {
        // Should be collapsed by default
        cy.get('.collapse-icon').should('contain', '▶');
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        cy.get('.summary-card').should('exist');
      });
    });
  });

  it('should not default to collapsed for sections in TODO/WIP columns', () => {
    // Clear localStorage to test default behavior
    cy.clearLocalStorage();
    
    // Refresh to get clean state
    refreshAndWait();
    
    // Check WIP column sections
    cy.get('.wip-column').within(() => {
      cy.contains('.section', 'test archive').then($section => {
        // If it has completed tasks and a collapse button
        if ($section.find('.collapse-completed-btn').length > 0) {
          cy.wrap($section).within(() => {
            // Should not be collapsed by default
            cy.get('.collapse-icon').should('contain', '▼');
            cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
          });
        }
      });
    });
  });

  it('should collapse all sections when clicking Collapse All in DONE column', () => {
    // Clear localStorage to start fresh
    cy.clearLocalStorage();
    refreshAndWait();
    
    // Find the ARCHIVE column
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // Click Collapse All button
      cy.get('.collapse-all-btn').click();
      
      // Check that all sections with completed tasks are collapsed
      cy.get('.section').each($section => {
        // If section has collapse button (meaning it has completed tasks)
        if ($section.find('.collapse-completed-btn').length > 0) {
          cy.wrap($section).within(() => {
            cy.get('.collapse-icon').should('contain', '▶');
            cy.get('.task-card-wrapper.collapsed-completed').should('exist');
          });
        }
      });
    });
  });

  it('should expand all sections when clicking Expand All in DONE column', () => {
    // Start with some sections collapsed
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // First collapse all
      cy.get('.collapse-all-btn').click();
      
      // Wait a moment for the collapse to complete
      cy.wait(500);
      
      // Then click Expand All
      cy.get('.expand-all-btn').click();
      
      // Wait a moment for the expand to complete
      cy.wait(500);
      
      // Check that all sections are expanded
      cy.get('.section').each($section => {
        // If section has collapse button
        if ($section.find('.collapse-completed-btn').length > 0) {
          cy.wrap($section).within(() => {
            cy.get('.collapse-icon').should('contain', '▼');
            cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
          });
        }
      });
    });
  });
});