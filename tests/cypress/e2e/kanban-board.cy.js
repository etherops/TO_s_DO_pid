describe('Kanban Board', () => {
    beforeEach(() => {
        // Visit the app
        cy.visit('/')
    })

    it('should load and display kanban board with three columns', () => {
        // Wait for the app to load
        cy.contains('TO_s_DO_pid').should('be.visible')

        // Click on the "example" tab
        cy.contains('.file-tab', 'example').click()

        // Verify the tab is active
        cy.contains('.file-tab', 'example').should('have.class', 'active')

        // Verify all three columns exist
        cy.contains('.column-header', 'TODO').should('be.visible')
        cy.contains('.column-header', 'WIP').should('be.visible')
        cy.contains('.column-header', 'DONE').should('be.visible')

        // Verify each column has at least one section with items
        // TODO column
        cy.get('.todo-column').within(() => {
            cy.get('.section').should('have.length.at.least', 1)
            cy.get('.task-card').should('have.length.at.least', 1)
        })

        // WIP column
        cy.get('.wip-column').within(() => {
            cy.get('.section').should('have.length.at.least', 1)
            cy.get('.task-card').should('have.length.at.least', 1)
        })

        // DONE column
        cy.get('.done-column').within(() => {
            cy.get('.section').should('have.length.at.least', 1)
            cy.get('.task-card').should('have.length.at.least', 1)
        })
    })
})