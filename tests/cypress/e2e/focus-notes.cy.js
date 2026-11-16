describe('Focus notes', () => {
  const previewDate = () => cy.get('[aria-label="Focus date"]')
    .invoke('val', '2026-11-10').trigger('change', { force: true });

  it('displays and saves subtask notes without detaching them', () => {
    cy.writeTestFileContent('# SELECTED\n+ [ ] Parent\n'
      + '  - [~] Child (Original note) ! Nov 10 2026\n  - [ ] Sibling (keep me)\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    previewDate();
    cy.intercept('POST', '**/api/todos').as('saveChild');
    cy.get('.panel-now .focus-row-note').should('have.text', 'Original note').click();
    cy.get('.focus-edit-note').should('have.value', 'Original note');
    cy.get('.focus-edit-name').clear().type('Child (some test note){enter}');
    cy.wait('@saveChild').its('request.body.content')
      .should('contain', '  - [~] Child (some test note) ! Nov 10 2026\n  - [ ] Sibling (keep me)');
    cy.reload();
    previewDate();
    cy.get('.panel-now .focus-row-note').should('have.text', 'some test note')
      .and('have.css', 'font-style', 'italic').click();
    cy.get('.subtask-parent-header').should('contain', 'Parent');
    cy.get('.focus-edit-note').should('have.value', 'some test note').clear().type('Updated child note');
    cy.get('.focus-edit-save').click();
    cy.wait('@saveChild').its('request.body.content')
      .should('contain', '  - [~] Child (Updated child note) ! Nov 10 2026');
    cy.reload();
    previewDate();
    cy.get('.panel-now .focus-row-note').should('have.text', 'Updated child note').click();
    cy.get('.focus-edit-note').clear();
    cy.get('.focus-edit-save').click();
    cy.wait('@saveChild').its('request.body.content').should('contain', '  - [~] Child ! Nov 10 2026');
    cy.get('.panel-now .focus-row-note').should('not.exist');
  });

  it('saves notes entered directly in the title and retains them after reload', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [~] Original ! Nov 10 2026\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    previewDate();
    cy.intercept('POST', '**/api/todos').as('saveNote');
    cy.contains('.focus-row-title', 'Original').click();
    cy.get('.focus-edit-name').clear().type('test (some test note){enter}');
    cy.wait('@saveNote').its('request.body.content').should('contain', 'test (some test note) ! Nov 10 2026');
    cy.get('.panel-now .focus-row-note').should('have.text', 'some test note');
    cy.reload();
    previewDate();
    cy.get('.panel-now .focus-row-title').should('have.text', 'test');
    cy.get('.panel-now .focus-row-note').should('have.text', 'some test note').click();
    cy.get('.focus-edit-note').should('have.value', 'some test note');
    cy.get('.focus-edit-cancel').click();
  });

  it('adds and edits a note from a side panel', () => {
    cy.writeTestFileContent('# WIP\n### Work\n* [~] Note task ! Nov Week #2 2026\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    previewDate();
    cy.contains('.focus-row-title', 'Note task').click();
    cy.get('.focus-edit-note').type('First note{enter}');
    cy.get('.focus-edit-note').should('not.exist');
    cy.contains('.focus-task-row', 'Note task').find('.focus-row-note')
      .should('have.text', 'First note').click();
    cy.get('.focus-edit-note').should('have.value', 'First note').clear().type('Updated note');
    cy.get('.focus-edit-save').click();
    cy.reload();
    previewDate();
    cy.contains('.focus-task-row', 'Note task').find('.focus-row-note')
      .should('have.text', 'Updated note').and('have.attr', 'aria-label', 'Task note: Updated note');
    cy.get('.focus-note-indicator').should('not.exist');
  });

  it('keeps smaller italic notes inline and compact in all three panels', () => {
    cy.viewport(1600, 1000);
    cy.writeTestFileContent('# WIP\n### Work\n'
      + '* [ ] Weekly task (Call ahead) ! Nov Week #2 2026\n'
      + '* [ ] Today task (Bring documents) ! Nov 10 2026\n'
      + '- [ ] Later task (A long note with plenty of detail that should truncate instead of wrapping) ! Nov 12 2026\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    previewDate();
    ['.panel-upnext', '.panel-now', '.panel-in-progress-queued'].forEach(panel => {
      cy.get(`${panel} .focus-row-note`).should('be.visible').and('have.css', 'font-style', 'italic')
        .and('have.css', 'white-space', 'nowrap').and('have.css', 'text-overflow', 'ellipsis')
        .then($note => {
          const note = $note[0];
          const title = note.previousElementSibling;
          const noteRect = note.getBoundingClientRect();
          const titleRect = title.getBoundingClientRect();
          expect(noteRect.left).to.be.at.least(titleRect.right);
          expect(getComputedStyle(note.parentElement).alignItems).to.equal('baseline');
          expect(noteRect.top, 'smaller note sits lower than title').to.be.greaterThan(titleRect.top);
          expect(parseFloat(getComputedStyle(note).fontSize)).to.be.at.most(10);
          expect(parseFloat(getComputedStyle(note).fontSize))
            .to.be.lessThan(parseFloat(getComputedStyle(title).fontSize));
          expect(getComputedStyle(note).color).not.to.equal(getComputedStyle(title).color);
          expect(note.closest('.focus-task-row').getBoundingClientRect().height).to.be.lessThan(40);
        });
    });
    cy.get('.panel-in-progress-queued .focus-row-note').trigger('mouseenter');
    // Pointer-transparent tooltips are deliberately excluded from hit testing.
    cy.get('.focus-note-tooltip').should('contain', 'should truncate instead of wrapping')
      .and('have.css', 'visibility', 'visible').and('not.have.css', 'display', 'none');
  });
});
