import { refreshAndWait, findSection, findTask, withRefresh } from '../support/helpers.js';

describe('Collapse Completed Tasks Feature', () => {

  it('should show collapse toggle group when section exists', () => {
    const sectionName = 'test archive';

    // Find section with completed tasks
    findSection(sectionName).within(() => {
      // Verify toggle group exists with 3 buttons
      cy.get('.collapse-toggle-group').should('exist');
      cy.get('.collapse-toggle-group').should('be.visible');
      cy.get('.toggle-btn').should('have.length', 3);
      cy.get('.toggle-btn').eq(0).should('contain', 'Focus');
      cy.get('.toggle-btn').eq(1).should('contain', 'Collapse');
      cy.get('.toggle-btn').eq(2).should('contain', 'Summary');
    });
  });

  it('should collapse and expand completed tasks with Focus button', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Count completed tasks
      cy.get('.task-card').then($cards => {
        const totalCards = $cards.length;

        // Click Focus button to enter partial collapse
        cy.get('.toggle-btn').contains('Focus').click();

        // Verify Focus button is active
        cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');

        // Verify completed tasks are collapsed
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');

        // Verify summary card exists
        cy.get('.task-card-wrapper.collapsed-summary').should('exist');
        cy.get('.summary-card').should('exist');

        // All original cards plus summary card should be in DOM
        cy.get('.task-card').should('have.length', totalCards + 1);

        // Click Focus again to return to normal
        cy.get('.toggle-btn').contains('Focus').click();

        // Verify Focus button is no longer active
        cy.get('.toggle-btn').contains('Focus').should('not.have.class', 'active');

        // Verify no collapsed classes
        cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
        cy.get('.task-card-wrapper.collapsed-summary').should('not.exist');

        // Should be back to original count
        cy.get('.task-card').should('have.length', totalCards);
      });
    });
  });

  it('should persist collapse state after refresh', () => {
    const sectionName = 'test archive';

    // Collapse the section with Focus button
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.toggle-btn').contains('Focus').click();
      cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');
    });

    // Refresh and verify state persisted
    refreshAndWait();

    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');
      cy.get('.task-card-wrapper.collapsed-completed').should('exist');
    });

    // Clean up - click Focus again to return to normal
    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.toggle-btn').contains('Focus').click();
    });
  });

  it('should show toggle group for all sections', () => {
    const sectionName = 'BACKLOG';

    findSection(sectionName).within(() => {
      // Toggle group always exists
      cy.get('.collapse-toggle-group').should('exist');
      cy.get('.toggle-btn').should('have.length', 3);

      // Test Focus and Collapse buttons toggle correctly
      // Focus
      cy.get('.toggle-btn').contains('Focus').click();
      cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');
      cy.get('.toggle-btn').contains('Focus').click();
      cy.get('.toggle-btn').contains('Focus').should('not.have.class', 'active');

      // Collapse (summary card only)
      cy.get('.toggle-btn').contains('Collapse').click();
      cy.get('.toggle-btn').contains('Collapse').should('have.class', 'active');
      cy.get('.toggle-btn').contains('Collapse').click();
      cy.get('.toggle-btn').contains('Collapse').should('not.have.class', 'active');

      // Summary (header only) - this hides the toggle group, so test separately
      cy.get('.toggle-btn').contains('Summary').click();
      // Toggle group replaced with expand icon
      cy.get('.expand-icon-btn').should('exist');
      // Click expand to return to normal
      cy.get('.expand-icon-btn').click();
      cy.get('.collapse-toggle-group').should('exist');
      cy.get('.toggle-btn.active').should('not.exist');
    });
  });

  it('should maintain proper z-index stacking for collapsed cards', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.toggle-btn').contains('Focus').click();

      // Check that completed tasks have proper stacking
      cy.get('.task-card-wrapper.collapsed-completed').each(($el, index) => {
        // Each card should have a z-index
        cy.wrap($el).should('have.css', 'z-index');
      });

      // Clean up
      cy.get('.toggle-btn').contains('Focus').click();
    });
  });

  it('should keep non-completed tasks visible when collapsed', () => {
    const sectionName = 'test archive'; // This section has mixed completed and incomplete tasks

    findSection(sectionName).scrollIntoView().within(() => {
      cy.get('.toggle-btn').contains('Focus').click();

      // Non-completed tasks should be visible
      cy.get('.task-card-wrapper:not(.collapsed-completed)').should('exist');
      cy.get('.task-card-wrapper:not(.collapsed-completed)').should('be.visible');

      // Clean up
      cy.get('.toggle-btn').contains('Focus').click();
    });
  });

  it('should maintain collapsed state during interactions', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Collapse the section
      cy.get('.toggle-btn').contains('Focus').click();

      // Verify collapsed state
      cy.get('.task-card-wrapper.collapsed-completed').should('have.length.at.least', 1);

      // Try to interact with a collapsed task (should still be clickable)
      cy.get('.task-card-wrapper.collapsed-completed').first().within(() => {
        cy.get('.custom-checkbox').should('be.visible');
      });

      // Verify state persists
      cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');

      // Clean up
      cy.get('.toggle-btn').contains('Focus').click();
    });
  });

  it('should show summary card with correct counts', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Collapse the section
      cy.get('.toggle-btn').contains('Focus').click();

      // Verify summary card exists and is visible
      cy.get('.task-card-wrapper.collapsed-summary').should('exist');
      cy.get('.summary-card').should('be.visible');

      // Check that summary shows visual checkboxes and text
      cy.get('.summary-card .custom-checkbox.checked').should('exist');
      cy.get('.summary-card .summary-text').should('contain', 'completed');

      // Clean up
      cy.get('.toggle-btn').contains('Focus').click();
    });
  });

  it('should default to collapsed for sections in DONE/ARCHIVE column', () => {
    // Clear localStorage to test default behavior
    cy.clearLocalStorage();

    // Refresh to get clean state
    refreshAndWait();

    // Find the ARCHIVE column specifically and check sections
    cy.get('.done-column').contains('ARCHIVE').parent().parent().within(() => {
      // MAY Week 4 is in the ARCHIVE column
      cy.contains('.section', 'MAY Week 4').within(() => {
        // Should be collapsed by default (Focus button active)
        cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');
        cy.get('.task-card-wrapper.collapsed-completed').should('exist');
        cy.get('.summary-card').should('exist');
      });

      // MAY Week 3 is also in ARCHIVE column
      cy.contains('.section', 'MAY Week 3').within(() => {
        // Should be collapsed by default
        cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');
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
        // Should not be collapsed by default (no active button)
        cy.get('.toggle-btn.active').should('not.exist');
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

      // Check that all sections are collapsed (Focus button active)
      cy.get('.section').each($section => {
        cy.wrap($section).within(() => {
          cy.get('.toggle-btn').contains('Focus').should('have.class', 'active');
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

      // Wait a moment for the collapse to complete
      cy.wait(500);

      // Then click Expand All
      cy.get('.expand-all-btn').click();

      // Wait a moment for the expand to complete
      cy.wait(500);

      // Check that all sections are expanded (no active toggle button)
      cy.get('.section').each($section => {
        cy.wrap($section).within(() => {
          cy.get('.toggle-btn.active').should('not.exist');
          cy.get('.task-card-wrapper.collapsed-completed').should('not.exist');
        });
      });
    });
  });

  it('should show Collapse state with summary card only', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click Collapse button (summary card only mode)
      cy.get('.toggle-btn').contains('Collapse').click();
      cy.get('.toggle-btn').contains('Collapse').should('have.class', 'active');

      // Should show summary-only card
      cy.get('.summary-only-card').should('exist');
      cy.get('.summary-card.full-summary').should('be.visible');

      // Task list should be hidden
      cy.get('.task-list').should('not.be.visible');

      // Clean up
      cy.get('.toggle-btn').contains('Collapse').click();
    });
  });

  it('should show Summary state with header only and expand icon', () => {
    const sectionName = 'test archive';

    findSection(sectionName).scrollIntoView().within(() => {
      // Click Summary button (header only mode)
      cy.get('.toggle-btn').contains('Summary').click();

      // Toggle group should be replaced with expand icon
      cy.get('.collapse-toggle-group').should('not.exist');
      cy.get('.expand-icon-btn').should('exist');

      // Section items should be hidden
      cy.get('.section-items').should('not.be.visible');

      // Inline summary should show in header
      cy.get('.inline-collapse-summary').should('exist');

      // Click expand icon to return to normal
      cy.get('.expand-icon-btn').click();

      // Should be back to normal with toggle group
      cy.get('.collapse-toggle-group').should('exist');
      cy.get('.toggle-btn.active').should('not.exist');
    });
  });
});
