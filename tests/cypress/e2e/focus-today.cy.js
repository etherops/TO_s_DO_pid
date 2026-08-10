import { findTask } from '../support/helpers.js';
import { formatCompletionDate } from '../../../src/utils/completionDateHelpers';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dueTag = (date) => `!!(${MONTHS[date.getMonth()]} ${date.getDate()})`;
const dateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('Focus Mode (execution carousel)', () => {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  // Ten days out is always past the end of this week, whatever day it is today
  const nextWeek = new Date(today.getTime() + 10 * 86400000);

  const fixtureContent = `# TODO
## BACKLOG
* [ ] Undated backlog task
* [ ] Overdue backlog task ${dueTag(yesterday)}

# SELECTED
## Ready
* [~] Parked selected task
* [ ] Selected ready task
* [ ] Overdue selected task ${dueTag(yesterday)}
* [x] Done selected task ${formatCompletionDate(new Date(2000, 0, 1))}

# WIP
### CURRENT
* [~] Inflight wip task
* [ ] Queued wip task ${dueTag(today)}
* [x] Done wip task ${formatCompletionDate(new Date(2000, 0, 1))}

# ARCHIVE
## Old
* [x] Archived done task ${formatCompletionDate(today)}
`;

  const enterFocusMode = () => {
    cy.get('.view-mode-btn').contains('Focus').click();
    cy.get('.focus-mode').should('be.visible');
  };

  beforeEach(() => {
    cy.viewport(1400, 900);
    cy.clearLocalStorage();
    cy.writeTestFileContent(fixtureContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });
  });

  it('should replace the board with four panels and spotlight the execution pair', () => {
    enterFocusMode();

    cy.get('.kanban-container').should('not.exist');
    cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');

    cy.get('.focus-panel').should('have.length', 4);

    // The spotlight pairs the weekly execution queue with urgent NOW work
    cy.get('.focus-panel.panel-in-progress-queued').should('have.class', 'is-focused')
      .should('contain', 'In Progress / Queued')
      .should('contain', 'Inflight wip task')
      .find('.focus-section-badge').should('contain', 'CURRENT');
    cy.get('.focus-panel.panel-now').should('have.class', 'is-focused')
      .should('contain', 'Now')
      .should('contain', 'Queued wip task');
  });

  it('should bucket into up next, in progress / queued, now, and done', () => {
    enterFocusMode();

    // IN PROGRESS / QUEUED: underway work already on deck
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 1)
      .should('contain', 'Inflight wip task');
    cy.get('.panel-in-progress-queued .focus-row-check.inflight').should('have.length', 1);
    cy.get('.panel-in-progress-queued').should('not.contain', 'Parked selected task');

    // NOW: remaining unstarted work, under a Today section holding the overdue
    // SELECTED card (flagged urgent) ahead of the WIP card due today
    cy.get('.panel-now .focus-day-header').should('have.length', 1)
      .and('contain', 'Today');
    cy.get('.panel-now .focus-task-row').should('have.length', 2);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Overdue selected task')
      .and('have.class', 'overdue-row')
      .find('.focus-badge.overdue').should('exist');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Queued wip task')
      .and('not.have.class', 'overdue-row');
    cy.get('.panel-now .focus-row-check.unchecked').should('exist');
    // The card repeats its date as a directly editable badge
    cy.get('.panel-now .focus-badge.due-today').should('contain', 'today')
      .find('.focus-due-clock').should('contain', '◷');

    // Undated cards use the clock itself as the date-edit affordance
    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-due-edit.no-due-date').should('not.contain', 'Set date')
      .find('.focus-due-clock').should('contain', '◷');

    // UP NEXT: the remaining SELECTED work keeps its existing status
    cy.get('.panel-upnext .focus-task-row').should('have.length', 2);
    cy.get('.panel-upnext .focus-task-row').eq(0).should('contain', 'Parked selected task')
      .find('.focus-row-check.inflight').should('exist');
    cy.get('.panel-upnext .focus-task-row').eq(1).should('contain', 'Selected ready task');

    // DONE: completed cards from both SELECTED and WIP, any completion date
    cy.get('.panel-done .focus-task-row').should('have.length', 2);
    cy.get('.panel-done').should('contain', 'Done selected task');
    cy.get('.panel-done').should('contain', 'Done wip task');

    // TODO and ARCHIVE columns are not pulled in at all
    cy.get('.focus-mode').should('not.contain', 'Undated backlog task');
    cy.get('.focus-mode').should('not.contain', 'Overdue backlog task');
    cy.get('.focus-mode').should('not.contain', 'Archived done task');

    cy.get('.focus-progress-text').should('contain', '2 / 7 done');
    cy.get('.focus-status-action').should('not.exist');
  });

  it('should pull due-this-week SELECTED work onto the deck, split by status', () => {
    const dueDatedContent = `# SELECTED
## Plans
* [ ] Selected due today ${dueTag(today)}
* [~] Selected inflight overdue ${dueTag(yesterday)}
* [ ] Selected due later ${dueTag(nextWeek)}
* [ ] Selected undated

# WIP
### CURRENT
* [ ] Wip undated
`;

    cy.writeTestFileContent(dueDatedContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();

    // Due this week and underway -> IN PROGRESS / QUEUED under Today
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 1)
      .and('contain', 'Selected inflight overdue')
      .find('.focus-badge.overdue').should('exist');

    // Due today and undated unstarted work remain in NOW
    cy.get('.panel-now .focus-task-row').should('have.length', 2);
    cy.get('.panel-now .focus-day-header').eq(0).should('contain', 'Today');
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Selected due today');
    cy.get('.panel-now .focus-day-header').eq(1).should('contain', 'General');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Wip undated');

    // Later and undated SELECTED work stays in the queue behind them
    cy.get('.panel-upnext .focus-task-row').should('have.length', 2);
    cy.get('.panel-upnext .focus-task-row').eq(0).should('contain', 'Selected due later')
      .find('.focus-badge.due-later').should('exist');
    cy.get('.panel-upnext .focus-task-row').eq(1).should('contain', 'Selected undated');
  });

  it('should cycle all four statuses and keep completed-due-today work in NOW', () => {
    enterFocusMode();

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-check').click();

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .should('exist')
      .find('.focus-row-check').should('have.class', 'inflight');
    cy.get('.focus-task-row.transitioning').should('not.exist');
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-check').click();

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .should('exist')
      .find('.focus-row-check').should('have.class', 'checked');
    cy.get('.focus-task-row.transitioning').should('not.exist');

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-check').click();
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-check').should('have.class', 'cancelled');
    cy.get('.focus-task-row.transitioning').should('not.exist');
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-check').click();
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-check').should('have.class', 'unchecked');
    cy.wait(1600);
    cy.get('.panel-now').should('contain', 'Queued wip task');
    cy.get('.focus-row-check.pending').should('not.exist');
  });

  it('should split both execution panels into the existing day sections', () => {
    const tomorrow = new Date(today.getTime() + 86400000);
    const dayAfter = new Date(today.getTime() + 2 * 86400000);

    const dayContent = `# WIP
### CURRENT
* [ ] Wip day after ${dueTag(dayAfter)}
* [ ] Wip undated
* [ ] Wip tomorrow ${dueTag(tomorrow)}
* [ ] Wip due today ${dueTag(today)}
* [ ] Wip overdue ${dueTag(yesterday)}
`;

    cy.writeTestFileContent(dayContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();

    // Urgent and general unstarted work remain in NOW
    cy.get('.panel-now .focus-day-header').should('have.length', 2);
    cy.get('.panel-now .focus-day-header').eq(0).should('contain', 'Today').and('contain', '2');
    cy.get('.panel-now .focus-day-header').eq(1).should('contain', 'General');
    cy.get('.panel-now .focus-day-header').eq(0).should('have.class', 'day-today');
    cy.get('.panel-now .focus-day-header').eq(1).should('have.class', 'day-general');
    cy.get('.panel-now .focus-task-row').should('have.length', 3);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Wip overdue')
      .and('have.class', 'overdue-row');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Wip due today');
    cy.get('.panel-now .focus-task-row').eq(2).should('contain', 'Wip undated');

    // Upcoming scheduled work moves to IN PROGRESS / QUEUED, still grouped by day
    cy.get('.panel-in-progress-queued .focus-day-header').should('have.length', 2);
    cy.get('.panel-in-progress-queued .focus-day-header').eq(0).should('have.class', 'day-upcoming');
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 2);
    cy.get('.panel-in-progress-queued .focus-task-row').eq(0).should('contain', 'Wip tomorrow');
    cy.get('.panel-in-progress-queued .focus-task-row').eq(1).should('contain', 'Wip day after');
  });

  it('should badge each card with its section and keep sections clustered', () => {
    const multiSectionContent = `# SELECTED
## Ready
* [~] Ready inflight task
* [ ] Ready plain task

## Waiting
* [ ] Waiting later task ${dueTag(nextWeek)}

# WIP
### MONDAY
* [ ] Monday queued task
* [x] Monday completed today ${dueTag(today)} ${formatCompletionDate(new Date(2000, 0, 1))}

### FRIDAY
* [~] Friday inflight task
* [-] Friday cancelled today ${dueTag(today)} ${formatCompletionDate(new Date(2000, 0, 1))}
* [~] Friday active today ${dueTag(today)}
* [ ] Friday due today ${dueTag(today)}
`;

    cy.writeTestFileContent(multiSectionContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();

    // The section rides on the card as a badge - no group container rows
    cy.get('.focus-group-label').should('not.exist');
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 1)
      .and('contain', 'Friday inflight task');
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Friday inflight task')
      .find('.focus-section-badge').should('contain', 'FRIDAY');

    // NOW keeps its day grouping, then follows the board's x -> - -> ~ -> blank
    // status order before clustering matching sections.
    cy.get('.panel-now .focus-task-row').should('have.length', 5);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Monday completed today');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Friday cancelled today');
    cy.get('.panel-now .focus-task-row').eq(2).should('contain', 'Friday active today');
    cy.get('.panel-now .focus-task-row').eq(3).should('contain', 'Friday due today');
    cy.get('.panel-now .focus-task-row').eq(4).should('contain', 'Monday queued task');
    cy.get('.panel-now .focus-section-badge').eq(0).should('contain', 'MONDAY');
    cy.get('.panel-now .focus-section-badge').eq(1).should('contain', 'FRIDAY');
    cy.get('.panel-now .focus-section-badge').eq(4).should('contain', 'MONDAY');

    // UP NEXT keeps the off-deck SELECTED cards, in-progress first
    cy.get('.panel-upnext .focus-task-row').should('have.length', 3);
    cy.get('.panel-upnext .focus-task-row').eq(0).should('contain', 'Ready inflight task');
    cy.get('.panel-upnext .focus-task-row').eq(1).should('contain', 'Waiting later task');
    cy.get('.panel-upnext .focus-task-row').eq(2).should('contain', 'Ready plain task');
    cy.get('.panel-upnext .focus-section-badge').eq(0).should('contain', 'Ready');
    cy.get('.panel-upnext .focus-section-badge').eq(1).should('contain', 'Waiting');
  });

  it('should edit a task name separately and save due-date menu choices immediately', () => {
    enterFocusMode();

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-title').click();

    cy.get('.panel-now .focus-edit-name').clear().type('Renamed focus task');
    cy.get('.panel-now .focus-edit-date').should('not.exist');
    cy.get('.panel-now .focus-edit-save').click();

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .invoke('outerHeight').as('dateRowHeight');
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').click();
    cy.get('.panel-now .focus-edit-name').should('not.exist');
    cy.get('.focus-date-menu').should('be.visible')
      .and('have.css', 'position', 'fixed')
      .and('contain', 'Today')
      .and('contain', 'Tomorrow')
      .and('contain', 'Next week')
      .and('contain', 'Custom')
      .and('contain', 'Clear');
    cy.get('@dateRowHeight').then((rowHeight) => {
      cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
        .invoke('outerHeight').should('equal', rowHeight);
    });
    cy.get('.focus-date-option').each(($option) => {
      expect($option.text().trim()).not.to.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d/);
    });
    cy.get('.focus-date-option').contains('Next week').click();
    cy.get('.focus-date-menu').should('not.exist');
    cy.get('.focus-task-row.transitioning.phase-held.whisk-within').should('contain', 'Renamed focus task');
    cy.wait(750);
    cy.get('.flight-card.fly-within').should('contain', 'Renamed focus task');
    cy.wait(600);

    cy.get('.focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').click({ force: true });
    cy.get('.focus-date-menu input[aria-label="Custom due date"]')
      .invoke('val', dateInputValue(nextWeek)).trigger('change');
    cy.get('.focus-date-menu').should('not.exist');
    cy.get('.focus-task-row.transitioning.phase-held.whisk-within').should('contain', 'Renamed focus task');
    cy.wait(1350);

    cy.get('.focus-mode').should('contain', 'Renamed focus task').and('contain', 'Aug');
    cy.wait(500);
    cy.reload();
    cy.get('.focus-mode').should('be.visible').and('contain', 'Renamed focus task');

    cy.get('.focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-row-title').click({ force: true });
    cy.get('.focus-edit-name').should('have.value', 'Renamed focus task');
    cy.get('.focus-date-menu').should('not.exist');
    cy.get('.focus-edit-cancel').click();

    cy.get('.focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').click({ force: true });
    cy.get('.focus-edit-name').should('not.exist');
    cy.get('.focus-date-menu input[aria-label="Custom due date"]')
      .should('have.value', dateInputValue(nextWeek));
    cy.get('.focus-date-option').contains('Clear').click();
    cy.get('.focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').should('have.class', 'no-due-date');
  });

  it('should debounce a completed task in place, then whisk it into NOW', () => {
    enterFocusMode();

    // Drive the staged move by the clock rather than racing it
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);

    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check').click();

    // Pending: stays clickable in IN PROGRESS / QUEUED, already wearing its completed status
    cy.get('.panel-in-progress-queued .focus-task-row')
      .should('contain', 'Inflight wip task')
      .find('.focus-row-check').should('have.class', 'checked').and('have.class', 'pending');
    cy.get('.panel-done').should('not.contain', 'Inflight wip task');
    cy.get('.panel-now').should('not.contain', 'Inflight wip task');

    // It remains under the pointer for the same 1.5s debounce as the board.
    cy.tick(1499);
    cy.get('.panel-in-progress-queued').should('contain', 'Inflight wip task');
    cy.get('.focus-flight-layer').should('be.empty');

    // Once settled, today's completion stamp puts it in NOW and the move begins.
    cy.tick(1);
    cy.get('.focus-flight-layer .flight-card').should('contain', 'Inflight wip task');
    cy.get('.panel-in-progress-queued .focus-task-row.phase-whisking').should('exist');
    cy.get('.panel-done').should('not.contain', 'Inflight wip task');

    // Flight elapses: it lands in NOW, not DONE.
    cy.tick(550);
    cy.get('.panel-now .focus-task-row').should('contain', 'Inflight wip task');
    cy.get('.panel-done').should('not.contain', 'Inflight wip task');
    cy.get('.panel-in-progress-queued .focus-task-row').should('not.exist');
    cy.get('.focus-task-row.transitioning').should('not.exist');
    cy.get('.focus-flight-layer').should('be.empty');
  });

  it('should complete an in-progress task, keep it in NOW today, and persist across reload', () => {
    enterFocusMode();

    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check').click();

    cy.wait(2100);
    cy.get('.panel-now .focus-task-row').should('contain', 'Inflight wip task');
    cy.get('.panel-done').should('not.contain', 'Inflight wip task');
    cy.get('.panel-in-progress-queued').should('contain', 'Nothing in progress or queued');
    cy.get('.focus-progress-text').should('contain', '3 / 7 done');

    // Wait for the save to land, then verify the mode and the completion persist
    cy.wait(500);
    cy.reload();
    cy.get('.focus-mode').should('be.visible');
    cy.get('.panel-now .focus-task-row').should('contain', 'Inflight wip task');
  });

  it('should navigate the sliding 2-panel window with dots, arrows, and panel clicks', () => {
    enterFocusMode();

    cy.get('.focus-dot').should('have.length', 3);

    // Dots jump to a window position - two panels are always in the spotlight
    cy.get('.focus-dot.dot-upnext').click();
    cy.get('.panel-upnext').should('have.class', 'is-focused');
    cy.get('.panel-in-progress-queued').should('have.class', 'is-focused');
    cy.get('.panel-now').should('not.have.class', 'is-focused');

    // Arrow keys slide through the three adjacent spotlight pairs
    cy.get('body').type('{rightarrow}');
    cy.get('.panel-in-progress-queued').should('have.class', 'is-focused');
    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('.panel-upnext').should('not.have.class', 'is-focused');
    cy.get('body').type('{rightarrow}');
    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('.panel-done').should('have.class', 'is-focused');
    cy.get('.panel-in-progress-queued').should('not.have.class', 'is-focused');

    // Clicking an off-window panel slides the window to include it
    cy.get('.panel-in-progress-queued').click({ force: true });
    cy.get('.panel-in-progress-queued').should('have.class', 'is-focused');
    cy.get('.panel-now').should('have.class', 'is-focused');
  });

  it('should navigate with two-finger horizontal swipes', () => {
    enterFocusMode();

    // Swipe left (positive deltaX) moves toward DONE
    cy.get('.focus-mode').trigger('wheel', { deltaX: 150, deltaY: 0 });
    cy.get('.panel-done').should('have.class', 'is-focused');

    // After the gesture settles, swipe right steps back to the pair
    cy.wait(600);
    cy.get('.focus-mode').trigger('wheel', { deltaX: -150, deltaY: 0 });
    cy.get('.panel-in-progress-queued').should('have.class', 'is-focused');
    cy.get('.panel-now').should('have.class', 'is-focused');

    cy.wait(600);
    cy.get('.focus-mode').trigger('wheel', { deltaX: -150, deltaY: 0 });
    cy.get('.panel-upnext').should('have.class', 'is-focused');

    // Momentum-tail events while disarmed do not overswipe
    cy.get('.focus-mode').trigger('wheel', { deltaX: -150, deltaY: 0 });
    cy.get('.panel-upnext').should('have.class', 'is-focused');
  });

  it('should start an up-next task and move it into IN PROGRESS / QUEUED', () => {
    enterFocusMode();

    cy.get('.panel-upnext').click({ force: true });
    cy.get('.panel-upnext').should('have.class', 'is-focused');

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    // The spotlight returns to the execution pair; the task was pulled into active WIP
    cy.get('.panel-in-progress-queued').should('have.class', 'is-focused');
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 2)
      .should('contain', 'Selected ready task');
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-section-badge').should('contain', 'CURRENT');
    cy.get('.panel-upnext .focus-task-row').should('have.length', 1)
      .and('contain', 'Parked selected task');
  });

  it('should keep off-deck in-progress SELECTED work in UP NEXT', () => {
    enterFocusMode();

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Parked selected task')
      .find('.focus-section-badge').should('contain', 'Ready');

    // Merely viewing status does not needlessly move the underlying task
    cy.get('.focus-exit-btn').click();
    cy.get('.selected-column').should('contain', 'Parked selected task');
  });

  it('should cycle in-progress through completed, cancelled, queued, and back', () => {
    enterFocusMode();

    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check.checked').click({ force: true });

    cy.wait(1600);
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check.cancelled').click({ force: true });

    cy.wait(1600);
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check.unchecked').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-in-progress-queued').should('have.class', 'is-focused');
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 1)
      .should('contain', 'Inflight wip task');
  });

  it('should complete a task directly from the up-next panel', () => {
    enterFocusMode();

    cy.get('.panel-upnext').click({ force: true });
    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-now').should('contain', 'Selected ready task');
    cy.get('.panel-done').should('not.contain', 'Selected ready task');
    cy.get('.panel-upnext').should('not.contain', 'Selected ready task');
    cy.get('.focus-progress-text').should('contain', '3 / 7 done');

    // Exit to the board and verify the task is checked with a completion badge
    cy.get('.focus-exit-btn').click();
    findTask('Selected ready task').within(() => {
      cy.get('.custom-checkbox').should('have.class', 'checked');
      cy.get('.completion-badge').should('exist');
    });
  });

  it('should cycle a completed task through cancelled and queued', () => {
    enterFocusMode();

    cy.get('.panel-done').click({ force: true });
    cy.get('.panel-done .focus-task-row').contains('.focus-task-row', 'Done wip task')
      .find('.focus-row-check').click({ force: true });

    cy.get('.panel-done .focus-task-row').contains('.focus-task-row', 'Done wip task')
      .find('.focus-row-check').should('have.class', 'cancelled');
    cy.wait(2100);
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Done wip task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(1600);
    cy.get('.panel-now').should('contain', 'Done wip task');
    cy.get('.panel-done').should('not.contain', 'Done wip task');
    cy.get('.focus-progress-text').should('contain', '1 / 7 done');
  });

  it('should quick add a task into the active WIP section, appearing in NOW', () => {
    enterFocusMode();

    cy.get('.focus-quick-add-btn').click();
    cy.get('.focus-quick-add-input').type('Buy oat milk{enter}');

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Buy oat milk')
      .find('.focus-section-badge').should('contain', 'CURRENT');

    // Exit to the board and verify it landed in the WIP section
    cy.get('.focus-exit-btn').click();
    cy.get('.wip-column').should('contain', 'Buy oat milk');
  });

  it('should support dark/light/auto theming across board and focus mode', () => {
    // Default is auto; cycle auto -> dark: the board itself goes dark
    cy.get('.theme-toggle-btn').click();
    cy.get('.todo-app').should('have.class', 'theme-dark');

    // dark -> light
    cy.get('.theme-toggle-btn').click();
    cy.get('.todo-app').should('have.class', 'theme-light');

    enterFocusMode();
    cy.get('.focus-mode').should('have.class', 'theme-light');

    // Preference persists across reload
    cy.reload();
    cy.get('.focus-mode').should('be.visible');
    cy.get('.focus-mode').should('have.class', 'theme-light');

    // Cycle light -> auto -> dark
    cy.get('.theme-toggle-btn').click();
    cy.get('.theme-toggle-btn').click();
    cy.get('.focus-mode').should('have.class', 'theme-dark');
    cy.get('.todo-app').should('have.class', 'theme-dark');
  });

  it('should exit focus mode via the close button', () => {
    enterFocusMode();

    cy.get('.focus-exit-btn').click();

    cy.get('.focus-mode').should('not.exist');
    cy.get('.kanban-container').should('be.visible');
    cy.get('.view-mode-btn').contains('Focus').should('not.have.class', 'active');
  });

  it('should offer planning when nothing is on deck', () => {
    const emptyContent = `# TODO
## BACKLOG
* [ ] Undated backlog task

# ARCHIVE
## Old
* [x] Archived done task ${formatCompletionDate(new Date(2000, 0, 1))}
`;

    cy.writeTestFileContent(emptyContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();

    cy.get('.panel-in-progress-queued').should('contain', 'Nothing on deck this week');
    cy.get('.panel-upnext .focus-task-row').should('not.exist');
    cy.get('.panel-now .focus-task-row').should('not.exist');
    cy.get('.panel-done .focus-task-row').should('not.exist');

    cy.get('.focus-plan-btn').click();

    cy.get('.kanban-container').should('be.visible');
    cy.get('.view-mode-btn').contains('Plan').should('have.class', 'active');
    cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
  });
});
