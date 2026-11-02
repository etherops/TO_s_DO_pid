describe('Archive selected completion weeks', () => {
  it('defaults to closed weeks, preserves unchecked tasks, and allows opting into this week', () => {
    cy.writeTestFileContent('# WIP\n### WIP\n* [x] Older done | Sep 24 2026\n'
      + '* [-] Current cancelled | Oct 1 2026\n* [x] Undated done\n* [~] Keep working\n'
      + '# ARCHIVE\n### Sep Week #4 2026\n* [x] Already archived | Sep 23 2026\n')
      .then(() => cy.reload());
    cy.clock(new Date(2026, 9, 2).getTime(), ['Date']);
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('.archive-section-btn').first().click();
    cy.get('[aria-label="Sep Week #4 2026"]').should('be.checked');
    cy.get('[aria-label="Oct Week #1 2026"]').should('not.be.checked');
    cy.get('.archive-selection-count').should('contain.text', '1 task selected');
    cy.get('.archive-week-summary').should($rows => {
      const checkbox = $rows[0].querySelector('input').getBoundingClientRect();
      expect(checkbox.width).to.be.greaterThan(10);
      expect($rows[1].getBoundingClientRect().top).to.be.greaterThan(checkbox.bottom);
    });
    cy.get('.modal-content').screenshot('archive-week-selection');
    cy.get('.btn-confirm').click();
    cy.readFile('fixture-archive-weeks.todo.md').should(content => {
      const [active, archive] = content.split('# ARCHIVE');
      expect(active).not.to.contain('Older done');
      expect(active).to.contain('Current cancelled');
      expect(active).to.contain('Undated done');
      expect(active).to.contain('Keep working');
      expect(archive).to.contain('Older done');
      expect(archive).to.contain('Already archived');
      expect(archive.match(/### Sep Week #4 2026/g)).to.have.length(1);
    });
    cy.get('.archive-section-btn').first().click();
    cy.get('.btn-confirm').should('be.disabled');
    cy.get('[aria-label="Oct Week #1 2026"]').check();
    cy.get('.archive-selection-count').should('contain.text', '2 tasks selected');
    cy.get('.btn-confirm').click();
    cy.readFile('fixture-archive-weeks.todo.md').should(content => {
      const [active, archive] = content.split('# ARCHIVE');
      expect(active).to.contain('Keep working');
      expect(active).not.to.contain('Current cancelled');
      expect(active).not.to.contain('Undated done');
      expect(archive).to.contain('### Oct Week #1 2026');
    });
  });
});
