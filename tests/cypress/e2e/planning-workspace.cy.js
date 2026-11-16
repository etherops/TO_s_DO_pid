describe('Backlog and scheduled planning', () => {
  const content = '# TODO\n### Inbox\n* [ ] Backlog item (keep note)\n'
    + '# PROJECTS\n### Research\n+ [ ] Future initiative\n'
    + '  - [ ] Dated child ! Nov 3 2026\n  * [~] Unsupported child stays\n'
    + '# SELECTED\n### Ready\n* [ ] Selected item ! Nov Week #1 2026\n* [ ] Paper commitment\n'
    + '# WIP\n### Work\n+ [~] Active parent (retain note) ! Nov 2026\n'
    + '* [ ] Today task ! Nov 2 2026\n'
    + '# ARCHIVE\n### Older\n* [x] History | Oct 28 2026\n';

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.clock(new Date(2026, 10, 2, 12).getTime(), ['Date']);
    cy.writeTestFileContent(content).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
      cy.get('.planning-workspace').should('be.visible');
    });
  });

  it('subheads the remaining week by day and keeps week-only assignments separate', () => {
    const source = '# WIP\n### Work\n* [ ] Tuesday task ! Nov 3 2026\n'
      + '* [ ] Another Tuesday ! Nov 3 2026\n* [ ] Wednesday task ! Nov 4 2026\n'
      + '+ [~] Weekly parent ! Nov Week #1 2026\n  - [ ] Child Wednesday ! Nov 4 2026\n';
    cy.writeTestFileContent(source).then(file => {
      cy.reload(); cy.switchToFile(file.fileName);
      cy.get('[data-schedule-group="week"] .planning-day-heading').should('have.length', 3);
      cy.get('[data-schedule-group="week"] .planning-day-heading').first()
        .should('contain', 'This week · no specific day');
      cy.get('[data-schedule-day="2026-11-03"]').should('contain', 'Tuesday, Nov 3')
        .find('.planning-task-row').should('have.length', 2);
      cy.get('[data-schedule-day="2026-11-04"]').should('contain', 'Wednesday, Nov 4')
        .find('.planning-task-row').should('have.length', 2);
      cy.contains('.planning-day-group', 'This week · no specific day')
        .find('.planning-task-row').should('have.length', 1);
      cy.get('[data-schedule-group="overdue"]').should($group => {
        expect($group[0].children).to.have.length(1);
        expect($group[0].getBoundingClientRect().height).to.be.at.most(26);
        const heading = $group[0].querySelector('h3').getBoundingClientRect();
        const message = $group[0].querySelector('.planning-empty-inline').getBoundingClientRect();
        expect($group.text()).to.contain('Nothing overdue.');
        expect(Math.abs((heading.top + heading.bottom - message.top - message.bottom) / 2)).to.be.lessThan(1);
        expect(getComputedStyle($group[0]).borderBottomWidth).to.equal('1px');
      });
      cy.readFile(file.filePath).should('equal', source);
      cy.get('[data-planning-lane="WIP"]').screenshot('scheduled-week-day-headers');
    });
  });

  it('stacks every backlog source beside source-organized SELECTED and date-grouped WIP', () => {
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.planning-columns > section').should('have.length', 2);
    cy.get('.planning-outline').should('not.contain', 'SELECTED').and('not.contain', 'WIP');
    cy.get('.planning-backlog > [data-planning-column]').first().should('have.attr', 'data-planning-column', 'TODO');
    cy.get('.planning-schedule').should('be.visible');
    cy.get('.planning-backlog .column-header, .planning-selected .column-header').each($header => {
      expect($header[0].getBoundingClientRect().height).to.be.at.most(40);
      expect(getComputedStyle($header[0]).paddingTop).to.equal('2px');
    });
    cy.get('.planning-schedule-meta, .planning-schedule-source').should('not.exist');
    cy.contains('.planning-schedule-title', 'Active parent')
      .should('have.attr', 'title', 'Due: November 2026\nWIP › Work');
    cy.get('.planning-schedule-entry').each($entry => {
      expect($entry.children()).to.have.length(2);
      expect($entry.children()[0].className).to.equal('planning-schedule-title');
      expect($entry.children()[1].className).to.equal('planning-schedule-date');
    });
    cy.get('.planning-layout').should($layout => {
      const rect = selector => $layout[0].querySelector(selector).getBoundingClientRect();
      const areaTitle = $layout[0].querySelector('.planning-area-title');
      expect(getComputedStyle(areaTitle).fontSize).to.equal('24px');
      expect(getComputedStyle(areaTitle).letterSpacing).to.equal('4px');
      expect(rect('.planning-area-label').height).to.be.at.most(32);
      expect(rect('.planning-commitment-title').right).to.be.lessThan(rect('.planning-add-task').left);
      const empty = $layout[0].querySelector('[data-schedule-group="overdue"]');
      expect(empty.classList.contains('is-empty')).to.equal(true);
      expect(empty.children).to.have.length(1);
      expect(empty.getBoundingClientRect().height).to.be.at.most(26);
      expect($layout[0].querySelector('.planning-selected .section-header').getBoundingClientRect().height)
        .to.be.at.most(25);
      expect(rect('.planning-browse-label').left).to.equal(rect('.planning-toc').left);
      expect(rect('.planning-browse-label').right).to.equal(rect('.planning-backlog').right);
      expect(rect('.planning-open-archive').left - rect('.planning-add-task').right).to.equal(6);
      expect(rect('.planning-add-task').top).to.equal(rect('.planning-open-archive').top);
      const lane = name => rect(`[data-planning-lane="${name}"]`);
      expect(rect('.planning-split-column').top).to.equal(rect('.planning-backlog').top);
      expect(rect('.planning-split-column').top).to.equal(lane('WIP').top);
      expect(lane('PROJECTS').top).to.be.greaterThan(lane('SELECTED').bottom);
      expect(lane('PROJECTS').bottom).to.be.at.most(lane('WIP').bottom + 1);
      expect(lane('SELECTED').left).to.equal(lane('PROJECTS').left);
      expect(rect('.planning-toc').width).to.equal(44);
      expect(rect('.planning-backlog').width / lane('PROJECTS').width).to.be.closeTo(0.8, 0.01);
      expect(lane('WIP').width).to.be.closeTo(lane('PROJECTS').width, 1);
      expect(lane('WIP-AFTER').left).to.be.greaterThan(lane('WIP').right);
      expect(lane('WIP-AFTER').width).to.be.lessThan(lane('WIP').width);
      expect(lane('WIP-AFTER').width).to.equal(235);
      const style = selector => getComputedStyle($layout[0].querySelector(selector));
      expect(style('.planning-schedule').backgroundColor).to.equal(style('.projects-stack').backgroundColor);
      expect(style('.planning-schedule').borderWidth).to.equal('1px');
      expect(parseFloat(style('.planning-schedule').borderRadius)).to.be.greaterThan(0);
      expect(style('.planning-schedule').paddingLeft).to.equal('15px');
      expect(style('.planning-schedule h2').fontSize).to.equal('15px');
      expect(style('.planning-schedule-group').borderTopWidth).to.equal('1px');
      expect(style('.planning-schedule h3').color).not.to.equal(style('.planning-schedule h2').color);
      expect(style('.planning-schedule-entry').paddingLeft).to.equal(style('.planning-schedule h3').paddingLeft);
      expect(rect('.planning-schedule-title').left).to.equal(
        rect('.planning-schedule h3').left + parseFloat(style('.planning-schedule h3').paddingLeft));
    });
    cy.contains('[data-planning-lane="SELECTED"] .section-title', 'Ready').should('be.visible');
    cy.contains('[data-planning-lane="SELECTED"]', 'Paper commitment').should('be.visible');
    cy.contains('[data-schedule-group="today"]', 'Today task').should('be.visible');
    cy.contains('.planning-backlog .task-card', 'Backlog item').should('be.visible');
    cy.contains('[data-planning-lane="PROJECTS"] .task-card', 'Future initiative').should('be.visible');
    cy.contains('[data-planning-lane="PROJECTS"] .task-card', 'Active parent').should('be.visible');
    cy.contains('.planning-backlog .task-card', 'Backlog item').should('exist');
    cy.get('.planning-backlog [data-planning-column]').each($column => {
      expect($column.css('display')).not.to.equal('none');
    });
    cy.contains('[data-planning-lane="SELECTED"]', 'Selected item').should('be.visible');
    cy.get('.planning-open-archive').click();
    cy.contains('.planning-archive-drawer .task-card', 'History').should('be.visible');
    cy.get('[aria-label="Close archive"]').click();
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
    cy.screenshot('projects-four-panel-layout');
  });

  it('keeps source section headers compact and on one line', () => {
    cy.writeTestFileContent(content.replace('### Inbox', '### TOP OF BACKLOG')).then(file => {
      cy.reload(); cy.switchToFile(file.fileName);
    });
    [1800, 1400].forEach(width => {
      cy.viewport(width, 1000);
      cy.get('.planning-backlog .section-header').first().should($header => {
        const header = $header[0];
        const title = header.querySelector('.section-title').getBoundingClientRect();
        const actions = header.querySelector('.section-header-actions').getBoundingClientRect();
        expect(header.getBoundingClientRect().height).to.be.at.most(32);
        expect(Math.abs((title.top + title.bottom) / 2 - (actions.top + actions.bottom) / 2)).to.be.lessThan(1);
        expect(title.right).to.be.at.most(actions.left);
        expect(actions.right).to.be.at.most(header.getBoundingClientRect().right);
        expect(header.scrollWidth).to.be.at.most(header.clientWidth);
      });
      cy.get('.planning-backlog .collapse-expand-link').should('not.be.visible');
      cy.get('.planning-backlog .section-title').first().should('have.attr', 'title', 'TOP OF BACKLOG');
    });
    cy.get('.planning-backlog .section-header').first().screenshot('compact-section-header');
    cy.get('.planning-backlog .caret-toggle-btn').first().click().should('have.class', 'state-focus');
  });

  it('opens the ToC over Backlog without resizing columns or saving data', () => {
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
    cy.get('.planning-layout').then($layout => {
      const bounds = () => ['.planning-backlog', '.planning-split-column', '[data-planning-lane="WIP"]']
        .map(selector => {
          const rect = $layout[0].querySelector(selector).getBoundingClientRect();
          return [rect.left, rect.width];
        });
      const original = bounds();
      cy.get('.planning-toc').trigger('mouseenter');
      cy.get('.planning-outline').should('be.visible').and($nav => {
        expect($nav[0].getBoundingClientRect().width).to.equal(209);
        expect(bounds()).to.deep.equal(original);
      });
      cy.get('.planning-toc .outline-drawer-grip').should('have.attr', 'aria-expanded', 'true');
      cy.get('.planning-toc .outline-drawer-panel').should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, 0)');
      cy.get('.planning-toc .outline-drawer-track').should('have.css', 'overflow', 'hidden');
      cy.screenshot('planning-toc-popover');
      cy.get('.planning-toc').trigger('mouseleave');
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
      cy.get('.planning-toc .outline-drawer-panel').should('have.css', 'transform', 'matrix(1, 0, 0, 1, -190, 0)');
      cy.get('.planning-toc').should($drawer => {
        const edge = $drawer[0].getBoundingClientRect();
        const panel = $drawer[0].querySelector('.outline-drawer-panel').getBoundingClientRect();
        const content = $drawer[0].querySelector('.outline-drawer-content').getBoundingClientRect();
        expect(panel.right - edge.left).to.be.closeTo(44, 1);
        expect(content.right - edge.left).to.be.greaterThan(15);
      });
      cy.get('.planning-toc .outline-drawer-grip').should('be.visible').focus();
      cy.get('.planning-outline').should('be.visible');
      cy.get('.planning-heading-link').first().focus();
      cy.get('.planning-toc').trigger('mouseleave');
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
      cy.get('.planning-toc .outline-drawer-grip').click();
      cy.get('.planning-heading-link').first().focus();
      cy.get('.planning-heading-link').first().type('{esc}');
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
      cy.get('.planning-toc .outline-drawer-grip').should('be.focused').click();
      cy.get('.planning-outline').should('be.visible');
      cy.get('.planning-heading-link').first().click();
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
      cy.get('.planning-toc .outline-drawer-grip').click();
      cy.get('.planning-add-task').focus();
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
      cy.then(() => expect(bounds()).to.deep.equal(original));
    });
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('groups future work by week with whole-week tasks before weekdays and preserves drop precision', () => {
    const groupedSource = content.replace('# ARCHIVE', '* [ ] Later day ! Nov 13 2026\n'
      + '* [ ] Later week ! Nov Week #2 2026\n* [ ] Later month ! Dec 2026\n# ARCHIVE');
    cy.writeTestFileContent(groupedSource).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.planning-schedule-group h3').then($headers => {
      expect([...$headers].map(header => header.textContent.trim())).to.deep.equal([
        'Nov Week #2 2026 2', 'November 2026 1', 'December 2026 1'
      ]);
    });
    cy.get('.planning-schedule [data-schedule-group="week:2026-11-08"]').should('contain', 'Later week');
    cy.get('.planning-schedule [data-schedule-group="week:2026-11-08"] .planning-schedule-title')
      .then($titles => expect([...$titles].map(title => title.textContent.trim()))
        .to.deep.equal(['Later week', 'Later day']));
    cy.get('.planning-schedule [data-schedule-day="2026-11-13"] h4').should('have.text', 'Friday, Nov 13');
    cy.get('.planning-schedule [data-schedule-day="2026-11-13"] h4')
      .should('have.css', 'color', 'rgb(77, 143, 214)');
    cy.get('@save.all').should('have.length', 0);
    const dataTransfer = new DataTransfer();
    cy.contains('.planning-task-row', 'Today task').find('.planning-task-grip').trigger('dragstart', { dataTransfer });
    cy.get('.planning-schedule [data-schedule-day="2026-11-13"]').trigger('drop', { dataTransfer });
    cy.get('.planning-schedule [data-schedule-day="2026-11-13"]').should('contain', 'Today task');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '* [ ] Today task ! Nov 13 2026'));
  });

  it('fits the Projects panel to its contents and scrolls only at the available-height limit', () => {
    const longProject = content.replace('  * [~] Unsupported child stays',
      Array.from({ length: 45 }, (_, index) => `  - [ ] Project step ${index + 1}`).join('\n')
      + '\n  * [~] Unsupported child stays');
    cy.writeTestFileContent(longProject).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.intercept('POST', '**/api/todos').as('save');
    const lane = '[data-planning-lane="PROJECTS"]';
    const assertContentHeight = () => cy.get(lane).should($lane => {
      const element = $lane[0];
      const body = element.querySelector('.planning-lane-body');
      const last = element.querySelector('.planning-project:last-of-type');
      expect(element.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom).to.be.within(8, 20);
      expect(body.scrollHeight).to.be.at.most(body.clientHeight + 1);
      expect(element.getBoundingClientRect().height).to.be.lessThan(250);
    });
    assertContentHeight();
    cy.get('[aria-label="Expand Future initiative"]').click();
    cy.get(lane).should($lane => {
      const element = $lane[0];
      const body = element.querySelector('.planning-lane-body');
      expect(body.scrollHeight).to.be.greaterThan(body.clientHeight);
      expect(element.getBoundingClientRect().bottom)
        .to.be.at.most(element.parentElement.getBoundingClientRect().bottom + 1);
    });
    cy.get('[aria-label="Collapse Future initiative"]').click();
    assertContentHeight();
    cy.viewport(1800, 700);
    assertContentHeight();
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', longProject));
  });

  it('expands project subtasks individually and together without saving disclosure state', () => {
    const expandedSource = content.replace('+ [~] Active parent (retain note) ! Nov 2026',
      '+ [~] Active parent (retain note) ! Nov 2026\n  - [x] Finished child | Nov 1 2026\n  - [~] Undated child');
    cy.writeTestFileContent(expandedSource).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.planning-project-children').should('not.exist');
    cy.get('[aria-label="Expand Future initiative"]').focus().type('{enter}');
    cy.contains('.planning-project-children', 'Dated child').should('be.visible');
    cy.get('.planning-project-children .planning-child-row').should($rows => {
      const row = $rows[0];
      expect(getComputedStyle(row).borderWidth).to.equal('0px');
      expect(row.getBoundingClientRect().height).to.be.at.most(26);
      expect(getComputedStyle(row.querySelector('.planning-child-title')).whiteSpace).to.equal('normal');
    });
    cy.get('.planning-project-children').should('not.contain', 'Unsupported child stays');
    cy.get('[aria-label="Collapse Future initiative"]').should('have.attr', 'aria-expanded', 'true');
    cy.contains('.planning-projects-toggle', 'Expand all').click();
    cy.get('.planning-project-children').should('have.length', 2);
    cy.get('.planning-project-children [aria-label="Done"]').should('be.visible');
    cy.contains('.planning-project-children', 'Undated child').should('be.visible');
    cy.contains('.planning-projects-toggle', 'Collapse all').click();
    cy.get('.planning-project-children').should('not.exist');
    cy.get('[aria-label="Expand Future initiative"]').click();
    cy.get('.planning-project-children [aria-label="Schedule Dated child"]').click();
    cy.contains('.planning-dialog', 'Dated child').should('be.visible');
    cy.get('.planning-dialog [aria-label="Close"]').click();
    cy.contains('.planning-project-children .planning-child-title', 'Dated child').click();
    cy.get('.planning-parent-dialog .task-text-edit').should('have.value', 'Future initiative');
    cy.get('.planning-parent-dialog [aria-label="Close"]').click();
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', expandedSource));
  });

  it('gives titles room and keeps notes and confirmed deletion in an accessible overflow', () => {
    cy.viewport(1512, 900);
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.planning-columns .task-card:visible').each($card => {
      const title = $card[0].querySelector('.task-title');
      expect(title.getBoundingClientRect().width).to.be.greaterThan(100);
      expect($card[0].getBoundingClientRect().height).to.be.lessThan(40);
      expect($card.find('.edit-btn, .notes-btn, .delete-btn, .inline-note-preview')).to.have.length(0);
    });
    cy.contains('.planning-backlog .task-card', 'Backlog item').find('.planning-actions-trigger').click();
    cy.get('.planning-task-actions').should('contain', 'keep note').and('contain', 'TODO › Inbox');
    cy.get('.planning-task-actions .edit-btn').should('be.focused').type('{esc}');
    cy.get('.planning-task-actions').should('not.exist');
    cy.contains('.planning-backlog .task-card', 'Backlog item').find('.planning-actions-trigger')
      .should('be.focused').click();
    cy.get('.planning-task-actions .delete-btn').click();
    cy.get('@save.all').should('have.length', 0);
    cy.contains('.planning-task-actions button', 'Cancel').click();
    cy.get('.planning-task-actions .notes-btn').click();
    cy.get('.note-text-edit').should('have.value', 'keep note');
    cy.get('.cancel-edit-btn').click();
    cy.contains('.planning-backlog .task-card', 'Backlog item').find('.planning-actions-trigger').click();
    cy.get('.planning-task-actions .delete-btn').click();
    cy.get('.planning-task-actions .confirm-delete-btn').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('not.contain', 'Backlog item'));
  });

  it('edits through the Projects index without duplicating or moving the source task', () => {
    cy.contains('[data-planning-lane="PROJECTS"] .task-card', 'Active parent').find('.planning-actions-trigger').click();
    cy.get('.planning-task-actions .edit-btn').click();
    cy.get('.task-text-edit').clear().type('Project renamed');
    cy.get('.edit-actions-row .confirm-edit-btn').click();
    cy.contains('.planning-schedule-title', 'Project renamed').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved.match(/Project renamed/g)).to.have.length(1);
      expect(saved.split('# WIP')[1].split('# ARCHIVE')[0]).to.contain('Project renamed (retain note) ! Nov 2026');
    }));
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('.focus-initiatives').should('have.attr', 'aria-label', 'Projects');
    cy.get('#focus-tab-projects').should('contain', 'Projects').click();
    cy.get('.focus-initiatives').should('be.visible');
  });

  it('scrolls a long backlog without hiding sources, shifting the page or writing data', () => {
    const longContent = content.replace('# PROJECTS', '# BACKLOG').replace('* [ ] Backlog item (keep note)',
      Array.from({ length: 40 }, (_, index) => `* [ ] Backlog item ${index}`).join('\n'))
      .replace('+ [ ] Future initiative', Array.from({ length: 40 }, (_, index) =>
        `* [ ] Research item ${index}`).join('\n') + '\n+ [ ] Future initiative');
    cy.writeTestFileContent(longContent).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('[data-planning-lane="PROJECTS"]').then($selected => {
      const originalTop = $selected[0].getBoundingClientRect().top;
      cy.get('.planning-toc').trigger('mouseenter');
      cy.contains('.planning-section-link', 'Research').click();
      cy.get('.planning-backlog').should($lane => {
        expect($lane[0].scrollTop).to.be.greaterThan(0);
        const lane = $lane[0].getBoundingClientRect();
        const target = $lane[0].querySelector('[data-planning-column="BACKLOG"] .section')
          .getBoundingClientRect();
        expect(Math.abs(target.top - lane.top)).to.be.lessThan(3);
      });
      cy.get('[data-planning-lane="PROJECTS"]').should($column =>
        expect($column[0].getBoundingClientRect().top).to.equal(originalTop));
    });
    cy.get('.planning-backlog [data-planning-column]').each($column =>
      expect($column.css('display')).not.to.equal('none'));
    cy.get('.planning-toc').trigger('mouseenter');
    cy.contains('.planning-heading-link', 'TODO').click();
    cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
    cy.contains('.planning-backlog .task-card', 'Backlog item 0').should('be.visible');
    cy.get('.planning-backlog').should($lane => expect($lane[0].scrollTop).to.equal(0));
    cy.contains('[data-planning-lane="SELECTED"]', 'Selected item').should('be.visible');
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', longContent));
  });

  it('resizes SELECTED and PROJECTS with the divider without saving tasks', () => {
    const longSelected = content.replace('* [ ] Paper commitment', Array.from({ length: 35 }, (_, index) =>
      `* [ ] Selected task ${index}`).join('\n'));
    cy.writeTestFileContent(longSelected).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.intercept('POST', '**/api/todos').as('save');
    const assertSplit = share => cy.get('.planning-split-column').should($column => {
      const rows = getComputedStyle($column[0]).gridTemplateRows.split(' ').map(parseFloat);
      expect(rows[0] / (rows[0] + rows[2])).to.be.closeTo(share, 0.01);
      const selected = $column[0].querySelector('.planning-selected').getBoundingClientRect();
      const project = $column[0].querySelector('.projects-stack').getBoundingClientRect();
      const handle = $column[0].querySelector('.planning-split-handle').getBoundingClientRect();
      const grip = $column[0].querySelector('.planning-split-handle span');
      expect(getComputedStyle(grip).borderTopWidth).to.equal('1px');
      expect(getComputedStyle($column[0].querySelector('.planning-selected')).borderBottomWidth).to.equal('1px');
      expect(handle.height).to.equal(18);
      expect(handle.top).to.be.greaterThan(selected.bottom);
      expect(handle.bottom).to.be.lessThan(project.top);
      expect(selected.left).to.equal(project.left);
      expect(selected.width).to.equal(project.width);
      expect(project.top).to.be.greaterThan(selected.bottom);
    });
    assertSplit(2 / 3);
    cy.get('.planning-split-handle').dblclick();
    assertSplit(0.2);
    cy.get('.planning-split-handle').dblclick();
    assertSplit(0.8);
    cy.get('.planning-split-handle').dblclick();
    assertSplit(0.2);
    cy.get('.planning-split-handle').then($handle => {
      const element = $handle[0];
      const column = element.parentElement;
      const available = column.clientHeight - element.offsetHeight - 2 * parseFloat(getComputedStyle(column).rowGap);
      const y = element.getBoundingClientRect().top + 6;
      // Synthetic pointer events do not register an active native pointer for capture.
      cy.stub(element, 'setPointerCapture').as('capture');
      cy.wrap($handle).trigger('pointerdown', { pointerId: 1, button: 0, clientY: y });
      cy.wrap($handle).trigger('pointermove', { pointerId: 1, clientY: y + available * (1 / 3 - 0.2) });
      cy.wrap($handle).trigger('pointerup', { pointerId: 1 });
    });
    cy.get('@capture').should('have.been.calledWith', 1);
    assertSplit(1 / 3);
    cy.viewport(1400, 700);
    assertSplit(1 / 3);
    cy.get('.planning-split-handle').focus().type('{home}{uparrow}');
    assertSplit(0.2);
    cy.get('.planning-split-handle').type('{end}{downarrow}');
    assertSplit(0.8);
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', longSelected));
  });

  it('keeps the divider directly below short SELECTED content even at the maximum split', () => {
    cy.intercept('POST', '**/api/todos').as('save');
    const assertNoGap = () => cy.get('.planning-selected').should($pane => {
      const pane = $pane[0];
      const content = pane.querySelector('.selected-stack:last-child');
      expect(pane.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom).to.be.within(0, 3);
      const handle = pane.parentElement.querySelector('.planning-split-handle').getBoundingClientRect();
      expect(handle.top - pane.getBoundingClientRect().bottom).to.be.closeTo(3, 1);
    });
    assertNoGap();
    cy.get('.planning-split-handle').focus().type('{end}');
    assertNoGap();
    cy.viewport(1400, 1200);
    assertNoGap();
    cy.get('.planning-selected .column-caret-btn').click();
    assertNoGap();
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('adds to the chosen source section and cancels without writing a blank task', () => {
    cy.get('.planning-add-task').click();
    cy.get('[aria-label="Task title"]').type('Cancelled task');
    cy.contains('.planning-add-dialog button', 'Cancel').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
    cy.get('.planning-add-task').click();
    cy.get('[aria-label="Task section"]').select('Research');
    cy.get('[aria-label="Task title"]').type('New research task{enter}');
    cy.contains('[data-planning-lane="PROJECTS"] .task-card', 'New research task').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved.split('# PROJECTS')[1].split('# SELECTED')[0]).to.contain('* [ ] New research task');
      expect(saved).not.to.contain('Cancelled task');
      expect(saved).to.contain('  * [~] Unsupported child stays');
    }));
  });

  it('reschedules WIP with precise dates and preserves attached child data', () => {
    cy.contains('.planning-schedule-title', 'Active parent').click();
    cy.get('.planning-parent-dialog .task-text-edit').should('have.value', 'Active parent');
    cy.get('.planning-parent-dialog [aria-label="Close"]').click();
    cy.contains('[data-planning-lane="PROJECTS"] .task-card', 'Active parent').find('.clock-btn').click();
    cy.contains('.planning-date-popover .shortcuts button', /^Today$/).click();
    cy.contains('[data-schedule-group="today"] .task-card', 'Active parent').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved.split('# WIP')[1].split('# ARCHIVE')[0]).to.contain('### Nov Week #1 2026');
      expect(saved).to.contain('+ [~] Active parent (retain note) ! Nov 2 2026');
      expect(saved).to.contain('  * [~] Unsupported child stays');
    }));
    cy.contains('[data-schedule-group="today"] .task-card', 'Active parent').find('.clock-btn').click();
    cy.contains('.planning-dialog button', 'Clear date').click();
    cy.contains('.planning-backlog .task-card', 'Active parent').should('be.visible');
  });

  it('preserves status debounce and records completion before regrouping', () => {
    cy.contains('[data-schedule-group="today"] .task-card', 'Today task').find('.custom-checkbox').click();
    cy.contains('[data-schedule-group="today"] .task-card', 'Today task').should('exist');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '* [x] Today task | Nov 2 2026'));
    cy.get('.planning-completed [data-completion-day="2026-11-02"]').should('be.visible');
    cy.contains('.planning-completed .task-card', 'Today task').should('be.visible');
    cy.get('.planning-archive').should('not.exist');
  });

  for (const destination of ['Focus', 'Archive']) it(`retains completion when opening ${destination} during debounce`, () => {
    cy.contains('[data-schedule-group="today"] .task-card', 'Today task').find('.custom-checkbox').click();
    if (destination === 'Archive') cy.get('.planning-open-archive').click();
    else cy.contains('.view-mode-btn', destination).click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '* [x] Today task | Nov 2 2026'));
    if (destination === 'Archive') cy.get('[aria-label="Close archive"]').click();
    else cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('.planning-completed [data-completion-day="2026-11-02"]').should('be.visible');
    cy.contains('.planning-completed .task-card', 'Today task').should('be.visible');
  });

  it('drags tasks and subtasks between exact days, weeks and future dates while retaining parent data', () => {
    const source = '# WIP\n### Work\n* [~] Today task ! Nov 2 2026\n'
      + '* [ ] Tuesday task ! Nov 3 2026\n* [ ] Wednesday task ! Nov 4 2026\n'
      + '* [ ] Weekly task ! Nov Week #1 2026\n+ [~] Parent (keep note) ! Nov 2026\n'
      + '  - [ ] Child (hidden note) ! Nov 2 2026\n  * [~] Unsupported child stays\n';
    cy.writeTestFileContent(source).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
    });
    const drag = (title, target) => {
      const dataTransfer = new DataTransfer();
      cy.contains('.planning-scheduled .planning-task-row', title)
        .find('.planning-task-grip').trigger('dragstart', { dataTransfer });
      cy.get(target).trigger('dragover', { dataTransfer }).trigger('drop', { dataTransfer });
    };
    drag('Today task', '[data-schedule-day="2026-11-03"] h4');
    cy.contains('[data-schedule-day="2026-11-03"] .task-card', 'Today task').should('be.visible');
    drag('Child', '[data-schedule-day="2026-11-04"] h4');
    cy.contains('[data-schedule-day="2026-11-04"] .planning-child-title', 'Child').should('be.visible');
    drag('Child', '[data-schedule-day="week:2026-11-01"] h4');
    cy.contains('[data-schedule-day="week:2026-11-01"] .planning-child-title', 'Child').should('be.visible');
    drag('Child', '[data-schedule-group="month:2026-11"] h3');
    cy.contains('.planning-schedule-title', 'Child').should('be.visible');
    const dataTransfer = new DataTransfer();
    cy.contains('.planning-schedule-title', 'Child').trigger('dragstart', { dataTransfer });
    cy.get('[data-schedule-group="today"]').trigger('drop', { dataTransfer });
    cy.contains('[data-schedule-group="today"] .planning-child-title', 'Child').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved).to.contain('* [~] Today task ! Nov 3 2026');
      expect(saved).to.contain('+ [~] Parent (keep note) ! Nov 2026\n'
        + '  - [ ] Child (hidden note) ! Nov 2 2026\n  * [~] Unsupported child stays');
    }));
  });

  it('edits dates beside the badge and saves a selected day without another Save button', () => {
    cy.intercept('POST', '**/api/todos').as('save');
    cy.contains('[data-schedule-group="today"] .task-card', 'Today task').find('.clock-btn').click();
    cy.get('.planning-date-popover').should('be.visible').and($picker => {
      const rect = $picker[0].getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(1800);
      expect(rect.bottom).to.be.at.most(1000);
    });
    cy.contains('.planning-date-popover .custom-date button', 'week').click();
    cy.get('@save.all').should('have.length', 0);
    cy.contains('.planning-date-popover .custom-date button', 'day').click();
    cy.get('[aria-label="Task due day"]').type('2026-11-05').trigger('change');
    cy.get('.planning-date-popover').should('not.exist');
    cy.contains('[data-schedule-day="2026-11-05"] .task-card', 'Today task').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '* [ ] Today task ! Nov 5 2026'));
    cy.contains('.planning-schedule-entry', 'Active parent').find('.planning-schedule-date').focus().click();
    cy.contains('.planning-date-popover .shortcuts button', /^Tomorrow$/).click();
    cy.contains('[data-schedule-day="2026-11-03"] .task-card', 'Active parent').should('be.visible');
  });

  it('shows completed and will-not-do cards expanded under completion-day headings', () => {
    const source = '# WIP\n### Work\n* [x] Older task | Nov 1 2026\n'
      + '* [-] Cancelled task | Nov 2 2026\n* [x] Finished task | Nov 2 2026\n* [x] No date\n';
    cy.writeTestFileContent(source).then(file => {
      cy.reload(); cy.switchToFile(file.fileName);
      cy.get('.planning-completed [data-completion-day]').then($groups => {
        expect([...$groups].map(group => group.dataset.completionDay))
          .to.deep.equal(['2026-11-02', '2026-11-01', 'undated']);
      });
      cy.contains('[data-completion-day="2026-11-02"] h4', 'Monday, Nov 2, 2026').should('be.visible');
      cy.get('[data-completion-day="2026-11-02"] .task-card').should('have.length', 2).and('be.visible');
      cy.contains('[data-completion-day="2026-11-01"] .task-card', 'Older task').should('be.visible');
      cy.contains('[data-completion-day="undated"] h4', 'No completion date').should('be.visible');
      cy.readFile(file.filePath).should('equal', source);
    });
  });

  it('supports rescheduling by dragging within WIP without changing status', () => {
    const dataTransfer = new DataTransfer();
    cy.contains('.planning-task-row', 'Today task').find('.planning-task-grip').trigger('dragstart', { dataTransfer });
    cy.get('[data-planning-lane="WIP"] [data-schedule-group="week"]').trigger('drop', { dataTransfer });
    cy.contains('[data-schedule-group="week"] .task-card', 'Today task').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath)
      .should('contain', '* [ ] Today task ! Nov Week #1 2026'));
  });

  it('edits SELECTED in its original section, retains context menus and compact rows', () => {
    cy.contains('[data-planning-lane="SELECTED"] .task-title', 'Selected item').click();
    cy.get('.task-text-edit').clear().type('Selected item revised');
    cy.get('.edit-actions-row .confirm-edit-btn').click();
    cy.contains('[data-planning-lane="SELECTED"] .task-card', 'Selected item revised').rightclick();
    cy.get('.context-menu').should('be.visible');
    cy.get('body').type('{esc}');
    for (const width of [1800, 1280, 768]) {
      cy.viewport(width, 1000);
      cy.get('.planning-workspace').should($workspace => {
        const rect = $workspace[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0); expect(rect.right).to.be.at.most(width);
        expect($workspace[0].scrollWidth).to.be.at.most($workspace[0].clientWidth + 1);
      });
    }
    cy.viewport(1800, 1000);
    cy.get('.planning-columns .task-card:visible').each($card => {
      expect($card[0].getBoundingClientRect().height).to.be.lessThan(40);
    });
  });

  it('opens titles directly in Backlog, Projects and WIP without losing metadata or selecting cards', () => {
    const cases = [
      ['.planning-backlog', 'Backlog item', '* [ ] Backlog item revised (keep note)'],
      ['[data-planning-lane="PROJECTS"]', 'Future initiative', '+ [ ] Future initiative revised'],
      ['[data-planning-lane="WIP"]', 'Today task', '* [ ] Today task revised ! Nov 2 2026']
    ];
    for (const [lane, title, sourceLine] of cases) {
      cy.contains(`${lane} .task-title`, title).click();
      cy.get(`${lane} .task-text-edit`).should('be.focused').clear().type(`${title} revised`);
      cy.get(`${lane} .edit-actions-row .confirm-edit-btn`).click();
      cy.contains(`${lane} .task-card`, `${title} revised`).should('not.have.class', 'selected');
      cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', sourceLine));
    }
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '  * [~] Unsupported child stays'));
  });
});
