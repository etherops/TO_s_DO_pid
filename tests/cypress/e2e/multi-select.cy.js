import { refreshAndWait, findSection, findTask } from '../support/helpers.js'

describe('Multi-Select Task Operations', () => {
    // Helper to get task by text
    const getTask = (text) => cy.contains('.task-card', text)
    
    // Helper to verify task selection state
    const verifySelected = (taskText) => {
        getTask(taskText).should('have.class', 'selected')
    }
    
    const verifyNotSelected = (taskText) => {
        getTask(taskText).should('not.have.class', 'selected')
    }

    beforeEach(() => {
        refreshAndWait()
    })

    it('should select single task on click', () => {
        const taskText = 'WORK - Follow up with client'
        
        // Click on task
        getTask(taskText).click()
        
        // Verify it's selected
        verifySelected(taskText)
        
        // Click on another task should select only that task
        const anotherTask = 'HOBBY - RSVP for local event'
        getTask(anotherTask).click()
        verifyNotSelected(taskText)
        verifySelected(anotherTask)
    })

    it('should multi-select with Ctrl/Cmd+Click', () => {
        const task1 = 'WORK - Follow up with client'
        const task2 = 'HOBBY - RSVP for local event'
        const task3 = 'HOME - Garden maintenance'
        
        // Select first task
        getTask(task1).click()
        verifySelected(task1)
        
        // Ctrl+Click second task (use meta key for Mac)
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        verifySelected(task1)
        verifySelected(task2)
        
        // Ctrl+Click third task
        getTask(task3).click({ metaKey: true, ctrlKey: true })
        verifySelected(task1)
        verifySelected(task2)
        verifySelected(task3)
        
        // Regular click should clear selection and select only clicked task
        const task4 = 'HOME - Lawn care'
        getTask(task4).click()
        verifyNotSelected(task1)
        verifyNotSelected(task2)
        verifyNotSelected(task3)
        verifySelected(task4)
    })

    it('should toggle selection with Ctrl/Cmd+Click on already selected task', () => {
        const task1 = 'WORK - Follow up with client'
        const task2 = 'HOBBY - RSVP for local event'
        
        // Select both tasks
        getTask(task1).click()
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        verifySelected(task1)
        verifySelected(task2)
        
        // Ctrl+Click on already selected task should deselect it
        getTask(task1).click({ metaKey: true, ctrlKey: true })
        verifyNotSelected(task1)
        verifySelected(task2)
    })

    it('should select individual tasks with Shift+Click', () => {
        // Shift+Click should work like Ctrl+Click (individual selection)
        const section = 'PROJECTS'
        
        findSection(section).within(() => {
            cy.get('.task-card').then($tasks => {
                if ($tasks.length >= 3) {
                    // Click first task
                    cy.wrap($tasks[0]).click()
                    cy.wrap($tasks[0]).should('have.class', 'selected')
                    
                    // Shift+Click third task (should add to selection, not select range)
                    cy.wrap($tasks[2]).click({ shiftKey: true })
                    
                    // Only first and third should be selected (no range selection)
                    cy.wrap($tasks[0]).should('have.class', 'selected')
                    cy.wrap($tasks[1]).should('not.have.class', 'selected')
                    cy.wrap($tasks[2]).should('have.class', 'selected')
                }
            })
        })
    })

    it('should clear selection when clicking a different single task', () => {
        const task1 = 'WORK - Follow up with client'
        const task2 = 'HOBBY - RSVP for local event'
        const task3 = 'HOME - Garden maintenance'
        
        // Select multiple tasks
        getTask(task1).click()
        getTask(task2).click({ metaKey: true, ctrlKey: true })
        verifySelected(task1)
        verifySelected(task2)
        
        // Click on a third task without modifier keys
        getTask(task3).click()
        
        // Previous selections should be cleared
        verifyNotSelected(task1)
        verifyNotSelected(task2)
        verifySelected(task3)
    })

    it('should maintain selection across columns', () => {
        // Select task from TODO column
        const todoTask = 'WORK - Follow up with client'
        getTask(todoTask).click()
        verifySelected(todoTask)
        
        // Add task from WIP column
        const wipTask = 'WORK - Website maintenance'
        getTask(wipTask).click({ metaKey: true, ctrlKey: true })
        verifySelected(todoTask)
        verifySelected(wipTask)
        
        // Verify we can select across different columns
        cy.get('.task-card.selected').should('have.length', 2)
    })

    it('should update checkbox for single task when clicked', () => {
        const task1 = 'WORK - Follow up with client'
        
        // Click checkbox to mark as in-progress
        getTask(task1).find('.custom-checkbox').click()
        
        // Wait for status update
        cy.wait(500)
        
        // Task should have updated status to in-progress
        getTask(task1).find('.custom-checkbox').should('have.class', 'in-progress')
        
        // Click again to mark as completed
        getTask(task1).find('.custom-checkbox').click()
        
        // Wait for completion animation
        cy.wait(1500)
        
        // Should be completed
        getTask(task1).find('.custom-checkbox').should('have.class', 'checked')
        
        // Verify it's marked as completed (might stay in same column or move to archive)
        getTask(task1).find('.custom-checkbox').should('have.class', 'checked')
    })

    it('should handle selection after drag and drop', () => {
        const taskText = 'HOME - Garden maintenance'
        
        // Select task
        getTask(taskText).click()
        verifySelected(taskText)
        
        // Use the drag command from existing tests
        cy.get('.task-card').contains(taskText).drag('.section:contains("HOBBY") .task-list')
        
        // Task should still be selected after drop
        verifySelected(taskText)
        
        // And should be in the new section
        findSection('HOBBY').within(() => {
            cy.contains('.task-card', taskText).should('exist')
        })
    })
})