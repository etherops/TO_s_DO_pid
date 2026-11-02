describe('Subtask autosave', () => {
  for (const mode of ['Focus', 'Plan']) {
    it(`saves titles, additions, dates, order and removal without parent Save in ${mode}`, () => {
      cy.writeTestFileContent('# WIP\n### Work\n+ [~] Parent\n  - [ ] Original (keep note)\n  * Keep raw\n')
        .then(() => cy.reload());
      cy.contains('.view-mode-btn', mode).click();
      cy.get('.subtask-indicator').click();
      cy.get('input[aria-label="Subtask title"]').first().clear().type('Renamed').blur();
      cy.get('input[aria-label="Subtask title"]').last().type('Second child{enter}');
      cy.get('.subtask-drag-handle').eq(1).focus().trigger('keydown', { key: 'ArrowUp' });
      cy.get('input[aria-label="Subtask title"]').first().should('have.value', 'Second child');
      cy.get('button[aria-label="Edit subtask due date"]').first().click();
      cy.get('input[aria-label="Subtask due day"]').invoke('val', '2026-12-15').trigger('change');
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      cy.get('.subtask-indicator').click();
      cy.get('input[aria-label="Subtask title"]').eq(0).should('have.value', 'Second child');
      cy.get('input[aria-label="Subtask title"]').eq(1).should('have.value', 'Renamed');
      cy.get('button[aria-label="Edit subtask due date"]').first().should('contain', 'Dec 15');
      cy.get('.subtask-remove').first().click();
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      cy.get('.subtask-total').should('have.text', '1 subtask');
    });
  }
});
