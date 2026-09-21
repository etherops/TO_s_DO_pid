describe('Focus notes', () => {
  it('adds and edits a note from a side panel', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [~] Note task\n').then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.contains('.focus-row-title', 'Note task').click();
    cy.get('.focus-edit-note').type('First note{enter}');
    cy.get('.focus-edit-note').should('not.exist');
    cy.contains('.focus-task-row', 'Note task').find('.focus-note-indicator').click();
    cy.get('.focus-edit-note').should('have.value', 'First note').clear().type('Updated note');
    cy.get('.focus-edit-save').click();
    cy.reload();
    cy.contains('.focus-task-row', 'Note task').find('.focus-note-indicator')
      .should('have.attr', 'aria-label', 'Task note: Updated note');
  });
});
