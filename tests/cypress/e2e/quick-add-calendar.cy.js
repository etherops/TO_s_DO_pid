describe('Focus quick-add calendar', () => {
  it('uses a native day picker and saves the selected date', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [~] Existing task\n').then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.focus-quick-add-btn').click();
    cy.get('.focus-quick-add-input').type('Calendar regression');
    cy.get('.focus-quick-add-date-btn').click();
    cy.get('.focus-quick-add-date-menu .focus-date-custom-trigger').click();
    cy.get('input[aria-label="New task custom due day"]')
      .should('have.attr', 'type', 'date').and('be.visible').then($input => {
        expect($input[0].getBoundingClientRect().width).to.be.greaterThan(100);
      });
    cy.get('.focus-quick-add-date-menu .focus-period-kind-btn').contains(/^week$/i).click();
    cy.get('input[aria-label="New task custom due week"]').should('have.attr', 'type', 'week');
    cy.get('.focus-quick-add-date-menu .focus-period-kind-btn').contains(/^day$/i).click();
    cy.get('input[aria-label="New task custom due day"]').invoke('val', '2026-12-15').trigger('change');
    cy.get('.focus-quick-add-popover').should('not.exist');
    cy.contains('.focus-task-row', 'Calendar regression').should('exist');
    cy.reload();
    cy.contains('.focus-task-row', 'Calendar regression').should('contain', 'Dec 15');
  });
});
