import { refreshAndWait, findSection, findTask } from '../support/helpers'
import { setupTestSuite } from '../support/test-base'

setupTestSuite('Task CRUD Operations', () => {
    it('should create new task, edit it, and delete it', () => {
        // Using actual section from the file
        const sectionName = 'PROJECTS'
        const newTaskText = 'Test task to create'
        const editedTaskText = 'Test task edited'

        // Create new task
        findSection(sectionName).within(() => {
            cy.get('.add-task-btn').click()

            // New task should appear with edit mode active
            cy.get('.task-text-edit').should('be.visible')
            cy.get('.task-text-edit').type(newTaskText)
            cy.get('.confirm-task-btn').click()
        })

        // Verify task created
        findTask(newTaskText).should('exist')

        // Refresh and verify persistence
        refreshAndWait()
        findTask(newTaskText).should('exist')

        // Click edit button on the specific task
        cy.contains('.task-card', newTaskText).find('.edit-btn').click()

        // Just find the textarea directly - there should only be one in edit mode
        cy.get('.task-text-edit').should('be.visible')
        cy.get('.task-text-edit').clear().type(editedTaskText)
        cy.get('.confirm-task-btn').click()

        // Verify task edited
        findTask(editedTaskText).should('exist')
        findTask(newTaskText).should('not.exist')

        // Refresh and verify edit persisted
        refreshAndWait()
        findTask(editedTaskText).should('exist')

        // Delete the task
        findTask(editedTaskText).within(() => {
            cy.get('.delete-btn').click()
            // Confirm delete
            cy.get('.confirm-delete-btn').click()
        })

        // Verify task deleted
        cy.contains('.task-card', editedTaskText).should('not.exist')

        // Refresh and verify deletion persisted
        refreshAndWait()
        cy.contains('.task-card', editedTaskText).should('not.exist')
    })

    it('should cancel task creation when escape is pressed', () => {
        // Using actual section
        const sectionName = 'HOBBY'

        findSection(sectionName).within(() => {
            // Count initial tasks
            cy.get('.task-card').then($tasks => {
                const initialCount = $tasks.length

                // Start creating new task
                cy.get('.add-task-btn').click()
                cy.get('.task-text-edit').type('Task to cancel')

                // Press escape to cancel
                cy.get('.task-text-edit').type('{esc}')

                // Verify task count unchanged
                cy.get('.task-card').should('have.length', initialCount)
            })
        })
    })
})