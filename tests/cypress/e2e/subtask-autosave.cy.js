describe('Subtask autosave', () => {
  it('adds subtasks directly in an expanded Plan project on Enter and blur', () => {
    const source = '# SELECTED\n### Original section\n+ [~] Parent (note) ! Dec 2026\n'
      + '  - [x] Existing (hidden) | Nov 1 2026\n  * Preserve raw\n';
    cy.writeTestFileContent(source).then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('[aria-label="Expand Parent"]').click();
    cy.intercept('POST', '**/api/todos').as('addition');
    cy.get('[aria-label="Add subtask to Parent"]').type('New child{enter}').should('have.value', '').and('have.focus');
    cy.wait('@addition').its('request.body.content').should('contain', source.trim() + '\n  - [ ] New child');
    cy.get('[aria-label="Add subtask to Parent"]').type('Another child').blur();
    cy.wait('@addition').its('request.body.content').should('contain', '  - [ ] New child\n  - [ ] Another child');
    cy.get('@addition.all').should('have.length', 2);
    cy.reload();
    cy.get('[aria-label="Expand Parent"]').click();
    cy.get('.planning-project-children .planning-child-title').should('have.length', 3);
    cy.get('[aria-label="Add subtask to Parent"]').should('have.value', '');
  });
  const openParent = mode => {
    if (mode === 'Focus') cy.get('#focus-tab-projects').click();
    cy.get(mode === 'Focus' ? '.focus-initiatives .subtask-indicator'
      : '[data-planning-lane="PROJECTS"] .subtask-indicator').click();
  };
  for (const mode of ['Focus', 'Plan']) {
    it(`saves titles, additions, dates, order and removal without parent Save in ${mode}`, () => {
      cy.writeTestFileContent(`# ${mode === 'Plan' ? 'SELECTED' : 'WIP'}\n### Work\n+ [~] Parent\n`
        + '  - [ ] Original (keep note)\n  * Keep raw\n')
        .then(() => cy.reload());
      cy.contains('.view-mode-btn', mode).click();
      openParent(mode);
      cy.get('input[aria-label="Subtask title"]').first().clear().type('Renamed').blur();
      cy.get('input[aria-label="Subtask title"]').last().type('Second child{enter}');
      cy.get('.subtask-drag-handle').eq(1).focus().trigger('keydown', { key: 'ArrowUp' });
      cy.get('input[aria-label="Subtask title"]').first().should('have.value', 'Second child');
      cy.get('button[aria-label="Edit subtask due date"]').first().click();
      cy.get('input[aria-label="Subtask due day"]').invoke('val', '2026-12-15').trigger('change');
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      openParent(mode);
      cy.get('input[aria-label="Subtask title"]').eq(0).should('have.value', 'Second child');
      cy.get('input[aria-label="Subtask title"]').eq(1).should('have.value', 'Renamed');
      cy.get('button[aria-label="Edit subtask due date"]').first().should('contain', 'Dec 15');
      cy.get('.subtask-remove').first().click();
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      if (mode === 'Focus') cy.get('#focus-tab-projects').click();
      cy.get(mode === 'Focus' ? '.focus-initiatives .subtask-total'
        : '[data-planning-lane="PROJECTS"] .subtask-total').should('have.text', mode === 'Focus' ? '1 subtask' : '1');
    });
  }
});
