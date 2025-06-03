import { refreshAndWait, findSection } from '../support/helpers.js'

describe('WIP Section CRUD Operations', () => {
    it('should create new section in TODO column, edit name, and delete', () => {
        const newSectionName = 'Test Section'
        const editedSectionName = 'Edited Test Section'

        // Create new section in TODO column (first one in the stack)
        cy.get('.column-stack').eq(0).find('.todo-column').first().within(() => {
            cy.get('.add-section-btn').click()
            cy.get('.section').first().as('newSection')
        })

        // New section should appear in edit mode automatically
        cy.get('@newSection').within(() => {
            cy.get('.section-name-edit').should('be.visible')
            cy.get('.section-name-edit').should('have.focus')
            cy.get('.section-name-edit').clear().type(newSectionName)
            cy.get('.confirm-section-btn').click()
        })

        // Verify section renamed
        findSection(newSectionName).should('exist')

        // Refresh and verify persistence
        refreshAndWait()
        findSection(newSectionName).should('exist')

        // Edit again - click edit button
        findSection(newSectionName).find('.edit-section-btn').click()
        
        // Wait for edit mode to be active
        cy.get('.section-name-edit').should('be.visible').and('have.focus')
        
        // Type new name and confirm
        cy.get('.section-name-edit').clear().type(editedSectionName)
        cy.get('.confirm-section-btn').click()

        // Verify edited
        findSection(editedSectionName).should('exist')

        // Delete the section (only works if empty)
        findSection(editedSectionName).within(() => {
            cy.get('.delete-section-btn').click()
            cy.get('.confirm-delete-btn').click()
        })

        // Verify deleted
        cy.contains('.section-header', editedSectionName).should('not.exist')

        // Refresh and verify deletion persisted
        refreshAndWait()
        cy.contains('.section-header', editedSectionName).should('not.exist')
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