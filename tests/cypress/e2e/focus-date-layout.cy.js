describe('Focus date header layout', () => {
  for (const width of [768, 1280, 2560]) {
    it(`keeps arrows fixed beside changing dates at ${width}px`, () => {
      cy.viewport(1280, 900);
      cy.contains('.view-mode-btn', 'Focus').click();
      cy.viewport(width, 900);
      const previous = '[aria-label="Preview previous day"]';
      const next = '[aria-label="Preview next day"]';
      let baseline;
      const checkLayout = () => cy.get('.focus-date-navigation').should($nav => {
        const nav = $nav[0];
        const left = nav.querySelector(previous).getBoundingClientRect();
        const right = nav.querySelector(next).getBoundingClientRect();
        const title = nav.querySelector('.focus-date-trigger').getBoundingClientRect();
        const centerY = rect => rect.top + rect.height / 2;
        if (!baseline) baseline = [left.x, right.x];
        expect(left.x, 'previous arrow stays fixed').to.be.closeTo(baseline[0], 0.5);
        expect(right.x, 'next arrow stays fixed').to.be.closeTo(baseline[1], 0.5);
        expect(centerY(left), 'same line as date').to.be.closeTo(centerY(title), 1);
        expect(centerY(right), 'same line as date').to.be.closeTo(centerY(title), 1);
        expect(title.left, 'date clears previous arrow').to.be.greaterThan(left.right);
        expect(title.right, 'date clears next arrow').to.be.lessThan(right.left);
        expect(title.left + title.width / 2, 'date stays centered').to.be.closeTo(width / 2, 1);
      });

      checkLayout();
      for (const date of ['2027-05-01', '2027-09-22', '2027-12-31']) {
        cy.get('[aria-label="Focus date"]').invoke('val', date).trigger('change');
        checkLayout();
        cy.get(next).click();
        checkLayout();
        cy.get(previous).click();
        cy.get('[aria-label="Focus date"]').should('have.value', date);
        checkLayout();
      }
      cy.contains('.focus-as-of button', 'Back to today').click();
      checkLayout();
    });
  }
});
