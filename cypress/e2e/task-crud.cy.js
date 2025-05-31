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

            // New task should appear with simplified edit mode active
            cy.get('.new-task-input').should('be.visible')
            cy.get('.new-task-input').should('have.focus')
            cy.get('.new-task-input').type(newTaskText)
            cy.get('.confirm-edit-btn').click()
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
        cy.get('.confirm-edit-btn').click()

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
                cy.get('.new-task-input').type('Task to cancel')

                // Press escape to cancel
                cy.get('.new-task-input').type('{esc}')

                // Verify task count unchanged
                cy.get('.task-card').should('have.length', initialCount)
            })
        })
    })

    it('should support shift+click for simple edit mode', () => {
        // Find a task with notes
        const fullTaskText = 'BILLS - Phone bill really really really really really really really really really really really really really really really really really long'
        const displayText = 'Phone bill really really really really really really really really really really really really really really really really really long'
        const noteText = 'Jan 14, follow up about refund'
        
        // First verify the task exists and has notes
        findTask(displayText).should('exist')
        findTask(displayText).within(() => {
            cy.get('.notes-btn').should('have.class', 'has-notes')
        })

        // Click edit button with shift key for simple edit mode
        findTask(displayText).within(() => {
            cy.get('.edit-btn').click({ shiftKey: true })
        })

        // Should show simple edit interface with full text
        cy.get('.new-task-input').should('be.visible')
        cy.get('.new-task-input').invoke('val').should('equal', `${fullTaskText} (${noteText})`)
        
        // Cancel to exit edit mode
        cy.get('.cancel-edit-btn').click()

        // Now try regular edit mode for comparison
        findTask(displayText).within(() => {
            cy.get('.edit-btn').click({ shiftKey: false })
        })

        // Should show full edit interface with separate fields
        cy.get('.task-text-edit').should('be.visible')
        cy.get('.note-text-edit').should('be.visible')
        cy.get('.task-text-edit').should('have.value', fullTaskText)
        cy.get('.note-text-edit').should('have.value', noteText)
        
        // Cancel
        cy.get('.cancel-edit-btn').click()
    })

    it('should save changes from simple edit mode', () => {
        const sectionName = 'PROJECTS'
        const originalText = 'PROJECT - Outdoor activities'
        const newFullText = 'Updated outdoor project (with a new note) !!(2024-12-25)'
        
        // Find the task
        findTask(originalText).should('exist')
        
        // Shift+click to enter simple edit mode
        findTask(originalText).within(() => {
            cy.get('.edit-btn').click({ shiftKey: true })
        })
        
        // Edit the full text
        cy.get('.new-task-input').clear().type(newFullText)
        cy.get('.confirm-edit-btn').click()
        
        // Verify the task was updated correctly
        findTask('Updated outdoor project').should('exist')
        findTask('Updated outdoor project').within(() => {
            cy.get('.task-title').should('have.text', 'Updated outdoor project')
            cy.get('.notes-btn').should('have.class', 'has-notes')
            cy.get('.notes-btn').should('have.attr', 'title', 'with a new note')
            cy.get('.clock-btn').should('have.class', 'has-due-date')
        })
        
        // Verify persistence
        refreshAndWait()
        findTask('Updated outdoor project').should('exist')
    })
})