describe('Selected project source boundaries', () => {
  const source = '# TODO\n+ [ ] Backlog project (keep note) ! Nov 23 2026\n'
    + '  - [ ] Backlog child ! Nov 23 2026\n# SELECTED\n+ [ ] First selection\n'
    + '  - [ ] Selected child\n+ [x] Completed selection | Nov 21 2026\n'
    + '# WIP\n+ [ ] WIP project ! Nov 23 2026\n# BACKLOG\n+ [ ] Last backlog project\n'
    + '# ICE\n+ [ ] Frozen backlog\n# ARCHIVE\n+ [ ] Archived project\n';

  it('keeps backlog projects out of selected rows, counts, expansion and the final sort target', () => {
    cy.viewport(1800, 1000);
    cy.clock(new Date(2026, 10, 22, 12).getTime(), ['Date']);
    cy.writeTestFileContent(source).then(file => {
      cy.reload();
      cy.switchToFile(file.fileName);
      cy.get('#planning-scheduled-title').realHover();
      cy.intercept('POST', '**/api/todos').as('save');
      cy.tick(1);
      cy.get('.projects-stack .task-title').should($titles => {
        expect([...$titles].map(title => title.textContent.trim()))
          .to.deep.equal(['First selection', 'Completed selection']);
      });
      cy.get('.projects-stack .planning-lane-header h2 span').should('have.text', '2');
      cy.get('.planning-projects-toggle').click();
      cy.get('.projects-stack .planning-project-children').should('have.length', 2);
      cy.get('.projects-stack').should('contain', 'Selected child').and('not.contain', 'Backlog child');
      cy.get('.planning-scheduled').should('contain', 'Backlog project').and('contain', 'Backlog child');
      cy.get('.outline-drawer-grip').realHover({ scrollBehavior: false });
      cy.contains('.planning-backlog .task-title', 'Backlog project').should('be.visible');
      cy.get('[aria-label="Close backlog"]').click();
      cy.get('@save.all').should('have.length', 0);
      cy.readFile(file.filePath).should('equal', source);
      cy.get('.planning-projects-toggle').click();
      cy.window().then(win => {
        const dataTransfer = new win.DataTransfer();
        const pane = win.document.querySelector('.projects-stack');
        pane.querySelector('.planning-task-grip').dispatchEvent(new win.DragEvent('dragstart', {
          bubbles: true, dataTransfer
        }));
        const body = pane.querySelector('.planning-lane-body');
        ['dragover', 'drop'].forEach(type => body.dispatchEvent(new win.DragEvent(type, {
          bubbles: true, cancelable: true, dataTransfer
        })));
      });
      cy.wait('@save');
      cy.get('.projects-stack .task-title').should($titles => {
        expect([...$titles].map(title => title.textContent.trim()))
          .to.deep.equal(['Completed selection', 'First selection']);
      });
      cy.readFile(file.filePath).should('contain', '# SELECTED\n+ [x] Completed selection | Nov 21 2026\n'
        + '+ [ ] First selection\n  - [ ] Selected child').and('contain', '# BACKLOG\n+ [ ] Last backlog project');
      cy.get('.projects-stack').screenshot('selected-projects-source-boundary');
      cy.reload();
      cy.get('.projects-stack .task-title').should('have.length', 2).first().should('have.text', 'Completed selection');
    });
  });
});
