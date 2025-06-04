import { refreshAndWait, findSection } from '../support/helpers.js'

describe('Section Archiving', () => {
    it('should show archive picker when multiple DONE columns exist', () => {
        // The example.todo.md has both ARCHIVE and DONE columns
        // CURRENT WEEK is an archivable section in WIP
        const sectionName = 'CURRENT WEEK (Week of May 1'

        // Verify section starts in WIP column (SCHEDULED column)
        cy.get('.column-stack').eq(1).find('.wip-column').within(() => {
            findSection(sectionName).should('exist')
        })

        // Find and click archive button
        findSection(sectionName).within(() => {
            cy.get('.archive-section-btn').click()
        })

        // Archive picker modal should appear since there are 2 DONE columns
        cy.get('.modal-backdrop').should('be.visible')
        cy.contains('Choose Archive Destination').should('be.visible')
        
        // Should show both DONE columns as options
        cy.get('.column-options').within(() => {
            cy.contains('button', 'ARCHIVE').should('exist')
            cy.contains('button', 'DONE').should('exist')
        })

        // Select ARCHIVE
        cy.contains('button.column-option', 'ARCHIVE').click()

        // Modal should close
        cy.get('.modal-backdrop').should('not.exist')

        // Section should be in DONE column stack
        cy.get('.column-stack').eq(2).within(() => {
            findSection(sectionName).should('exist')
        })

        // Find the ARCHIVE column specifically and check section order
        cy.get('.column-stack').eq(2).within(() => {
            // Look for the column with title "ARCHIVE"  
            cy.contains('.column-header', 'ARCHIVE').parent().within(() => {
                // Get all sections in this column and verify our section is first
                cy.get('.section').first().within(() => {
                    cy.get('.section-header').should('contain', sectionName)
                })
            })
        })

        // Section should no longer be in WIP column
        cy.get('.column-stack').eq(1).find('.wip-column').within(() => {
            cy.contains('.section-header', sectionName).should('not.exist')
        })

        // Refresh and verify persistence and correct ordering
        refreshAndWait()

        cy.get('.column-stack').eq(2).within(() => {
            findSection(sectionName).should('exist')
            // Verify it's still the first section after refresh
            cy.contains('.column-header', 'ARCHIVE').parent().within(() => {
                cy.get('.section').first().within(() => {
                    cy.get('.section-header').should('contain', sectionName)
                })
            })
        })
    })
})