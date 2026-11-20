describe('Unified planning workspace', () => {
  const source = '# TODO\n## Inbox\n- [ ] Optional backlog\n* [ ] Backlog task (keep note)\n'
    + Array.from({ length: 35 }, (_, index) => `* [ ] Backlog ${index}\n`).join('')
    + '## Household\n* [ ] Garden plan\n# SELECTED\n'
    + '+ [~] House project\n  - [ ] Child this week ! Nov 4 2026\n'
    + '  - [ ] Child next week ! Nov 9 2026\n  - [ ] Undated child\n'
    + '- [ ] Optional ready\n* [ ] Ready task\n# WIP\n- [ ] Optional today ! Nov 2 2026\n'
    + '* [ ] Today task ! Nov 2 2026\n'
    + '* [ ] Whole week ! Nov Week #1 2026\n* [ ] Next week ! Nov Week #2 2026\n'
    + '* [ ] Friday task ! Nov 13 2026\n- [ ] Optional December ! Dec 2026\n'
    + '* [ ] December task ! Dec 2026\n'
    + '* [x] Finished | Nov 1 2026\n# ARCHIVE\n## Old\n* [x] Historical | Oct 1 2026\n';

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.clock(new Date(2026, 10, 2, 12).getTime(), ['Date']);
    cy.writeTestFileContent(source).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
      cy.get('.planning-workspace').should('be.visible');
      // Native pointer position survives between tests; keep it off the hover-open drawer.
      cy.get('#planning-scheduled-title').realHover();
      cy.get('.planning-toc .outline-drawer-panel').then($panel => {
        if ($panel.hasClass('is-open')) cy.get('[aria-label="Close backlog"]').click();
      });
    });
    cy.intercept('POST', '**/api/todos').as('save');
    // Keep synthetic click timestamps later than Vue's initial listener attachment time.
    cy.tick(1);
  });

  it('shows Projects, Tasks and three schedule columns without changing the file', () => {
    cy.get('.planning-commitment-title').should('have.text', 'SELECTED');
    cy.get('.planning-selected .column-title-container').should('contain', 'TASKS');
    cy.get('.planning-selected').should('contain', 'Ready task').and('not.contain', 'House project');
    cy.get('.planning-columns > section').should($columns => {
      expect([...$columns].map(column => column.dataset.planningLane))
        .to.deep.equal(['PROJECTS', 'SELECTED', 'WIP', 'WIP-MONTH', 'WIP-AFTER']);
      const [projects, tasks, schedule, month, after] = [...$columns].map(column => column.getBoundingClientRect());
      expect(projects.top).to.equal(tasks.top);
      expect(tasks.top).to.equal(schedule.top);
      expect(projects.right).to.be.lessThan(tasks.left);
      expect(tasks.right).to.be.lessThan(schedule.left);
      expect(schedule.right).to.be.closeTo(month.left, 1);
      expect(month.right).to.be.closeTo(after.left, 1);
      expect(month.top).to.equal(schedule.top);
      expect(after.top).to.equal(schedule.top);
      expect(after.right).to.be.at.most(1800);
    });
    cy.get('.planning-split-handle').should('not.exist');
    cy.get('#planning-scheduled-title').should('have.text', 'SCHEDULED');
    cy.get('.planning-scheduled > .planning-lane-header').should('have.length', 3);
    cy.get('[data-planning-lane="WIP"]').should('contain', 'Today task').and('not.contain', 'Next week');
    cy.get('[data-planning-lane="WIP-MONTH"]').should('contain', 'Next week').and('not.contain', 'December task');
    cy.get('[data-planning-lane="WIP-AFTER"]').should('contain', 'December task').and('not.contain', 'Next week');
    cy.get('[data-schedule-group="week:2026-11-08"] .planning-task-row').should('have.length', 3);
    cy.get('[data-schedule-group="week:2026-11-08"] h4').then($headings =>
      expect([...$headings].map(heading => heading.textContent)).to.deep.equal(['Monday, Nov 9', 'Friday, Nov 13']));
    cy.contains('[data-schedule-group="month:2026-12"] .task-card', 'December task').should('exist');
    cy.get('[data-completion-day="2026-11-01"]').should('contain', 'Finished');
    cy.get('.projects-stack .task-title').click();
    cy.get('.planning-project-children').should('contain', 'Child next week').and('contain', 'Undated child');
    cy.get('.planning-open-archive').click();
    cy.get('.planning-archive-drawer').should('contain', 'Historical');
    cy.get('[aria-label="Close archive"]').click();
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', source));
  });

  it('slides the entire backlog and ToC over stable columns and keeps navigation read-only', () => {
    cy.get('.outline-drawer-edge-label').should('have.text', 'BACKLOG')
      .and('have.css', 'writing-mode', 'vertical-rl').and('be.visible');
    cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
    cy.get('.planning-columns').then($columns => {
      const original = $columns[0].getBoundingClientRect();
      cy.get('.outline-drawer-grip').realHover({ scrollBehavior: false });
      cy.get('.planning-toc .outline-drawer-panel').should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, 0)');
      cy.get('.planning-columns').should('have.css', 'isolation', 'isolate');
      cy.get('.planning-selected .task-card').first().then($card => {
        // Emulate the raised card layer used by hover/fanned stacks behind the drawer.
        $card[0].style.zIndex = '1000';
        const card = $card[0].getBoundingClientRect();
        const hit = $card[0].ownerDocument.elementFromPoint(card.left + 8, card.top + 8);
        expect(hit.closest('.planning-toc')).not.to.equal(null);
        $card[0].style.removeProperty('z-index');
      });
      cy.contains('.planning-backlog .task-card', 'Backlog task').should('be.visible');
      cy.contains('.planning-section-link', 'Household').click();
      cy.contains('.planning-backlog .task-card', 'Garden plan').should('be.visible');
      cy.get('.planning-backlog').should($pane => expect($pane[0].scrollTop).to.be.greaterThan(0));
      cy.get('.planning-toc').trigger('mouseleave');
      cy.get('.planning-toc .outline-drawer-content').should('not.have.attr', 'inert');
      cy.get('[aria-label="Close backlog"]').click();
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
      cy.get('.planning-columns').should($current => {
        const current = $current[0].getBoundingClientRect();
        expect([current.left, current.width]).to.deep.equal([original.left, original.width]);
      });
      cy.get('.planning-toc').should($drawer => {
        const edge = $drawer[0].getBoundingClientRect();
        const panel = $drawer[0].querySelector('.outline-drawer-panel').getBoundingClientRect();
        expect(panel.right - edge.left).to.be.closeTo(44, 1);
      });
      cy.get('.outline-drawer-grip').focus();
      cy.get('.planning-heading-link').first().focus().type('{esc}');
      cy.get('.outline-drawer-grip').should('be.focused');
      cy.get('.planning-toc .outline-drawer-content').should('have.attr', 'inert');
    });
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', source));
  });

  it('widens one schedule column at a time and retains clock-only date editing', () => {
    const lane = id => `[data-planning-lane="${id}"]`;
    const checkActive = id => {
      cy.get('.planning-scheduled.is-active').should('have.length', 1).and('have.attr', 'data-planning-lane', id);
      cy.get('.planning-scheduled').should($lanes => {
        const selected = [...$lanes].find(el => el.dataset.planningLane === id);
        for (const other of [...$lanes].filter(el => el !== selected)) {
          expect(selected.getBoundingClientRect().width).to.be.greaterThan(other.getBoundingClientRect().width * 1.15);
          expect(getComputedStyle(other.querySelector('.planning-lane-body')).opacity).to.equal('0.72');
        }
        const heights = [...$lanes].map(el => el.querySelector('.planning-lane-header').getBoundingClientRect().height);
        expect(heights).to.deep.equal([32, 32, 32]);
      });
    };
    checkActive('WIP');
    cy.get('[data-planning-lane="WIP-MONTH"] .planning-task-grip').should('not.be.visible');
    cy.get('[data-planning-lane="WIP-AFTER"] .task-buttons-container').should('not.be.visible');
    cy.get('[data-planning-lane="WIP-AFTER"] .task-title').first()
      .should('have.css', 'white-space', 'nowrap').and('have.css', 'text-overflow', 'ellipsis');
    cy.get(`${lane('WIP-MONTH')} .planning-lane-activate`).click();
    checkActive('WIP-MONTH');
    cy.get('[data-planning-lane="WIP-MONTH"] .planning-task-grip').first().should('be.visible');
    cy.get('.planning-scheduled .clock-btn, .planning-scheduled .planning-child-date').each($button => {
      expect($button.text().trim()).to.equal('◷');
      expect($button.attr('title')).to.be.a('string').and.not.be.empty;
    });
    cy.get(`${lane('WIP-AFTER')} .planning-lane-activate`).focus().type('{enter}');
    checkActive('WIP-AFTER');
    cy.contains(`${lane('WIP-AFTER')} .task-card`, 'December task').find('.clock-btn').click();
    cy.get('.planning-date-popover').should('be.visible');
    cy.get('[aria-label="Close"]').click();
    cy.viewport(1440, 800);
    checkActive('WIP-AFTER');
    cy.get('.planning-layout').should('have.css', 'transition-property', 'grid-template-columns');
    cy.get(`${lane('WIP-AFTER')}`).should($lane =>
      expect($lane[0].getBoundingClientRect().right).to.be.at.most(1440));
    cy.screenshot('plan-schedule-active-after', { capture: 'viewport' });
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', source));
  });

  it('edits backlog and Tasks titles while retaining their paper headings and metadata', () => {
    cy.get('.outline-drawer-grip').realHover({ scrollBehavior: false });
    cy.get('.planning-toc .outline-drawer-panel').should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, 0)');
    cy.contains('.planning-backlog .task-title', 'Backlog task').click({ scrollBehavior: false });
    cy.get('.planning-backlog .task-text-edit').clear().type('Revised backlog');
    cy.get('.planning-backlog .confirm-edit-btn').click();
    cy.get('[aria-label="Close backlog"]').click();
    cy.contains('.planning-selected .task-title', 'Ready task').click();
    cy.get('.planning-selected .task-text-edit').clear().type('Revised ready');
    cy.get('.planning-selected .confirm-edit-btn').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved).to.contain('* [ ] Revised backlog (keep note)');
      expect(saved).to.contain('# SELECTED');
      expect(saved).to.contain('* [ ] Revised ready');
      expect(saved).not.to.contain('# TASKS');
      expect(saved).to.contain('  - [ ] Child next week ! Nov 9 2026');
    }));
  });

  it('reschedules future tasks and attached children using the same cards and exact date targets', () => {
    const drag = (title, target) => {
      const dataTransfer = new DataTransfer();
      cy.contains('.planning-scheduled .planning-task-row', title).closest('.planning-scheduled')
        .find('.planning-lane-activate').click();
      cy.contains('.planning-scheduled .planning-task-row', title).scrollIntoView();
      cy.contains('.planning-scheduled .planning-task-row', title)
        .find('.planning-task-grip').trigger('dragstart', { dataTransfer });
      cy.get(target).scrollIntoView().trigger('drop', { dataTransfer });
      cy.wait('@save');
    };
    drag('Today task', '[data-schedule-day="2026-11-13"] h4');
    drag('Child next week', '[data-schedule-group="today"] h3');
    cy.contains('[data-schedule-day="2026-11-13"] .task-card', 'Today task').should('exist');
    cy.contains('[data-schedule-group="today"] .planning-child-title', 'Child next week').should('exist');
    cy.contains('[data-schedule-group="month:2026-12"] .task-card', 'December task').scrollIntoView();
    cy.get('[data-planning-lane="WIP-AFTER"] .planning-lane-activate').click();
    cy.contains('[data-schedule-group="month:2026-12"] .task-card', 'December task').find('.clock-btn').click();
    cy.contains('.planning-date-popover .shortcuts button', /^Today$/).click();
    cy.contains('[data-schedule-group="today"] .task-card', 'December task').should('exist');
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved).to.contain('* [ ] Today task ! Nov 13 2026');
      expect(saved).to.contain('* [ ] December task ! Nov 2 2026');
      expect(saved).to.contain('+ [~] House project\n  - [ ] Child this week ! Nov 4 2026\n'
        + '  - [ ] Child next week ! Nov 2 2026\n  - [ ] Undated child');
    }));
  });

  it('keeps LOW PRIO below main cards in source sections and every scheduled date without saving the grouping', () => {
    cy.get('.outline-drawer-grip').realHover({ scrollBehavior: false });
    cy.get('.planning-toc .outline-drawer-panel').should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, 0)');
    cy.get('.planning-backlog .planning-low-priority-heading').should('contain', 'LOW PRIO');
    cy.get('.planning-backlog .task-title').first().should('contain', 'Backlog task');
    cy.get('[aria-label="Close backlog"]').click();
    cy.get('.planning-selected .planning-low-priority-heading').should('contain', 'LOW PRIO');
    cy.get('.planning-selected .task-title').then($titles =>
      expect([...$titles].map(title => title.textContent.trim())).to.deep.equal(['Ready task', 'Optional ready']));
    for (const period of ['today', 'month:2026-12']) {
      cy.get(`[data-schedule-group="${period}"] .planning-low-priority-heading`).should('contain', 'LOW PRIO');
      cy.get(`[data-schedule-group="${period}"] .planning-task-row`).last().should('contain', 'Optional');
    }
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', source));
  });

  it('groups projects above tasks and low priority in each schedule column without saving', () => {
    const content = '# SELECTED\n' + ['Nov 2 2026', 'Nov 2026', 'Dec 2026'].map((date, index) =>
      `* [ ] Regular ${index} ! ${date}\n- [ ] Optional ${index} ! ${date}\n`
      + `+ [ ] Project ${index} ! ${date}\n  - [ ] Child ${index} ! ${date}\n`).join('');
    cy.writeTestFileContent(content).then(file => {
      cy.reload(); cy.switchToFile(file.fileName);
      ['WIP', 'WIP-MONTH', 'WIP-AFTER'].forEach((lane, index) => {
        cy.get(`[data-planning-lane="${lane}"] .planning-task-row`).should($rows =>
          expect([...$rows].map(row => row.querySelector('.task-title, .planning-child-title').textContent.trim()))
            .to.deep.equal([`Project ${index}`, `Regular ${index}`, `Child ${index}`, `Optional ${index}`]));
        cy.get(`[data-planning-lane="${lane}"] [data-entry-group]`).should($headings =>
          expect([...$headings].map(heading => heading.dataset.entryGroup)).to.deep.equal(['projects', 'low']));
        cy.get(`[data-planning-lane="${lane}"] .planning-lane-body > section`).first()
          .should('have.class', 'planning-scheduled-projects');
        cy.get(`[data-planning-lane="${lane}"] .planning-date-group`).should('not.contain', `Project ${index}`);
      });
      cy.get('@save.all').should('have.length', 0);
      cy.readFile(file.filePath).should('equal', content);
    });
  });

  it('expands project titles, edits on the next click and changes subtask statuses immediately', () => {
    cy.get('.planning-project-caret').should('not.exist');
    cy.get('.projects-stack .task-title').click();
    cy.get('.planning-project-children').should('be.visible');
    cy.get('.projects-stack .task-text-edit').should('not.exist');
    cy.get('.projects-stack .task-title').click();
    cy.get('.projects-stack .task-text-edit').should('be.focused').clear().type('House project revised');
    cy.get('.projects-stack .edit-actions-row .confirm-edit-btn').click();
    cy.contains('.planning-project-children .planning-child-row', 'Child next week')
      .find('.planning-child-status').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('contain', '  - [x] Child next week | Nov 2 2026'));
    cy.get('.planning-project-close').click();
    cy.get('.planning-project-children').should('not.exist');
    cy.get('.planning-projects-sort').should('not.exist');
    cy.get('.projects-stack .task-title').should('contain', 'House project revised');
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved).to.contain('+ [~] House project revised');
      expect(saved).to.contain('  - [ ] Undated child');
    }));
  });

  it('reorders from the dot handle in both directions and retains order after reload', () => {
    const projects = '# SELECTED\n+ [ ] Quarter\n  - [x] One\n  - [ ] Two\n  - [ ] Three\n  - [ ] Four\n'
      + '+ [ ] Nearly done\n  - [x] One\n  - [x] Two\n  - [x] Three\n  - [ ] Four\n'
      + '+ [ ] Half later ! Dec 2026\n  - [x] One\n  - [ ] Two\n'
      + '+ [ ] Half sooner ! Nov 2026\n  - [x] One\n  - [ ] Two\n';
    cy.writeTestFileContent(projects).then(file => {
      cy.reload(); cy.switchToFile(file.fileName);
      cy.get('.projects-stack .task-title').first().should('have.text', 'Quarter');
      const project = title => cy.contains('.planning-project', title);
      const order = expected => cy.get('.projects-stack .task-title').should($titles =>
        expect([...$titles].map(title => title.textContent.trim())).to.deep.equal(expected));
      const drag = (source, target, after = false) => cy.window().then(win => {
        const dataTransfer = new win.DataTransfer();
        project(source).find('.planning-task-grip').trigger('dragstart', { dataTransfer });
        project(target).then($target => {
          const bounds = $target[0].getBoundingClientRect();
          const clientY = after ? bounds.bottom - 2 : bounds.top + 2;
          cy.wrap($target).trigger('dragover', { dataTransfer, clientY })
            .trigger('drop', { dataTransfer, clientY });
        });
      });
      drag('Half sooner', 'Quarter');
      order(['Half sooner', 'Quarter', 'Nearly done', 'Half later']);
      cy.readFile(file.filePath).should(saved => {
        expect(saved.indexOf('+ [ ] Half sooner')).to.be.lessThan(saved.indexOf('+ [ ] Quarter'));
        expect(saved).to.contain('+ [ ] Quarter\n  - [x] One\n  - [ ] Two\n  - [ ] Three\n  - [ ] Four');
      });
      cy.reload(); cy.switchToFile(file.fileName);
      order(['Half sooner', 'Quarter', 'Nearly done', 'Half later']);
      drag('Half sooner', 'Half later', true);
      order(['Quarter', 'Nearly done', 'Half later', 'Half sooner']);
      cy.readFile(file.filePath).should(saved =>
        expect(saved.indexOf('+ [ ] Half sooner')).to.be.greaterThan(saved.indexOf('+ [ ] Half later')));
    });
  });
});
