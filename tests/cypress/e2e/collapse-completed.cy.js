import { refreshAndWait, findSection, findTask, withRefresh } from '../support/helpers.js';

describe('Collapse Completed Tasks Feature', () => {

  it('should show collapse controls when section exists', () => {
    const sectionName = 'test archive';

    // Find section with completed tasks
    findSection(sectionName).within(() => {
      // Verify collapse/expand link exists before title
      cy.get('.collapse-expand-link').should('exist').and('contain', 'collapse');
      // Tri-state caret toggle should exist at far right
      cy.get('.caret-toggle-btn').should('exist');
    });
  });

  it('should cycle through caret states: normal → Focus → Collapse → normal', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Start in normal state
      cy.get('.caret-toggle-btn').should('have.class', 'state-normal');

      // Click to enter Focus state (partial collapse)
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
      cy.get('.task-card-wrapper.collapsed-completed').should('exist');
      cy.get('.summary-card').should('exist');

      // Click to enter Collapse state (summary only)
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-collapse');
      cy.get('.summary-only-card').should('exist');

      // Click to return to normal
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-normal');
      cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
    });
  });

  it('should persist collapse state after refresh', () => {
    const sectionName = 'test archive';

    // Click caret to enter Focus state
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
    });

    // Refresh and verify state persisted
    refreshAndWait();

    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
      cy.get('.task-card-wrapper.collapsed-completed').should('exist');
    });

    // Clean up - click twice to return to normal
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.caret-toggle-btn').click(); // Focus → Collapse
      cy.get('.caret-toggle-btn').click(); // Collapse → Normal
    });
  });

  it('should show caret controls for all sections', () => {
    const sectionName = 'BACKLOG';

    findSection(sectionName).within(() => {
      // Caret toggle always exists
      cy.get('.caret-toggle-btn').should('exist');
      cy.get('.collapse-expand-link').should('exist');

      // Test caret cycling
      cy.get('.caret-toggle-btn').should('have.class', 'state-normal');
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-collapse');
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-normal');
    });
  });

  it('should maintain proper z-index stacking for collapsed cards', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click caret to enter Focus state
      cy.get('.caret-toggle-btn').click();

      // Check that completed tasks have proper stacking
      cy.get('.task-card-wrapper.collapsed-completed').each(($el, index) => {
        cy.wrap($el).should('have.css', 'z-index');
      });

      // Clean up - click twice to return to normal
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').click();
    });
  });

  it('should keep non-completed tasks visible when in Focus state', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click caret to enter Focus state
      cy.get('.caret-toggle-btn').click();

      // Non-completed tasks should be visible
      cy.get('.task-card-wrapper:not(.collapsed-completed)').should('exist');
      cy.get('.task-card-wrapper:not(.collapsed-completed)').should('be.visible');

      // Clean up
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').click();
    });
  });

  it('should maintain collapsed state during interactions', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click caret to enter Focus state
      cy.get('.caret-toggle-btn').click();

      // Verify collapsed state
      cy.get('.task-card-wrapper.collapsed-completed').should('have.length.at.least', 1);

      // Try to interact with a collapsed task (should still be clickable)
      cy.get('.task-card-wrapper.collapsed-completed').first().within(() => {
        cy.get('.custom-checkbox').should('be.visible');
      });

      // Verify state persists
      cy.get('.caret-toggle-btn').should('have.class', 'state-focus');

      // Clean up
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').click();
    });
  });

  it('should show summary card with correct counts in Focus state', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click caret to enter Focus state
      cy.get('.caret-toggle-btn').click();

      // Verify summary card exists and is visible
      cy.get('.task-card-wrapper.collapsed-summary').should('exist');
      cy.get('.summary-card').should('be.visible');

      // Check that summary shows visual checkboxes and text
      cy.get('.summary-card .custom-checkbox.checked').should('exist');
      cy.get('.summary-card .summary-text').should('contain', 'completed');

      // Clean up
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').click();
    });
  });

  it('should default to Focus state for sections in DONE/ARCHIVE column', () => {
    // Clear localStorage to test default behavior
    cy.clearLocalStorage();

    // Refresh to get clean state
    refreshAndWait();

    // Find the ARCHIVE column specifically and check sections
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // MAY Week 4 is in the ARCHIVE column
      cy.contains('.section', 'MAY Week 4').within(() => {
        // Should be in Focus state by default
        cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        cy.get('.summary-card').should('exist');
      });

      // MAY Week 3 is also in ARCHIVE column
      cy.contains('.section', 'MAY Week 3').within(() => {
        // Should be in Focus state by default
        cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        cy.get('.summary-card').should('exist');
      });
    });
  });

  it('should not default to collapsed for sections in TODO/WIP columns', () => {
    // Clear localStorage to test default behavior
    cy.clearLocalStorage();

    // Refresh to get clean state
    refreshAndWait();

    // Check WIP column sections
    cy.get('.wip-column').within(() => {
      cy.contains('.section', 'test archive').within(() => {
        // Should be in normal state by default
        cy.get('.caret-toggle-btn').should('have.class', 'state-normal');
        cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
      });
    });
  });

  it('should collapse all sections when clicking Collapse All in DONE column', () => {
    // Clear localStorage to start fresh
    cy.clearLocalStorage();
    refreshAndWait();

    // Find the ARCHIVE column
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // Click Collapse All button
      cy.get('.collapse-all-btn').click();

      // Check that all sections are in Focus state
      cy.get('.section').each($section => {
        cy.wrap($section).within(() => {
          cy.get('.caret-toggle-btn').should('have.class', 'state-focus');
          cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        });
      });
    });
  });

  it('should expand all sections when clicking Expand All in DONE column', () => {
    // Start with some sections collapsed
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // First collapse all
      cy.get('.collapse-all-btn').click();
      cy.wait(500);

      // Then click Expand All
      cy.get('.expand-all-btn').click();
      cy.wait(500);

      // Check that all sections are in normal state
      cy.get('.section').each($section => {
        cy.wrap($section).within(() => {
          cy.get('.caret-toggle-btn').should('have.class', 'state-normal');
          cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
        });
      });
    });
  });

  it('should show Collapse state with summary card only', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click caret twice to enter Collapse state (normal → Focus → Collapse)
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').click();
      cy.get('.caret-toggle-btn').should('have.class', 'state-collapse');

      // Should show summary-only card
      cy.get('.summary-only-card').should('exist');
      cy.get('.summary-card.full-summary').should('be.visible');

      // Task list should be hidden
      cy.get('.task-list').should('not.be.visible');

      // Clean up - click to return to normal
      cy.get('.caret-toggle-btn').click();
    });
  });

  it('should show fully collapsed state with header only via collapse link', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click collapse link to fully collapse (header only mode)
      cy.get('.collapse-expand-link').should('contain', 'collapse').click();

      // Link should now say "expand", caret shows square
      cy.get('.collapse-expand-link').should('contain', 'expand');
      cy.get('.caret-toggle-btn').should('have.class', 'collapsed');

      // Section items should be hidden
      cy.get('.section-items').should('not.be.visible');

      // Inline summary should show in header
      cy.get('.inline-collapse-summary').should('exist');

      // Click caret (square) to return to normal
      cy.get('.caret-toggle-btn').click();

      // Should be back to normal with controls visible
      cy.get('.collapse-expand-link').should('contain', 'collapse');
      cy.get('.caret-toggle-btn').should('have.class', 'state-normal');
    });
  });
});
