describe('Raw Text Toggle', () => {
  it('should show toggle switch with correct text when raw text exists', () => {
    // Verify toggle switch container and label exist with correct text
    cy.get('.toggle-switch').contains('raw text')
      .should('be.visible')
      .should('contain', 'Show raw text')
      .should('contain', 'lines'); // Should show line count
    
    // Verify toggle is not disabled (since raw text exists)
    cy.get('.raw-text-toggle').should('not.be.disabled');
    
    // Verify toggle is initially unchecked
    cy.get('.raw-text-toggle').should('not.be.checked');
  });

  it('should hide raw text by default', () => {
    // Verify raw text is hidden initially
    cy.get('.raw-text-column').should('not.exist');
    cy.get('.raw-text-section').should('not.exist');
    cy.get('.raw-text-card').should('not.exist');
  });

  it('should show raw text when toggle is clicked', () => {
    // Click toggle switch (label) to show raw text
    cy.get('.toggle-switch').contains('raw text').click();
    cy.wait(100);
    
    // Verify toggle is now checked
    cy.get('.raw-text-toggle').should('be.checked');
    
    // Verify toggle text changes
    cy.get('.toggle-switch').contains('raw text').should('contain', 'Hide raw text');
    
    // Verify raw text becomes visible
    cy.get('.raw-text-column').contains('WINDSTORM').should('exist');
    cy.get('.raw-text-section').contains('SPARKLE').should('exist');
    cy.get('.raw-text-card').contains('SUPERCATS').should('exist');
  });

  it('should hide raw text when toggle is clicked again', () => {
    // First enable raw text
    cy.get('.toggle-switch').contains('raw text').click();
    cy.wait(100);
    
    // Verify raw text is visible and toggle is checked
    cy.get('.raw-text-column').should('exist');
    cy.get('.raw-text-toggle').should('be.checked');
    
    // Click toggle again to hide
    cy.get('.toggle-switch').contains('raw text').click();
    cy.wait(100);
    
    // Verify toggle is unchecked and text changes back
    cy.get('.raw-text-toggle').should('not.be.checked');
    cy.get('.toggle-switch').contains('raw text').should('contain', 'Show raw text');
    
    // Verify raw text is hidden
    cy.get('.raw-text-column').should('not.exist');
    cy.get('.raw-text-section').should('not.exist');
    cy.get('.raw-text-card').should('not.exist');
  });

  it('should disable toggle when no raw text exists', () => {
    // Switch to a file with no raw text (TO_s_DO_pid)
    cy.contains('.file-tab', 'TO s DO pid').click();
    cy.wait(500);
    
    // Verify toggle is disabled
    cy.get('.raw-text-toggle').should('be.disabled');
    
    // Find the specific toggle switch for raw text
    cy.get('.toggle-switch').filter(':has(.raw-text-toggle)').as('rawTextToggle');
    
    // Verify the toggle switch has correct text and disabled class
    cy.get('@rawTextToggle').should('contain', 'Show raw text');
    cy.get('@rawTextToggle').should('not.contain', 'lines');
    cy.get('@rawTextToggle').should('have.class', 'disabled');
  });
});