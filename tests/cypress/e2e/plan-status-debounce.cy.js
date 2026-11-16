describe('Plan status settling', () => {
  const source = '# TODO\n### Inbox\n* [ ] Backlog first\n* [ ] Backlog second\n'
    + '# SELECTED\n### Next\n* [ ] Selected first\n* [ ] Selected second\n'
    + '# WIP\n### Work\n+ [~] Parent ! Nov 2 2026\n  - [ ] Child ! Nov 3 2026\n'
    + '* [x] Finished | Nov 1 2026\n* [x] Older completion | Oct 31 2026\n';
  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.writeTestFileContent(source).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
      cy.get('.planning-workspace').should('be.visible');
    });
    cy.clock(new Date(2026, 10, 2, 12).getTime(), ['Date', 'setTimeout', 'clearTimeout']);
    // Refresh the derived date groups using the controlled date without replacing task objects.
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.contains('.view-mode-btn', 'Plan').click();
  });
  afterEach(() => { cy.clock().invoke('restore'); });

  it('shares one debounce across Projects and scheduled copies', () => {
    const project = '[data-planning-lane="PROJECTS"] .custom-checkbox';
    const scheduled = '[data-schedule-group="today"] .custom-checkbox';
    cy.get(project).click().should('have.class', 'checked');
    cy.get(scheduled).should('have.class', 'checked');
    cy.contains('[data-schedule-day="2026-11-03"]', 'Child').should('be.visible');
    cy.tick(1000);
    cy.get(scheduled).click().should('have.class', 'status-blocked');
    cy.tick(1499);
    cy.get(project).should('have.class', 'pending-completion');
    cy.get(scheduled).should('have.class', 'pending-completion');
    cy.tick(1);
    cy.get(scheduled).should('not.have.class', 'pending-completion');
    cy.get('@file').then(file => cy.readFile(file.filePath)
      .should('contain', '+ [!] Parent ! Nov 2 2026\n  - [ ] Child ! Nov 3 2026'));
  });

  it('holds a reopened card in its original completion-day group until the final click settles', () => {
    const checkbox = '[data-completion-day="2026-11-01"] .custom-checkbox';
    cy.get(checkbox).click().should('have.class', 'in-progress');
    cy.get('[data-completion-day="undated"]').should('not.exist');
    cy.tick(1000);
    cy.get(checkbox).click().should('have.class', 'status-blocked');
    cy.tick(1499);
    cy.get(checkbox).should('be.visible');
    cy.tick(1);
    cy.get('[data-completion-day="2026-11-01"]').should('not.exist');
    cy.contains('[data-schedule-group="overdue"] .task-card', 'Finished').should('be.visible');
  });

  it('holds archive previews so reopening an older completion does not shift the column early', () => {
    cy.contains('.planning-archive-week', 'Older completion').should('be.visible');
    cy.get('[data-completion-day="2026-10-31"] .custom-checkbox').click();
    cy.contains('.planning-archive-week', 'Older completion')
      .find('.archive-week-action').should('be.disabled');
    cy.tick(1499);
    cy.contains('.planning-archive-week', 'Older completion').should('exist');
    cy.get('[data-completion-day="2026-10-31"]').should('exist');
    cy.tick(1);
    cy.contains('.planning-archive-week', 'Older completion').should('not.exist');
    cy.contains('[data-schedule-group="overdue"] .task-card', 'Older completion').should('be.visible');
  });

  for (const [lane, title] of [['.planning-backlog', 'Backlog'], ['.planning-selected', 'Selected']]) {
    it(`holds ${title} cards in place before sorting or collapsing them`, () => {
      cy.get(`${lane} .caret-toggle-btn`).click();
      cy.contains(`${lane} .task-card`, `${title} first`).find('.custom-checkbox').click();
      cy.get(`${lane} .collapsed-completed`).should('not.exist');
      cy.tick(1499);
      cy.get(`${lane} .collapsed-completed`).should('not.exist');
      cy.tick(1);
      cy.get(`${lane} .collapsed-completed`).should('have.length', 1);
      cy.get(`${lane} .caret-toggle-btn`).click().click();
      cy.contains(`${lane} .task-card`, `${title} second`).find('.custom-checkbox').click();
      cy.tick(1499);
      cy.get(`${lane} .task-title`).first().should('contain', `${title} first`);
      cy.tick(1);
      cy.get('@file').then(file => cy.readFile(file.filePath)
        .should('contain', `* [x] ${title} second | Nov 2 2026`));
    });
  }
});
