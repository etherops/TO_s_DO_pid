describe('Low priority horizontal alignment', () => {
  beforeEach(() => {
    cy.viewport(1800, 1000);
    cy.writeTestFileContent('# TODO\n* [ ] Backlog normal\n- [ ] Backlog low\n'
      + '# SELECTED\n* [ ] Selected normal\n- [ ] Selected low\n'
      + '# WIP\n* [ ] Today normal ! Nov 10 2026\n- [ ] Today low ! Nov 10 2026\n'
      + '* [ ] Week normal ! Nov Week #2 2026\n- [ ] Week low ! Nov Week #2 2026\n'
      + '* [ ] Later normal ! Nov 12 2026\n- [ ] Later low ! Nov 12 2026\n')
      .then(() => cy.reload());
    cy.clock(new Date(2026, 10, 10, 12).getTime(), ['Date']);
  });

  const aligned = (container, rowSelector, titleSelector, checkSelector, prefix) => {
    cy.get(container).should($container => {
      const rows = [...$container[0].querySelectorAll(rowSelector)];
      const normal = rows.find(row => row.querySelector(titleSelector)?.textContent.includes(`${prefix} normal`));
      const low = rows.find(row => row.querySelector(titleSelector)?.textContent.includes(`${prefix} low`));
      expect(normal, 'normal row').to.exist;
      expect(low, 'low row').to.exist;
      for (const selector of [null, titleSelector, checkSelector]) {
        const a = (selector ? normal.querySelector(selector) : normal).getBoundingClientRect();
        const b = (selector ? low.querySelector(selector) : low).getBoundingClientRect();
        if (selector === checkSelector) {
          expect(Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2),
            `${prefix} checkbox center`).to.be.lessThan(1);
          expect(b.width, `${prefix} smaller checkbox width`).to.be.lessThan(a.width);
          expect(b.height, `${prefix} smaller checkbox height`).to.be.lessThan(a.height);
          continue;
        }
        expect(Math.abs(a.left - b.left), `${prefix} ${selector || 'card'} left edge`).to.be.lessThan(1);
        if (selector !== titleSelector) {
          expect(Math.abs(a.right - b.right), `${prefix} ${selector || 'card'} right edge`).to.be.lessThan(1);
        }
      }
    });
  };

  it('aligns low-priority cards, checkboxes and titles in every Focus pane', () => {
    cy.contains('.view-mode-btn', /\bFocus\b/).click();
    for (const [container, prefix] of [
      ['.panel-now', 'Today'], ['.panel-upnext', 'Week'], ['.panel-in-progress-queued', 'Later']
    ]) aligned(container, '.focus-task-row', '.focus-row-title', '.focus-row-check', prefix);
  });

  it('aligns low-priority cards, checkboxes and titles in Plan source and scheduled columns', () => {
    cy.contains('.view-mode-btn', /\bPlan\b/).click();
    for (const [container, prefix] of [
      ['.planning-backlog', 'Backlog'], ['.planning-selected', 'Selected'], ['.planning-scheduled', 'Today']
    ]) aligned(container, '.task-card', '.task-title', '.custom-checkbox', prefix);
  });
});
