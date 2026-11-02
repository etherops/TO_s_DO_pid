describe('Initiatives', () => {
  it('expands vertically without widening and keeps Up Next magnification separate', () => {
    const tasks = Array.from({ length: 9 }, (_, index) => `+ [ ] Initiative ${index + 1}`).join('\n');
    cy.writeTestFileContent(`# WIP\n### Work\n${tasks}\n* [ ] Regular task\n`).then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.focus-initiative-anchor').should('have.css', 'opacity', '1');
    cy.get('.initiative-row').first().should($row => {
      const fill = getComputedStyle($row[0]).backgroundColor;
      expect(fill).not.to.equal('rgba(0, 0, 0, 0)');
      expect(fill).to.match(/^rgb\(/);
    });
    let width;
    cy.get('.focus-initiatives').then($panel => { width = $panel[0].getBoundingClientRect().width; });
    cy.get('.initiative-list').should($list => {
      expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight);
    });
    cy.get('.focus-initiatives .panel-header').realHover();
    cy.wait(3200);
    cy.get('.focus-initiatives').should($panel => {
      const header = $panel[0].querySelector('.panel-header').getBoundingClientRect();
      const hit = $panel[0].ownerDocument.elementFromPoint(header.x + header.width / 2, header.y + header.height / 2);
      expect($panel[0].matches(':hover'), `hover target: ${hit?.className}`).to.equal(true);
      expect($panel[0].getBoundingClientRect().width).to.be.closeTo(width, 1);
      const list = $panel[0].querySelector('.initiative-list');
      expect(list.scrollHeight).to.equal(list.clientHeight);
    });
    cy.get('.panel-upnext').should('not.have.class', 'is-magnified');
    cy.get('.focus-date').realHover();
    cy.get('.initiative-list').should($list => {
      expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight);
    });
    cy.get('.focus-upnext-content .panel-header').click();
    cy.get('.panel-upnext').should('have.class', 'is-magnified');
    cy.get('.focus-initiatives').should($panel => {
      expect($panel[0].getBoundingClientRect().width).to.be.closeTo(width, 1);
    });
  });
  it('persists high priority and shows its Focus summary', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [~] Initiative task\n  - [ ] Attached child ! Oct 2026\n')
      .then(() => cy.reload());
    cy.contains('.task-card', 'Initiative task').find('.priority-toggle').should('have.text', 'HIGH');
    cy.reload();
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.focus-initiatives').should('contain', 'Initiative task');
    cy.get('.focus-initiatives .priority-toggle').should('have.text', '↓')
      .and('have.css', 'color', 'rgb(137, 150, 165)').click();
    cy.get('.focus-initiatives').should('not.exist');
    cy.get('.detach-modal').should('not.exist');
    cy.contains('.focus-task-row', 'Initiative task').find('.subtask-total').should('have.text', '1 subtask');
    cy.contains('.focus-task-row', 'Initiative task').find('[aria-label="Make low priority"]').click();
    cy.get('.detach-modal').should('be.visible').and('contain', 'All subtasks will be detached');
    cy.get('.detach-subtask-list li').should('have.length', 1).and('contain', 'Attached child');
    cy.get('.detach-subtask-date').should('contain', 'Oct');
    cy.get('.detach-subtask-list').find('input, button, textarea, [contenteditable]').should('not.exist');
    cy.get('.detach-modal').should($modal => {
      const rect = $modal[0].getBoundingClientRect();
      expect(rect.width).to.be.within(400, 480);
      expect(rect.left).to.be.greaterThan(0);
      expect(rect.top).to.be.greaterThan(0);
    });
    cy.get('.detach-modal').screenshot('initiative-detach-modal');
    cy.get('.detach-cancel').should('have.focus').click();
    cy.get('.detach-modal').should('not.exist');
    cy.contains('.focus-task-row', 'Initiative task').find('.subtask-total').should('have.text', '1 subtask');
    cy.contains('.focus-task-row', 'Initiative task').find('[aria-label="Make low priority"]').click();
    cy.get('.detach-confirm').click();
    cy.get('.focus-initiatives').should('not.exist');
    cy.contains('.focus-task-row', 'Initiative task').find('.subtask-indicator').should('not.exist');
    cy.contains('.focus-task-row', 'Attached child').should('exist');
  });
});
