import { refreshAndWait, findSection, findTask } from '../support/helpers.js'

describe('Context Menu Move Task Operations', () => {
    // Helper to get task by text
    const getTask = (text) => cy.contains('.task-card', text)
    
    // Helper to right-click on task
    const rightClickTask = (taskText) => {
        getTask(taskText).rightclick()
    }
    
    // Helper to verify context menu is visible
    const verifyContextMenuVisible = () => {
        cy.get('.context-menu').should('be.visible')
    }
    
    // Helper to verify context menu is not visible
    const verifyContextMenuNotVisible = () => {
        cy.get('.context-menu').should('not.exist')
    }

    beforeEach(() => {
        refreshAndWait()
    })

    it('should show context menu on right-click', () => {
        const taskText = 'WORK - Follow up with client'
        
        // Right-click on task
        rightClickTask(taskText)
        
        // Context menu should appear
        verifyContextMenuVisible()
        
        // Should show move options
        cy.get('.context-menu').within(() => {
            cy.contains('Move 1 task to...').should('be.visible')
            cy.get('.menu-section-header').first().should('contain', 'TODO')
        })
    })

    it('should close context menu on escape key', () => {
        const taskText = 'WORK - Follow up with client'
        
        rightClickTask(taskText)
        verifyContextMenuVisible()
        
        // Press escape
        cy.get('body').type('{esc}')
        
        verifyContextMenuNotVisible()
    })

    it('should close context menu when clicking outside', () => {
        const taskText = 'WORK - Follow up with client'
        
        rightClickTask(taskText)
        verifyContextMenuVisible()
        
        // Click outside
        cy.get('.kanban-container').click(10, 10)
        
        verifyContextMenuNotVisible()
    })

    it('should move single task to different section in same column', () => {
        const taskText = 'WORK - Follow up with client'
        const targetSection = 'HOBBY'
        
        // Task starts in TODO column, TO DO section
        cy.get('.todo-column').first().within(() => {
            cy.contains('.task-card', taskText).should('exist')
        })
        
        // Right-click and move
        rightClickTask(taskText)
        
        cy.get('.context-menu').within(() => {
            // Click on HOBBY section (in same column)
            cy.contains('.menu-item', targetSection)
                .not('.disabled')
                .click()
        })
        
        // Verify task moved
        findSection(targetSection).within(() => {
            cy.contains('.task-card', taskText).should('exist')
        })
        
        // Refresh and verify persistence
        refreshAndWait()
        findSection(targetSection).within(() => {
            cy.contains('.task-card', taskText).should('exist')
        })
    })

    it('should move task to different column via submenu', () => {
        const taskText = 'WORK - Follow up with client'
        const targetColumn = 'SCHEDULED'
        const targetSection = 'WIP'
        
        rightClickTask(taskText)
        
        cy.get('.context-menu').within(() => {
            // Hover over target column to show submenu
            cy.contains('.menu-item.expandable', targetColumn)
                .trigger('mouseenter')
        })
        
        // Wait for submenu to appear (it's outside the main menu)
        cy.wait(100)
        
        // Click on target section in submenu
        cy.get('.submenu').should('exist').contains('.menu-item', targetSection).click()
        
        // Verify task moved to WIP section in SCHEDULED column
        cy.get('.wip-column').first().within(() => {
            findSection(targetSection).within(() => {
                cy.contains('.task-card', taskText).should('exist')
            })
        })
        
        // Should not be in original location
        cy.get('.todo-column').first().within(() => {
            cy.contains('.task-card', taskText).should('not.exist')
        })
    })

    it('should move multiple selected tasks together', () => {
        const task1 = 'WORK - Follow up with client'
        const task2 = 'HOBBY - RSVP for local event'
        const targetSection = 'PROJECTS'
        
        // Select multiple tasks
        getTask(task1).click()
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        
        // Right-click and move
        rightClickTask(task1)
        
        cy.get('.context-menu').within(() => {
            cy.contains('.menu-item', targetSection).click()
        })
        
        // Both tasks should be in target section
        findSection(targetSection).within(() => {
            cy.contains('.task-card', task1).should('exist')
            cy.contains('.task-card', task2).should('exist')
        })
    })

    it('should disable current section in context menu', () => {
        // Find a task in PROJECTS section
        const section = 'PROJECTS'
        
        findSection(section).within(() => {
            cy.get('.task-card').first().then($task => {
                const taskText = $task.text()
                
                // Right-click on it
                cy.wrap($task).rightclick()
            })
        })
        
        // Current section should be disabled
        cy.get('.context-menu').within(() => {
            cy.contains('.menu-item', section)
                .should('have.class', 'disabled')
                .should('contain', '(current)')
        })
    })

    it('should handle context menu positioning near screen edges', () => {
        // Find a task to right-click
        const taskText = 'VEHICLE - Send photos to buyer'
        
        // Right-click on task
        rightClickTask(taskText)
        
        // Context menu should be visible and positioned properly
        cy.get('.context-menu').should('be.visible').then($menu => {
            const menuRect = $menu[0].getBoundingClientRect()
            
            // Menu should be positioned within viewport
            expect(menuRect.top).to.be.at.least(0)
            expect(menuRect.left).to.be.at.least(0)
        })
    })

    it('should update context menu when right-clicking different task', () => {
        const task1 = 'WORK - Follow up with client' // In TODO
        const task2 = 'WORK - Website maintenance' // In WIP
        
        // Right-click first task
        rightClickTask(task1)
        
        cy.get('.context-menu').within(() => {
            cy.get('.menu-section-header').first().should('contain', 'TODO')
        })
        
        // Close first menu
        cy.get('body').type('{esc}')
        
        // Right-click second task (in different column)
        rightClickTask(task2)
        
        // Context menu should update to show new current section
        cy.get('.context-menu').within(() => {
            cy.get('.menu-section-header').first().should('contain', 'SCHEDULED')
        })
    })

    it('should handle submenu hover interactions', () => {
        const taskText = 'WORK - Follow up with client'
        
        rightClickTask(taskText)
        
        cy.get('.context-menu').within(() => {
            // Hover over column to show submenu
            cy.contains('.menu-item.expandable', 'SCHEDULED')
                .trigger('mouseenter')
        })
        
        // Wait for submenu
        cy.wait(100)
        cy.get('.submenu').should('exist')
        
        // Move mouse away from menu item
        cy.get('.context-menu').within(() => {
            cy.contains('.menu-item.expandable', 'SCHEDULED')
                .trigger('mouseleave')
        })
        
        // Submenu should hide
        cy.get('.submenu').should('not.exist')
    })

    it.only('should auto-sort moved tasks in destination section by priority', () => {
        const taskToMove = 'sort8' // This is completed [x]
        const targetColumn = 'SCHEDULED'
        const targetSection = 'CURRENT DAY (Thursday May 1)'
        
        // Right-click sort8 from AUTOSORT TEST section
        rightClickTask(taskToMove)
        
        // Navigate to SCHEDULED column and CURRENT DAY section
        cy.get('.context-menu').within(() => {
            cy.contains('.menu-item.expandable', targetColumn)
                .trigger('mouseenter')
        })
        
        // Wait for submenu
        cy.wait(100)
        
        // Click on CURRENT DAY section in submenu
        cy.get('.submenu').contains('.menu-item', targetSection).click()
        
        // Wait for move and auto-sort to complete
        cy.wait(1000)
        
        // Verify sort8 is now in CURRENT DAY section at position #2
        findSection(targetSection).within(() => {
            cy.get('.task-card').eq(1).should('contain', taskToMove)
        })
    })
})