describe('Paper ownership and scheduled projections', () => {
  const source = '# TODO\n* [ ] Normal (keep note)\n- [ ] Low\n'
    + '# SELECTED\n+ [ ] Project\n  - [ ] Child (keep child note)\n# WIP\n';
  beforeEach(() => {
    cy.viewport(1700, 1050);
    cy.writeTestFileContent(source).then(() => cy.reload());
    cy.clock(new Date(2026, 10, 8, 12).getTime(), ['Date']);
    cy.contains('.view-mode-btn', /\bPlan\b/).click();
    cy.intercept('POST', '**/api/todos').as('save');
  });

  it('moves an inline-dated task to WIP and returns it to SELECTED when cleared in Focus', () => {
    cy.contains('.planning-backlog .task-card', 'Normal').find('.clock-btn').click();
    cy.get('.planning-backlog .compact-date-picker input[type="date"]')
      .invoke('val', '2026-11-08').trigger('input').trigger('change');
    cy.contains('.planning-backlog .confirm-edit-btn', 'Save').click();
    cy.wait('@save');
    cy.readFile('fixture-paper-workflow.todo.md').should('contain', '# WIP\n* [ ] Normal (keep note) ! Nov 8 2026');
    cy.get('.planning-scheduled').should('contain', 'Normal');
    cy.get('.planning-backlog').should('not.contain', 'Normal');
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    cy.contains('.panel-now .focus-task-row', 'Normal').find('.focus-due-edit').click();
    cy.contains('.focus-date-menu button', /^Clear$/).click();
    cy.wait('@save');
    cy.readFile('fixture-paper-workflow.todo.md').then(content => {
      const selected = content.split('# SELECTED\n')[1].split('\n# WIP')[0];
      expect(selected).to.contain('* [ ] Normal (keep note)');
      expect(content.match(/\* \[ \] Normal/g)).to.have.length(1);
      expect(content).not.to.contain('## ');
    });
    cy.get('.panel-now').should('not.contain', 'Normal');
  });

  it('keeps the project and all children in SELECTED while adding/removing child schedule projections', () => {
    cy.get('.planning-selected').should('not.contain', 'Project');
    cy.get('.planning-selected .column-counts').should('not.exist');
    cy.get('[data-planning-lane="PROJECTS"]').should('contain', 'Project');
    cy.get('.planning-project-caret').click();
    cy.get('.planning-project-children').should('contain', 'Child');
    cy.get('.planning-project-children .planning-child-date').click();
    cy.contains('.planning-date-popover button', /^Today$/).click();
    cy.wait('@save');
    cy.get('.planning-project-children').should('contain', 'Child');
    cy.get('.planning-scheduled').should('contain', 'Child');
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    cy.get('.panel-now').should('contain', 'Child');
    cy.contains('.view-mode-btn', /\bPlan\b/).click();
    cy.get('.planning-scheduled .planning-child-date').click();
    cy.contains('.planning-date-popover button', /^Clear date$/).click();
    cy.wait('@save');
    cy.get('.planning-scheduled').should('not.contain', 'Child');
    cy.get('.planning-project-caret').click();
    cy.get('.planning-project-children').should('contain', 'Child');
    cy.readFile('fixture-paper-workflow.todo.md').should('contain',
      '# SELECTED\n+ [ ] Project\n  - [ ] Child (keep child note)');
    cy.get('.planning-project-heading .clock-btn').click();
    cy.contains('.planning-date-popover button', /^Today$/).click();
    cy.wait('@save');
    cy.readFile('fixture-paper-workflow.todo.md').should('contain',
      '# SELECTED\n+ [ ] Project ! Nov 8 2026\n  - [ ] Child (keep child note)');
    cy.get('.planning-selected').should('not.contain', 'Project');
  });

  it('adds tasks directly under an H1 without introducing a section heading', () => {
    cy.get('.planning-selected .column-header .add-task-btn').click();
    cy.get('.planning-selected .new-task-input').type('Direct task{enter}');
    cy.readFile('fixture-paper-workflow.todo.md').should('contain', '* [ ] Direct task')
      .and('not.contain', '## ');
    cy.get('.planning-selected .column-root-section .section-header').should('not.exist');
    cy.get('.planning-selected .total-count').should('have.text', '1');
    cy.get('[data-planning-lane="PROJECTS"]').should('contain', 'Project').and('not.contain', 'Direct task');
  });
});
