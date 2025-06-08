describe('Ice Column Functionality', () => {
    // Global beforeEach in e2e.js handles file navigation

    it('should display ICE column in TODO stack with frozen styling', () => {
        // Scroll to the ON ICE column first
        cy.contains('.column-header', 'ON ICE').scrollIntoView()
        
        // Verify ON ICE column exists and is visible
        cy.contains('.column-header', 'ON ICE').should('be.visible')
        
        // Verify the column has ice styling by checking if it has the ice-column class
        cy.contains('.column-header', 'ON ICE').parent('.kanban-column')
            .should('have.class', 'ice-column')
        
        // Verify the "ON ICE" badge is visible in the header
        cy.contains('.column-header', 'ON ICE').within(() => {
            cy.get('.on-ice-badge').should('be.visible').should('contain', 'ON ICE')
        })
    })

    it('should disable editing functionality in ICE column', () => {
        // Find ON ICE column in TODO stack
        cy.get('.column-stack').eq(0).within(() => {
            cy.contains('.column-header', 'ON ICE').parent('.kanban-column').within(() => {
                // Verify "Add Section" button is not present
                cy.get('.add-section-btn').should('not.exist')
                
                // Check sections within the ice column
                cy.get('.section').first().within(() => {
                    // Verify "Add Task" button is not present in ice sections
                    cy.get('.add-task-btn').should('not.exist')
                    
                    // Verify "Edit Section" button is not present in ice sections
                    cy.get('.edit-section-btn').should('not.exist')
                })
                
                // Check tasks within ice column sections
                cy.get('.task-card').first().within(() => {
                    // Verify task editing buttons are not present
                    cy.get('.edit-btn').should('not.exist')
                    cy.get('.clock-btn').should('not.exist')
                    cy.get('.notes-btn').should('not.exist')
                    
                    // Verify delete button is still present (as per requirements)
                    cy.get('.delete-btn').should('exist')
                    
                    // Verify task checkboxes are not clickable
                    cy.get('.custom-checkbox').should('have.css', 'cursor', 'not-allowed')
                })
            })
        })
    })

    it('should not allow task status changes in ICE column', () => {
        // Find a task in ON ICE column
        cy.get('.column-stack').eq(0).within(() => {
            cy.contains('.column-header', 'ON ICE').parent('.kanban-column').within(() => {
                cy.get('.task-card').first().within(() => {
                    // Get initial checkbox state
                    cy.get('.custom-checkbox').then($checkbox => {
                        const initialClasses = $checkbox[0].className
                        
                        // Try to click the checkbox
                        cy.get('.custom-checkbox').click()
                        
                        // Verify the state hasn't changed
                        cy.get('.custom-checkbox').should('have.class', initialClasses.split(' ').find(c => c.includes('checked') || c.includes('unchecked') || c.includes('in-progress') || c.includes('cancelled')) || 'unchecked')
                    })
                })
            })
        })
    })

    it('should have ICE column sections with transparent styling', () => {
        // Verify ice sections have the on-ice styling
        cy.get('.column-stack').eq(0).within(() => {
            cy.contains('.column-header', 'ON ICE').parent('.kanban-column').within(() => {
                cy.get('.section').should('have.class', 'on-ice-section')
                
                // Check ice task cards have proper styling
                cy.get('.task-card').should('have.class', 'ice-task-card')
            })
        })
    })
})