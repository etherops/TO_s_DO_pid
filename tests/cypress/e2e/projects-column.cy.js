import { refreshAndWait } from '../support/helpers.js';

describe('Projects Column', () => {
    // Custom fixture content with a PROJECTS column
    const fixtureContent = `# TODO
## Backlog
* [ ] Todo task 1
* [ ] Todo task 2

# PROJECTS
## Active Projects
* [ ] Project task 1
* [~] Project task 2 in progress

## Future Projects
* [ ] Future project idea

# SELECTED
## Ready
* [ ] Selected task 1

# SCHEDULED
## This Week
* [~] WIP task 1

# ARCHIVE
## Old Stuff
* [x] Completed task
`;

    beforeEach(() => {
        // Write custom content and reload
        cy.writeTestFileContent(fixtureContent).then((fileInfo) => {
            cy.wait(500);
            cy.reload();
            cy.contains('TO_s_DO_pid').should('be.visible');
            cy.switchToFile(fileInfo.fileName);
        });
    });

    it('should display PROJECTS column between TODO and SELECTED', () => {
        // Verify column stacks exist in correct order: TODO, PROJECTS, SELECTED, WIP, DONE
        cy.get('.column-stack').should('have.length.at.least', 4);

        // TODO stack should be first
        cy.get('.column-stack').eq(0).within(() => {
            cy.get('.todo-column').should('exist');
            cy.contains('.column-header', 'TODO').should('be.visible');
        });

        // PROJECTS stack should be second
        cy.get('.column-stack').eq(1).within(() => {
            cy.get('.projects-column').should('exist');
            cy.contains('.column-header', 'PROJECTS').should('be.visible');
        });

        // SELECTED stack should be third
        cy.get('.column-stack').eq(2).within(() => {
            cy.get('.selected-column').should('exist');
            cy.contains('.column-header', 'SELECTED').should('be.visible');
        });
    });

    it('should show PROJECTS column sections and tasks', () => {
        cy.get('.projects-column').within(() => {
            // Verify sections exist
            cy.contains('.section-header', 'Active Projects').should('be.visible');
            cy.contains('.section-header', 'Future Projects').should('be.visible');

            // Verify tasks exist
            cy.contains('.task-card', 'Project task 1').should('be.visible');
            cy.contains('.task-card', 'Project task 2 in progress').should('be.visible');
        });
    });

    it('should have drawer toggle buttons for PROJECTS column', () => {
        // When expanded, should show hide button (←) on the right
        cy.get('.projects-column .column-header-buttons .drawer-toggle-btn')
            .should('be.visible')
            .should('contain', '←');
    });

    it('should collapse PROJECTS column when drawer toggle is clicked', () => {
        // Get initial width
        cy.get('.projects-stack').invoke('outerWidth').then((initialWidth) => {
            // Click the hide button
            cy.get('.projects-column .column-header-buttons .drawer-toggle-btn').click();
            cy.wait(400); // Wait for animation

            // Verify column is collapsed (125px)
            cy.get('.projects-stack').should('have.class', 'drawer-collapsed');
            cy.get('.projects-stack').invoke('outerWidth').should('be.lessThan', initialWidth);

            // Header buttons should be hidden when collapsed
            cy.get('.projects-stack .column-header-buttons').should('not.be.visible');

            // Show button should appear in title container
            cy.get('.projects-column .column-title-container .drawer-toggle-btn')
                .should('be.visible')
                .should('contain', '→');
        });
    });

    it('should expand PROJECTS column when expand button is clicked', () => {
        // First collapse it
        cy.get('.projects-column .column-header-buttons .drawer-toggle-btn').click();
        cy.wait(400);
        cy.get('.projects-stack').should('have.class', 'drawer-collapsed');

        // Now expand it
        cy.get('.projects-column .column-title-container .drawer-toggle-btn').click();
        cy.wait(400);

        // Verify expanded
        cy.get('.projects-stack').should('not.have.class', 'drawer-collapsed');
        cy.get('.projects-column .column-header-buttons .drawer-toggle-btn').should('be.visible');
    });

    it('should persist PROJECTS drawer state across refresh', () => {
        // Collapse the drawer
        cy.get('.projects-column .column-header-buttons .drawer-toggle-btn').click();
        cy.wait(400);
        cy.get('.projects-stack').should('have.class', 'drawer-collapsed');

        // Refresh
        refreshAndWait();

        // Should still be collapsed
        cy.get('.projects-stack').should('have.class', 'drawer-collapsed');

        // Expand it
        cy.get('.projects-column .column-title-container .drawer-toggle-btn').click();
        cy.wait(400);

        // Refresh again
        refreshAndWait();

        // Should be expanded
        cy.get('.projects-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should collapse PROJECTS in focus mode', () => {
        // Enable focus mode
        cy.get('.toggle-switch').contains('Focus Mode').click();
        cy.wait(400);

        // PROJECTS should be collapsed
        cy.get('.projects-stack').should('have.class', 'drawer-collapsed');

        // TODO should also be collapsed
        cy.get('.todo-stack').should('have.class', 'drawer-collapsed');

        // Disable focus mode
        cy.get('.toggle-switch').contains('Focus Mode').click();
        cy.wait(400);

        // Both should be expanded
        cy.get('.projects-stack').should('not.have.class', 'drawer-collapsed');
        cy.get('.todo-stack').should('not.have.class', 'drawer-collapsed');
    });

    it('should allow adding sections to PROJECTS column', () => {
        // Count sections before
        cy.get('.projects-column .section').then(($sections) => {
            const countBefore = $sections.length;

            cy.get('.projects-column .column-header-buttons .add-section-btn').click();

            // New section should appear in edit mode at the top
            cy.get('.projects-column .section').first().within(() => {
                cy.get('.section-name-edit').should('be.visible');
            });

            // Should have one more section
            cy.get('.projects-column .section').should('have.length', countBefore + 1);
        });
    });
});
