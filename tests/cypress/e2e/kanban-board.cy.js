describe('Kanban Board', () => {
    it('should load and display kanban board with three columns', () => {
        cy.get('.file-tab.active').should('exist')

        // Verify file columns exist within each column stack
        // TODO stack should have multiple TODO columns
        cy.get('.column-stack').eq(0).within(() => {
            cy.get('.todo-column').should('have.length.at.least', 1)
            cy.contains('.column-header', 'TODO').should('be.visible')
        })

        // WIP stack should have SCHEDULED column
        cy.get('.column-stack').eq(1).within(() => {
            cy.get('.wip-column').should('have.length.at.least', 1)
            cy.contains('.column-header', 'SCHEDULED').should('be.visible')
        })

        // DONE stack should have ARCHIVE and/or DONE columns
        cy.get('.column-stack').eq(2).within(() => {
            cy.get('.done-column').should('have.length.at.least', 1)
            // Check that at least one header contains ARCHIVE or DONE
            cy.get('.column-header').then($headers => {
                const headerTexts = Array.from($headers).map(el => el.textContent)
                const hasValidHeader = headerTexts.some(text => 
                    text.includes('ARCHIVE') || text.includes('DONE')
                )
                expect(hasValidHeader).to.be.true
            })
        })

        // Verify sections and tasks exist
        cy.get('.section').should('have.length.at.least', 3)
        cy.get('.task-card').should('have.length.at.least', 3)
    })
})