describe('Plan partially collapsed source sections', () => {
  const activeTasks = '* [~] DB: PHONE: Phone/Watch\n'
    + '* [~] BOOKCHECK - recommendations\n'
    + '* [ ] LISA: Follow up on Schedule Email\n* [ ] YOGAHHH: email stuff\n';

  [false, true].forEach(withFinished => {
    it(`keeps cards separated with saved partial collapse${withFinished ? ' and completed tasks' : ''}`, () => {
      cy.viewport(1600, 1000);
      const finished = withFinished ? '* [x] Finished task\n* [-] Cancelled task\n' : '';
      const source = `# SELECTED\n### HOLD/WAIT\n${finished}${activeTasks}`;
      cy.writeTestFileContent(source).then(file => {
        cy.window().then(win => win.localStorage.setItem('section-collapse-HOLD/WAIT', 'partial'));
        cy.reload();
        cy.switchToFile(file.fileName);
        cy.contains('.planning-selected .section', 'HOLD/WAIT').as('section');
        cy.get('@section').find('.caret-toggle-btn').should('have.class', 'state-focus');
        cy.get('@section').find('.collapsed-in-progress').should('not.exist');
        cy.get('@section').find('.task-card-wrapper:not(.collapsed-completed) > .task-card:visible')
          .should('have.length', withFinished ? 5 : 4).should($cards => {
            const bounds = [...$cards].map(card => card.getBoundingClientRect());
            for (let index = 1; index < bounds.length; index++) {
              expect(bounds[index].top, `card ${index + 1} starts below previous card`).to.be.at.least(bounds[index - 1].bottom);
            }
          });
        cy.get('@section').screenshot(`hold-wait-partial-${withFinished ? 'with-completed' : 'active'}`);
        cy.readFile(file.filePath).should('equal', source);
      });
    });
  });
});
