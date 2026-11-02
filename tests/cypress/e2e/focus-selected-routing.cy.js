describe('SELECTED Focus routing', () => {
  it('parks selected work except urgent and whole-current-week work', () => {
    cy.writeTestFileContent(`# SELECTED
### Plans
* [ ] Selected today ! Aug 12 2026
* [ ] Selected overdue ! Aug 11 2026
* [ ] Selected week ! Aug Week #2 2026
* [~] Selected active week ! Aug Week #2 2026
* [ ] Selected undated
* [ ] Selected later ! Sep 2026
* [~] Selected active later ! Sep 2026
* [~] Selected active today ! Aug 12 2026
* [~] Selected active overdue ! Aug 11 2026
- [~] Selected low
+ [ ] Selected initiative
* [x] Selected completed | Aug 12 2026
# HOLD
### Waiting
* [~] Alias selected
# WIP
### Work
* [ ] WIP week ! Aug Week #2 2026
* [ ] WIP later ! Sep 2026
`).then(() => cy.reload());
    cy.contains('.view-mode-btn', 'Focus').click();
    cy.get('[aria-label="Focus date"]').invoke('val', '2026-08-12').trigger('change');
    for (const title of ['Selected today', 'Selected overdue', 'Selected completed', 'WIP week',
      'Selected week', 'Selected active week', 'Selected active today', 'Selected active overdue']) {
      cy.get('.panel-now').should('contain', title);
      cy.get('.panel-in-progress-queued').should('not.contain', title);
    }
    for (const title of ['Selected active later', 'Selected low', 'Alias selected']) {
      cy.get('.panel-in-progress-queued').should('contain', title);
      cy.get('.panel-now').should('not.contain', title);
      cy.get('.panel-upnext').should('not.contain', title);
    }
    for (const title of ['Selected undated', 'Selected later']) {
      cy.get('.panel-upnext').should('contain', title);
      cy.get('.panel-in-progress-queued').should('not.contain', title);
    }
    cy.get('.panel-in-progress-queued .day-this-week').should('not.exist');
    cy.get('.panel-in-progress-queued .day-this-month-parked').should('contain', 'Parked');
    cy.get('.panel-in-progress-queued .day-low-priority').should('contain', 'Low Priority');
    cy.get('.focus-initiatives').should('contain', 'Selected initiative');
    cy.get('.panel-in-progress-queued').should('not.contain', 'Selected initiative');
    cy.get('.panel-upnext').should('contain', 'WIP later');
    cy.contains('.panel-now .focus-row-title', 'Selected active week').click();
    cy.get('.focus-edit-name').should('have.value', 'Selected active week');
    cy.get('.focus-edit-cancel').click();
  });
});
