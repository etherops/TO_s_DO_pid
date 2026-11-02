describe('Focus active weekly work', () => {
  it('puts active weekly work in NOW and retains urgency and initiative placement', () => {
    cy.writeTestFileContent(`# WIP
### Work
* [~] Active weekly task ! Oct Week #3 2026
* [ ] Unstarted weekly task ! Oct Week #3 2026
* [~] Urgent task ! Oct 15 2026
* [~] Late task ! Oct 14 2026
* [~] Later task ! Oct Week #4 2026
- [~] Low weekly task ! Oct Week #3 2026
+ [~] Parent initiative ! Oct Week #3 2026
  - [~] Weekly child ! Oct Week #3 2026
`).then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-10-15').trigger('change');
    cy.get('.panel-now .day-this-week').should('exist');
    for (const title of ['Active weekly task', 'Weekly child', 'Low weekly task']) {
      cy.get('.panel-now').should('contain', title);
      cy.get('.panel-in-progress-queued').should('not.contain', title);
    }
    for (const title of ['Unstarted weekly task', 'Urgent task', 'Late task']) {
      cy.get('.panel-now').should('contain', title);
      cy.get('.panel-in-progress-queued').should('not.contain', title);
    }
    cy.get('.panel-now .day-this-week-low-priority').should('contain', 'Low Priority');
    cy.get('.focus-initiatives').should('contain', 'Parent initiative');
    cy.get('.panel-upnext').should('contain', 'Later task');
    cy.contains('.panel-now .focus-row-title', 'Active weekly task').click();
    cy.get('.focus-edit-name').should('have.value', 'Active weekly task');
    cy.get('.focus-edit-cancel').click();
    cy.get('.focus-stage').screenshot('active-week-now');
  });
});
