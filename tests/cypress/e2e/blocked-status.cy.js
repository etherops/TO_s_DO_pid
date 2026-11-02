describe('Blocked tasks', () => {
  it('renders and persists blocked tasks across Focus, Plan and nested editing', () => {
    cy.viewport(1800, 1100);
    cy.writeTestFileContent(`# SELECTED
### Plans
* [!] Blocked today ! Oct 21 2026
* [!] Blocked overdue ! Oct 20 2026
* [!] Blocked later ! Nov 2026
- [!] Low blocked
+ [!] Blocked initiative
  - [!] Blocked child (keep note)
# WIP
### Work
* [~] Active weekly ! Oct Week #4 2026
* [ ] Queued weekly ! Oct Week #4 2026
* [ ] Cycle me ! Oct Week #4 2026
`).then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-10-21').trigger('change');
    for (const title of ['Blocked today', 'Blocked overdue', 'Blocked later', 'Blocked initiative', 'Blocked child']) {
      cy.contains('.panel-in-progress-queued .focus-task-row', title).find('.status-blocked').should('be.visible');
      cy.get('.panel-now').should('not.contain', title);
    }
    cy.get('.panel-in-progress-queued .day-blocked').should('contain', 'Blocked');
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Blocked initiative')
      .find('.subtask-indicator').should('have.attr', 'title', '1 total, 1 blocked');
    cy.get('.panel-in-progress-queued .day-low-priority').should('exist');
    cy.get('.panel-now').should('contain', 'Active weekly').and('contain', 'Queued weekly');
    cy.contains('.panel-now .focus-task-row', 'Active weekly').should('have.class', 'this-week-row');
    cy.get('.focus-initiatives').should('not.exist');
    cy.get('.panel-in-progress-queued .status-blocked').first().then(($control) => {
      const style = getComputedStyle($control[0]);
      const inner = getComputedStyle($control[0], '::after');
      expect(style.clipPath).to.equal('none');
      expect(inner.clipPath).to.contain('polygon');
      expect(parseFloat(inner.width)).to.be.lessThan($control[0].getBoundingClientRect().width * 0.65);
    });
    cy.clock(Date.now());
    const cycleControl = () => cy.contains('.panel-now .focus-task-row', 'Cycle me').find('.focus-row-check');
    for (const state of ['checked', 'in-progress', 'status-blocked']) {
      cycleControl().click({ force: true });
      cycleControl().should('have.class', state);
    }
    cy.tick(3000);
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Cycle me').find('.status-blocked').should('exist');
    cy.get('.panel-now').should('not.contain', 'Cycle me');
    cy.get('.panel-in-progress-queued').screenshot('blocked-right-pane');
    cy.clock().invoke('restore');
    cy.reload();
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Cycle me').find('.status-blocked').should('exist');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.task-card', 'Cycle me').find('.status-blocked').should('be.visible');
    cy.get('.selected-file-status-summary [title="Blocked"]').should('contain', '7');
    cy.viewport(1280, 900);
    cy.get('.selected-file-status-summary .header-status-label').should('not.be.visible');
    cy.get('.selected-file-status-summary').then(($summary) => {
      cy.get('.file-selector-trigger').then(($selector) => {
        expect($summary[0].getBoundingClientRect().left)
          .to.be.greaterThan($selector[0].getBoundingClientRect().right);
      });
      cy.get('.toolbar-controls').then(($toolbar) => {
        expect($summary[0].getBoundingClientRect().right)
          .to.be.lessThan($toolbar[0].getBoundingClientRect().left);
      });
    });
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.contains('.panel-in-progress-queued .focus-row-title', 'Blocked initiative').click();
    cy.get('.subtask-edit-row').first().find('.status-blocked').should('be.visible');
    cy.get('.subtask-edit-row').first().find('.subtask-status').click();
    cy.get('.subtask-edit-row').first().find('.subtask-status').should('have.class', 'is-cancelled');
    cy.get('.focus-edit-cancel').click();
    cy.reload();
    cy.contains('.panel-in-progress-queued .focus-row-title', 'Blocked initiative').click();
    cy.get('.subtask-edit-row').first().find('.subtask-status').should('have.class', 'is-cancelled');
  });
});
