describe('Raw Markdown', () => {
  const original = '# WIP\n\n### Work\n* [ ] Exact  spacing (keep note)\n  ??? unsupported\n';
  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.writeTestFileContent(original).then(file => {
      cy.wrap(file).as('file');
      cy.reload();
      cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', 'Raw').click();
      cy.get('.raw-source').should('have.value', original).and('have.attr', 'readonly');
    });
  });

  it('saves exact text only after Edit and Save, then returns to read-only', () => {
    cy.intercept('POST', '/api/todos').as('save');
    cy.get('@save.all').should('have.length', 0);
    cy.contains('.raw-actions button', 'Edit').click();
    cy.get('.raw-source').clear().type(original.replace('Exact', 'Revised'), { parseSpecialCharSequences: false });
    cy.contains('.raw-actions button', 'Save').click();
    cy.wait('@save').its('response.statusCode').should('equal', 200);
    cy.get('.raw-source').should('have.attr', 'readonly');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', original.replace('Exact', 'Revised')));
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.task-card', 'Revised').should('be.visible');
    cy.contains('.view-mode-btn', 'Raw').click();
    cy.get('.raw-source').should('have.attr', 'readonly');
  });

  it('guards unsaved navigation and rejects stale writes without overwriting newer data', () => {
    cy.contains('.raw-actions button', 'Edit').click();
    cy.get('.raw-source').type('draft');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('.raw-modal').should('be.visible');
    cy.contains('.raw-modal button', 'Keep editing').click();
    const newer = original + '* [ ] External addition\n';
    cy.get('@file').then(file => cy.writeFile(file.filePath, newer));
    cy.intercept('POST', '/api/todos').as('staleSave');
    cy.contains('.raw-actions button', 'Save').click();
    cy.wait('@staleSave').its('response.statusCode').should('equal', 409);
    cy.get('.raw-error').should('contain', 'changed elsewhere');
    cy.get('.raw-source').should('contain.value', 'draft');
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', newer));
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.contains('.raw-modal button', 'Discard changes').click();
    cy.get('.planning-workspace').should('be.visible');
  });
});
