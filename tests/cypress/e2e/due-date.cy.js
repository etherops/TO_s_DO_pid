import { refreshAndWait, findTask } from '../support/helpers.js'

describe('Due Date Management', () => {
    it('should add due date to task and persist', () => {
        // Using actual task without due date from HELPER section
        const taskText = 'HOME - Lawn care'

        // Find task and verify no due date initially
        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('not.have.class', 'has-due-date')
            cy.get('.clock-btn').click()
        })

        // Edit mode should open with date picker visible
        cy.get('.compact-date-picker').should('be.visible')
        cy.get('.date-input').should('be.focused')

        // Set a date (tomorrow)
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateString = tomorrow.toISOString().split('T')[0]

        cy.get('.date-input').clear().type(dateString)
        
        // Save the changes
        cy.get('.confirm-edit-btn').click()

        // Verify edit mode closed
        cy.get('.compact-date-picker').should('not.exist')

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

        // Edit mode should open with date picker visible and date filled
        cy.get('.compact-date-picker').should('be.visible')
        cy.get('.date-input').should('not.have.value', '')

        // Clear the date using the clear button
        cy.get('.clear-btn').click()

        // Verify date input is cleared
        cy.get('.date-input').should('have.value', '')

        // Save the changes
        cy.get('.confirm-edit-btn').click()

        // Verify edit mode closed and due date removed
        cy.get('.compact-date-picker').should('not.exist')

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

    it('should show past due styling for overdue tasks', () => {
        const taskText = 'HOME - Lawn care'

        // Find task and add a past due date
        findTask(taskText).within(() => {
            cy.get('.clock-btn').click()
        })

        // Set a date 5 days in the past
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 5)
        const dateString = pastDate.toISOString().split('T')[0]

        cy.get('.date-input').clear().type(dateString)
        cy.get('.confirm-edit-btn').click()

        // Verify past due styling is applied
        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('have.class', 'has-due-date')
            cy.get('.task-title').should('have.class', 'due-past')
            // Past due tasks should have animation (may include hash suffix)
            cy.get('.task-title')
                .should('have.css', 'animation-name')
                .and('match', /pulse/)
        })

        // Test with a date from earlier this year (e.g., May 1 when it's June)
        findTask(taskText).within(() => {
            cy.get('.clock-btn').click()
        })

        // Set May 1 of current year
        const may1 = new Date()
        may1.setMonth(4) // May is month 4 (0-indexed)
        may1.setDate(1)
        const may1String = may1.toISOString().split('T')[0]

        cy.get('.date-input').clear().type(may1String)
        cy.get('.confirm-edit-btn').click()

        // Verify it still shows as past due (not interpreted as next year)
        findTask(taskText).within(() => {
            cy.get('.task-title').should('have.class', 'due-past')
        })

        // Refresh and verify persistence
        refreshAndWait()

        findTask(taskText).within(() => {
            cy.get('.task-title').should('have.class', 'due-past')
        })
    })

    it('should navigate dates using navigation buttons', () => {
        const taskText = 'HOME - Garden maintenance'

        // Click clock button to enter edit mode
        findTask(taskText).within(() => {
            cy.get('.clock-btn').click()
        })

        // Set today's date using Today button
        cy.get('.today-btn').click()
        
        // Verify a date is set (not empty)
        cy.get('.date-input').should('not.have.value', '')
        
        // Store the current date value
        cy.get('.date-input').invoke('val').then((todayValue) => {
            // Click next day button
            cy.get('.nav-btn').last().click()
            
            // Verify date changed (moved forward)
            cy.get('.date-input').invoke('val').should('not.equal', todayValue)
            
            // Click previous day button to go back
            cy.get('.nav-btn').first().click()
            
            // Should be back to today's date
            cy.get('.date-input').should('have.value', todayValue)
            
            // Click previous day button again to go to yesterday
            cy.get('.nav-btn').first().click()
            
            // Verify date changed again (moved backward)
            cy.get('.date-input').invoke('val').should('not.equal', todayValue)
        })

        // Save and verify
        cy.get('.confirm-edit-btn').click()
        
        findTask(taskText).within(() => {
            cy.get('.clock-btn').should('have.class', 'has-due-date')
        })
    })
})