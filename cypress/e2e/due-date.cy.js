import { refreshAndWait, findTask } from '../support/helpers'
import { setupTestSuite } from '../support/test-base'

setupTestSuite('Due Date Management', () => {
    it('should add due date to task and persist', () => {
        // Using actual task without due date from HELPER section
        const taskText = 'HOME - Lawn care'

        // Find task and verify no due date initially
        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('not.have.class', 'has-due-date')
            cy.get('.clock-btn').click()
        })

        // Date picker should appear
        cy.get('.date-picker-container').should('be.visible')

        // Set a date (tomorrow)
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateString = tomorrow.toISOString().split('T')[0]

        cy.get('.date-picker-input').clear().type(dateString)
        cy.get('.date-picker-confirm-btn').click()

        // Verify date picker closed
        cy.get('.date-picker-container').should('not.exist')

        // Verify task now shows due date indicator
        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('have.class', 'has-due-date')
            // Task should have the due-soon class
            cy.get('.task-title').should('have.class', 'due-soon')
        })

        // Refresh and verify persistence
        refreshAndWait()

        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('have.class', 'has-due-date')
            cy.get('.task-title').should('have.class', 'due-soon')
        })
    })

    it('should clear due date from task', () => {
        // Using actual task that already has a due date
        const taskText = 'PROJECT - Mountain trip planning'

        // Verify task already has due date
        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('have.class', 'has-due-date')
            cy.get('.clock-btn').click()
        })

        // Clear the date
        cy.get('.date-picker-clear-btn').click()

        // Verify date picker closed and due date removed
        cy.get('.date-picker-container').should('not.exist')

        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('not.have.class', 'has-due-date')
            cy.get('.task-title').should('not.have.class', 'due-date')
        })

        // Refresh and verify cleared date persisted
        refreshAndWait()

        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('not.have.class', 'has-due-date')
        })
    })
})