import { refreshAndWait, findTask, findSection } from '../support/helpers.js'

describe('Drag and Drop Tasks', () => {
    it('should move task between sections and persist', () => {
        const taskText = 'HOME - Garden maintenance'

        // Verify starting position
        findSection('HELPER').contains('.task-card', taskText).should('exist')

        // Drag to HOBBY section
        cy.get('.task-card').contains(taskText).drag('.section:contains("HOBBY") .task-list')

        // Verify new position
        findSection('HOBBY').contains('.task-card', taskText).should('exist')
        findSection('HELPER').contains('.task-card', taskText).should('not.exist')

        // Verify persistence
        refreshAndWait()
        findSection('HOBBY').contains('.task-card', taskText).should('exist')
    })

    it('should auto-sort task when dropped into partially collapsed section', () => {
        // Set up a section with mixed task statuses
        const fixtureContent = `# TODO
## Test Section
* [x] Completed task
* [~] In progress task
* [ ] Todo task 1

## Source Section
* [ ] Task to drag
`;
        cy.writeTestFileContent(fixtureContent).then((fileInfo) => {
            cy.wait(500);
            cy.reload();
            cy.contains('TO_s_DO_pid').should('be.visible');
            cy.switchToFile(fileInfo.fileName);
        });

        // Enable partial collapse (Focus) on Test Section
        findSection('Test Section').within(() => {
            cy.get('.toggle-btn').contains('Focus').click();
        });
        cy.wait(300);

        // Drag todo task from Source Section to Test Section
        cy.get('.task-card').contains('Task to drag').drag('.section:contains("Test Section") .task-list');
        cy.wait(400);

        // Verify the dropped task is sorted correctly (after completed/in-progress tasks)
        // In a sorted section: completed first, then in-progress, then todo
        findSection('Test Section').within(() => {
            // Filter out summary cards, only get actual task cards
            cy.get('.task-card:not(.summary-card)').then($cards => {
                const texts = [...$cards].map(el => el.textContent);
                // Find positions of tasks
                const completedIdx = texts.findIndex(t => t.includes('Completed task'));
                const inProgressIdx = texts.findIndex(t => t.includes('In progress task'));
                const draggedTaskIdx = texts.findIndex(t => t.includes('Task to drag'));
                // Dragged todo task should come after completed and in-progress tasks
                expect(draggedTaskIdx).to.be.greaterThan(completedIdx);
                expect(draggedTaskIdx).to.be.greaterThan(inProgressIdx);
            });
        });
    })
})