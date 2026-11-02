describe('Focus priority arrows', () => {
  it('shows compact adjacent arrows and saves the chosen priority without changing the board control', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [ ] Raise me ! Oct 1 2026\n'
      + '* [ ] Lower me ! Oct 1 2026\n* [ ] Parent ! Oct 1 2026\n  - [ ] Keep child\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-10-01').trigger('change');
    cy.contains('.panel-now .focus-task-row', 'Raise me').find('.priority-directions').should($group => {
      const buttons = $group[0].querySelectorAll('button');
      expect([...buttons].map(button => button.textContent)).to.deep.equal(['↑', '↓']);
      expect(getComputedStyle($group[0]).gap).to.equal('0px');
      expect(getComputedStyle(buttons[0]).fontSize).to.equal('10px');
      expect(getComputedStyle(buttons[0]).width).to.equal('12px');
      const up = buttons[0].getBoundingClientRect();
      const down = buttons[1].getBoundingClientRect();
      expect(down.left - up.right).to.be.closeTo(0, 0.5);
    });
    cy.get('.panel-now').screenshot('compact-priority-arrows');
    cy.contains('.panel-now .focus-task-row', 'Raise me').find('[aria-label="Make high priority"]').click();
    cy.get('.focus-initiatives').should('contain', 'Raise me');
    cy.contains('.panel-now .focus-task-row', 'Lower me').find('[aria-label="Make low priority"]').click();
    cy.readFile('fixture-focus-priority-arrows.todo.md').should('contain', '- [ ] Lower me');
    cy.contains('.panel-now .focus-task-row', 'Parent').find('[aria-label="Make high priority"]').click();
    cy.get('.detach-modal').should('not.exist');
    cy.contains('.focus-initiatives .focus-task-row', 'Parent').find('.priority-toggle').click();
    cy.contains('.panel-now .focus-task-row', 'Parent').find('[aria-label="Make low priority"]').click();
    cy.get('.detach-modal').should('be.visible');
    cy.get('.detach-cancel').click();
    cy.readFile('fixture-focus-priority-arrows.todo.md').should('contain', '* [ ] Parent ! Oct 1 2026\n  - [ ] Keep child');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.task-card', 'Parent').find('.priority-toggle').should('have.text', '↕');
    cy.get('.priority-directions').should('not.exist');
  });
});
