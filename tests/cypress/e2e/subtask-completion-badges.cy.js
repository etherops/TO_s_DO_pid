describe('Subtask completion badges', () => {
  for (const mode of ['Focus', 'Plan']) {
    it(`edits historical completion dates and saves without parent drafts in ${mode}`, () => {
      cy.writeTestFileContent('# WIP\n### Work\n+ [~] Parent\n'
        + '  - [x] Finished (keep note) | Sep 20 2026\n  - [-] Cancelled\n')
        .then(() => cy.reload());
      cy.contains('.view-mode-btn', mode).click();
      cy.get('.subtask-indicator').click();
      cy.get(mode === 'Focus' ? '.focus-edit-name' : '.task-text-edit').clear().type('Unsaved title');
      cy.get('[aria-label="Edit subtask completion date"]').first().click();
      cy.get('[aria-label="Subtask completed on"]').should('have.value', '2026-09-20');
      cy.intercept('POST', '**/api/todos').as('completionSave');
      cy.get('[aria-label="Subtask completed on"]').type('2026-09-18').blur();
      cy.wait('@completionSave').its('request.body.content').should(content => {
        expect(content).to.contain('  - [x] Finished (keep note) | Sep 18 2026');
        expect(content).not.to.contain('Unsaved title');
      });
      cy.get('[aria-label="Edit subtask completion date"]').eq(1).click();
      cy.get('[aria-label="Subtask completed on"]').should('have.value', '').type('2026-09-17').blur();
      cy.wait('@completionSave').its('request.body.content').should('contain', '  - [-] Cancelled | Sep 17 2026');
      cy.get('[aria-label="Edit subtask completion date"]').first().click();
      cy.contains('.subtask-date-picker button', 'Clear').click();
      cy.wait('@completionSave').its('request.body.content').should('contain', '  - [x] Finished (keep note)\n');
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      cy.get('.subtask-indicator').click();
      cy.get('.subtask-completion-date').eq(0).should('have.text', 'Done · no date');
      cy.get('.subtask-completion-date').eq(1).should('have.text', 'Will not do Sep 17 2026');
    });
    it(`saves status and completion immediately in ${mode} without saving parent title drafts`, () => {
      cy.writeTestFileContent('# WIP\n### Work\n+ [~] Parent\n  - [ ] Child (keep note) ! Oct 2026\n')
        .then(() => cy.reload());
      cy.contains('.view-mode-btn', mode).click();
      cy.get('.subtask-indicator').click();
      cy.get(mode === 'Focus' ? '.focus-edit-name' : '.task-text-edit').clear().type('Unsaved title');
      cy.intercept('POST', '**/api/todos').as('statusSave');
      cy.get('.subtask-status').first().click();
      cy.wait('@statusSave').its('request.body.content').should(content => {
        expect(content).to.match(/  - \[x\] Child \(keep note\) \| [A-Z][a-z]{2} \d{1,2} \d{4}/);
        expect(content).not.to.contain('Unsaved title');
      });
      cy.get('.subtask-completion-date').should('contain', 'Done');
      cy.get(mode === 'Focus' ? '.focus-edit-cancel' : '.task-card .cancel-edit-btn').click();
      cy.reload();
      cy.get('.subtask-indicator').click();
      cy.get('input[aria-label="Subtask title"]').first().should('have.value', 'Child');
      cy.get('.subtask-completion-date').should('contain', 'Done');
    });
  }
  it('shows completion dates in Focus and Plan editors without changing stored dates', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [~] Parent\n'
      + '  - [x] Finished | Sep 20 2026\n  - [-] Cancelled | Sep 21 2026\n'
      + '  - [x] Legacy\n  - [ ] Open child ! Oct 2026\n').then(() => cy.reload());
    const checkDates = () => {
      cy.get('.subtask-completion-date').should('have.length', 3);
      cy.get('.subtask-completion-date').eq(0).should('have.text', 'Done Sep 20 2026');
      cy.get('.subtask-completion-date').eq(1).should('have.text', 'Will not do Sep 21 2026');
      cy.get('.subtask-completion-date').eq(2).should('have.text', 'Done · no date');
      cy.get('button[aria-label="Edit subtask due date"]').should('have.length', 1).and('contain', 'Oct');
    };
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.subtask-indicator').click();
    checkDates();
    cy.get('.subtask-completion-date').first().should('be.visible');
    cy.get('.focus-edit-cancel').click();
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('.subtask-indicator').click();
    checkDates();
    cy.get('.task-card .confirm-edit-btn').click();
    cy.reload();
    cy.get('.subtask-indicator').click();
    checkDates();
  });
});
