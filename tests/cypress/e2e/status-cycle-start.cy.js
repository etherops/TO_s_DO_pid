describe('Status cycle anchored to the settled state', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    cy.clearLocalStorage();
    cy.writeTestFileContent('# WIP\n### Current\n* [~] Partial cycle task\n* [ ] Empty cycle task\n')
      .then(file => {
        cy.reload();
        cy.switchToFile(file.fileName);
      });
  });

  for (const mode of ['Plan', 'Focus']) {
    it(`retains the partial-start order and resets after settling in ${mode}`, () => {
      cy.contains('.view-mode-btn', mode).click();
      const row = mode === 'Focus' ? '.focus-task-row' : '.task-card';
      const control = mode === 'Focus' ? '.focus-row-check' : '.custom-checkbox';
      const partialClass = mode === 'Focus' ? 'inflight' : 'in-progress';
      cy.contains(row, 'Partial cycle task').should('be.visible');
      const checkbox = () => cy.contains(row, 'Partial cycle task').find(control);
      for (const state of ['checked', 'status-blocked', 'cancelled', 'unchecked', partialClass]) {
        checkbox().click({ force: true });
        checkbox().should('have.class', state);
      }
      // Let the real debounce and Vue/browser rendering settle together.
      cy.wait(1700);
      checkbox().click({ force: true });
      checkbox().should('have.class', 'checked');
      cy.wait(2500);
      checkbox().click({ force: true });
      checkbox().should('have.class', partialClass);

      const emptyCheckbox = () => cy.contains(row, 'Empty cycle task').find(control);
      for (const state of ['checked', partialClass, 'status-blocked', 'cancelled', 'unchecked']) {
        emptyCheckbox().click({ force: true });
        emptyCheckbox().should('have.class', state);
      }
    });
  }
});
