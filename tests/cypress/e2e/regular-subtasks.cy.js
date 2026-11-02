describe('Normal task subtasks', () => {
  it('keeps an empty normal-task editor note-first until subtasks are requested', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [~] Simple task (A useful note)\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.contains('.focus-row-title', 'Simple task').click();
    cy.get('.subtask-editor').should('not.exist');
    cy.get('.focus-note-column').should($note => {
      const editor = $note[0].closest('.focus-inline-editor').getBoundingClientRect();
      expect($note[0].getBoundingClientRect().width).to.be.greaterThan(editor.width * 0.9);
    });
    cy.get('.focus-inline-editor').screenshot('normal-note-first');
    cy.get('.add-subtasks-control').click();
    cy.get('input[aria-label="Subtask title"]').should('be.visible');
    cy.get('.focus-inline-editor').should($editor => {
      const subtasks = $editor[0].querySelector('.subtask-heading').getBoundingClientRect();
      const note = $editor[0].querySelector('.focus-note-heading').getBoundingClientRect();
      expect(Math.abs(subtasks.top - note.top)).to.be.lessThan(2);
    });
    cy.get('.focus-inline-editor').screenshot('aligned-editor-headings');
    cy.get('.focus-edit-cancel').click();
    cy.contains('.focus-row-title', 'Simple task').click();
    cy.get('.subtask-editor').should('not.exist');
    cy.get('.focus-edit-cancel').click();
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.task-card', 'Simple task').find('.notes-btn').click();
    cy.get('.subtask-editor').should('not.exist');
    cy.get('.add-subtasks-control').click();
    cy.get('input[aria-label="Subtask title"]').should('be.visible');
  });
  it('offers initiatives first and searches open normal parents', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [~] Initiative parent\n* [~] Source task\n'
      + '* [~] Normal parent\n* [x] Closed parent\n- [~] Low parent\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.contains('.focus-task-row', 'Source task').rightclick();
    cy.contains('button', 'Convert to subtask').click();
    cy.get('.initiative-parent-options').should('contain', 'Initiative parent').and('not.contain', 'Normal parent');
    cy.contains('button', 'Choose a regular task').click();
    cy.get('.initiative-parent-options').should('contain', 'Normal parent')
      .and('not.contain', 'Closed parent').and('not.contain', 'Low parent').and('not.contain', 'Source task');
    cy.get('.initiative-parent-options').should($list => {
      expect($list[0].getBoundingClientRect().height).to.be.at.most(240);
    });
    cy.get('.focus-task-context-menu').screenshot('regular-parent-chooser');
    cy.get('input[aria-label="Search open tasks"]').type('normal');
    cy.get('.initiative-parent-options button').should('have.length', 1).click();
    cy.contains('.focus-task-row', 'Normal parent').find('.subtask-indicator').click();
    cy.get('input[aria-label="Subtask title"]').first().should('have.value', 'Source task');
    cy.get('input[aria-label="Subtask title"]').last().type('Added child');
    cy.get('.focus-edit-save').click();
    cy.reload();
    cy.contains('.focus-task-row', 'Normal parent').find('.subtask-total').should('have.text', '2 subtasks');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.task-card', 'Normal parent').find('.subtask-indicator').click();
    cy.get('input[aria-label="Subtask title"]').last().should('be.visible').type('Board child');
    cy.get('.task-card .confirm-edit-btn').click();
    cy.contains('.task-card', 'Normal parent').find('.subtask-total').should('have.text', '3 subtasks');
  });
});
