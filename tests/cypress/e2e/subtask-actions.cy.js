describe('Shared subtask right-click actions', () => {
  const content = '# TODO\n### Inbox\n* [ ] Regular destination\n- [ ] Low destination\n'
    + '# WIP\n### Work\n+ [~] Source project (parent note)\n'
    + '  - [~] Move child (hidden note) ! Nov 2 2026\n'
    + '  * [ ] Unsupported row\n  - [x] Finished child | Nov 1 2026\n'
    + '  - [ ] Future child ! Dec 2026\n+ [ ] Other project\n  - [ ] Existing child\n'
    + '# ARCHIVE\n### Old\n+ [ ] Archived project\n';
  const menu = '.subtask-actions-menu';
  const readSource = () => cy.get('@file').then(file => cy.readFile(file.filePath));
  const openNested = title => cy.contains('.planning-project-children .planning-child-row', title).rightclick();

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.clock(new Date(2026, 10, 2, 12).getTime(), ['Date']);
    cy.writeTestFileContent(content).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.get('.planning-workspace').should('be.visible');
    cy.intercept('POST', '**/api/todos').as('save');
  });

  it('moves between projects, then to a searched regular parent, preserving hidden metadata', () => {
    cy.get('[aria-label="Expand Source project"]').click();
    openNested('Move child');
    cy.contains(menu, 'In Source project').should('be.visible');
    cy.contains(`${menu} button`, 'Move to another parent').click();
    cy.get(menu).should('not.contain', 'Archived project');
    cy.get('.subtask-parent-choice').should('have.length', 1);
    cy.get('[aria-label="Search parent tasks"]').type('other');
    cy.contains('.subtask-parent-choice', 'Other project').click();
    cy.wait('@save');
    readSource().should('contain', '+ [ ] Other project\n  - [ ] Existing child\n'
      + '  - [~] Move child (hidden note) ! Nov 2 2026');
    cy.get('[aria-label="Expand Other project"]').click();
    openNested('Move child');
    cy.contains(`${menu} button`, 'Move to another parent').click();
    cy.contains(`${menu} button`, 'Choose a regular task').click();
    cy.get('[aria-label="Search parent tasks"]').type('destination');
    cy.get('.subtask-parent-choice').should('have.length', 1);
    cy.contains('.subtask-parent-choice', 'Regular destination').click();
    cy.wait('@save');
    readSource().should('contain', '* [ ] Regular destination\n'
      + '  - [~] Move child (hidden note) ! Nov 2 2026')
      .and('contain', '  * [ ] Unsupported row\n  - [x] Finished child | Nov 1 2026');
  });

  it('detaches from the editor without saving parent drafts or resurrecting the child on Save', () => {
    cy.get('[aria-label="Expand Source project"]').click();
    cy.contains('.planning-project-children .planning-child-title', 'Finished child').click();
    cy.focused().should('have.attr', 'aria-label', 'Subtask title').and('have.value', 'Finished child');
    cy.get('.planning-parent-dialog .task-text-edit').clear().type('Parent draft');
    cy.contains('.subtask-edit-row', 'Done Nov 1').rightclick();
    cy.contains(`${menu} button`, 'Detach as regular task').click();
    cy.wait('@save');
    readSource().should('contain', '+ [~] Source project (parent note)')
      .and('contain', '* [x] Finished child | Nov 1 2026').and('not.contain', 'Parent draft');
    cy.get('.subtask-edit-row input').should($inputs => {
      expect([...$inputs].map(input => input.value)).not.to.include('Finished child');
    });
    cy.get('.planning-parent-dialog .confirm-edit-btn').click();
    cy.wait('@save');
    readSource().should('contain', '+ [~] Parent draft (parent note)')
      .and('not.contain', '  - [x] Finished child');
  });

  it('opens on scheduled sidebar children, cancels deletion, and confirms only the selected child', () => {
    cy.contains('.planning-schedule-title', 'Future child').rightclick();
    cy.contains(`${menu} button`, 'Delete subtask').click();
    cy.contains(`${menu} button`, 'Cancel').should('be.focused').click();
    cy.get(menu).trigger('keydown', { key: 'Escape' });
    cy.get('@save.all').should('have.length', 0);
    readSource().should('equal', content);
    cy.contains('.planning-schedule-title', 'Future child').rightclick();
    cy.contains(`${menu} button`, 'Delete subtask').click();
    cy.contains(`${menu} button`, /^Delete$/).click();
    cy.wait('@save');
    readSource().should('not.contain', 'Future child').and('contain', 'Unsupported row')
      .and('contain', 'Move child (hidden note) ! Nov 2 2026');
  });

  it('offers the same actions on Focus children and saves a detached task', () => {
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.contains('.panel-now .focus-task-row', 'Move child').rightclick();
    cy.contains(`${menu} button`, 'Move to another parent').should('be.visible');
    cy.contains(`${menu} button`, 'Detach as regular task').click();
    cy.wait('@save');
    readSource().should('contain', '* [~] Move child (hidden note) ! Nov 2 2026')
      .and('not.contain', '  - [~] Move child');
    cy.contains('.panel-now .focus-task-row', 'Move child').should('be.visible');
  });

  it('keeps an open Focus parent draft and updates its children when another child is moved into it', () => {
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('#focus-tab-projects').click();
    cy.contains('.initiative-row', 'Other project').find('.subtask-indicator').click();
    cy.get('.focus-expanded-project-title').click();
    cy.get('.focus-edit-name').clear().type('Other parent draft');
    cy.contains('.panel-now .focus-task-row', 'Move child').rightclick();
    cy.contains(`${menu} button`, 'Move to another parent').click();
    cy.contains('.subtask-parent-choice', 'Other project').click();
    cy.wait('@save');
    cy.get('.focus-edit-name').should('have.value', 'Other parent draft');
    cy.get('[aria-label="Subtask title"]').should($inputs => {
      expect([...$inputs].map(input => input.value)).to.include('Move child');
    });
    readSource().should('not.contain', 'Other parent draft');
    cy.get('.focus-edit-save').click();
    cy.wait('@save');
    readSource().should('contain', '+ [ ] Other parent draft\n  - [ ] Existing child\n'
      + '  - [~] Move child (hidden note) ! Nov 2 2026');
  });
});
