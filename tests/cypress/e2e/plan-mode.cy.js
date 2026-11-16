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

  for (const oldMode of ['normal', 'triage', 'plan', 'archive']) {
    it(`opens old ${oldMode} preferences in the outline workspace`, () => {
      cy.window().then(win => {
        win.localStorage.setItem('viewMode', oldMode);
        win.localStorage.setItem('planningLayout', 'board');
      });
      cy.reload();
      cy.get('.planning-workspace').should('be.visible');
      cy.get('.planning-backlog').should('be.visible');
      cy.get('.planning-scheduled').should('be.visible');
      cy.contains('.view-mode-btn', 'Plan').should('have.class', 'active');
    });
  }

  it('opens archive and returns to the backlog without changing the file', () => {
    cy.contains('.planning-backlog .task-card', 'Backlog task').should('be.visible');
    cy.contains('[data-planning-lane="PROJECTS"] .task-card', 'Project task').should('be.visible');
    cy.get('.planning-open-archive').click();
    cy.get('.done-stack').should('be.visible');
    cy.reload();
    cy.get('.planning-archive-drawer').should('not.exist');
    cy.get('.planning-open-archive').click();
    cy.contains('.done-stack .task-card', 'Old task').should('be.visible');
    cy.get('[aria-label="Close archive"]').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('adds and completes a task using the existing controls', () => {
    cy.get('.planning-add-task').click();
    cy.get('[aria-label="Task title"]').type('New outline task{enter}');
    cy.contains('.planning-columns .task-card', 'New outline task').find('.custom-checkbox').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('match', /\[x\] New outline task \|/));
  });

  it('keeps low-priority controls and compact rows', () => {
    cy.contains('.planning-columns .task-card', 'Low planning task')
      .find('.planning-actions-trigger').click();
    cy.contains('.planning-task-actions button', 'Priority: low → high').click();
    cy.contains('.planning-columns .task-card', 'Low planning task')
      .should('not.have.class', 'low-priority-task-card');
    cy.get('.planning-columns .task-card:visible').each($card => {
      expect($card[0].getBoundingClientRect().height).to.be.lessThan(40);
    });
  });
});
