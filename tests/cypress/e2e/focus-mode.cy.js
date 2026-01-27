import { refreshAndWait, findSection, findTask } from '../support/helpers.js';

describe('View Modes (Triage & Focus)', () => {
  const fixtureContent = `# TODO
## BACKLOG
* [ ] Todo task 1

## PROJECTS
* [ ] Project task 1

# PROJECTS
## Active Projects
* [ ] Active project task

# SELECTED
## Ready
* [ ] Selected task 1

# SCHEDULED
### WIP
* [~] BILLS - Phone bill really really really really really really really really really really really really really really really really really long (Jan 14, follow up about refund)

### CURRENT WEEK
* [~] WORK - Website maintenance
* [ ] TECH - Schedule service appointment

# ARCHIVE
## Old Stuff
* [x] Completed task
`;

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.writeTestFileContent(fixtureContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });
  });

  describe('Focus Mode', () => {
    it('should toggle focus mode and interact with WIP tasks', () => {
      // Use existing WIP tasks from fixture
      const existingWipTask = 'BILLS - Phone bill really really really really really really really really really really really really really really really really really long';

      // Verify task is visible in normal mode
      cy.get('.wip-column').should('contain', existingWipTask);

      // Enable focus mode by clicking the Focus button
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Verify Focus button is active
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');

      // Verify WIP tasks are still visible and we can interact with them
      cy.get('.wip-column').should('contain', existingWipTask);

      // Create a new task to test checkbox interaction
      cy.get('.wip-column').contains('.section-header', 'CURRENT WEEK').parent().within(() => {
        cy.get('.add-task-btn').click();
        cy.get('.new-task-input').type('Test checkbox task');
        cy.get('.confirm-edit-btn').click();
      });

      // Now test the checkbox on the new task
      findTask('Test checkbox task').parent().within(() => {
        // First verify it's unchecked
        cy.get('.custom-checkbox').should('have.class', 'unchecked');
        // Click to mark as in-progress
        cy.get('.custom-checkbox').click();
        // Verify it's now in-progress
        cy.get('.custom-checkbox').should('have.class', 'in-progress');
      });
    });

    it('should collapse TODO, PROJECTS, and DONE but expand SELECTED and WIP in focus mode', () => {
      // Start in normal mode - all columns should be expanded
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.projects-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.done-stack').should('not.have.class', 'drawer-collapsed');

      // Enable focus mode
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Verify correct columns are collapsed/expanded
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
      cy.get('.projects-stack').should('have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.done-stack').should('have.class', 'drawer-collapsed');

      // SELECTED column doesn't have collapse behavior, so just verify it's visible
      cy.get('.selected-stack').should('be.visible');
    });

    it('should allow interaction with TODO column after hover in focus mode', () => {
      // Enable focus mode
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Create a new task in TODO after hovering
      cy.get('.todo-stack').trigger('mouseenter');
      cy.wait(1100); // Wait for 1 second hover delay

      // Scroll to the PROJECTS section to ensure it's visible
      findSection('PROJECTS').scrollIntoView();
      cy.wait(100);

      // Add new task to PROJECTS section
      findSection('PROJECTS').within(() => {
        cy.get('.add-task-btn').click({ force: true });
        cy.get('.new-task-input').type('New task in focus mode');
        cy.get('.confirm-edit-btn').click();
      });

      // Verify task was created
      findTask('New task in focus mode').should('exist');

      // Move mouse away and verify TODO column still contains our task
      cy.get('.todo-stack').trigger('mouseleave');
      cy.wait(100);

      // Task should still be there even when column is partially hidden
      cy.get('.todo-column').should('contain', 'New task in focus mode');
    });

    it('should persist focus mode across page reload', () => {
      // Enable focus mode
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Verify it's enabled - button is active and drawers are collapsed
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
      cy.get('.done-stack').should('have.class', 'drawer-collapsed');

      // Reload and verify persistence
      refreshAndWait();

      // Verify focus mode is still enabled
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');

      // Verify we can still interact with tasks
      findTask('TECH - Schedule service appointment').should('be.visible');

      // Disable focus mode by clicking Focus again
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Reload and verify mode stays disabled
      refreshAndWait();

      cy.get('.view-mode-btn').contains('Focus').should('not.have.class', 'active');
      // After disabling view mode, drawer states return to default (expanded)
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should return to normal mode and expand all columns when clicking active Focus button', () => {
      // Enable focus mode
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');

      // Click Focus again to disable (return to normal)
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Verify we're back to normal mode (no active button)
      cy.get('.view-mode-btn').contains('Focus').should('not.have.class', 'active');
      cy.get('.view-mode-btn').contains('Triage').should('not.have.class', 'active');

      // All columns should be expanded
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.projects-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.done-stack').should('not.have.class', 'drawer-collapsed');
    });
  });

  describe('Triage Mode', () => {
    it('should collapse WIP and DONE but expand TODO, PROJECTS, and SELECTED in triage mode', () => {
      // Start in normal mode - all columns should be expanded
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');

      // Enable triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);

      // Verify Triage button is active
      cy.get('.view-mode-btn').contains('Triage').should('have.class', 'active');

      // Verify correct columns are collapsed/expanded
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.projects-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');
      cy.get('.done-stack').should('have.class', 'drawer-collapsed');

      // SELECTED column should be visible
      cy.get('.selected-stack').should('be.visible');
    });

    it('should allow interaction with TODO and PROJECTS columns in triage mode', () => {
      // Enable triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);

      // TODO column should be expanded, so we can add tasks directly
      findSection('PROJECTS').scrollIntoView();
      findSection('PROJECTS').within(() => {
        cy.get('.add-task-btn').click();
        cy.get('.new-task-input').type('Triage mode task');
        cy.get('.confirm-edit-btn').click();
      });

      // Verify task was created
      findTask('Triage mode task').should('exist');
    });

    it('should allow interaction with collapsed WIP column after hover in triage mode', () => {
      // Enable triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);

      // WIP should be collapsed
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');

      // Hover to expand
      cy.get('.wip-stack').trigger('mouseenter');
      cy.wait(1100);

      // Add task to WIP
      cy.get('.wip-column').contains('.section-header', 'CURRENT WEEK').parent().within(() => {
        cy.get('.add-task-btn').click({ force: true });
        cy.get('.new-task-input').type('WIP task in triage mode');
        cy.get('.confirm-edit-btn').click();
      });

      // Verify task was created
      cy.get('.wip-column').should('contain', 'WIP task in triage mode');
    });

    it('should persist triage mode across page reload', () => {
      // Enable triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);

      // Verify it's enabled
      cy.get('.view-mode-btn').contains('Triage').should('have.class', 'active');
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');

      // Reload and verify persistence
      refreshAndWait();

      // Verify triage mode is still enabled
      cy.get('.view-mode-btn').contains('Triage').should('have.class', 'active');
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should return to normal mode when clicking active Triage button', () => {
      // Enable triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);
      cy.get('.view-mode-btn').contains('Triage').should('have.class', 'active');

      // Click Triage again to disable (return to normal)
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);

      // Verify we're back to normal mode (no active button)
      cy.get('.view-mode-btn').contains('Triage').should('not.have.class', 'active');
      cy.get('.view-mode-btn').contains('Focus').should('not.have.class', 'active');

      // Drawer states return to default (all expanded)
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
    });
  });

  describe('Mode Switching', () => {
    it('should switch directly from Triage to Focus mode', () => {
      // Enable triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);
      cy.get('.view-mode-btn').contains('Triage').should('have.class', 'active');
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');

      // Switch directly to focus mode
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);

      // Verify Focus is now active and Triage is not
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');
      cy.get('.view-mode-btn').contains('Triage').should('not.have.class', 'active');

      // Verify focus mode drawer states
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should switch directly from Focus to Triage mode', () => {
      // Enable focus mode
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');

      // Switch directly to triage mode
      cy.get('.view-mode-btn').contains('Triage').click();
      cy.wait(100);

      // Verify Triage is now active and Focus is not
      cy.get('.view-mode-btn').contains('Triage').should('have.class', 'active');
      cy.get('.view-mode-btn').contains('Focus').should('not.have.class', 'active');

      // Verify triage mode drawer states
      cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');
    });
  });

  describe('WIP Column Drawer', () => {
    it('should have a toggle button for WIP drawer when expanded', () => {
      // WIP column should be expanded by default
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');

      // Find the hide button (←) in WIP column header
      cy.get('.wip-column .column-header-buttons .drawer-toggle-btn').should('exist');
      cy.get('.wip-column .column-header-buttons .drawer-toggle-btn').should('contain', '←');
    });

    it('should collapse WIP drawer when clicking hide button', () => {
      // Click the hide button
      cy.get('.wip-column .column-header-buttons .drawer-toggle-btn').click();
      cy.wait(100);

      // Verify WIP is collapsed
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');

      // Verify the expand button (→) appears
      cy.get('.wip-column .column-title-container .drawer-toggle-btn').should('contain', '→');
    });

    it('should expand WIP drawer when clicking show button', () => {
      // First collapse it
      cy.get('.wip-column .column-header-buttons .drawer-toggle-btn').click();
      cy.wait(100);
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');

      // Click the expand button
      cy.get('.wip-column .column-title-container .drawer-toggle-btn').click();
      cy.wait(100);

      // Verify WIP is expanded
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should persist WIP drawer state across page reload', () => {
      // Collapse WIP drawer
      cy.get('.wip-column .column-header-buttons .drawer-toggle-btn').click();
      cy.wait(100);
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');

      // Reload and verify persistence
      refreshAndWait();

      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');

      // Expand again
      cy.get('.wip-column .column-title-container .drawer-toggle-btn').click();
      cy.wait(100);

      // Reload and verify it stays expanded
      refreshAndWait();

      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should exit view mode when manually toggling WIP drawer but preserve other column states', () => {
      // Enable focus mode (WIP is expanded, TODO/PROJECTS/DONE collapsed)
      cy.get('.view-mode-btn').contains('Focus').click();
      cy.wait(100);
      cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');
      cy.get('.wip-stack').should('not.have.class', 'drawer-collapsed');
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
      cy.get('.projects-stack').should('have.class', 'drawer-collapsed');

      // Manually collapse WIP
      cy.get('.wip-column .column-header-buttons .drawer-toggle-btn').click();
      cy.wait(100);

      // View mode should be deactivated (back to normal)
      cy.get('.view-mode-btn').contains('Focus').should('not.have.class', 'active');
      cy.get('.view-mode-btn').contains('Triage').should('not.have.class', 'active');

      // WIP is now collapsed (we just toggled it)
      cy.get('.wip-stack').should('have.class', 'drawer-collapsed');

      // Other columns should remain in their focus mode state (collapsed)
      cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
      cy.get('.projects-stack').should('have.class', 'drawer-collapsed');
    });
  });
});
