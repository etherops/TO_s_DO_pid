import { refreshAndWait, findSection } from '../support/helpers.js'

describe('WIP Section CRUD Operations', () => {
    it.only('should create new section in TODO column, validate raw-text inheritance, and test deletion with second section', () => {
        const firstSectionName = 'First Test Section'
        const secondSectionName = 'Second Test Section'
        const editedSecondSectionName = 'Edited Second Section'

        // Create first new section in TODO column (first non-raw-text one in the stack)
        cy.get('.column-stack').eq(0).find('.todo-column').not('.raw-text-column').first().within(() => {
            cy.get('.add-section-btn').click()
            cy.get('.section').first().as('firstNewSection')
        })

        // First section should appear in edit mode automatically
        cy.get('@firstNewSection').within(() => {
            cy.get('.section-name-edit').should('be.visible')
            cy.get('.section-name-edit').should('have.focus')
            cy.get('.section-name-edit').clear().type(firstSectionName)
            cy.get('.confirm-section-btn').click()
        })

        // Verify first section was created
        findSection(firstSectionName).should('exist')

        // Refresh and verify persistence - this will cause the section to inherit raw-text items
        // it will not be delete-able because of the raw-text item, so we now create a second section to delete...
        //  annoying, i know.
        refreshAndWait()
        findSection(firstSectionName).should('exist')

        // Create second section that should remain empty and deletable
        cy.get('.column-stack').eq(0).find('.todo-column').not('.raw-text-column').first().within(() => {
            cy.get('.add-section-btn').click()
            cy.get('.section').first().as('secondNewSection')
        })

        // Second section should appear in edit mode automatically
        cy.get('@secondNewSection').within(() => {
            cy.get('.section-name-edit').should('be.visible')
            cy.get('.section-name-edit').should('have.focus')
            cy.get('.section-name-edit').clear().type(secondSectionName)
            cy.get('.confirm-section-btn').click()
        })

        // Verify second section was created
        findSection(secondSectionName).should('exist')

        // Edit the second section name
        findSection(secondSectionName).find('.edit-section-btn').click()
        
        // Wait for edit mode to be active
        cy.get('.section-name-edit').should('be.visible').and('have.focus')
        
        // Type new name and confirm
        cy.get('.section-name-edit').clear().type(editedSecondSectionName)
        cy.get('.confirm-section-btn').click()

        // Verify edited
        findSection(editedSecondSectionName).should('exist')

        // Delete the second section (should work since it's empty)
        findSection(editedSecondSectionName).within(() => {
            cy.get('.delete-section-btn').should('be.visible').click()
            cy.get('.confirm-delete-btn', { timeout: 10000 }).should('be.visible').click()
        })

        // Verify second section was deleted
        cy.contains('.section-header', editedSecondSectionName).should('not.exist')

        // Refresh and verify deletion persisted
        refreshAndWait()
        cy.contains('.section-header', editedSecondSectionName).should('not.exist')
        
        // Verify first section still exists with its raw-text item
        findSection(firstSectionName).should('exist')
    })
})

describe('TODO Section CRUD Operations', () => {
    it('should create new section in WIP column', () => {
        const newSectionName = 'WIP Test Section'

        // Create new section in WIP column (first one in the stack)
        cy.get('.column-stack').eq(1).find('.wip-column').first().within(() => {
            cy.get('.add-section-btn').click()
            cy.get('.section').last().as('newSection')
        })

        // New section should appear in edit mode automatically
        cy.get('@newSection').within(() => {
            cy.get('.section-name-edit').should('be.visible')
            cy.get('.section-name-edit').should('have.focus')
            cy.get('.section-name-edit').clear().type(newSectionName)
            cy.get('.confirm-section-btn').click()
        })

        // Verify in WIP column and has archive button
        cy.get('.column-stack').eq(1).find('.wip-column').first().within(() => {
            cy.get('@newSection').should('exist')
            cy.get('@newSection').find('.archive-section-btn').should('exist')
        })

        // Clean up - delete the section
        cy.get('@newSection').within(() => {
            cy.get('.delete-section-btn').click()
            cy.get('.confirm-delete-btn').click()
        })
    })
})

describe('Section DELETE protection', () => {
    it('should not allow deleting section with tasks', () => {
        // Using actual section that has tasks
        const sectionWithTasks = 'PROJECTS' // We know this has tasks

        findSection(sectionWithTasks).within(() => {
            // Delete button should be disabled/non-clickable
            cy.get('.delete-section-btn').should('have.class', 'non-clickable')

            // Clicking should not show confirmation
            cy.get('.delete-section-btn').click({ force: true })
            cy.get('.confirm-delete-btn').should('not.exist')
        })
    })
})