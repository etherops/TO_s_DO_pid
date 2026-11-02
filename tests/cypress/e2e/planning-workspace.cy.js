describe('Outline planning workspace', () => {
  const content = '# TODO\n### Inbox\n* [ ] Backlog item (keep note) ! Nov 4 2026\n'
    + '# PROJECTS\n### Research\n+ [ ] Future initiative\n'
    + '# SELECTED\n### Ready\n* [ ] Selected item ! Nov Week #1 2026\n'
    + '# WIP\n### Work\n+ [~] Active parent (retain note) ! Nov 2026\n'
    + '  - [x] Finished child | Oct 31 2026\n  - [ ] Dated child ! Nov 3 2026\n'
    + '  * [~] Unsupported child stays\n'
    + '# ARCHIVE\n### Older\n* [x] History | Oct 28 2026\n';

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.writeTestFileContent(content).then(file => {
      cy.wrap(file).as('file');
      cy.reload();
      cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', 'Plan').click();
      cy.get('.planning-workspace').should('be.visible');
    });
  });

  it('shows SELECTED and WIP together; navigation never writes data', () => {
    cy.intercept('POST', '/api/todos').as('save');
    cy.get('.planning-columns .selected-stack').should('be.visible');
    cy.get('.planning-columns .wip-stack').should('be.visible');
    cy.contains('.planning-heading-link', 'TODO').click();
    cy.contains('.planning-columns .task-card', 'Backlog item').should('be.visible');
    cy.contains('.planning-overview', 'Selected + WIP').click();
    cy.contains('.planning-schedule-entry', 'Backlog item').click();
    cy.contains('.planning-columns .task-card', 'Backlog item').should('be.visible');
    cy.contains('.planning-overview', 'Selected + WIP').click();
    cy.get('.planning-layout-switch').should('not.exist');
    cy.get('.view-mode-btn').then($tabs => expect([...$tabs].map(tab => tab.textContent.trim()))
      .to.deep.equal(['Plan', 'Focus', 'Calendar', 'Raw']));
    cy.contains('.planning-section-link', 'Ready').find('.planning-outline-count').should('have.text', '1');
    cy.get('.planning-workspace').should('be.visible');
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('edits through the existing editor, preserves children, and persists through reload', () => {
    cy.contains('.planning-columns .task-card', 'Selected item').find('.edit-btn').click();
    cy.get('.task-text-edit').clear().type('Selected item revised');
    cy.get('.edit-actions-row .confirm-edit-btn').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved).to.contain('Selected item revised ! Nov Week #1 2026');
      expect(saved).to.contain('+ [~] Active parent (retain note) ! Nov 2026\n'
        + '  - [x] Finished child | Oct 31 2026\n  - [ ] Dated child ! Nov 3 2026\n'
        + '  * [~] Unsupported child stays');
    }));
    cy.reload();
    cy.contains('.planning-columns .task-card', 'Selected item revised').should('be.visible');
    cy.contains('.planning-columns .task-card', 'Selected item revised').rightclick();
    cy.get('.context-menu').should('be.visible');
  });

  it('keeps schedule, both columns and layout controls inside the viewport', () => {
    cy.get('.planning-toolbar').should('not.exist');
    cy.get('.planning-eyebrow').should('not.exist');
    cy.get('.planning-outline').should('have.attr', 'aria-label', 'File outline');
    cy.get('.kanban-shell').then($shell => {
      cy.get('.planning-workspace').should($workspace => {
        const gap = $workspace[0].getBoundingClientRect().top - $shell[0].getBoundingClientRect().top;
        expect(gap).to.be.at.most(8);
      });
    });
    for (const width of [1800, 1280, 768]) {
      cy.viewport(width, 1000);
      cy.get('.planning-workspace').should($workspace => {
        const rect = $workspace[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(width);
        expect($workspace[0].scrollWidth).to.be.at.most($workspace[0].clientWidth + 1);
      });
    }
  });
});
