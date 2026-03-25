import { refreshAndWait, findSection } from '../support/helpers.js'

// Note: Cypress's synthetic drag library (@4tw/cypress-drag-drop) cannot simulate
// multi-drag because Vue re-renders during drag events detach the target element.
// Multi-drag logic is tested via context menu "Move to" which uses the same code path.
// The visual stacking behavior (clones + hide) is verified manually.

describe('Multi-Select Move Operations', () => {
    const getTask = (text) => cy.contains('.task-card', text)

    beforeEach(() => {
        refreshAndWait()
    })

    it('should move multiple selected tasks to another section via context menu', () => {
        const task1 = 'HOME - Garden maintenance'
        const task2 = 'HOME - Lawn care'

        // Multi-select
        getTask(task1).click()
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        getTask(task1).should('have.class', 'selected')
        getTask(task2).should('have.class', 'selected')

        // Right-click to open context menu
        getTask(task1).rightclick()
        cy.get('.context-menu').should('be.visible')
        cy.get('.context-menu-header').should('contain', 'Move 2 tasks')

        // Hover over target column to open submenu, then click section
        cy.get('.context-menu .menu-item.expandable').contains('SCHEDULED').trigger('mouseenter')
        cy.get('.submenu').should('be.visible')
        cy.get('.submenu .menu-item').contains('CURRENT WEEK').click()

        cy.wait(500)

        // Both tasks should be in the target section
        findSection('CURRENT WEEK').within(() => {
            cy.contains('.task-card', task1).should('exist')
            cy.contains('.task-card', task2).should('exist')
        })

        // Should be removed from original section
        findSection('HELPER').within(() => {
            cy.contains('.task-card', task1).should('not.exist')
            cy.contains('.task-card', task2).should('not.exist')
        })
    })

    it('should persist multi-move across refresh', () => {
        const task1 = 'HOME - Garden maintenance'
        const task2 = 'HOME - Lawn care'

        getTask(task1).click()
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        getTask(task1).rightclick()
        cy.get('.context-menu .menu-item.expandable').contains('SCHEDULED').trigger('mouseenter')
        cy.get('.submenu .menu-item').contains('CURRENT WEEK').click()
        cy.wait(500)

        refreshAndWait()

        findSection('CURRENT WEEK').within(() => {
            cy.contains('.task-card', task1).should('exist')
            cy.contains('.task-card', task2).should('exist')
        })
    })

    it('should move tasks from different sections via context menu', () => {
        const todoTask = 'WORK - Follow up with client'
        const helperTask = 'HOME - Garden maintenance'

        getTask(todoTask).click()
        getTask(helperTask).click({ metaKey: true, ctrlKey: true })
        getTask(todoTask).should('have.class', 'selected')
        getTask(helperTask).should('have.class', 'selected')

        getTask(todoTask).rightclick()
        cy.get('.context-menu-header').should('contain', 'Move 2 tasks')

        // Move to a section in the current column
        cy.get('.context-menu .menu-item').contains('HOBBY').click()
        cy.wait(500)

        findSection('HOBBY').within(() => {
            cy.contains('.task-card', todoTask).should('exist')
            cy.contains('.task-card', helperTask).should('exist')
        })
    })

    it('should clear selection after multi-move', () => {
        const task1 = 'HOME - Garden maintenance'
        const task2 = 'HOME - Lawn care'

        getTask(task1).click()
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        getTask(task1).rightclick()
        cy.get('.context-menu .menu-item').contains('HOBBY').click()
        cy.wait(500)

        cy.get('.task-card.selected').should('have.length', 0)
    })

    it('should drag single task normally when selected', () => {
        const task = 'HOME - Garden maintenance'

        getTask(task).click()
        getTask(task).drag('.section:contains("HOBBY") .task-list')
        cy.wait(400)

        findSection('HOBBY').within(() => {
            cy.contains('.task-card', task).should('exist')
        })

        findSection('HELPER').within(() => {
            cy.contains('.task-card', 'HOME - Lawn care').should('exist')
        })
    })
})
