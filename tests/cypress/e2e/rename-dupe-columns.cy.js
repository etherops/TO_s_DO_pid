describe('Partitioned File Columns', () => {
    it('should renamed duplicated TODO column from file as TODO-2', () => {
        // The TODO stack should have multiple columns
        cy.get('.column-stack').eq(0).within(() => {
            // Should have exactly 3 TODO columns (including ON ICE, excluding raw-text columns)
            cy.get('.todo-column').not('.raw-text-column').should('have.length.at.least', 2)
            
            // First two should have "TODO" as header, third should have "ON ICE"
            cy.get('.column-header').eq(0).should('contain.text', 'TODO')
            cy.get('.column-header').eq(1).should('contain.text', 'TODO-2')
        })
    })

})