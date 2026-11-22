describe('Calendar planning workspace', () => {
  const source = '# TODO\n+ [ ] Backlog project ! Nov 2026\n'
    + '# SELECTED\n+ [~] Month project (parent note) ! Nov 2026\n'
    + '  - [ ] Weekly child (child note) ! Nov Week #4 2026\n'
    + '  - [x] Finished child | Nov 20 2026\n'
    + '  - [ ] Monthly child ! Nov 2026\n  - [~] Started monthly child ! Nov 2026\n'
    + '+ [ ] December project ! Dec 2026\n'
    + '# WIP\n* [!] Blocked weekly ! Nov Week #4 2026\n'
    + '* [ ] Daily open (retain note) ! Nov 24 2026\n* [ ] Stale open | Nov 20 2026\n'
    + '* [ ] Monthly open ! Nov 2026\n* [!] Monthly blocked ! Nov 2026\n* [~] Monthly started ! Nov 2026\n'
    + '# ARCHIVE\n* [x] Finished task | Nov 20 2026\n* [-] Dropped | Nov 20 2026\n'
    + '* [x] Earlier task | Nov 2 2026\n* [x] Next day task | Nov 3 2026\n';

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.clock(new Date(2026, 10, 22, 12).getTime(), ['Date']);
    cy.writeTestFileContent(source).then(file => {
      cy.wrap(file).as('file');
      cy.reload(); cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', 'Calendar').click();
    });
    cy.intercept('POST', '**/api/todos').as('save');
  });

  it('shows selected month projects and each weekly list, with completed-only details and single-line rows', () => {
    cy.get('.calendar-selected-projects').should('contain', 'Month project')
      .and('not.contain', 'Backlog project').and('not.contain', 'December project');
    cy.get('[data-week="2026-11-22"]').should('contain', 'Weekly child').and('contain', 'Blocked weekly');
    cy.get('.calendar-project-group-toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('.calendar-project-group-toggle').click();
    cy.get('.calendar-project-group-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('.calendar-month-tasks .calendar-task-title').should($titles => {
      expect([...$titles].map(title => title.textContent))
        .to.deep.equal(['Started monthly child', 'Monthly child', 'Monthly started', 'Monthly blocked', 'Monthly open']);
    });
    cy.get('.calendar-project-tiles .is-tile').should('have.length', 1);
    cy.get('.review-week-row [data-week]').should('have.length', 5);
    cy.get('.review-rail').should('not.have.class', 'is-open');
    cy.get('.calendar-completed-content').should('have.attr', 'inert');
    cy.get('.calendar-completed-toggle').click();
    cy.get('.review-day-detail').should('contain', 'Finished task').and('contain', 'Finished child')
      .and('not.contain', 'Daily open').and('not.contain', 'Dropped');
    cy.get('.review-day-detail .review-entry-text').then($entries => {
      expect([...$entries].map(entry => entry.textContent.trim()))
        .to.deep.equal(['Earlier task', 'Next day task', 'Finished child', 'Finished task']);
    });
    cy.get('[data-date="2026-11-24"] .review-day-meter').click();
    cy.get('.review-day-detail').should('contain', 'Nothing completed').and('not.contain', 'Daily open');
    cy.get('.calendar-drawer-close').click();
    cy.get('.review-rail').should('not.have.class', 'is-open');
    cy.get('[data-date="2026-11-20"] .review-day-meter').click();
    cy.get('.review-day-detail').should('contain', 'Finished task').and('not.contain', 'Dropped');
    cy.get('.calendar-drawer-close').click();
    cy.get('.review-rail').should('not.have.class', 'is-open');
    for (const width of [1800, 1280, 900]) {
      cy.viewport(width, 1000);
      cy.get('.calendar-task-title').should($titles => {
        [...$titles].forEach(title => expect(getComputedStyle(title).whiteSpace).to.equal('nowrap'));
      });
      cy.get('.review-body').should($body => {
        const body = $body[0];
        expect(body.scrollWidth).to.be.at.most(body.clientWidth + 1);
      });
      cy.get('.review-mode').should($mode => {
        const mode = $mode[0];
        const rect = selector => mode.querySelector(selector).getBoundingClientRect();
        for (const selector of ['.review-header', '.calendar-selection-pane']) {
          expect(getComputedStyle(mode.querySelector(selector)).borderTopWidth).to.equal('1px');
        }
        expect(getComputedStyle(mode, '::after').borderTopWidth).to.equal('1px');
        expect(getComputedStyle(mode, '::after').pointerEvents).to.equal('none');
        expect(rect('.review-stat').height).to.be.at.most(44);
        expect(rect('.review-header').left).to.equal(rect('.calendar-week-selection').left);
        expect(rect('.calendar-selection-pane').top).to.equal(rect('.review-weekday-row').top);
        expect(rect('.calendar-selection-pane').right + 12).to.equal(rect('.review-header').left);
        expect(rect('.calendar-month-summary').right).to.equal(rect('.calendar-selection-pane').right);
        expect(rect('.calendar-month-summary').top).to.equal(rect('.review-header').top);
        expect(rect('.calendar-month-summary').bottom).to.equal(rect('.review-header').bottom);
        expect(rect('.calendar-month-summary').left).to.equal(rect('.calendar-selection-pane').left);
        expect(rect('.calendar-month-summary').bottom + 12).to.equal(rect('.review-weekday-row').top);
        expect(rect('.calendar-month-heading').bottom).to.be.at.most(rect('.review-metrics').top);
        expect(mode.querySelectorAll('.calendar-month-summary')).to.have.length(1);
        const stats = [...mode.querySelector('.calendar-month-summary').querySelectorAll('.review-stat')];
        expect(stats).to.have.length(5);
        expect(new Set(stats.map(stat => stat.getBoundingClientRect().top)).size).to.equal(1);
        expect(rect('.review-header').height).to.equal(96);
        expect(mode.querySelector('.stat-peak')).to.equal(null);
        expect(rect('.calendar-month-summary .review-stat:last-child').bottom)
          .to.be.at.most(rect('.calendar-month-summary').bottom - 6);
        expect(getComputedStyle(mode.querySelector('.calendar-month-heading')).borderTopWidth).to.equal('1px');
        mode.querySelectorAll('.review-stat').forEach(stat => {
          expect(getComputedStyle(stat).textAlign).to.equal('center');
          expect(getComputedStyle(stat).borderTopWidth).to.equal('1px');
        });
        mode.querySelectorAll('.calendar-week-selection .calendar-day-task').forEach(task => {
          expect(task.getBoundingClientRect().height).to.be.at.most(20);
        });
        expect(rect('.calendar-month-heading').bottom).to.be.at.most(rect('.calendar-selected-heading').top);
        expect(rect('.calendar-selected-heading').bottom).to.be.lessThan(rect('.calendar-selected-projects').top);
        expect(rect('.calendar-selected-projects').bottom).to.be.lessThan(rect('.calendar-month-tasks').top);
        expect([...mode.querySelectorAll('.calendar-selection-pane .review-card-head h2')]
          .map(el => el.textContent)).to.deep.equal(['Projects', 'Tasks']);
        expect(getComputedStyle(mode.querySelector('.review-step-value.month')).fontSize).to.equal('13px');
        expect(mode.querySelector('.calendar-selected-heading').textContent).to.equal('SELECTED');
        expect(mode.querySelector('.calendar-month-project-groups .calendar-project-group')).not.to.equal(null);
        expect(mode.querySelector('.calendar-month-standalone .calendar-task-title').textContent)
          .to.equal('Monthly started');
        const monthStyle = getComputedStyle(mode.querySelector('.calendar-month-heading'));
        const statStyle = getComputedStyle(mode.querySelector('.review-stat-value'));
        expect(parseFloat(monthStyle.fontSize)).to.be.greaterThan(parseFloat(statStyle.fontSize) * 1.3);
        const heading = mode.querySelector('.calendar-month-heading');
        expect(heading.textContent).to.equal('November 2026');
        expect(heading.scrollWidth).to.be.at.most(heading.clientWidth + 1);
        mode.querySelectorAll('.is-tile .calendar-task-status').forEach(icon => {
          const bounds = icon.getBoundingClientRect();
          expect(bounds.width).to.equal(bounds.height);
        });
        mode.querySelectorAll('.calendar-project-tiles .is-tile').forEach(tile => {
          const bounds = tile.getBoundingClientRect();
          const tileGrid = rect('.calendar-project-tiles');
          expect(bounds.width).to.be.closeTo((tileGrid.width - 12) / 3, 1);
          expect(bounds.height).to.be.closeTo(bounds.width, 1);
          const icon = tile.querySelector('.calendar-task-status').getBoundingClientRect();
          const title = tile.querySelector('.calendar-task-title').getBoundingClientRect();
          const date = tile.querySelector('.calendar-row-date').getBoundingClientRect();
          expect(icon.bottom).to.be.lessThan(title.top);
          expect(title.bottom).to.be.lessThan(date.top);
        });
        expect(mode.scrollWidth).to.be.at.most(mode.clientWidth + 1);
        mode.querySelectorAll('.review-week-row').forEach(row => {
          const list = row.querySelector('[data-week]').getBoundingClientRect();
          const day = row.querySelector('.review-day').getBoundingClientRect();
          expect(list.top).to.equal(day.top);
          expect(list.height).to.equal(day.height);
          expect(list.right).to.equal(day.left);
          const days = [...row.querySelectorAll('.review-day')];
          days.forEach((cell, index) => {
            expect(getComputedStyle(cell).borderRadius).to.equal('0px');
            if (index) expect(days[index - 1].getBoundingClientRect().right)
              .to.be.closeTo(cell.getBoundingClientRect().left, 1);
          });
        });
        const weeks = [...mode.querySelectorAll('.review-week-row')];
        weeks.slice(1).forEach((week, index) => {
          expect(weeks[index].getBoundingClientRect().bottom).to.equal(week.getBoundingClientRect().top);
        });
      });
      cy.screenshot(`calendar-workspace-${width}`);
    }
    cy.get('[title="Next month"]').click();
    cy.get('.calendar-selected-projects').should('contain', 'December project').and('not.contain', 'Month project');
    cy.get('@save.all').should('have.length', 0);
  });

  const dragTo = (sourceSelector, title, day) => {
    cy.contains(sourceSelector, title).should('have.attr', 'draggable', 'true');
    cy.window().then(win => {
      const row = [...win.document.querySelectorAll(sourceSelector)].find(el => el.textContent.includes(title));
      const target = win.document.querySelector(`[data-date="${day}"]`);
      const dataTransfer = new win.DataTransfer();
      row.dispatchEvent(new win.DragEvent('dragstart', { bubbles: true, dataTransfer }));
      target.dispatchEvent(new win.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new win.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    });
  };

  it('defaults to a taller current week and lets another week be emphasized without saving', () => {
    cy.get('.review-week-row.is-prominent-week [data-week]').should('have.attr', 'data-week', '2026-11-22');
    const checkProminence = () => cy.get('.review-weeks').should($weeks => {
      const active = $weeks[0].querySelector('.is-prominent-week').getBoundingClientRect();
      $weeks[0].querySelectorAll('.review-week-row:not(.is-prominent-week)').forEach(row => {
        expect(active.height).to.be.greaterThan(row.getBoundingClientRect().height * 1.5);
      });
    });
    checkProminence();
    cy.get('[data-week="2026-11-08"] .calendar-week-toggle').click();
    cy.get('.review-week-row.is-prominent-week [data-week]').should('have.attr', 'data-week', '2026-11-08');
    cy.get('[data-week="2026-11-08"] .calendar-week-toggle').should('have.attr', 'aria-pressed', 'true');
    checkProminence();
    cy.get('[title="Next month"]').click();
    cy.get('.review-week-row.is-prominent-week').should('not.exist');
    cy.get('[title="Previous month"]').click();
    cy.get('.review-week-row.is-prominent-week [data-week]').should('have.attr', 'data-week', '2026-11-22');
    cy.get('@save.all').should('have.length', 0);
  });

  it('expands month pseudo-projects without source changes and reschedules their individual children', () => {
    cy.get('.calendar-project-group-toggle').should('contain', 'Month project').and('have.attr', 'aria-expanded', 'false');
    cy.get('.calendar-project-group').should('not.contain', 'Weekly child').and('not.contain', 'Finished child');
    cy.get('.calendar-project-group-children').should('not.exist');
    cy.get('@save.all').should('have.length', 0);
    cy.get('.calendar-project-group-toggle').click();
    cy.get('.calendar-project-group-toggle').should('have.attr', 'aria-expanded', 'true');
    dragTo('.calendar-project-group .calendar-day-task', 'Monthly child', '2026-11-29');
    cy.wait('@save').its('request.body.content').should('contain', '  - [ ] Monthly child ! Nov 29 2026');
    cy.get('.calendar-project-group-count').should('have.text', '1');
    cy.get('[data-date="2026-11-29"]').should('contain', 'Monthly child');
    cy.reload();
    cy.get('.calendar-project-group-toggle').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('.calendar-project-group').should('contain', 'Started monthly child').and('not.contain', 'Weekly child');
    cy.get('[data-date="2026-11-29"]').should('contain', 'Monthly child');
  });

  it('reschedules weekly children and day tasks, autosaves, preserves nesting, and survives reload', () => {
    dragTo('.calendar-week-selection .calendar-day-task', 'Weekly child', '2026-11-25');
    cy.wait('@save').its('request.body.content').should(content => {
      expect(content).to.contain('+ [~] Month project (parent note) ! Nov 2026\n'
        + '  - [ ] Weekly child (child note) ! Nov 25 2026\n  - [x] Finished child | Nov 20 2026');
      expect(content).to.contain('* [ ] Stale open | Nov 20 2026');
    });
    cy.get('[data-date="2026-11-25"]').should('contain', 'Weekly child');
    cy.get('[data-week="2026-11-22"]').should('not.contain', 'Weekly child');
    dragTo('.review-day .calendar-day-task', 'Daily open', '2026-11-26');
    cy.wait('@save').its('request.body.content').should('contain', 'Daily open (retain note) ! Nov 26 2026');
    cy.reload();
    cy.get('[data-date="2026-11-25"]').should('contain', 'Weekly child');
    cy.get('[data-date="2026-11-26"]').should('contain', 'Daily open');
    cy.get('.review-rail').should('not.have.class', 'is-open');
    cy.contains('.calendar-day-task', 'Finished task').should('have.attr', 'draggable', 'false');
    cy.contains('.calendar-day-task', 'Dropped').should('have.attr', 'draggable', 'false');
  });

  it('slides completed work over the calendar without shifting dates and closes with Escape', () => {
    cy.get('.review-day').first().then($day => {
      const before = $day[0].getBoundingClientRect().toJSON();
      cy.get('.calendar-completed-toggle').click().should('have.attr', 'aria-expanded', 'true');
      cy.get('.review-rail').should('be.visible').and('not.contain', 'Daily open');
      cy.get('.review-day').first().should($after => {
        expect($after[0].getBoundingClientRect().toJSON()).to.deep.equal(before);
      });
    });
    cy.get('.calendar-drawer-close').trigger('keydown', { key: 'Escape' });
    cy.get('.review-rail').should('not.have.class', 'is-open');
    cy.get('.calendar-completed-toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('.review-mode').should('not.contain', 'Where work landed').and('not.contain', 'Throughput');
    cy.get('@save.all').should('have.length', 0);
  });

  it('offers keyboard date moves and cancellation without changing completed work', () => {
    cy.contains('.calendar-day-task', 'Blocked weekly').trigger('keydown', { key: ' ', code: 'Space' });
    cy.get('[data-date="2026-11-27"] .review-day-summary').click();
    cy.wait('@save').its('request.body.content').should('contain', '* [!] Blocked weekly ! Nov 27 2026');
    cy.contains('.calendar-day-task', 'Weekly child').trigger('keydown', { key: ' ', code: 'Space' });
    cy.get('[data-date="2026-11-20"] .calendar-day-tasks').trigger('keydown', { key: 'Escape' });
    cy.get('[data-date="2026-11-28"]').click('bottomRight');
    cy.get('@save.all').should('have.length', 1);
    cy.get('[data-week="2026-11-22"]').should('contain', 'Weekly child');
  });

  it('opens the clicked day in Focus, including padding days, without saving', () => {
    cy.contains('.calendar-day-task', 'Daily open').click();
    cy.get('.review-mode').should('exist');
    for (const date of ['2026-11-20', '2026-11-28', '2026-12-02']) {
      cy.get(`[data-date="${date}"] .review-day-summary`).click();
      cy.contains('.view-mode-btn.active', 'Focus').should('exist');
      cy.get('.focus-date-input').should('have.value', date);
      cy.contains('.view-mode-btn', 'Calendar').click();
    }
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.focus-date-input').should('have.value', '2026-11-22');
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', source));
  });
});
