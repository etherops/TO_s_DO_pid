describe('Read-only Focus date preview', () => {
  it('previews any date and restores today without saving', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [ ] Preview target ! Jan 3 2027\n* [~] Active task\n')
      .then(() => {
        cy.reload();
        cy.contains('.task-card', 'Preview target').should('be.visible');
      });
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2027-01-03').trigger('change');
    cy.get('.focus-preview-label').should('contain', 'Read-only');
    cy.get('.panel-now').should('contain', 'Preview target');
    cy.get('.focus-date').should('contain', 'Jan 3rd, 2027');
    cy.get('.focus-task-row button').each(button => cy.wrap(button).should('be.disabled'));
    cy.get('.focus-task-row[draggable="true"]').should('not.exist');
    cy.get('.focus-quick-add-btn, .focus-overdue-btn').should('not.exist');
    cy.get('.focus-task-row').first().rightclick();
    cy.get('.focus-task-context-menu').should('not.exist');
    cy.contains('.focus-as-of button', 'Back to today').click();
    cy.get('.focus-preview-label').should('not.exist');
    cy.get('.focus-quick-add-btn').should('be.visible');
    cy.get('.focus-row-check').filter('button').first().should('not.be.disabled');
  });
});
