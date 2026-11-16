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

  it('keeps the ToC visible and jumps within read-only source and an unsaved draft', () => {
    const longSource = '# TODO\n' + '* [ ] Padding\n'.repeat(80) + '### Target\n'
      + '* [ ] Tail\n'.repeat(60);
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.writeTestFileContent(longSource).then(file => {
      cy.wrap(file).as('file'); cy.reload(); cy.switchToFile(file.fileName);
      cy.contains('.view-mode-btn', 'Raw').click();
    });
    cy.intercept('POST', '**/api/todos').as('save');
    cy.get('.raw-outline').should('be.visible');
    cy.screenshot('raw-heading-sidebar');
    cy.contains('.raw-outline-link', 'Target').click();
    cy.get('.raw-source').should('have.value', longSource).and($editor => {
      expect($editor[0].readOnly).to.equal(true);
      expect($editor[0].selectionStart).to.equal(longSource.indexOf('### Target'));
      expect($editor[0].scrollTop).to.be.greaterThan(1000);
    });
    cy.get('.raw-outline').should('be.visible');
    cy.contains('.raw-actions button', 'Edit').click();
    cy.get('.raw-source').type('{moveToEnd}\n### Draft heading');
    cy.contains('.raw-outline-link', 'Draft heading').click();
    cy.get('.raw-source').should($editor => {
      expect($editor[0].selectionStart).to.equal($editor[0].value.indexOf('### Draft heading'));
    });
    cy.get('@save.all').should('have.length', 0);
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', longSource));
    cy.contains('.raw-actions button', 'Cancel').click();
    cy.contains('.raw-modal button', 'Discard changes').click();
  });

  it('guards unsaved navigation and rejects stale writes without overwriting newer data', () => {
    cy.contains('.raw-actions button', 'Edit').click();
    cy.get('.raw-source').type('draft');
    cy.contains('.view-mode-btn', 'Plan').click();
    cy.get('.raw-modal').should('be.visible');
    cy.contains('.raw-modal button', 'Keep editing').click();
    cy.contains('.view-mode-btn', 'Raw').should('have.class', 'active');
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

  it('matches section colors and keeps highlighted source aligned while editing and scrolling', () => {
    const source = '# TODO\n### Inbox\n* [ ] ' + 'Long title '.repeat(80) + '\n'
      + '* [ ] More\n'.repeat(70) + '# PROJECTS\n### House\n+ [ ] Work\n'
      + '# SELECTED\n### Ready\n* [ ] Next\n# WIP\n### Week\n* [~] Active\n'
      + '# ARCHIVE\n### Old\n* [x] Done\n';
    cy.contains('.raw-actions button', 'Edit').click();
    cy.get('.raw-source').invoke('val', source).trigger('input');
    const colors = [];
    for (const title of ['TODO', 'PROJECTS', 'SELECTED', 'WIP', 'ARCHIVE']) {
      cy.contains('.raw-outline-link', title).invoke('css', 'color').then(color => {
        colors.push(color);
        cy.contains('.raw-source-heading', `# ${title}`).should('have.css', 'color', color);
      });
    }
    cy.then(() => expect(new Set(colors).size).to.equal(5));
    cy.get('.raw-outline-column').should('have.length', 5).and('have.css', 'border-left-width', '3px');
    cy.get('.raw-outline-link:not(.raw-outline-column)').should('have.css', 'border-left-width', '0px');
    cy.get('.raw-source-line').first().then($line => {
      const gutter = getComputedStyle($line[0], '::before');
      expect(parseFloat(gutter.left) + parseFloat(gutter.width)).to.be.at.most(-8);
    });
    cy.contains('.raw-outline-link', 'House').click();
    cy.get('.raw-source').then($editor => {
      cy.get('.raw-source-highlight').should($highlight => {
        expect($highlight[0].scrollTop).to.be.closeTo($editor[0].scrollTop, 1);
        const heading = $highlight[0].querySelectorAll('.raw-source-heading')[3];
        const editorTop = $editor[0].getBoundingClientRect().top;
        const expected = editorTop + 18 + source.slice(0, source.indexOf('### House')).split('\n').length * 22.4
          - 22.4 - $editor[0].scrollTop;
        expect(heading.getBoundingClientRect().top).to.be.closeTo(expected, 2);
      });
    });
    cy.get('.raw-source').scrollTo('topRight');
    cy.get('.raw-source').then($editor => {
      cy.get('.raw-source-highlight').should($highlight => {
        expect($highlight[0].scrollLeft).to.be.closeTo($editor[0].scrollLeft, 1);
        expect($highlight[0].scrollTop).to.be.closeTo($editor[0].scrollTop, 1);
      });
    });
    cy.get('.raw-source').scrollTo('topLeft');
    cy.screenshot('raw-section-colors');
    cy.get('.raw-source').should('have.value', source);
    cy.contains('.raw-actions button', 'Save').click();
    cy.get('@file').then(file => cy.readFile(file.filePath).should('equal', source));
  });
});
