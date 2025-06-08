// Helper functions for todo tests

export const TODO_FILE_PATH = '../example.todo.md';
export const BACKUP_FILE_PATH = '../example.backup.todo.md';

// Known items from example.todo.md for assertions
export const KNOWN_ITEMS = {
    todo: {
        mainTodo: 'PROJECT - Mountain trip planning',
        projects: ['SOCIAL - Event coordination for friends', 'PROJECT - Outdoor activities'],
        todo: ['WORK - Follow up with client'],
        hobby: ['HOBBY - RSVP for local event'],
        helper: ['HOME - Garden maintenance', 'HOME - Lawn care']
    },
    wip: {
        mainWip: ['BILLS - Phone bill really really really really really really really really really really really really really really really really really long', 'PROPERTY - Research local zoning regulations'],
        currentWeek: ['WORK - Website maintenance', 'TECH - Schedule service appointment'],
        currentDay: ['VEHICLE - Send photos to buyer', 'WORK - Update software subscriptions', 'HOBBY - Prepare for upcoming thing'],
        lowP: ['HEALTH - Research classes'],
        backlog: ['HEALTH - Schedule appointment', 'WORK - Contact potential partner']
    },
    ice: {
        future: ['FUTURE - Project idea for next year', 'FUTURE - Long-term planning'],
        onHold: ['PAUSED - Waiting for external input', 'PAUSED - Pending decision']
    },
    archive: {
        mayWeek4: ['HOBBY - Event promotion', 'SHOPPING - Return and replace items'],
        mayWeek3: ['SHOPPING - Purchase footwear', 'FINANCE - Complete tax filing', 'HOBBY - Event follow-ups'],
        aprilWeek3: ['WORK - Review contract details', 'LEGAL - Review terms of use'],
        aprilWeek2: ['HOME - Purchase supplies', 'TRAVEL - Book rental car']
    }
};

// Known sections from the file
export const KNOWN_SECTIONS = {
    todo: ['TODO', 'PROJECTS', 'HOBBY', 'HELPER'],
    wip: ['WIP', 'CURRENT WEEK (Week of May 1', 'CURRENT DAY (Thursday May 1)', 'LOW-P', 'BACKLOG'],
    ice: ['ICE', 'ON HOLD'],
    archive: ['ARCHIVE', 'MAY Week 4', 'MAY Week 3', 'APRIL Week 3', 'APRIL Week 2']
};

// Helper to refresh and wait for app to reload
// Automatically switches to the correct test file for parallel isolation
export function refreshAndWait() {
    cy.reload();
    cy.contains('TO_s_DO_pid').should('be.visible');
    
    // Switch back to the correct file for this test (using spec-based filename)
    cy.getCurrentTestFileName().then((fileName) => {
        cy.switchToFile(fileName);
    });
}

// Helper to find a task by text
export function findTask(taskText) {
    return cy.contains('.task-card', taskText);
}

// Helper to find a section by name
export function findSection(sectionName) {
    return cy.contains('.section-header', sectionName).parent();
}

/**
 * Test a condition before and after page refresh to ensure persistence
 * @param {Function} testFn - Function containing the test assertions to run
 * @param {string} [description] - Optional description for debugging
 */
export function withRefresh(testFn, description) {
    // Run test before refresh
    if (description) {
        cy.log(`Testing before refresh: ${description}`);
    }
    testFn();
    
    // Refresh and wait, restoring correct tab for parallel isolation
    refreshAndWait();
    
    // Run test after refresh
    if (description) {
        cy.log(`Testing after refresh: ${description}`);
    }
    testFn();
}