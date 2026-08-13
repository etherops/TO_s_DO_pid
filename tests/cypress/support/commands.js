// Custom commands for todo tests

const SOURCE_TODO_FILE = './example.todo.md'


// Create a test file based on the current spec filename
Cypress.Commands.add('createTestFile', () => {
    // Extract test filename from Cypress spec (e.g., "task-crud.cy.js" -> "task-crud")
    const specName = Cypress.spec.name.replace('.cy.js', '')
    const testFileName = `fixture-${specName}.todo.md`
    const testFilePath = `./${testFileName}`
    
    return cy.task('copyFile', {
        source: SOURCE_TODO_FILE,
        dest: testFilePath
    }).then(result => {
        if (!result.success) {
            throw new Error(`Test file creation failed: ${result.error}`)
        }
        return { fileName: testFileName, filePath: testFilePath }
    })
})

// Get the current test file name based on spec
Cypress.Commands.add('getCurrentTestFileName', () => {
    const specName = Cypress.spec.name.replace('.cy.js', '')
    return `fixture-${specName}.todo.md`
})

// Clean up test file
Cypress.Commands.add('cleanupTestFile', (filePath) => {
    return cy.task('deleteFile', filePath).then(result => {
        if (!result.success) {
            cy.log(`Warning: Failed to delete test file: ${result.error}`)
        }
    })
})

// Write custom content to the test file
Cypress.Commands.add('writeTestFileContent', (content) => {
    const specName = Cypress.spec.name.replace('.cy.js', '')
    const testFileName = `fixture-${specName}.todo.md`
    const testFilePath = `./${testFileName}`

    return cy.task('writeFile', {
        path: testFilePath,
        content: content
    }).then(result => {
        if (!result.success) {
            throw new Error(`Failed to write test file: ${result.error}`)
        }
        return { fileName: testFileName, filePath: testFilePath }
    })
})

// Switch to a specific file tab
Cypress.Commands.add('switchToFile', (fileName) => {
    const baseFileName = fileName.replace('.todo.md', '')

    // Open the custom file selector and choose the requested source.
    cy.get('.file-selector-trigger', { timeout: 8000 }).should('be.visible').click()
    cy.contains('.file-selector-option', baseFileName, { timeout: 8000 })
        .scrollIntoView()
        .should('be.visible')
        .click()

    cy.get('.file-selector-trigger').should('contain', baseFileName)
    
    // Wait for file to load by checking for content
    cy.get('.kanban-column', { timeout: 6000 }).should('exist')
    
    // Wait for tasks to load as well
    cy.get('.task-card', { timeout: 4000 }).should('exist')
    
    // Small wait to ensure everything is rendered
    cy.wait(300)
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
