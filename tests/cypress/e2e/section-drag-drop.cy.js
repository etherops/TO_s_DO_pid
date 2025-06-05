import { refreshAndWait, findSection } from '../support/helpers.js'

describe('Section Drag and Drop', () => {
    it('should move section between columns and persist', () => {
        const sectionName = 'PROJECTS'

        // Verify starting position - TO DO section should be in TODO column
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