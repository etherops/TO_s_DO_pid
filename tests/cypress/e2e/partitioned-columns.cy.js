describe('Partitioned File Columns', () => {
    beforeEach(() => {
        // Visit the app
        cy.visit('/')
        
        // Click on the "example" tab
        cy.contains('.file-tab', 'example').click()
        
        // Verify the tab is active
        cy.contains('.file-tab', 'example').should('have.class', 'active')
    })

    it('should render partitioned TODO columns as separate visual columns', () => {
        // The TODO stack should have multiple columns
        cy.get('.column-stack').eq(0).within(() => {
            // Should have exactly 2 TODO columns (excluding raw-text columns)
            cy.get('.todo-column').not('.raw-text-column').should('have.length', 2)
            
            // Both should have "TODO" as header
            cy.get('.column-header').eq(0).should('contain.text', 'TODO')
            cy.get('.column-header').eq(1).should('contain.text', 'TODO')
            
            // First TODO column should contain the first set of sections
            cy.get('.todo-column').not('.raw-text-column').eq(0).within(() => {
                cy.contains('.section-header', 'TO DO').should('exist')
                cy.contains('.section-header', 'PROJECTS').should('exist')
                cy.contains('.section-header', 'HOBBY').should('exist')
                cy.contains('.section-header', 'HELPER').should('exist')
                
                // Should NOT contain sections from second TODO
                cy.contains('.section-header', 'LOW-P').should('not.exist')
                cy.contains('.section-header', 'BACKLOG').should('not.exist')
            })
            
            // Second TODO column should contain the second set of sections
            cy.get('.todo-column').not('.raw-text-column').eq(1).within(() => {
                cy.contains('.section-header', 'LOW-P').should('exist')
                cy.contains('.section-header', 'BACKLOG').should('exist')
                cy.contains('.section-header', 'ICEBOX').should('exist')
                cy.contains('.section-header', 'ON HOLD').should('exist')
                
                // Should NOT contain sections from first TODO
                cy.contains('.section-header', 'TO DO').should('not.exist')
                cy.contains('.section-header', 'PROJECTS').should('not.exist')
            })
        })
    })

    it('should maintain visual separation with sticky headers when scrolling', () => {
        // Get the TODO column stack
        cy.get('.column-stack').eq(0).as('todoStack')
        
        // Scroll down within the stack to see the second TODO column
        cy.get('@todoStack').scrollTo('bottom')
        
        // The second TODO header should be visible and sticky
        cy.get('@todoStack').within(() => {
            // When scrolled, we should see the second TODO column's header
            cy.get('.column-header').filter(':visible').should('contain.text', 'TODO')
            
            // And we should see sections from the second TODO
            cy.contains('.section-header', 'LOW-P').should('be.visible')
        })
        
        // Scroll back up
        cy.get('@todoStack').scrollTo('top')
        
        // The first TODO header should be visible
        cy.get('@todoStack').within(() => {
            cy.get('.column-header').filter(':visible').first().should('contain.text', 'TODO')
            
            // And we should see sections from the first TODO
            cy.contains('.section-header', 'TO DO').should('be.visible')
        })
    })

    it('should have proper spacing between partitioned columns', () => {
        cy.get('.column-stack').eq(0).within(() => {
            cy.get('.todo-column').not('.raw-text-column').then($columns => {
                // Get the positions of both columns
                const firstColumnBottom = $columns[0].getBoundingClientRect().bottom
                const secondColumnTop = $columns[1].getBoundingClientRect().top
                
                // There should be a gap between them (10px as defined in CSS)
                const gap = secondColumnTop - firstColumnBottom
                expect(gap).to.be.at.least(10)
            })
        })
    })
})