import { refreshAndWait, findTask } from '../support/helpers.js'

describe('Task Status Toggle', () => {
    it('should toggle task status and persist after refresh', () => {
        // Find a known task in TODO state - using actual task from PROJECTS section
        const taskText = 'PROJECT - Outdoor activities'

        // Verify initial state (unchecked)
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'unchecked')
        })

        // Click to change to completed
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').click()
        })

        // Verify changed to completed
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'checked')
        })

        // Refresh and verify persisted
        refreshAndWait()

        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'checked')
        })

        // Click to change to in-progress
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').click()
        })

        // Verify changed to in-progress
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'in-progress')
        })

        // Refresh and verify persisted
        refreshAndWait()

        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'in-progress')
        })

        // Settled in-progress starts with done, then blocked on the next rapid click.
        findTask(taskText).find('.custom-checkbox').click()
        findTask(taskText).find('.custom-checkbox').click()
        findTask(taskText).find('.custom-checkbox').should('have.class', 'status-blocked')
        refreshAndWait()
        findTask(taskText).find('.custom-checkbox').should('have.class', 'status-blocked')

        // Blocked advances to cancelled.
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').click()
        })

        // Verify changed to cancelled
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'cancelled')
        })

        // Refresh and verify persisted
        refreshAndWait()

        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'cancelled')
        })

        // Click to cycle back to unchecked
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').click()
        })

        // Verify back to unchecked
        findTask(taskText).within(() => {
            cy.get('.custom-checkbox').should('have.class', 'unchecked')
        })
    })
})
