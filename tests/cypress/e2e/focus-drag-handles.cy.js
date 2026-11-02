describe('Focus drag handles', () => {
  it('renders spaced two-column grips and preserves handle-only sorting', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [ ] Initiative one\n+ [ ] Initiative two\n'
      + '* [ ] Today one ! Sep 21 2026\n* [ ] Today two ! Sep 21 2026\n'
      + '* [ ] Tomorrow one ! Sep 22 2026\n* [ ] Tomorrow two ! Sep 22 2026\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-09-21').trigger('change');
    cy.get('.focus-drag-handle:not(:disabled)').should('have.length.at.least', 6).each($handle => {
      const grip = getComputedStyle($handle[0], '::before');
      const control = getComputedStyle($handle[0]);
      expect(grip.width).to.equal('8px');
      expect(grip.height).to.equal('12px');
      expect(grip.backgroundSize).to.equal('4px 4px');
      expect(control.width).to.equal('12px');
      expect(control.height).to.equal('20px');
    });
    cy.get('.panel-now').screenshot('focus-two-column-drag-grips');
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer();
      cy.contains('.panel-now .focus-task-row', 'Today two').find('.focus-drag-handle')
        .trigger('dragstart', { dataTransfer });
      cy.contains('.panel-now .focus-task-row', 'Today one').then($target => {
        const clientY = $target[0].getBoundingClientRect().top + 1;
        cy.wrap($target).trigger('dragover', { dataTransfer, clientY }).trigger('drop', { dataTransfer, clientY });
      });
    });
    cy.get('.panel-now .focus-task-row').first().should('contain', 'Today two');
    cy.contains('.panel-now .focus-row-title', 'Today one').click();
    cy.get('.focus-edit-name').should('have.value', 'Today one');
  });
});
