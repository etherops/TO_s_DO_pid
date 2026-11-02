describe('Calendar mode', () => {
  const content = '# WIP\n### Work\n'
    + Array.from({ length: 24 }, (_, i) => `* [ ] Scheduled ${i + 1} ! Nov 2 2026\n`).join('')
    + '* [~] Started ! Nov 2 2026\n* [!] Blocked ! Nov 2 2026\n'
    + '* [ ] Weekly ! Nov Week #1 2026\n* [ ] December work ! Dec 3 2026\n'
    + '# ARCHIVE\n### History\n* [x] Finished | Nov 2 2026\n* [-] Dropped | Nov 2 2026\n';

  beforeEach(() => {
    cy.viewport(1600, 1000);
    cy.clock(new Date(2026, 10, 2, 12).getTime(), ['Date']);
    cy.writeTestFileContent(content).then(file => {
      cy.wrap(file).as('file');
      cy.reload();
      cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', 'Calendar').click();
    });
    cy.intercept('POST', '/api/todos').as('save');
  });

  it('shows all tasks in a bounded day scroll area with fixed date and counts', () => {
    const day = '[data-date="2026-11-02"]';
    cy.get(`${day} .calendar-day-task`).should('have.length', 28);
    cy.get(`${day} .calendar-day-tasks`).should('not.contain', 'Weekly');
    cy.get(`${day} .review-day-total`).should('have.text', '28');
    cy.get(`${day} .calendar-day-tasks`).should($list => {
      expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight);
      expect($list[0].clientHeight).to.be.greaterThan(30);
    });
    cy.get(`${day} .review-day-summary`).then($header => {
      const top = $header[0].getBoundingClientRect().top;
      cy.get(`${day} .calendar-day-tasks`).scrollTo('bottom');
      cy.contains(`${day} .calendar-day-task`, 'Dropped').should('be.visible');
      cy.get(`${day} .review-day-summary`).should($after => {
        expect($after[0].getBoundingClientRect().top).to.equal(top);
      });
    });
    cy.get('.review-week-row').first().children().then($days => {
      const heights = [...$days].map(el => Math.round(el.getBoundingClientRect().height));
      expect(new Set(heights).size).to.equal(1);
    });
    cy.get(`${day} .review-day-summary`).click();
    cy.get('.review-day-detail').should('contain', 'Scheduled 1').and('contain', 'Finished');
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', content));
  });

  it('retains saved Review mode compatibility and updates lists while navigating months', () => {
    cy.window().then(win => expect(win.localStorage.getItem('viewMode')).to.equal('review'));
    cy.reload();
    cy.contains('.view-mode-btn.active', 'Calendar').should('be.visible');
    cy.get('.review-step-btn[title="Next month"]').click();
    cy.get('[data-date="2026-12-03"] .calendar-day-tasks').should('contain', 'December work');
    cy.get('.review-this-month-btn').click();
    cy.get('[data-date="2026-11-02"] .calendar-day-task').should('have.length', 28);
    for (const width of [1280, 900]) {
      cy.viewport(width, 900);
      cy.get('[data-date="2026-11-02"] .calendar-day-tasks').should($list => {
        expect($list[0].clientHeight).to.be.greaterThan(30);
        expect($list[0].scrollWidth).to.be.at.most($list[0].clientWidth + 1);
      });
    }
    cy.get('@save.all').should('have.length', 0);
  });
});
