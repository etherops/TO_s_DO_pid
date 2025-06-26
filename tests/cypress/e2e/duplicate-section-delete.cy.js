import { refreshAndWait, findSection } from '../support/helpers.js'

describe('Duplicate Section Name Deletion', () => {
    it('should correctly delete the second section when two sections have the same name', () => {
        const duplicateName = 'Duplicate Section'
        const uniqueTaskText = 'Task in first section'

        // Create first section with duplicate name
        cy.get('.column-stack').eq(1).find('.wip-column').first().within(() => {
            cy.get('.add-section-btn').click()
            cy.get('.section').last().as('firstSection')
        })

        // Name the first section
        cy.get('@firstSection').within(() => {
            cy.get('.section-name-edit').should('be.visible')
            cy.get('.section-name-edit').clear().type(duplicateName)
            cy.get('.confirm-section-btn').click()
        })

        // Add a task to the first section to make it non-deletable
        cy.get('@firstSection').within(() => {
            cy.get('.add-task-btn').click()
            cy.get('.new-task-input').should('be.visible')
            cy.get('.new-task-input').type(uniqueTaskText)
            cy.get('.confirm-edit-btn').click()
        })

        // Create second section with the same name
        cy.get('.column-stack').eq(1).find('.wip-column').first().within(() => {
            cy.get('.add-section-btn').click()
            cy.get('.section').last().as('secondSection')
        })

        // Name the second section with the same name
        cy.get('@secondSection').within(() => {
            cy.get('.section-name-edit').should('be.visible')
            cy.get('.section-name-edit').clear().type(duplicateName)
            cy.get('.confirm-section-btn').click()
        })

        // Verify both sections exist
        cy.get('.section-header').filter(`:contains("${duplicateName}")`).should('have.length', 2)

        // Try to delete the second section (should work since it's empty)
        // Get all sections with the duplicate name and target the last one
        cy.get('.section-header').filter(`:contains("${duplicateName}")`).last().parent().within(() => {
            cy.get('.delete-section-btn').should('be.visible').click()
            cy.get('.confirm-delete-btn').should('be.visible').click()
        })

        // Verify only one section remains
        cy.get('.section-header').filter(`:contains("${duplicateName}")`).should('have.length', 1)

        // Verify the remaining section has the task (proving it's the first one)
        findSection(duplicateName).within(() => {
            cy.contains(uniqueTaskText).should('exist')
        })

        // Verify the first section cannot be deleted (has tasks)
        findSection(duplicateName).within(() => {
            cy.get('.delete-section-btn').should('have.class', 'non-clickable')
        })

        // Refresh and verify persistence
        refreshAndWait()
        cy.get('.section-header').filter(`:contains("${duplicateName}")`).should('have.length', 1)
        findSection(duplicateName).within(() => {
            cy.contains(uniqueTaskText).should('exist')
        })
    })

    it('should handle multiple duplicate sections correctly', () => {
        const duplicateName = 'Multi Duplicate'
        
        // Create three sections with the same name
        for (let i = 1; i <= 3; i++) {
            cy.get('.column-stack').eq(1).find('.wip-column').first().within(() => {
                cy.get('.add-section-btn').click()
                cy.get('.section').last().within(() => {
                    cy.get('.section-name-edit').should('be.visible')
                    cy.get('.section-name-edit').clear().type(duplicateName)
                    cy.get('.confirm-section-btn').click()
                })
            })

            // Add task to identify each section
            cy.get('.section').last().within(() => {
                cy.get('.add-task-btn').click()
                cy.get('.new-task-input').should('be.visible')
                cy.get('.new-task-input').type(`Task ${i}`)
                cy.get('.confirm-edit-btn').click()
            })
        }

        // Verify all three sections exist
        cy.get('.section-header').filter(`:contains("${duplicateName}")`).should('have.length', 3)

        // Mark task as complete in the section containing Task 2
        cy.contains('.task-card', 'Task 2').within(() => {
            cy.get('.custom-checkbox').click()
        })

        // Delete Task 2
        cy.contains('.task-card', 'Task 2').within(() => {
            cy.get('.delete-btn').click()
            cy.get('.confirm-delete-btn').click()
        })

        // Wait for the task to be deleted
        cy.contains('.task-card', 'Task 2').should('not.exist')

        // Now find and delete the second section (which should now be empty)
        // Get all sections with duplicate name and find the one without tasks
        cy.get('.section-header')
            .filter(`:contains("${duplicateName}")`)
            .parent()
            .then(sections => {
                // Find the section with no tasks
                const emptySection = [...sections].find(section => {
                    return Cypress.$(section).find('.task-card').length === 0
                })
                
                // Delete the empty section
                cy.wrap(emptySection).within(() => {
                    cy.get('.delete-section-btn').should('be.visible').click()
                    cy.get('.confirm-delete-btn').should('be.visible').click()
                })
            })

        // Verify only two sections remain
        cy.get('.section-header').filter(`:contains("${duplicateName}")`).should('have.length', 2)

        // Verify the correct sections remain (first and third)
        cy.contains('Task 1').should('exist')
        cy.contains('Task 2').should('not.exist')
        cy.contains('Task 3').should('exist')
    })
})