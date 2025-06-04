import { refreshAndWait, findSection } from '../support/helpers.js'

describe('Section Drag and Drop', () => {
    beforeEach(() => {
        // Visit the app
        cy.visit('/')
        cy.contains('TO_s_DO_pid').should('be.visible')
        cy.contains('.file-tab', 'example').click()
        cy.wait(500) // Allow data to load
    })

    it('should move section between columns and persist', () => {
        const sectionName = 'PROJECTS'

        // Verify starting position
        cy.get('.todo-column').first().within(() => {
            findSection(sectionName).should('exist')
        })

        // Drag to WIP column
        // cy.get('.section').contains(sectionName).drag('.wip-column .section-list')
        cy.get('.section').contains(sectionName).drag('.section:contains("WIP") .section-header')

        // Verify new position - use more direct verification
        cy.get('.wip-column').first()
            .should('contain', sectionName)
        cy.get('.todo-column').first()
            .should('not.contain', sectionName)

        // Verify persistence
        refreshAndWait()
        cy.get('.wip-column').first()
            .should('contain', sectionName)
    })


})