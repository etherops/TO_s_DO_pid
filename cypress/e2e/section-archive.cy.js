import { refreshAndWait, findSection } from '../support/helpers'
import { setupTestSuite } from '../support/test-base'

setupTestSuite('Section Archiving', () => {
    it('should archive WIP section to DONE column', () => {
        // Using actual archivable section from WIP
        const sectionName = 'CURRENT WEEK (Week of May 1'

        // Verify section starts in WIP column
        cy.get('.wip-column').within(() => {
            findSection(sectionName).should('exist')
        })

        // Find and click archive button
        findSection(sectionName).within(() => {
            cy.get('.archive-section-btn').click()
        })

        // Verify section moved to DONE column
        cy.get('.done-column').within(() => {
            findSection(sectionName).should('exist')
        })

        // Verify section no longer in WIP column
        cy.get('.wip-column').within(() => {
            cy.contains('.section-header', sectionName).should('not.exist')
        })

        // Refresh and verify persistence
        refreshAndWait()

        cy.get('.done-column').within(() => {
            findSection(sectionName).should('exist')
        })

        cy.get('.wip-column').within(() => {
            cy.contains('.section-header', sectionName).should('not.exist')
        })
    })
})