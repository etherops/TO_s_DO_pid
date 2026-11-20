describe('Plan in-place child controls', () => {
  const title = 'A very long child title that must stay on a single line even in the narrow projects pane';
  const source = '# SELECTED\n+ [ ] Parent (parent note)\n'
    + `  - [ ] ${title} (child note) ! Nov 18 2026\n`
    + '  - [x] Finished | Nov 17 2026\n  - [ ] Undated sibling\n'
    + Array.from({ length: 8 }, (_, index) => `  - [x] Completed trip preparation ${index + 1} | Nov 15 2026\n`).join('');
  beforeEach(() => {
    cy.viewport(1600, 1000);
    cy.clock(new Date(2026, 10, 18, 12).getTime(), ['Date']);
    cy.writeTestFileContent(source).then(file => {
      cy.wrap(file).as('file');
      cy.intercept('GET', '**/api/todos?*').as('loadFixture');
      cy.reload();
      cy.wait('@loadFixture');
    });
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('#planning-scheduled-title').realHover();
    cy.intercept('POST', '**/api/todos').as('save');
    cy.tick(1);
    cy.contains('.projects-stack .task-title', 'Parent').should('be.visible');
    cy.contains('.planning-projects-toggle', 'Expand all').click();
    cy.get('.planning-project-children').should('be.visible');
  });
  it('truncates child titles, exposes actions, and edits the title in place without a modal', () => {
    cy.get('.planning-project-children .planning-child-title').first().should($title => {
      const el = $title[0], css = getComputedStyle(el);
      expect(css.whiteSpace).to.equal('nowrap');
      expect(css.textOverflow).to.equal('ellipsis');
      expect(el.scrollWidth).to.be.greaterThan(el.clientWidth);
      expect(el.getBoundingClientRect().height).to.be.at.most(20);
    }).click();
    cy.get('.planning-parent-dialog, .planning-modal-backdrop').should('not.exist');
    cy.get('.planning-project-children .planning-child-editor input').should('be.focused')
      .clear().type('Renamed (new note){enter}');
    cy.wait('@save');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain',
      '  - [ ] Renamed (new note) ! Nov 18 2026').and('contain', '+ [ ] Parent (parent note)'));
    cy.contains('.planning-project-children .planning-child-row', 'Renamed')
      .find('.planning-child-actions').should('be.visible').click();
    cy.contains('.subtask-actions-menu button', 'Edit').click();
    cy.get('.planning-child-editor input').clear().type('Cancelled{esc}');
    cy.get('.planning-child-editor').should('not.exist');
    cy.screenshot('plan-inline-child-controls');
  });
  it('changes both due and completion dates inline, preserving the parent and siblings', () => {
    cy.get('.planning-project-children .planning-child-date').first().should('be.visible').click();
    cy.get('.planning-modal-backdrop').should('not.exist');
    cy.get('.planning-project-children [aria-label="Subtask due day"]').should('have.value', '2026-11-18')
      .invoke('val', '2026-11-20').trigger('change');
    cy.wait('@save');
    cy.contains('.planning-project-children .planning-child-row', 'Finished').find('.planning-child-date').click();
    cy.get('[aria-label="Subtask completed on"]').should('have.value', '2026-11-17')
      .invoke('val', '2026-11-18').trigger('change');
    cy.wait('@save');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', `${title} (child note) ! Nov 20 2026`)
      .and('contain', '  - [x] Finished | Nov 18 2026').and('contain', '  - [ ] Undated sibling'));
  });
  it('edits a scheduled projection in place and updates the nested source row', () => {
    cy.get('[data-schedule-group="today"] .planning-child-title').click();
    cy.get('[data-schedule-group="today"] .planning-child-editor input').clear().type('Scheduled edit{enter}');
    cy.wait('@save');
    cy.get('.planning-parent-dialog').should('not.exist');
    cy.contains('.planning-project-children .planning-child-title', 'Scheduled edit').should('be.visible');
    cy.get('[data-schedule-group="today"] .planning-child-date').click();
    cy.contains('[data-schedule-group="today"] .subtask-date-picker button', /^Tomorrow$/).click();
    cy.wait('@save');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain',
      '  - [ ] Scheduled edit (child note) ! Nov 19 2026'));
  });

  [1280, 1800].forEach(width => {
    it(`keeps the full project editor readable at ${width}px with eleven dated children`, () => {
      cy.viewport(width, 1000);
      cy.contains('.projects-stack .task-title', 'Parent').click();
      cy.get('.projects-stack .task-text-edit').should('have.prop', 'tagName', 'INPUT')
        .clear().type('TOU: Prep & Go List with a long project title');
      cy.get('.projects-stack .subtask-edit-row').should('have.length', 12);
      cy.get('.projects-stack .subtask-edit-row input').each($input => {
        expect($input[0].getBoundingClientRect().width, 'space reserved for each child title').to.be.at.least(100);
      });
      cy.get('.projects-stack .subtask-date').should('have.length', 11).each($button => {
        expect($button.text().trim()).to.equal('◷');
        expect($button[0].getBoundingClientRect().width).to.be.at.most(24);
      });
      cy.get('.projects-stack').screenshot(`project-inline-editor-${width}`);
      cy.get('.projects-stack .edit-actions-row').should($row => {
        const buttons = [...$row[0].children].map(button => button.getBoundingClientRect());
        expect(new Set(buttons.map(rect => Math.round(rect.top))).size,
          `actions share one line: ${buttons.map(rect => `${rect.x},${rect.y},${rect.width}`).join('; ')}`).to.equal(1);
        expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth + 1);
      });
      cy.get('.projects-stack .planning-project-children').should('not.be.visible');
      cy.get('.projects-stack .subtask-completion-date').first().should('have.attr', 'title', 'Done Nov 17 2026').click();
      cy.get('.projects-stack [aria-label="Subtask completed on"]').should('have.value', '2026-11-17')
        .invoke('val', '2026-11-18').trigger('change');
      cy.wait('@save');
      cy.get('.projects-stack .confirm-edit-btn').click();
      cy.wait('@save');
      cy.get('@file').then(file => cy.readFile(file.filePath)
        .should('contain', '+ [ ] TOU: Prep & Go List with a long project title (parent note)')
        .and('contain', '  - [x] Finished | Nov 18 2026').and('contain', 'Completed trip preparation 8'));
    });
  });
});
