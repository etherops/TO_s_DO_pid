describe('Focus Projects and Up Next tabs', () => {
  it('keeps equal-width tabs and compact project rows without expansion controls', () => {
    cy.viewport(1600, 900);
    cy.writeTestFileContent('# WIP\n### Work\n+ [ ] First project\n'
      + '  - [ ] Child ! Dec 2026\n  * Preserve raw\n+ [ ] Empty project\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.focus-queue-tabs').should($bar => {
      const buttons = $bar[0].querySelectorAll('button');
      expect(Math.abs(buttons[0].offsetWidth - buttons[1].offsetWidth)).to.be.at.most(1);
      expect(buttons[0].offsetWidth * 2).to.be.closeTo($bar[0].clientWidth, 1);
    });
    cy.get('#focus-tab-projects').click();
    cy.get('.focus-project-caret, .focus-project-toolbar, .focus-project-children').should('not.exist');
    cy.get('.subtask-editor').should('not.exist');
    cy.get('.focus-initiatives .subtask-indicator').click();
    cy.get('.focus-edit-name').should('not.exist');
    cy.get('.focus-expanded-project-title').should('have.text', 'First project');
    cy.get('.focus-edit-save').should('not.exist');
    cy.get('[aria-label="Subtask title"]').first().should('have.value', 'Child');
    cy.get('.focus-expanded-project-title').click();
    cy.get('.focus-edit-name').should('have.value', 'First project').and('have.focus');
    cy.get('.focus-edit-cancel').click();
    cy.viewport(768, 900);
    cy.get('.initiative-row .focus-row-title').first().should($title => {
      expect($title[0].clientWidth).to.be.greaterThan(35);
    });
    cy.get('@save.all').should('have.length', 0);
  });

  it('defaults to leftmost Projects and uses one bounded pane with independently retained scroll and drafts', () => {
    cy.viewport(1600, 900);
    const projects = Array.from({ length: 25 }, (_, index) => `+ [ ] Project ${index + 1}`).join('\n');
    const upcoming = Array.from({ length: 25 }, (_, index) => `* [ ] Upcoming ${index + 1}`).join('\n');
    cy.writeTestFileContent(`# WIP\n### Work\n${projects}\n${upcoming}\n`).then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.focus-queue-tabs [role="tab"]').first().should('have.id', 'focus-tab-projects');
    cy.get('#focus-tab-projects').should('have.attr', 'aria-selected', 'true').and('contain', '25');
    cy.get('#focus-tab-upNext').should('contain', '25');
    cy.get('.focus-initiatives').should('be.visible');
    cy.get('.focus-upnext-content').should('not.be.visible');
    cy.get('#focus-tab-upNext').click();
    cy.get('.focus-initiative-anchor, .focus-initiative-spacer').should('not.exist');
    cy.get('.focus-upnext-content .panel-body').scrollTo('bottom');
    let scrollTop;
    cy.get('.focus-upnext-content .panel-body').then($body => { scrollTop = $body[0].scrollTop; });
    cy.get('#focus-tab-projects').click();
    cy.get('.focus-upnext-content').should('not.be.visible');
    cy.get('.initiative-list').should($list => {
      expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight);
      const pane = $list[0].closest('.focus-panel').getBoundingClientRect();
      expect($list[0].getBoundingClientRect().bottom).to.be.at.most(pane.bottom + 1);
    });
    cy.get('.initiative-row').first().find('.focus-row-title').click();
    cy.get('.focus-expanded-project-title').click();
    cy.get('.focus-edit-name').clear().type('Unsaved draft');
    cy.get('#focus-tab-projects').trigger('keydown', { key: 'ArrowRight' });
    cy.get('#focus-tab-upNext').should('have.focus');
    cy.get('.focus-upnext-content .panel-body').should($body => {
      expect($body[0].scrollTop).to.equal(scrollTop);
    });
    cy.get('#focus-tab-upNext').trigger('keydown', { key: 'Home' });
    cy.get('#focus-tab-projects').should('have.focus');
    cy.get('.focus-edit-name').should('have.value', 'Unsaved draft');
    cy.get('.focus-edit-cancel').click();
    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('@save.all').should('have.length', 0);
    cy.get('.panel-upnext').screenshot('focus-projects-tab');
    cy.get('#focus-tab-upNext').click();
    cy.get('.focus-upnext-content .panel-body').scrollTo('top');
    cy.get('.panel-upnext').screenshot('focus-up-next-tab');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('#focus-tab-projects').should('have.attr', 'aria-selected', 'true');
  });

  it('keeps Projects available when empty and preserves priority changes', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [ ] Small project\n* [ ] Regular task\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('#focus-tab-projects').click();
    cy.get('.focus-initiatives .priority-toggle').click();
    cy.get('.initiative-row').should('not.exist');
    cy.get('.focus-initiatives').should('be.visible').and('contain', 'No active projects.');
    cy.get('#focus-tab-projects .panel-count').should('have.text', '0');
    cy.get('#focus-tab-upNext').click();
    cy.get('.focus-upnext-content').should('contain', 'Small project');
  });

  it('preserves project children when demoted and confirms detachment for low priority', () => {
    cy.writeTestFileContent('# WIP\n### Work\n+ [~] Initiative task\n  - [ ] Attached child ! Oct 2026\n')
      .then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('#focus-tab-projects').click();
    cy.get('.focus-initiatives .priority-toggle').should('have.text', '↓')
      .and('have.css', 'color', 'rgb(137, 150, 165)').click();
    cy.get('.initiative-row').should('not.exist');
    cy.get('.detach-modal').should('not.exist');
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Initiative task')
      .find('.subtask-total').should('have.text', '1 subtask');
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Initiative task')
      .find('[aria-label="Make low priority"]').click();
    cy.get('.detach-modal').should('be.visible').and('contain', 'All subtasks will be detached');
    cy.get('.detach-subtask-list li').should('have.length', 1).and('contain', 'Attached child');
    cy.get('.detach-subtask-date').should('contain', 'Oct');
    cy.get('.detach-subtask-list').find('input, button, textarea, [contenteditable]').should('not.exist');
    cy.get('.detach-cancel').should('have.focus').click();
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Initiative task')
      .find('[aria-label="Make low priority"]').click();
    cy.get('.detach-confirm').click();
    cy.contains('.focus-task-row', 'Attached child').should('exist');
  });
});
