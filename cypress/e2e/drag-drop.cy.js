import { refreshAndWait, findTask, findSection } from '../support/helpers'

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
})