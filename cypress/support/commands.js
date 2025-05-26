// Custom commands for todo tests

const TODO_FILE_PATH = './example_todo.txt'
const BACKUP_FILE_PATH = './example_backup.txt'

Cypress.Commands.add('backupTodoFile', () => {
    return cy.task('copyFile', {
        source: TODO_FILE_PATH,
        dest: BACKUP_FILE_PATH
    }).then(result => {
        if (!result.success) {
            throw new Error(`Backup failed: ${result.error}`)
        }
    })
})

Cypress.Commands.add('restoreTodoFile', () => {
    return cy.task('copyFile', {
        source: BACKUP_FILE_PATH,
        dest: TODO_FILE_PATH
    }).then(result => {
        if (!result.success) {
            throw new Error(`Restore failed: ${result.error}`)
        }
    })
})

// Clean drag command for Sortable.js/Vue Draggable
Cypress.Commands.add('drag', { prevSubject: 'element' }, (subject, target) => {
    cy.get(target).then($target => {
        const targetEl = $target[0]
        const targetRect = targetEl.getBoundingClientRect()
        const targetX = targetRect.left + (targetRect.width / 2)
        const targetY = targetRect.top + (targetRect.height / 2)

        cy.wrap(subject)
            .trigger('mousedown', { button: 0 })
            .trigger('dragstart')
            .trigger('drag')

        cy.get(target)
            .trigger('dragenter')
            .trigger('dragover')
            .trigger('drop')

        cy.wrap(subject)
            .trigger('dragend')
    })
})