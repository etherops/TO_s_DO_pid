describe('Board parent progress sorting', () => {
  for (const mode of ['Plan', 'Backlog']) {
    it(`sorts partially completed parents as active in ${mode} without changing their data`, () => {
      cy.viewport(1600, 1000);
      const column = mode === 'Plan' ? 'WIP' : 'TODO';
      const content = `# ${column}\n### Progress sort\n`
        + '* [ ] Untouched task\n'
        + '+ [ ] Partial initiative (keep note) ! Nov 2026\n'
        + '  - [x] Finished child | Oct 31 2026\n'
        + '  - [ ] Open child ! Nov 9 2026\n'
        + '  * [x] Unsupported child stays raw\n'
        + '* [~] Active task\n'
        + '* [ ] Partial normal parent\n'
        + '  - [~] Working child\n'
        + '+ [ ] Untouched initiative\n'
        + '  - [ ] Waiting child\n'
        + '+ [x] Explicit done\n'
        + '  - [ ] Still open child\n'
        + '+ [-] Explicit cancelled\n'
        + '  - [~] Started child\n';
      cy.writeTestFileContent(content).then(file => {
        cy.reload();
        cy.switchToFile(file.fileName);
        cy.contains('.view-mode-btn', 'Plan').click();
        if (mode === 'Backlog') cy.contains('.planning-overview', 'Todo + Projects').click();
        cy.contains('.section', 'Progress sort').find('.sort-tasks-btn').click();
        cy.contains('.section', 'Progress sort').find('.sort-tasks-btn').should('not.be.disabled');
        const expected = ['Explicit done', 'Explicit cancelled', 'Partial initiative', 'Active task',
          'Partial normal parent', 'Untouched task', 'Untouched initiative'];
        cy.contains('.section', 'Progress sort').find('.task-card').should($cards => {
          expect($cards).to.have.length(expected.length);
          expected.forEach((title, index) => expect($cards[index].textContent).to.contain(title));
        });
        cy.readFile(file.filePath).should(saved => {
          expect(saved.split('\n').filter(Boolean).sort()).to.deep.equal(content.split('\n').filter(Boolean).sort());
          expect(saved).to.contain('+ [ ] Partial initiative (keep note) ! Nov 2026\n'
            + '  - [x] Finished child | Oct 31 2026\n'
            + '  - [ ] Open child ! Nov 9 2026\n'
            + '  * [x] Unsupported child stays raw');
        });
        cy.reload();
        cy.switchToFile(file.fileName);
        if (mode === 'Backlog') cy.contains('.planning-overview', 'Todo + Projects').click();
        cy.contains('.section', 'Progress sort').find('.task-card').should($cards => {
          expected.forEach((title, index) => expect($cards[index].textContent).to.contain(title));
        });
      });
    });
  }
});
