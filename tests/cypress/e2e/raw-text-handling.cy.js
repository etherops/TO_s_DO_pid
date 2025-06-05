describe('Raw Text Handling', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('TO_s_DO_pid').should('be.visible');
    cy.contains('.file-tab', 'example').click();
    cy.wait(500); // Allow data to load

    // Enable raw text visibility
    cy.get('.toggle-switch').click();
    cy.wait(100);
  });

  it('should display raw text before first column as raw-text stacking column', () => {
    // Verify that raw-text columns are displayed in the TODO stack
    cy.get('.column-stack').eq(0).within(() => {
      // Should find a column that contains the WINDSTORM raw text
      cy.get('.kanban-column').should('contain', 'WINDSTORM');
    });
    
    // Verify it has the raw-text column styling
    cy.get('.raw-text-column').contains('WINDSTORM').should('exist');
    
    // Verify it has the correct monospace styling
    cy.get('.raw-text-column-text').contains('WINDSTORM')
      .should('have.css', 'font-family')
      .and('match', /monaco|menlo|mono/i);
  });

  it('should handle raw text between column and section as raw-text section', () => {
    // Verify the raw text "SPARKLE" appears as a raw-text section in TODO column
    cy.get('.todo-column').should('exist');
    
    // Look for raw-text section containing SPARKLE
    cy.get('.raw-text-section').contains('SPARKLE').should('exist');
    
    // Verify it appears before the first regular section in TODO column
    cy.get('.todo-column .raw-text-section').contains('SPARKLE').should('exist');
    
    // Verify it has the correct styling (monospace font)
    cy.get('.raw-text-section-text').contains('SPARKLE')
      .should('have.css', 'font-family')
      .and('match', /monaco|menlo|mono/i);
  });

  it('should handle raw text within sections as raw-text items', () => {
    // Verify raw text items within sections exist
    cy.get('.raw-text-card').contains('SUPERCATS').should('exist');
    cy.get('.raw-text-card').contains('BADBOYS').should('exist');
    cy.get('.raw-text-card').contains('GIGGLEGIGGLE').should('exist');
    
    // Verify they have the correct styling
    cy.get('.raw-text-text').contains('SUPERCATS')
      .should('have.css', 'font-family')
      .and('match', /monaco|menlo|mono/i);
    
    // Verify raw-text items are not editable (no edit buttons)
    cy.get('.raw-text-card').first().within(() => {
      cy.get('.edit-btn').should('not.exist');
      cy.get('.delete-btn').should('not.exist');
      cy.get('.custom-checkbox').should('not.exist');
    });
  });

  it('should preserve raw text content during drag operations', () => {
    // Perform a drag operation on a regular task
    cy.get('.todo-column').contains('PROJECT - Mountain trip planning').as('taskToDrag');
    cy.get('.wip-column .section').first().as('dropTarget');
    
    cy.get('@taskToDrag').parent().drag('@dropTarget');
    
    // Wait for the operation to complete
    cy.wait(1000);
    
    // Verify all raw text is still visible in DOM
    cy.get('.raw-text-column').contains('WINDSTORM').should('exist');
    cy.get('.raw-text-section').contains('SPARKLE').should('exist');
    cy.get('.raw-text-card').contains('SUPERCATS').should('exist');
    cy.get('.raw-text-card').contains('BADBOYS').should('exist');
    cy.get('.raw-text-card').contains('GIGGLEGIGGLE').should('exist');
  });

  it('should persist raw text correctly after page refresh', () => {
    // Verify initial state
    cy.get('.raw-text-column').contains('WINDSTORM').should('exist');
    cy.get('.raw-text-section').contains('SPARKLE').should('exist');
    cy.get('.raw-text-card').contains('SUPERCATS').should('exist');
    cy.get('.raw-text-card').contains('BADBOYS').should('exist');
    cy.get('.raw-text-card').contains('GIGGLEGIGGLE').should('exist');
    
    // Reload the page to force a fresh parse
    cy.reload();
    cy.wait(2000);
    
    // Click the example tab again
    cy.contains('.file-tab', 'example').click();
    cy.wait(500);
    
    // Enable raw text visibility again (it resets after refresh)
    cy.get('.toggle-switch').click();
    cy.wait(100);
    
    // Verify all raw text is still displayed correctly after reload
    cy.get('.raw-text-column').contains('WINDSTORM').should('exist');
    cy.get('.raw-text-section').contains('SPARKLE').should('exist');
    cy.get('.raw-text-card').contains('SUPERCATS').should('exist');
    cy.get('.raw-text-card').contains('BADBOYS').should('exist');
    cy.get('.raw-text-card').contains('GIGGLEGIGGLE').should('exist');
  });
});