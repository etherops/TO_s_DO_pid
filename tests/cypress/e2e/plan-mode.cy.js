describe('Unified Plan navigation', () => {
  const content = '# TODO\n### Inbox\n* [ ] Backlog task\n# PROJECTS\n### Ideas\n* [ ] Project task\n'
    + '# SELECTED\n### Ready\n* [ ] Selected task\n- [ ] Low planning task\n'
    + '# WIP\n### Current\n* [~] Active task\n# ARCHIVE\n### Past\n* [x] Old task | Oct 1 2026\n';

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.writeTestFileContent(content).then(file => {
      cy.wrap(file).as('file');
      cy.reload();
      cy.switchToFile(file.fileName);
    });
  });

  it('has four tabs and stays in Plan when the active tab is clicked', () => {
    cy.get('.view-mode-btn').then($tabs => expect([...$tabs].map(tab => tab.textContent.trim()))
      .to.deep.equal(['Plan', 'Focus', 'Calendar', 'Raw']));
    cy.contains('.view-mode-btn', 'Plan').should('have.class', 'active').click();
    cy.get('.planning-workspace').should('be.visible');
    cy.get('.planning-layout-switch, .drawer-toggle-btn').should('not.exist');
  });

  for (const oldMode of ['normal', 'triage', 'plan']) {
    it(`opens old ${oldMode} preferences in the outline workspace`, () => {
      cy.window().then(win => {
        win.localStorage.setItem('viewMode', oldMode);
        win.localStorage.setItem('planningLayout', 'board');
      });
      cy.reload();
      cy.get('.planning-workspace').should('be.visible');
      cy.get('.planning-columns .selected-stack').should('be.visible');
      cy.get('.planning-columns .wip-stack').should('be.visible');
      cy.contains('.view-mode-btn', 'Plan').should('have.class', 'active');
    });
  }

  it('opens backlog groups and archive from the outline without changing the file', () => {
    cy.contains('.planning-overview', 'Todo + Projects').click();
    cy.get('.planning-columns .todo-stack').should('be.visible');
    cy.get('.planning-columns .projects-stack').should('be.visible');
    cy.contains('.planning-heading-link', 'ARCHIVE').click();
    cy.get('.planning-columns .done-stack').should('be.visible');
    cy.contains('.planning-overview', 'Selected + WIP').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('adds and completes a task using the existing controls', () => {
    cy.contains('.planning-columns .section', 'Current').find('.add-task-btn').click();
    cy.get('.new-task-input').type('New outline task{enter}');
    cy.contains('.planning-columns .task-card', 'New outline task').find('.custom-checkbox').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '[x] New outline task'));
  });

  it('keeps low-priority controls and compact rows', () => {
    cy.contains('.planning-columns .task-card', 'Low planning task')
      .find('.low-priority-badge').click();
    cy.contains('.planning-columns .task-card', 'Low planning task')
      .should('not.have.class', 'low-priority-task-card');
    cy.get('.planning-columns .task-card').each($card => {
      expect($card[0].getBoundingClientRect().height).to.be.lessThan(40);
    });
  });
});
