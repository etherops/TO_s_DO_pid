describe('Plan archive week previews', () => {
  const content = '# SELECTED\n### Ready\n* [x] Leave selected | Oct 14 2026\n'
    + '# WIP\n### Work\n+ [x] Finished parent (keep note) | Oct 14 2026\n'
    + '  - [ ] Preserve child ! Nov 2 2026\n  * [~] Unsupported child\n'
    + '* [~] Still working\n* [x] Second week | Oct 21 2026\n'
    + '### Other\n* [-] Cancelled task | Oct 15 2026\n* [x] Third week | Oct 28 2026\n'
    + '* [x] Undated work\n# ARCHIVE\n### Oct Week #3 2026\n* [x] Existing | Oct 12 2026\n';

  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.clock(new Date(2026, 10, 1, 12).getTime(), ['Date']);
    cy.writeTestFileContent(content).then(file => {
      cy.wrap(file).as('file');
      cy.reload();
      cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', 'Plan').click();
    });
  });

  it('previews without writing, archives one closed week and survives reload without losing children', () => {
    cy.intercept('POST', '/api/todos').as('save');
    cy.get('.planning-scheduled .planning-archive-week').should('have.length', 3);
    cy.get('.planning-scheduled .planning-lane-body > .planning-archive-week').should('have.length', 3);
    cy.get('[data-planning-lane="WIP"]').then($column => {
      const column = $column[0];
      const header = column.querySelector('.planning-lane-header').getBoundingClientRect();
      const weeks = column.querySelectorAll('.planning-archive-week');
      const sourceSections = column.querySelector('.planning-date-group').getBoundingClientRect();
      expect(weeks[0].getBoundingClientRect().top).to.be.at.least(header.bottom);
      expect(weeks[weeks.length - 1].getBoundingClientRect().bottom).to.be.at.most(sourceSections.top);
    });
    cy.contains('.planning-archive-week', 'Oct Week #3 2026').within(() => {
      cy.contains('li', 'Finished parent').should('be.visible');
      cy.contains('li', 'Cancelled task').should('be.visible');
    });
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
    cy.contains('.planning-archive-week', 'Oct Week #3 2026').find('.archive-week-action').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('.archive-destination-summary').should('contain', 'No new week section will be created');
    cy.get('@save.all').should('have.length', 0);
    cy.get('.btn-cancel').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
    cy.contains('.planning-archive-week', 'Oct Week #3 2026').find('.archive-week-action').click();
    cy.get('.btn-confirm').click();
    cy.wait('@save');
    cy.get('.planning-archive-week').should('have.length', 2);
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      const wip = saved.split('# WIP')[1].split('# ARCHIVE')[0];
      expect(wip).not.to.contain('Finished parent');
      expect(wip).not.to.contain('Cancelled task');
      for (const title of ['Still working', 'Second week', 'Third week', 'Undated work']) {
        expect(wip).to.contain(title);
      }
      expect(saved).to.contain('+ [x] Finished parent (keep note) | Oct 14 2026\n'
        + '  - [ ] Preserve child ! Nov 2 2026\n  * [~] Unsupported child');
      expect(saved.match(/### Oct Week #3 2026/g)).to.have.length(1);
      expect(saved.split('# SELECTED')[1].split('# WIP')[0]).not.to.contain('Leave selected');
      expect(saved.split('# ARCHIVE')[1]).to.contain('Leave selected');
    }));
    cy.reload();
    cy.get('.planning-archive-week').should('have.length', 2);
    cy.get('[data-planning-lane="WIP"]').screenshot('plan-archive-weeks');
    for (const width of [1800, 1280, 768]) {
      cy.viewport(width, 1000);
      cy.get('.archive-week-action').each($button => {
        const rect = $button[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(width);
      });
    }
  });

  it('confirms merging legacy misspellings and duplicates without losing archived content', () => {
    const input = '# WIP\n### Work\n* [-] Incoming | Aug 6 2026\n'
      + '# ARCHIVE\n### Aug Week #1 2026\n* [-] Already moved | Aug 6 2026\n'
      + '### Aug Wek #1\n+ [x] Original parent | Aug 7 2026\n  - [x] Child | Aug 5 2026\n'
      + '  * Unsupported child\n* [x] Spillover | Aug 11 2026\n';
    cy.get('@file').then(file => {
      cy.writeFile(file.filePath, input); cy.reload(); cy.switchToFile(file.fileName);
    });
    cy.contains('.planning-archive-week', 'Aug Week #1 2026').find('.archive-week-action').click();
    cy.get('.archive-duplicate-warning').should('contain', 'Merge 2 matching week sections');
    cy.get('.btn-cancel').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', input));
    cy.contains('.planning-archive-week', 'Aug Week #1 2026').find('.archive-week-action').click();
    cy.get('.btn-confirm').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should(saved => {
      expect(saved.match(/### Aug/g)).to.have.length(1);
      for (const title of ['Incoming', 'Already moved', 'Original parent', 'Spillover', '  * Unsupported child']) {
        expect(saved).to.contain(title);
      }
      expect(saved).to.contain('  - [x] Child | Aug 5 2026');
    }));
    cy.reload();
    cy.get('.planning-archive-week').should('not.exist');
  });

  it('leaves undated completions out of ready-to-archive while keeping them accessible', () => {
    cy.contains('.planning-archive-week', 'Nov Week #1 2026').should('not.exist');
    cy.get('.planning-archive-week').should('not.contain', 'Undated work');
    cy.get('.planning-completed').should('be.visible');
    cy.contains('.planning-completed .task-card', 'Undated work').should('be.visible');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('opens archived tasks directly even when the saved week was hidden, without saving', () => {
    cy.intercept('POST', '/api/todos').as('save');
    cy.window().then(win => win.localStorage.setItem('section-collapse-Oct Week #3 2026', 'full'));
    cy.contains('.planning-archive button', 'View archive').click();
    cy.contains('.done-stack .task-card', 'Existing').should('be.visible');
    cy.get('.planning-archive-drawer').should('be.visible');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('.planning-open-archive').click();
    cy.contains('.done-stack .task-card', 'Existing').should('be.visible');
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });
});
