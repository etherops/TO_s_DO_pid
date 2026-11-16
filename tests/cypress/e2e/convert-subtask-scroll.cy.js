describe('Convert to subtask picker scrolling', () => {
  it('converts into a completed non-archived project without reopening it', () => {
    cy.viewport(1600, 1000);
    const source = '# SELECTED\n+ [x] DB: SCHOOL - Shadow HSs ! Nov 2026\n'
      + '+ [-] Cancelled project | Nov 1 2026\n'
      + '# WIP\n* [ ] Convert me (keep note) ! Nov 12 2026\n'
      + '# ARCHIVE\n+ [x] Archived project | Nov 1 2026\n+ [ ] Archived open project\n'
      + '# ICE\n+ [ ] Frozen project\n';
    cy.writeTestFileContent(source).then(file => {
      cy.reload(); cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', /\bFocus\b/).click();
      cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-12').trigger('change', { force: true });
      cy.intercept('POST', '**/api/todos').as('convert');
      cy.contains('.panel-now .focus-task-row', 'Convert me').rightclick();
      cy.get('.focus-task-context-convert').click({ scrollBehavior: false });
      cy.get('.initiative-parent-options button').should('have.length', 2);
      cy.get('.initiative-search').type('Shadow', { scrollBehavior: false });
      cy.get('.initiative-parent-options button').should('have.text', 'DB: SCHOOL - Shadow HSs')
        .click({ scrollBehavior: false });
      cy.wait('@convert');
      cy.readFile(file.filePath).should('contain', '+ [x] DB: SCHOOL - Shadow HSs ! Nov 2026\n'
        + '  - [ ] Convert me (keep note) ! Nov 12 2026');
      cy.reload();
      cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-12').trigger('change', { force: true });
      cy.contains('.panel-now .focus-task-row', 'Convert me')
        .find('.focus-subtask-parent').should('contain', 'DB: SCHOOL - Shadow HSs');
    });
  });

  for (const kind of ['projects', 'regular tasks']) {
    it(`scrolls ${kind} with the mouse wheel, then searches and converts without errors`, () => {
      cy.viewport(1600, 1000);
      const source = '# SELECTED\n' + Array.from({ length: 40 }, (_, index) =>
        `+ [ ] Project ${index}\n* [ ] Regular ${index}\n`).join('')
        + '# WIP\n* [ ] Convert me (keep note) ! Nov 12 2026\n';
      cy.writeTestFileContent(source).then(file => {
        cy.reload(); cy.switchToFile(file.fileName);
        cy.contains('.view-mode-btn', /\bFocus\b/).click();
        cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-12').trigger('change', { force: true });
        cy.intercept('POST', '**/api/todos').as('save');
        cy.contains('.panel-now .focus-task-row', 'Convert me').rightclick();
        // Fixed menus must not trigger the test runner's automatic background scrolling.
        cy.get('.focus-task-context-convert').click({ scrollBehavior: false });
        if (kind === 'regular tasks') cy.get('.choose-regular-task').click({ scrollBehavior: false });
        cy.get('.initiative-parent-options').realHover({ scrollBehavior: false })
          .realMouseWheel({ deltaY: 400, scrollBehavior: false });
        cy.get('.focus-task-context-menu').should('be.visible');
        cy.get('.initiative-parent-options').should($list => expect($list[0].scrollTop).to.be.greaterThan(0));
        cy.get('.initiative-parent-options').scrollTo('bottom');
        cy.get('.initiative-parent-options').realMouseWheel({ deltaY: 400, scrollBehavior: false });
        cy.get('.focus-task-context-menu').should('be.visible');
        cy.get('.initiative-search').type('39', { scrollBehavior: false });
        cy.get('.initiative-parent-options button').should('have.length', 1);
        cy.get('@save.all').should('have.length', 0);
        cy.readFile(file.filePath).should('equal', source);
        cy.get('.initiative-parent-options button').click({ scrollBehavior: false });
        cy.wait('@save');
        cy.get('.focus-task-context-menu').should('not.exist');
        cy.readFile(file.filePath).should(saved => {
          const parent = kind === 'projects' ? '+ [ ] Project 39' : '* [ ] Regular 39';
          expect(saved).to.contain(`${parent}\n  - [ ] Convert me (keep note) ! Nov 12 2026`);
          expect(saved).not.to.contain('* [ ] Convert me');
        });
      });
    });
  }
});
