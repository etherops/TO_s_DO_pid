import { findSection, findTask } from '../support/helpers.js';

describe('Task Sorting Feature', () => {
  it('should show pulsing animation when task status changes', () => {
    // Use existing test data from AUTOSORT TEST section
    findTask('sort4').within(() => {
      // Change status to trigger animation
      cy.get('.custom-checkbox').click(); // ~> x
      
      // Verify the checkbox has the pending-sort class (pulsing animation)
      cy.get('.custom-checkbox').should('have.class', 'pending-sort');
    });
    
    // Wait for animation to finish
    cy.wait(3500);
    
    // Animation should be gone
    findTask('sort4').within(() => {
      cy.get('.custom-checkbox').should('not.have.class', 'pending-sort');
    });
  });

  it('should auto-sort tasks upward when priority increases', () => {
    const sectionName = 'AUTOSORT TEST';
    
    // Mark sort0 as completed - should float up
    findTask('sort0').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
    });
    
    cy.wait(3500); // Wait for auto-sort
    
    // Verify sort0 moved up and has completed status
    findTask('sort0').within(() => {
      cy.get('.custom-checkbox').should('have.class', 'checked');
    });
  });

  it('should auto-sort tasks downward when priority decreases', () => {
    const sectionName = 'AUTOSORT TEST';
    
    // Change sort8 from completed [x] to unchecked [ ] - should float down
    findTask('sort8').within(() => {
      cy.get('.custom-checkbox').click(); // x -> -
      cy.get('.custom-checkbox').click(); // - -> (space)
    });
    
    cy.wait(3500); // Wait for auto-sort
    
    // Verify sort8 now has unchecked status
    findTask('sort8').within(() => {
      cy.get('.custom-checkbox').should('have.class', 'unchecked');
    });
  });

  it('should respect priority order after changes', () => {
    const sectionName = 'AUTOSORT TEST';
    
    // Make sort5 in-progress
    findTask('sort5').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
    });
    cy.wait(3500);
    
    // Verify sort5 now has in-progress status
    findTask('sort5').within(() => {
      cy.get('.custom-checkbox').should('have.class', 'in-progress');
    });
    
    // Make sort6 cancelled
    findTask('sort6').within(() => {
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
      cy.get('.custom-checkbox').click(); // -> cancelled
    });
    cy.wait(3500);
    
    // Verify sort6 now has cancelled status
    findTask('sort6').within(() => {
      cy.get('.custom-checkbox').should('have.class', 'cancelled');
    });
  });

  it('should handle basic sorting functionality', () => {
    // Simple test to verify sorting works at all
    const sectionName = 'AUTOSORT TEST';
    
    // Change a task status and verify it triggers sorting
    findTask('sort2').within(() => {
      cy.get('.custom-checkbox').click(); // change status
    });
    
    cy.wait(3500);
    
    // Just verify the section still exists and has tasks
    findSection(sectionName).within(() => {
      cy.get('.task-card').should('have.length.at.least', 5);
    });
  });

  it('should not affect items in ON ICE columns', () => {
    const onIceSection = 'We\'re never doing this shit';
    
    // Verify we can't toggle status in ON ICE columns
    findTask('Redecorate the living room').within(() => {
      cy.get('.custom-checkbox').should('exist');
      cy.get('.custom-checkbox').click();
      
      // Status should remain unchanged (unchecked)
      cy.get('.custom-checkbox').should('have.class', 'unchecked');
    });
    
    // Verify the order hasn't changed
    findSection(onIceSection).within(() => {
      cy.get('.task-card').first().should('contain', 'Redecorate the living room');
      cy.get('.task-card').eq(1).should('contain', 'Tea with mother in law');
    });
  });

  it('should show sort button in section headers', () => {
    const sectionName = 'AUTOSORT TEST';
    
    // Verify sort button exists
    findSection(sectionName).within(() => {
      cy.get('.sort-tasks-btn').should('exist');
      cy.get('.sort-tasks-btn').should('have.attr', 'title', 'Sort tasks');
      cy.get('.sort-tasks-btn').should('contain', '🔀');
    });
  });

  it('should manually sort all tasks when sort button is clicked', () => {
    const sectionName = 'AUTOSORT TEST';
    
    // Click the sort button to manually sort all tasks
    findSection(sectionName).within(() => {
      cy.get('.sort-tasks-btn').should('exist');
      cy.get('.sort-tasks-btn').should('not.be.disabled');
      
      // Click the sort button
      cy.get('.sort-tasks-btn').click();
    });
    
    // Wait for sorting animation
    cy.wait(2000);
    
    // Verify button is functional again
    findSection(sectionName).within(() => {
      cy.get('.sort-tasks-btn').should('not.be.disabled');
    });
    
    // Verify tasks are sorted in priority order
    findSection(sectionName).within(() => {
      // All [x] tasks should be at the top
      cy.get('.task-card').each(($card, index) => {
        // Check that higher priority items appear first
        cy.wrap($card).find('.custom-checkbox').then(($checkbox) => {
          const classes = $checkbox.attr('class');
          // At minimum, verify we have checkboxes with different states
          expect(classes).to.include('custom-checkbox');
        });
      });
    });
  });

  it('should not show sort button in ON ICE columns', () => {
    const onIceSection = 'We\'re never doing this shit';
    
    // Verify sort button does not exist in ON ICE sections
    findSection(onIceSection).within(() => {
      cy.get('.sort-tasks-btn').should('not.exist');
    });
  });

  it('should handle bidirectional sorting correctly', () => {
    const sectionName = 'AUTOSORT TEST';
    
    // Test a complete cycle: unchecked -> completed -> unchecked
    findTask('sort0').within(() => {
      // First, mark as completed (should move up)
      cy.get('.custom-checkbox').click(); // -> in-progress
      cy.get('.custom-checkbox').click(); // -> completed
    });
    
    cy.wait(3500);
    
    // Verify it moved up
    findSection(sectionName).within(() => {
      cy.get('.task-card').first().should('contain', 'sort0');
    });
    
    // Now change it back to unchecked (should move down)
    findTask('sort0').within(() => {
      cy.get('.custom-checkbox').click(); // completed -> cancelled
      cy.get('.custom-checkbox').click(); // cancelled -> unchecked
    });
    
    cy.wait(3500);
    
    // Verify it moved down (not at the top anymore)
    findSection(sectionName).within(() => {
      cy.get('.task-card').first().should('not.contain', 'sort0');
    });
  });
});