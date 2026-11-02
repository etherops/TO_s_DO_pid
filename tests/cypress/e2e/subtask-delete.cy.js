describe('Subtask right-click deletion', () => {
  for (const mode of ['Focus', 'Plan']) {
    it(`deletes only the selected child and autosaves in the ${mode} editor`, () => {
      cy.writeTestFileContent('# WIP\n### Work\n+ [~] Parent\n'
        + '  - [ ] Delete me (note)\n  * Keep raw\n  - [x] Keep child | Sep 20 2026\n')
        .then(() => cy.reload());
      cy.contains('.view-mode-btn', mode).click();
      cy.get('.subtask-indicator').click();
      cy.get(mode === 'Focus' ? '.focus-edit-name' : '.task-text-edit').clear().type('Unsaved parent');
      cy.get('.subtask-edit-row').first().rightclick();
      cy.get('.subtask-context-delete').click();
      cy.contains('.subtask-context-actions button', 'Cancel').click();
      cy.get('[aria-label="Subtask title"]').first().should('have.value', 'Delete me');
      cy.get('.subtask-edit-row').first().rightclick();
      cy.get('.subtask-context-delete').click();
      cy.intercept('POST', '**/api/todos').as('deletion');
      cy.get('.subtask-context-confirm').click();
      cy.wait('@deletion').its('request.body.content').should(content => {
        expect(content).not.to.contain('Delete me');
        expect(content).not.to.contain('Unsaved parent');
        expect(content).to.contain('+ [~] Parent');
        expect(content).to.contain('  * Keep raw\n  - [x] Keep child | Sep 20 2026');
      });
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      cy.get('.subtask-indicator').click();
      cy.get('[aria-label="Subtask title"]').first().should('have.value', 'Keep child');
      cy.get('[aria-label="Subtask title"]').should('have.length', 2);
    });
  }
  it('deletes surfaced Focus children in NOW and Week at a glance without touching their parent', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [~] Parent\n'
      + '  - [ ] Today child ! Sep 21 2026\n  - [ ] Tomorrow child ! Sep 22 2026\n'
      + '  * Keep raw\n  - [ ] Keep child\n').then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-09-21').trigger('change');
    cy.intercept('POST', '**/api/todos').as('deleteChild');
    for (const [selector, title] of [['.panel-now .focus-task-row', 'Today child'],
      ['.focus-week-day-column .focus-task-row', 'Tomorrow child']]) {
      cy.contains(selector, title).rightclick();
      cy.get('.focus-task-context-column').should('not.exist');
      cy.get('.focus-task-context-delete').should('contain', 'Delete subtask').click();
      cy.get('.focus-task-context-confirm-delete').click();
      cy.wait('@deleteChild').its('request.body.content').should(content => {
        expect(content).not.to.contain(title);
        expect(content).to.contain('+ [~] Parent');
        expect(content).to.contain('  * Keep raw\n  - [ ] Keep child');
      });
      cy.readFile('fixture-subtask-delete.todo.md').should('not.contain', title);
    }
    cy.readFile('fixture-subtask-delete.todo.md').should('not.contain', 'Today child')
      .and('not.contain', 'Tomorrow child');
    cy.reload();
    cy.get('.subtask-indicator').should('contain', '1 subtask').click();
    cy.get('[aria-label="Subtask title"]').first().should('have.value', 'Keep child');
  });
});
