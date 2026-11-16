describe('Focus scheduled day layout', () => {
  it('keeps crowded days and expanded editors inside their own groups, scrolling the pane', () => {
    cy.viewport(1600, 720);
    const tasks = Array.from({ length: 12 }, (_, i) => `* [ ] Tuesday task ${i + 1} ! Nov 10 2026`);
    cy.writeTestFileContent(`# WIP\n${tasks.join('\n')}\n`
      + '* [ ] Wednesday task ! Nov 11 2026\n* [ ] Thursday task ! Nov 12 2026\n'
      + '* [ ] Friday task ! Nov 13 2026\n').then(() => cy.reload());
    cy.clock(new Date(2026, 10, 9, 12).getTime(), ['Date']);
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    cy.intercept('POST', '**/api/todos').as('save');
    const assertNoOverlap = () => cy.get('.panel-in-progress-queued .panel-body').should($body => {
      const body = $body[0];
      const groups = [...body.querySelectorAll('.focus-schedule-group')];
      expect(groups).to.have.length(7);
      expect(body.scrollHeight, 'crowded days scroll in the panel').to.be.greaterThan(body.clientHeight);
      groups.forEach((group, i) => {
        const bottom = group.getBoundingClientRect().bottom;
        for (const row of group.querySelectorAll('.focus-task-row')) {
          expect(row.getBoundingClientRect().bottom, `row remains within day ${i}`)
            .to.be.at.most(bottom + 1);
        }
        if (i > 0) {
          const previous = groups[i - 1];
          expect(group.offsetTop, `day ${i} starts below previous day`)
            .to.be.at.least(previous.offsetTop + previous.offsetHeight - 1);
        }
      });
    });
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 15);
    assertNoOverlap();
    cy.contains('[data-schedule-date="2026-11-10"] .focus-row-title', 'Tuesday task 1').click();
    cy.get('.panel-in-progress-queued .focus-edit-note').type('A multiline note{shift+enter}Second line');
    assertNoOverlap();
    cy.get('.panel-in-progress-queued .focus-edit-cancel').click();
    cy.viewport(1300, 650);
    assertNoOverlap();
    cy.get('.panel-in-progress-queued .panel-body').scrollTo('bottom');
    cy.get('[data-schedule-date="2026-11-14"] .focus-day-header').should('be.visible');
    cy.get('@save.all').should('have.length', 0);
  });
});
