describe('Initiatives', () => {
  it('persists high priority and shows its Focus summary', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [~] Initiative task\n').then(() => cy.reload());
    cy.contains('.task-card', 'Initiative task').find('.priority-toggle').click();
    cy.contains('.task-card', 'Initiative task').find('.low-priority-badge').click();
    cy.contains('.task-card', 'Initiative task').find('.priority-toggle').should('have.text', 'HIGH');
    cy.reload();
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.focus-initiatives').should('contain', 'Initiative task');
    cy.get('.focus-initiatives .priority-toggle').click();
    cy.get('.focus-initiatives').should('not.exist');
  });
});
