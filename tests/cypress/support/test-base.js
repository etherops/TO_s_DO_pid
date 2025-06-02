// Base configuration for all test files
// This ensures backup/restore always happens

export function setupTestSuite(description, testFn) {
    describe(description, () => {
        before(() => {
            // Create initial backup before all tests in the suite
            cy.backupTodoFile();
        })
        beforeEach(() => {
            // Visit the app and load example todo
            cy.visit('/')
            cy.contains('TO_s_DO_pid').should('be.visible')
            cy.contains('.file-tab', 'example todo').click()
            cy.wait(500) // Allow data to load
        })

        afterEach(() => {
            cy.restoreTodoFile();
        })

        after(() => {
            cy.restoreTodoFile();
        })

        // Run the actual test definitions
        testFn()
    })
}