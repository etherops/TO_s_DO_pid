describe('Editable Focus date navigation', () => {
  it('edits tasks on another date and restores today', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [ ] Preview target ! Jan 3 2027\n* [~] Active task\n')
      .then(() => {
        cy.reload();
        cy.contains('.task-card', 'Preview target').should('be.visible');
      });
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2027-01-03').trigger('change');
    cy.get('.focus-preview-label').should('not.exist');
    cy.get('.panel-now').should('contain', 'Preview target');
    cy.get('.focus-date').should('contain', 'Jan 3rd, 2027');
    cy.contains('.panel-now .focus-row-title', 'Preview target').click();
    cy.get('.focus-edit-name').clear().type('Edited target');
    cy.get('.focus-edit-save').click();
    cy.get('.panel-now').should('contain', 'Edited target');
    cy.get('.focus-quick-add-btn').should('be.visible');
    cy.contains('.panel-now .focus-task-row', 'Edited target').rightclick();
    cy.get('.focus-task-context-menu').should('be.visible').type('{esc}');
    cy.contains('.focus-as-of button', 'Back to today').click();
    cy.get('.focus-preview-label').should('not.exist');
    cy.get('.focus-quick-add-btn').should('be.visible');
    cy.get('.focus-row-check').filter('button').first().should('not.be.disabled');
  });
});
