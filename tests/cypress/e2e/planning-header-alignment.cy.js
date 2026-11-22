describe('Plan header alignment', () => {
  [1280, 1800].forEach(width => {
    it(`keeps Tasks controls on one line aligned with adjacent headers at ${width}px`, () => {
      const source = '# SELECTED\n+ [ ] Project\n* [ ] First\n* [ ] Second\n'
        + '### HOLD/WAIT\n* [~] Waiting\n* [ ] Another\n';
      cy.viewport(width, 1000);
      cy.writeTestFileContent(source).then(file => {
        cy.reload(); cy.switchToFile(file.fileName);
        cy.get('#planning-scheduled-title').realHover();
        cy.intercept('POST', '**/api/todos').as('save');
        cy.get('.planning-selected .column-header').should($header => {
          const header = $header[0];
          const rect = header.getBoundingClientRect();
          const doc = header.ownerDocument;
          const adjacent = ['.projects-stack > .planning-lane-header',
            '.planning-scheduled > .planning-lane-header'].map(selector => doc.querySelector(selector));
          adjacent.forEach(el => {
            expect(rect.top).to.be.closeTo(el.getBoundingClientRect().top, 1);
            expect(rect.bottom).to.be.closeTo(el.getBoundingClientRect().bottom, 1);
          });
          expect(rect.height).to.equal(32);
          const controls = [...header.querySelectorAll('.count-badge, .column-header-buttons button')];
          controls.forEach(el => {
            const bounds = el.getBoundingClientRect();
            expect(bounds.top).to.be.at.least(rect.top);
            expect(bounds.bottom).to.be.at.most(rect.bottom);
            expect(bounds.right).to.be.at.most(rect.right);
          });
          const title = header.querySelector('.column-title-container').getBoundingClientRect();
          const actions = header.querySelector('.column-header-buttons').getBoundingClientRect();
          expect(title.right).to.be.at.most(actions.left);
          [...header.querySelectorAll('.count-badge')].forEach(el =>
            expect(el.getBoundingClientRect().right, 'count badge does not hide under controls')
              .to.be.at.most(title.right));
          expect(Math.abs(title.top + title.height / 2 - actions.top - actions.height / 2)).to.be.lessThan(1);
        });
        cy.get('.planning-selected .column-header').screenshot(`tasks-header-${width}`);
        cy.get('.planning-selected .add-task-btn').should('be.visible');
        cy.get('.planning-selected .add-section-btn').should('be.visible');
        cy.get('.planning-selected .column-caret-btn').should('be.visible');
        cy.get('@save.all').should('have.length', 0);
        cy.readFile(file.filePath).should('equal', source);
      });
    });
  });
});
