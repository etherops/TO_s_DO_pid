describe('Subtask status counts', () => {
  it('shows the same compact status breakdown on the board and in Focus and opens editing', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [~] Counted initiative\n'
      + '  - [ ] Unstarted child\n  - [~] Active child\n  - [x] Done child\n'
      + '  - [x] Another done child\n  - [-] Cancelled child\n').then(() => cy.reload());
    const checkCounts = () => {
      cy.get('.subtask-indicator').should('have.attr', 'aria-label',
        'Edit subtasks: 5 total, 2 done, 1 in progress, 1 not started, 1 will not do');
      cy.get('.subtask-total').should('have.text', '5 subtasks');
      cy.get('.subtask-indicator .subtask-status-grid').should('not.exist');
      cy.get('.subtask-status-grid').parent().should($control => {
        expect($control.is('.custom-checkbox, .focus-row-check')).to.equal(true);
        expect(parseFloat(getComputedStyle($control[0]).borderTopWidth)).to.be.greaterThan(0);
        expect(getComputedStyle($control[0]).borderTopColor).to.equal('rgb(165, 176, 187)');
        const control = $control[0];
        const grid = control.querySelector('.subtask-status-grid');
        expect(Math.abs(control.clientWidth - control.clientHeight)).to.be.at.most(1);
        expect(grid.offsetHeight).to.be.at.most(control.clientHeight);
      });
      cy.get('.subtask-status-grid').should('have.css', 'gap', '0px');
      cy.get('.subtask-status-block.unchecked').first().should('have.css', 'box-shadow', 'none');
      cy.get('.subtask-status-block.unchecked').first()
        .should('have.css', 'background-color', 'rgb(237, 240, 243)');
      cy.get('.subtask-status-block.unchecked').each($tile => {
        const dot = getComputedStyle($tile[0], '::after');
        expect(dot.width).to.equal('1px');
        expect(dot.height).to.equal('1px');
        expect(dot.backgroundColor).to.equal('rgb(165, 176, 187)');
      });
      cy.get('.subtask-status-block').should('have.length', 16).then($counts => {
        expect([...$counts].map(el => el.dataset.status)).to.deep.equal([
          ...Array(3).fill(' '), ...Array(3).fill('-'), ...Array(3).fill('~'), ...Array(7).fill('x')
        ]);
      });
      cy.get('.subtask-status-block.in-progress').should('have.css', 'background-color', 'rgb(255, 179, 71)');
      cy.get('.subtask-status-block.checked').first().should('have.css', 'background-color', 'rgb(76, 175, 80)');
      cy.get('.subtask-indicator').should($strip => {
        expect($strip[0].getBoundingClientRect().height).to.be.lessThan(25);
      });
    };
    checkCounts();
    cy.get('.subtask-indicator').click();
    cy.get('input[aria-label="Subtask title"]').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.contains('.view-mode-btn', 'Focus').click();
    checkCounts();
    cy.get('.subtask-indicator').click();
    cy.get('.focus-edit-name').should('have.value', 'Counted initiative');
    cy.get('.focus-edit-cancel').click();
    cy.get('.focus-initiatives .focus-row-check').should('have.class', 'in-progress');
  });
});
