describe('Focus weekly execution', () => {
  beforeEach(() => {
    cy.viewport(1600, 1000);
    cy.writeTestFileContent('# WIP\n### Work\n'
      + '+ [ ] Weekly project ! Nov Week #2 2026\n'
      + '  - [ ] Weekly child ! Nov Week #2 2026\n'
      + '  - [!] Wednesday child ! Nov 11 2026\n'
      + '* [!] Late blocked ! Nov 9 2026\n'
      + '* [ ] Today task ! Nov 10 2026\n'
      + '* [ ] Thursday task ! Nov 12 2026\n'
      + '* [ ] Future task ! Nov 16 2026\n').then(() => cy.reload());
    cy.clock(new Date(2026, 10, 10, 12).getTime(), ['Date']);
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    cy.intercept('POST', '**/api/todos').as('save');
  });

  it('routes tasks and subtasks by date, preserves navigation and migrates saved Focus2 selections', () => {
    cy.get('.panel-upnext .panel-kicker').should('have.text', 'THIS WEEK - UNSCHEDULED');
    cy.get('.panel-in-progress-queued .panel-kicker').should('have.text', 'THIS WEEK - SCHEDULED');
    cy.get('.panel-upnext').should('contain', 'Weekly project').and('contain', 'Weekly child');
    cy.get('.panel-now').should('contain', 'Today task').and('contain', 'Late blocked');
    cy.get('.panel-in-progress-queued').should('contain', 'Wednesday, Nov 11').and('contain', 'Thursday, Nov 12');
    cy.get('.focus-queue-tabs, .focus-initiatives').should('not.exist');
    cy.get('.panel-upnext .panel-body').should('have.css', 'display', 'flex');
    cy.get('.panel-upnext .upnext-group-header').first().should('contain', 'Nov Week #2');
    cy.get('.panel-upnext .focus-due-label').first().should('not.be.visible');
    cy.get('.panel-upnext .focus-section-badge').first().should('not.be.visible');
    cy.get('.focus-week-strip-current .focus-week-day-column').should('have.length', 7);
    cy.get('.focus-week-strip-current').should('contain', 'Today task').and('contain', 'Wednesday child');
    cy.get('.focus-week-readonly-row button, .focus-week-strip-current .focus-row-check').should('not.exist');
    cy.get('.focus-week-readonly-row').first().should('have.css', 'white-space', 'nowrap').click().rightclick();
    cy.get('.focus-inline-editor, .focus-task-context-menu').should('not.exist');
    cy.get('[aria-label="Next week"]').click();
    cy.get('.focus-week-strip-current').should('contain', 'Future task').and('not.contain', 'Weekly project');
    cy.contains('.focus-week-strip-current button', 'This week').click();
    cy.get('[aria-label="Preview next day"]').click();
    cy.get('.panel-now').should('contain', 'Wednesday child').and('not.contain', 'Late blocked');
    cy.get('[aria-label="Preview previous day"]').click();
    cy.get('.panel-now').should('contain', 'Today task');
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-15').trigger('change', { force: true });
    cy.get('.panel-in-progress-queued').should('contain', 'Monday, Nov 16').and('contain', 'Future task');
    cy.get('.panel-upnext').should('not.contain', 'Weekly project');
    cy.contains('button', 'Back to today').click();
    cy.get('.panel-now').should('contain', 'Today task');
    cy.get('@save.all').should('have.length', 0);
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    cy.get('.focus-week-carousel-shell').should('be.visible');
    cy.get('.focus-queue-tabs').should('not.exist');
    cy.get('.view-mode-btn').should('have.length', 4);
    cy.window().then(win => win.localStorage.setItem('viewMode', 'focus2'));
    cy.get('.panel-now .panel-body').should('have.css', 'display', 'flex');
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    cy.reload();
    cy.contains('.view-mode-btn', /\bFocus\b/).should('have.class', 'active');
    cy.window().its('localStorage.viewMode').should('equal', 'focus');
  });

  it('edits titles and dates and debounces completion without losing project children', () => {
    cy.contains('.panel-upnext .focus-row-title', 'Weekly project').click();
    cy.get('.focus-edit-name').clear().type('Renamed weekly project');
    cy.get('.focus-edit-save').click();
    cy.wait('@save');
    cy.contains('.panel-in-progress-queued .focus-task-row', 'Thursday task')
      .find('.focus-due-edit').click();
    cy.contains('.focus-date-menu button', /^Today$/).click();
    cy.wait('@save');
    cy.get('.panel-now').should('contain', 'Thursday task');
    cy.contains('.panel-now .focus-task-row', 'Today task').find('.focus-row-check').click();
    cy.contains('.panel-now .focus-task-row', 'Today task').find('.focus-row-check').should('have.class', 'checked');
    cy.wait('@save');
    cy.readFile('fixture-focus-weekly.todo.md').should('contain', '+ [ ] Renamed weekly project ! Nov Week #2 2026')
      .and('contain', '  - [ ] Weekly child ! Nov Week #2 2026')
      .and('contain', '* [x] Today task | Nov 10 2026');
  });

  it('drags a subtask across week, today and empty day targets without changing its parent', () => {
    const dropTask = (sourcePanel, target) => {
      cy.window().then(win => {
        const dataTransfer = new win.DataTransfer();
        cy.contains(`${sourcePanel} .focus-task-row`, 'Weekly child').find('.focus-drag-handle')
          .should('not.be.disabled').trigger('dragstart', { dataTransfer });
        cy.get(target).trigger('dragover', { dataTransfer }).trigger('drop', { dataTransfer });
      });
      cy.wait('@save');
    };
    cy.get('[data-schedule-date]').should('have.length', 7);
    dropTask('.panel-upnext', '.panel-now');
    cy.get('.panel-now').should('contain', 'Weekly child');
    dropTask('.panel-now', '[data-schedule-date="2026-11-13"]');
    cy.get('[data-schedule-date="2026-11-13"]').should('contain', 'Weekly child');
    dropTask('.panel-in-progress-queued', '.panel-upnext');
    cy.get('.panel-upnext').should('contain', 'Weekly child');
    cy.readFile('fixture-focus-weekly.todo.md').should('contain', '+ [ ] Weekly project ! Nov Week #2 2026\n')
      .and('contain', '  - [ ] Weekly child ! Nov Week #2 2026');
  });

  it('keeps low-priority weekly work under a separate final header without rewriting source order', () => {
    cy.writeTestFileContent('# WIP\n### Work\n'
      + '- [ ] Low first ! Nov Week #2 2026\n* [ ] Normal last ! Nov Week #2 2026\n')
      .then(() => cy.reload());
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-10').trigger('change', { force: true });
    cy.get('.panel-upnext .focus-row-title').then($titles => {
      expect([...$titles].map(node => node.textContent)).to.deep.equal(['Normal last', 'Low first']);
    });
    cy.get('[data-week-section="low-priority"] .upnext-group-header').should('have.text', 'LOW PRIO1');
    cy.get('.panel-upnext .panel-count').should('have.text', '2');
    cy.get('@save.all').should('have.length', 0);
    cy.readFile('fixture-focus-weekly.todo.md').should('contain',
      '- [ ] Low first ! Nov Week #2 2026\n* [ ] Normal last ! Nov Week #2 2026');
  });

  it('distinguishes read-only Done and Will not do symbols without increasing calendar row height', () => {
    const source = '# WIP\n* [x] Completed task | Nov 10 2026\n* [-] Cancelled task | Nov 10 2026\n'
      + '* [ ] Open task ! Nov 10 2026\n+ [ ] Parent\n'
      + '  - [x] Completed child | Nov 10 2026\n  - [-] Cancelled child | Nov 10 2026\n';
    cy.writeTestFileContent(source).then(file => {
      cy.reload();
      cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-10').trigger('change', { force: true });
      const day = '.focus-week-strip-current [data-week-day-value="2026-11-10"]';
      cy.get(`${day} .is-complete .focus-week-status`).should('have.length', 2).each($icon => {
        expect($icon.text().trim()).to.equal('✓');
        expect($icon.attr('aria-label')).to.equal('Done');
      });
      cy.get(`${day} .is-cancelled .focus-week-status`).should('have.length', 2).each($icon => {
        expect($icon.text().trim()).to.equal('−');
        expect($icon.attr('aria-label')).to.equal('Will not do');
      });
      cy.get(day).then($day => {
        const doc = $day[0].ownerDocument;
        const style = node => doc.defaultView.getComputedStyle(node);
        const done = $day[0].querySelector('.is-complete .focus-week-status');
        const cancelled = $day[0].querySelector('.is-cancelled .focus-week-status');
        expect(style(done).color).not.to.equal(style(cancelled).color);
        expect(style(done.parentElement).opacity).to.equal('1');
        const heights = [...$day[0].querySelectorAll('.focus-week-readonly-row')]
          .map(row => row.getBoundingClientRect().height);
        expect(Math.max(...heights) - Math.min(...heights)).to.be.at.most(1);
      });
      cy.get(`${day} .focus-week-status`).first().click();
      cy.get('.focus-inline-editor').should('not.exist');
      cy.get('@save.all').should('have.length', 0);
      cy.readFile(file.filePath).should('equal', source);
    });
  });

  it('fits five long calendar titles without wrapping or unnecessary vertical scrolling', () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      `* [ ] Long calendar task ${index + 1} with details that must stay on one line ! Nov 9 2026`);
    cy.writeTestFileContent(`# WIP\n### Work\n${rows.join('\n')}\n`).then(() => cy.reload());
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-10').trigger('change', { force: true });
    cy.get('.focus-week-strip-current [data-week-day-value="2026-11-09"] .focus-week-readonly-row')
      .should('have.length', 5).each($row => {
        expect($row).to.have.css('white-space', 'nowrap');
        expect($row.attr('title')).to.contain('with details that must stay on one line');
        expect($row[0].getBoundingClientRect().height).to.be.lessThan(22);
      });
    cy.get('.focus-week-strip-current [data-week-day-value="2026-11-09"] .focus-week-day-column')
      .should($day => expect($day[0].scrollHeight).to.be.at.most($day[0].clientHeight + 1));
  });

  it('groups weekly tasks and children into Main, Low Prio and Blocked/Waiting', () => {
    cy.writeTestFileContent('# SELECTED\n+ [ ] Parent\n'
      + '  - [~] Active child ! Nov Week #2 2026\n  - [!] Blocked child ! Nov Week #2 2026\n'
      + '# WIP\n- [ ] Low weekly ! Nov Week #2 2026\n- [!] Low blocked ! Nov Week #2 2026\n')
      .then(() => cy.reload());
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-10').trigger('change', { force: true });
    const main = '[data-week-section="main"]';
    const blocked = '[data-week-section="blocked-waiting"]';
    cy.get('.panel-upnext .upnext-group-header').first().should('have.text', 'Nov Week #24');
    cy.get('[data-week-section] .day-name').then($headers => {
      expect([...$headers].map(node => node.textContent)).to.deep.equal(['MAIN', 'LOW PRIO', 'BLOCKED/WAITING']);
    });
    cy.get(main).should('contain', 'Active child').and('not.contain', 'Blocked child');
    cy.get('[data-week-section="low-priority"]').should('contain', 'Low weekly').and('not.contain', 'Low blocked');
    cy.get(blocked).should('contain', 'Blocked child').and('contain', 'Low blocked');
    cy.get('.panel-upnext .focus-task-row').should('have.length', 4);
    cy.get('@save.all').should('have.length', 0);
    cy.contains(`${main} .focus-task-row`, 'Active child').find('.focus-row-check').click().click();
    cy.get(main).should('contain', 'Active child');
    cy.get(blocked).should('not.contain', 'Active child');
    cy.wait('@save');
    cy.get(blocked).should('contain', 'Active child');
    cy.get(main).should('not.contain', 'Active child');
    cy.readFile('fixture-focus-weekly.todo.md').should('contain',
      '+ [ ] Parent\n  - [!] Active child ! Nov Week #2 2026');
  });

  it('separates Main, Low Prio and Blocked/Waiting while keeping status changes under the pointer', () => {
    cy.writeTestFileContent('# WIP\n'
      + '* [~] Main active ! Nov 10 2026\n- [ ] Low task ! Nov 10 2026\n'
      + '- [!] Low blocked ! Nov 9 2026\n* [!] Normal blocked ! Nov 10 2026\n'
      + '+ [ ] Parent\n  - [ ] Child today ! Nov 10 2026\n'
      + '* [x] Done today | Nov 10 2026\n').then(() => cy.reload());
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-11-10').trigger('change', { force: true });
    const main = '[data-now-section="main"]';
    const low = '[data-now-section="low-priority"]';
    const blocked = '[data-now-section="blocked-waiting"]';
    cy.get('.panel-now .day-name').then($headers => {
      expect([...$headers].map(node => node.textContent)).to.deep.equal(['MAIN', 'LOW PRIO', 'BLOCKED/WAITING']);
    });
    cy.get(main).should('contain', 'Main active').and('contain', 'Child today').and('contain', 'Done today');
    cy.get(low).should('contain', 'Low task').and('not.contain', 'Low blocked');
    cy.get(blocked).should('contain', 'Low blocked').and('contain', 'Normal blocked');
    cy.get('.panel-now .focus-task-row').should('have.length', 6);
    cy.get('.panel-now .panel-count').should('have.text', '6');
    cy.get('@save.all').should('have.length', 0);
    cy.contains(`${main} .focus-task-row`, 'Main active').find('.focus-row-check').click().click();
    cy.contains(`${main} .focus-task-row`, 'Main active').find('.focus-row-check')
      .should('have.class', 'status-blocked');
    cy.get(blocked).should('not.contain', 'Main active');
    cy.wait('@save');
    cy.get(blocked).should('contain', 'Main active');
    cy.get(main).should('not.contain', 'Main active');
    cy.get('.panel-now .focus-task-row').should('have.length', 6);
  });
});
