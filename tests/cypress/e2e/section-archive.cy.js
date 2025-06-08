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

        // First, the confirmation modal should appear
        cy.get('.modal-backdrop').should('be.visible')
        cy.contains('Archive Section').should('be.visible')
        
        // Should show the archive destination selector with both DONE columns
        cy.get('.archive-destination').should('be.visible')
        cy.get('.destination-selector').within(() => {
            cy.contains('.destination-btn', 'ARCHIVE').should('exist')
            cy.contains('.destination-btn', 'DONE').should('exist')
        })

        // Select ARCHIVE
        cy.contains('.destination-btn', 'ARCHIVE').click()
        
        // Confirm the archive
        cy.get('.btn-confirm').click()

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

        // Original section should no longer be in WIP column (but leftovers section might exist)
        cy.get('.column-stack').eq(1).find('.wip-column').within(() => {
            cy.get('.section-header').each(($header) => {
                const text = $header.text().trim();
                // Should not find the exact original section name (but might find "Leftovers from" section)
                if (!text.includes('Leftovers from')) {
                    expect(text).to.not.equal(sectionName);
                }
            });
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