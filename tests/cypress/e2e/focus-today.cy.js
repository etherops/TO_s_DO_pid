import { findTask } from '../support/helpers.js';
import { formatCompletionDate } from '../../../src/utils/completionDateHelpers';
import { serializeDuePeriodValue } from '../../../src/utils/dateHelpers';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dueTag = (date) => `! ${MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
const weekDueTag = (date) => {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(date.getDate() - date.getDay());
  return `! ${serializeDuePeriodValue(`week:${dateInputValue(sunday)}`)}`;
};
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
* [ ] Selected ready task ${dueTag(nextWeek)}
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

  it('should replace the board with three panels and spotlight NOW', () => {
    enterFocusMode();

    cy.get('.kanban-container').should('not.exist');
    cy.get('.view-mode-btn').contains('Focus').should('have.class', 'active');

    cy.get('.focus-panel').should('have.length', 3);

    // NOW owns the single center spotlight; the queue has moved to the right.
    cy.get('.focus-panel.panel-in-progress-queued').should('not.have.class', 'is-focused')
      .should('contain', 'In Progress / Waiting')
      .should('contain', 'Inflight wip task')
      .find('.focus-section-badge').should('contain', 'CURRENT');
    cy.get('.focus-panel.panel-now').should('have.class', 'is-focused')
      .should('contain', 'Now')
      .should('contain', 'Queued wip task');
    cy.get('.panel-upnext').should('not.have.class', 'is-focused');
    cy.get('.panel-done').should('not.exist');

    // Both side panels are fully on-screen and do not sit behind NOW.
    cy.get('.focus-panel').then(($panels) => {
      const carouselRect = $panels[0].closest('.focus-carousel').getBoundingClientRect();
      const upNextRect = $panels.filter('.panel-upnext')[0].getBoundingClientRect();
      const nowRect = $panels.filter('.panel-now')[0].getBoundingClientRect();
      const queuedRect = $panels.filter('.panel-in-progress-queued')[0].getBoundingClientRect();
      expect(upNextRect.left).to.be.at.least(0);
      expect(queuedRect.right).to.be.at.most(1400);
      expect(upNextRect.right).to.be.lessThan(nowRect.left);
      expect(nowRect.right).to.be.lessThan(queuedRect.left);
      expect(nowRect.width).to.be.greaterThan(upNextRect.width);
      expect(nowRect.height).to.be.greaterThan(upNextRect.height);
      expect(nowRect.height).to.be.greaterThan(queuedRect.height);
      const upNextTopGap = upNextRect.top - carouselRect.top;
      const upNextBottomGap = carouselRect.bottom - upNextRect.bottom;
      const queuedTopGap = queuedRect.top - carouselRect.top;
      const queuedBottomGap = carouselRect.bottom - queuedRect.bottom;
      expect(upNextTopGap).to.be.greaterThan(upNextBottomGap);
      expect(queuedTopGap).to.be.greaterThan(queuedBottomGap);
      expect(upNextTopGap - upNextBottomGap).to.be.lessThan(25);
      expect(queuedTopGap - queuedBottomGap).to.be.lessThan(25);
    });
    cy.get('.focus-week-strip').then(($strip) => {
      expect(window.innerHeight - $strip[0].getBoundingClientRect().bottom).to.be.lessThan(85);
    });
  });

  it('should bucket into up next, in progress / waiting, NOW, and the weekly strip', () => {
    enterFocusMode();

    // The right panel contains only undated ~ work, preserving its two legacy groups.
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 2)
      .and('contain', 'Inflight wip task').and('contain', 'Parked selected task');
    cy.get('.panel-in-progress-queued .focus-row-check.inflight').should('have.length', 2);
    cy.get('.panel-in-progress-queued .focus-day-header').eq(0).should('contain', 'In Progress / Parked');
    cy.get('.panel-in-progress-queued .focus-day-header').eq(1).should('contain', 'Waiting / Blocked');

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

    // UP NEXT owns the scheduled card.
    cy.get('.panel-upnext .focus-task-row').should('have.length', 1)
      .and('contain', 'Selected ready task');

    // The old DONE panel is gone; the weekly strip contains the seven real days.
    cy.get('.panel-done').should('not.exist');
    cy.get('.focus-week-strip').should('be.visible').and('contain', 'Week at a glance');
    cy.get('.focus-week-day-column').should('have.length', 7);
    cy.get('.focus-week-day-column.is-current').should('have.length', 1)
      .and('contain', 'Today!')
      .and('contain', '2')
      .and('contain', 'Not started')
      .and('not.contain', 'In progress')
      .and('not.contain', 'Done')
      .and('not.contain', 'Won’t do');
    cy.get('.focus-week-day-column.is-current .focus-task-row').should('not.exist');
    cy.get('.focus-week-day-column.is-current .focus-today-status').should('have.length', 1)
      .find('.focus-row-check.unchecked').should('exist');
    cy.get('.focus-week-strip .focus-due-edit').should('not.exist');
    cy.get('.focus-week-strip .focus-section-badge').should('not.exist');
    cy.get('.focus-week-day-column.is-current').then(($current) => {
      const rect = $current[0].getBoundingClientRect();
      cy.get('.focus-week-day-columns').trigger('mousemove', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
    });
    cy.get('.focus-week-day-column.is-current').should('have.class', 'is-expanded');
    // Re-aim after the first transform settles; the pane's center moves as the
    // surrounding dock slots redistribute.
    cy.wait(200);
    cy.get('.focus-week-day-column.is-current').then(($current) => {
      const rect = $current[0].getBoundingClientRect();
      cy.get('.focus-week-day-columns').trigger('mousemove', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
    });
    cy.get('.focus-week-day-column.is-current').should('have.class', 'is-expanded');

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

    // Urgent underway work joins NOW; only non-urgent active work stays queued.
    cy.get('.panel-in-progress-queued .focus-task-row').should('not.exist');

    // Overdue and due-today work remain in NOW.
    cy.get('.panel-now .focus-task-row').should('have.length', 2);
    cy.get('.panel-now .focus-day-header').eq(0).should('contain', 'Today');
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Selected inflight overdue')
      .find('.focus-badge.overdue').should('exist');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Selected due today');
    // Future and undated non-~ work goes to Up Next.
    cy.get('.panel-upnext .focus-task-row').should('have.length', 3);
    cy.get('.panel-upnext .focus-task-row').eq(0).should('contain', 'Selected due later')
      .find('.focus-badge.due-later').should('exist');
    cy.get('.panel-upnext .focus-task-row').eq(1).should('contain', 'Selected undated');
    cy.get('.panel-upnext .focus-task-row').eq(2).should('contain', 'Wip undated');
  });

  it('should group current-month work at the top of Up Next', () => {
    const monthName = MONTHS[today.getMonth()];
    const monthContent = `# SELECTED
## Ready
* [ ] Plain waiting task
* [ ] Current month task ! ${monthName} ${today.getFullYear()}
* [ ] Future waiting task ${dueTag(nextWeek)}

# WIP
### CURRENT
* [ ] Wip undated
`;

    cy.writeTestFileContent(monthContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();
    cy.get('.panel-upnext .upnext-group-header').should('have.length', 3);
    cy.get('.panel-upnext .upnext-group-header').eq(0).should('contain', 'This Month').and('contain', '1');
    cy.get('.panel-upnext .focus-task-row').eq(0).should('contain', 'Current month task');
    cy.get('.panel-upnext .focus-task-row').eq(0).find('.focus-due-edit').should('have.class', 'due-month');
    cy.get('.panel-upnext .upnext-group-header').eq(1).should('not.contain', 'Unscheduled').and('contain', '1');
    cy.get('.panel-upnext .upnext-group-header').eq(2).should('contain', 'Unscheduled').and('contain', '2');
    cy.get('.panel-in-progress-queued .focus-task-row').should('not.exist');
  });

  it('uses the same canonical label for a due-week group and its task badge', () => {
    const weekStart = new Date(nextWeek);
    weekStart.setDate(nextWeek.getDate() - nextWeek.getDay());
    const label = serializeDuePeriodValue(`week:${dateInputValue(weekStart)}`).replace(/\s+\d{4}$/, '');
    const weekContent = `# SELECTED
## Ready
* [ ] Whole future week ${weekDueTag(nextWeek)}
`;

    cy.writeTestFileContent(weekContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();
    cy.get('.panel-upnext .upnext-group-header').should('contain', label);
    cy.get('.panel-upnext .focus-badge.due-week-period')
      .should('contain', label)
      .and('have.css', 'background-color', 'rgba(139, 103, 177, 0.24)');
  });

  it('interleaves whole-month and week groups in chronological month order', () => {
    const futureSunday = new Date(today);
    futureSunday.setHours(0, 0, 0, 0);
    futureSunday.setDate(today.getDate() + (7 - today.getDay()));
    const ownerThursday = new Date(futureSunday);
    ownerThursday.setDate(futureSunday.getDate() + 4);
    const ownerMonth = new Date(ownerThursday.getFullYear(), ownerThursday.getMonth(), 1);
    const followingMonth = new Date(ownerMonth.getFullYear(), ownerMonth.getMonth() + 1, 1);
    const ownerMonthLabel = ownerMonth.getFullYear() === today.getFullYear() && ownerMonth.getMonth() === today.getMonth()
      ? 'This Month'
      : ownerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const weekLabel = serializeDuePeriodValue(`week:${dateInputValue(futureSunday)}`)
      .replace(/\s+\d{4}$/, '').toUpperCase();
    const followingMonthLabel = followingMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const content = `# SELECTED
## Ready
* [ ] Broad owner month ! ${MONTHS[ownerMonth.getMonth()]} ${ownerMonth.getFullYear()}
* [ ] Owner month week ${weekDueTag(futureSunday)}
* [ ] Broad following month ! ${MONTHS[followingMonth.getMonth()]} ${followingMonth.getFullYear()}
`;

    cy.writeTestFileContent(content).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();
    cy.get('.panel-upnext .upnext-group-header').then(($headers) => {
      const labels = [...$headers].map(header => header.textContent.trim());
      expect(labels[0]).to.contain(ownerMonthLabel);
      expect(labels[1]).to.contain(weekLabel);
      expect(labels[2]).to.contain(followingMonthLabel);
    });
  });

  it('should separate dash-marker in-progress tasks into a compact Low Priority group', () => {
    const priorityContent = `# SELECTED
### Waiting
- [~] Low blocked task
- [ ] Low unscheduled task
- [ ] Low future task ${dueTag(nextWeek)}
- [ ] Low today task ${dueTag(today)}
* [~] Normal blocked task

# WIP
### Active
* [~] Normal active task
`;

    cy.writeTestFileContent(priorityContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });
    enterFocusMode();

    cy.get('.panel-in-progress-queued .focus-day-header').should('contain', 'Low Priority').and('contain', '1');
    cy.get('.panel-in-progress-queued .focus-task-row.low-priority-row')
      .should('have.length', 1).and('contain', 'Low blocked task');
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Normal blocked task')
      .should('not.have.class', 'low-priority-row');
    cy.get('.panel-upnext .upnext-group-header').last()
      .should('contain', 'Low Priority').and('contain', '2');
    cy.get('.panel-upnext .focus-task-row.low-priority-row')
      .should('have.length', 2).and('contain', 'Low unscheduled task').and('contain', 'Low future task');
    cy.get('.panel-now .focus-day-header').last()
      .should('contain', 'Low Priority').and('contain', '1');
    cy.get('.panel-now .focus-task-row.low-priority-row')
      .should('have.length', 1).and('contain', 'Low today task');
    cy.get('.focus-week-day-column.is-current .focus-today-status').should('have.length', 1)
      .and('contain', '2').and('contain', 'Not started');
    cy.get('.panel-in-progress-queued .focus-task-row.low-priority-row').then(($low) => {
      cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Normal active task')
        .then(($normal) => expect($low[0].getBoundingClientRect().height)
          .to.be.lessThan($normal[0].getBoundingClientRect().height));
    });

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Low today task')
      .find('.focus-priority-toggle').should('contain', 'LOW').click();
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Low today task')
      .should('not.have.class', 'low-priority-row')
      .find('.focus-priority-toggle').should('contain', '↓');

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Low unscheduled task')
      .find('.focus-priority-toggle').click({ force: true });
    cy.get('.panel-upnext .upnext-group-header').should('contain', 'Unscheduled');
    cy.wait(500);
    cy.reload();
    cy.get('.focus-mode').should('be.visible');
    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Low today task')
      .should('not.have.class', 'low-priority-row');
    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Low unscheduled task')
      .should('not.have.class', 'low-priority-row');
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

  it('should not status-sort a card until the toggle debounce settles', () => {
    enterFocusMode();
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);

    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Overdue selected task');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Queued wip task')
      .find('.focus-row-check').click();

    // The icon changes, but the card remains exactly where it was while pending.
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Overdue selected task');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Queued wip task')
      .find('.focus-row-check').should('have.class', 'inflight').and('have.class', 'pending');
    cy.tick(1499);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Overdue selected task');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Queued wip task');

    // Once settled, status ordering applies and the real within-panel move animates.
    cy.tick(1);
    cy.get('.flight-card.fly-within').should('contain', 'Queued wip task');
    cy.tick(550);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Queued wip task');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Overdue selected task');
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
* [ ] Wip all week ${weekDueTag(today)}
`;

    cy.writeTestFileContent(dayContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();

    // Whole-week work has one purple home above the urgent Today group.
    cy.get('.panel-now .focus-day-header').should('have.length', 2);
    cy.get('.panel-now .focus-day-header').eq(0).should('contain', 'This Week').and('contain', '1')
      .and('have.class', 'day-this-week');
    cy.get('.panel-now .focus-day-header').eq(1).should('contain', 'Today').and('contain', '2')
      .and('have.class', 'day-today');
    cy.get('.panel-now .focus-task-row').should('have.length', 3);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Wip all week')
      .and('have.class', 'this-week-row');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Wip overdue')
      .and('have.class', 'overdue-row');
    cy.get('.panel-now .focus-task-row').eq(2).should('contain', 'Wip due today');

    // The full-width week strip contains only Sunday-Saturday. Future cards
    // land in their day, while Today mirrors the spotlight counts.
    const tomorrowName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAfterName = dayAfter.toLocaleDateString('en-US', { weekday: 'long' });
    cy.get('.focus-week-strip').should('be.visible').and('contain', 'Week at a glance');
    cy.get('.focus-week-strip .focus-week-day-column').should('have.length', 7);
    cy.get('.focus-week-strip').should('not.contain', 'Wip all week');
    cy.contains('.focus-week-day-column', tomorrowName).should('contain', 'Wip tomorrow');
    cy.contains('.focus-week-day-column', dayAfterName).should('contain', 'Wip day after');
    cy.get('.focus-week-day-column.is-current').then(($todayColumn) => {
      cy.get('.focus-week-day-column').not('.is-current').first().then(($otherColumn) => {
        expect($todayColumn[0].getBoundingClientRect().width)
          .to.be.closeTo($otherColumn[0].getBoundingClientRect().width, 1);
      });
    });
    cy.get('.focus-week-day-column').each(($column) => {
      expect(getComputedStyle($column[0]).overflowY).to.equal('auto');
      expect(getComputedStyle($column[0]).borderTopStyle).to.equal('solid');
    });

    // Dock magnification grows the entered day in both dimensions, gives its
    // neighbors a smaller lift, and pushes the outer panes away without reflow.
    cy.get('.focus-week-day-column').then(($days) => {
      const restingRects = [...$days].map(day => day.getBoundingClientRect());
      const restingLabelHeight = $days[3].querySelector('.day-name').getBoundingClientRect().height;
      const target = restingRects[3];
      cy.get('.focus-week-day-columns').trigger('mousemove', {
        clientX: target.left + target.width / 2,
        clientY: target.top + target.height / 2
      });
      cy.get('.focus-week-day-column').eq(3).should('have.class', 'is-expanded');
      cy.get('.focus-week-day-columns').should('have.class', 'has-expanded-day');
      cy.get('.focus-week-day-column.is-expanded-neighbor').should('have.length', 2);
      cy.wait(250);
      cy.get('.focus-week-day-column').then(($magnifiedDays) => {
        const magnifiedRects = [...$magnifiedDays].map(day => day.getBoundingClientRect());
        const activeTransform = new DOMMatrix(getComputedStyle($magnifiedDays[3]).transform);
        const stripRect = $magnifiedDays[3].closest('.focus-week-strip').getBoundingClientRect();
        const magnifiedLabelHeight = $magnifiedDays[3].querySelector('.day-name').getBoundingClientRect().height;
        expect(activeTransform.a).to.be.greaterThan(1.65);
        expect(activeTransform.d).to.be.greaterThan(1.65);
        expect(magnifiedLabelHeight).to.be.closeTo(restingLabelHeight, 1);
        expect(magnifiedRects[3].width).to.be.greaterThan(restingRects[3].width * 1.6);
        expect(magnifiedRects[3].height).to.be.greaterThan(restingRects[3].height * 1.2);
        expect(magnifiedRects[3].top).to.be.lessThan(stripRect.top);
        expect(magnifiedRects[2].width).to.be.greaterThan(restingRects[2].width * 1.05);
        expect(magnifiedRects[2].width).to.be.lessThan(magnifiedRects[3].width);
        expect(magnifiedRects[0].width).to.be.closeTo(restingRects[0].width, 1);
        expect(magnifiedRects[0].left).to.be.lessThan(restingRects[0].left - 10);
      });
      cy.get('.week-strip-body').should('have.css', 'overflow-y', 'visible');
      cy.get('.focus-week-day-columns').trigger('mouseleave');
      cy.get('.focus-week-day-column').eq(3).should('not.have.class', 'is-expanded');
      cy.get('.focus-week-day-columns').should('not.have.class', 'has-expanded-day');
      cy.wait(250);
      cy.get('.focus-week-day-column').eq(3).then(($restoredDay) => {
        expect($restoredDay[0].getBoundingClientRect().width).to.be.closeTo(restingRects[3].width, 4);
        expect($restoredDay[0].getBoundingClientRect().height).to.be.closeTo(restingRects[3].height, 4);
      });

      // Edge panes grow inward as needed and never leave the viewport.
      [0, $days.length - 1].forEach((edgeIndex) => {
        cy.get('.focus-week-day-columns').trigger('mouseleave');
        cy.wait(250);
        cy.get('.focus-week-day-column').eq(edgeIndex).then(($edgeDay) => {
          const edgeRect = $edgeDay[0].getBoundingClientRect();
          cy.get('.focus-week-day-columns').trigger('mousemove', {
            clientX: edgeRect.left + edgeRect.width / 2,
            clientY: edgeRect.top + edgeRect.height / 2
          });
        });
        cy.wait(250);
        cy.get('.focus-week-day-column').eq(edgeIndex).then(($expandedEdge) => {
          const rect = $expandedEdge[0].getBoundingClientRect();
          const viewportWidth = $expandedEdge[0].ownerDocument.defaultView.innerWidth;
          expect(rect.left).to.be.at.least(7);
          expect(rect.right).to.be.at.most(viewportWidth - 7);
        });
      });
    });

    // Exact-day work remains in Week at a glance; whole-week work is in NOW.
    cy.get('.panel-upnext .focus-task-row').should('have.length', 1)
      .and('contain', 'Wip undated');
    cy.get('.panel-upnext').should('not.contain', 'Wip tomorrow')
      .and('not.contain', 'Wip day after').and('not.contain', 'Wip all week');
    cy.get('.panel-in-progress-queued .focus-task-row').should('not.exist');
  });

  it('should retain terminal cards in past days and keep unfinished overdue work above', () => {
    const historyContent = `# WIP
### CURRENT
* [x] Finished yesterday ${formatCompletionDate(yesterday)}
* [-] Skipped yesterday ${formatCompletionDate(yesterday)}
* [x] Finished without due date ${formatCompletionDate(yesterday)}
* [ ] Still overdue ${dueTag(yesterday)}
`;

    cy.writeTestFileContent(historyContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });

    enterFocusMode();

    const yesterdayName = yesterday.toLocaleDateString('en-US', { weekday: 'long' });
    cy.contains('.focus-week-day-column.is-past', yesterdayName)
      .should('contain', 'Finished yesterday')
      .and('contain', 'Skipped yesterday')
      .and('contain', 'Finished without due date')
      .and('not.contain', 'Still overdue');
    cy.get('.panel-now').should('contain', 'Still overdue');
  });

  it('should place a terminal task by completion day instead of its later due day', () => {
    const yesterdayCompletion = formatCompletionDate(yesterday);
    const historyContent = `# WIP
### CURRENT
* [x] Finished yesterday due today ${yesterdayCompletion}
`;

    cy.writeTestFileContent(historyContent).then((fileInfo) => {
      cy.wait(500);
      cy.reload();
      cy.contains('TO_s_DO_pid').should('be.visible');
      cy.switchToFile(fileInfo.fileName);
    });
    enterFocusMode();

    cy.get('.panel-now').should('not.contain', 'Finished yesterday due today');
    cy.get('.focus-week-day-column.is-current').should('not.contain', 'Finished yesterday due today');
    cy.get('.focus-week-day-column.is-past').contains('Finished yesterday due today').should('exist');
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
* [x] Monday completed today ${formatCompletionDate(today)}

### FRIDAY
* [~] Friday inflight task
* [-] Friday cancelled today ${formatCompletionDate(today)}
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
    cy.get('.panel-in-progress-queued .focus-task-row').should('have.length', 2)
      .and('contain', 'Friday inflight task').and('contain', 'Ready inflight task');

    // NOW keeps its day grouping, then follows the board's x -> - -> ~ -> blank
    // status order before clustering matching sections.
    cy.get('.panel-now .focus-task-row').should('have.length', 4);
    cy.get('.panel-now .focus-task-row').eq(0).should('contain', 'Monday completed today');
    cy.get('.panel-now .focus-task-row').eq(1).should('contain', 'Friday cancelled today');
    cy.get('.panel-now .focus-task-row').eq(2).should('contain', 'Friday active today');
    cy.get('.panel-now .focus-task-row').eq(3).should('contain', 'Friday due today');
    cy.get('.panel-now .focus-section-badge').eq(0).should('contain', 'MONDAY');
    cy.get('.panel-now .focus-section-badge').eq(1).should('contain', 'FRIDAY');

    // UP NEXT owns dated and unscheduled non-~ work.
    cy.get('.panel-upnext .focus-task-row').should('have.length', 3);
    cy.get('.panel-upnext .focus-task-row').eq(0).should('contain', 'Waiting later task');
    cy.get('.panel-upnext .focus-task-row').eq(1).should('contain', 'Ready plain task');
    cy.get('.panel-upnext .focus-task-row').eq(2).should('contain', 'Monday queued task');
  });

  it('should edit a task name separately and save due-date menu choices immediately', () => {
    enterFocusMode();

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Queued wip task')
      .find('.focus-row-title').click();

    cy.get('.panel-now .focus-edit-name').clear();
    cy.get('.panel-now .focus-edit-name').type('Renamed focus task');
    cy.get('.panel-now .focus-edit-name').should('have.value', 'Renamed focus task');
    cy.get('.panel-now .focus-edit-date').should('not.exist');
    cy.get('.panel-now .focus-edit-name').type('{enter}');

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
      .and('contain', 'This week')
      .and('not.contain', 'Whole next week')
      .and('contain', 'This month')
      .and('contain', 'Next month')
      .and('contain', 'Custom')
      .and('contain', 'Clear');
    cy.get('.focus-date-custom-trigger').click();
    cy.get('.focus-unified-date-picker').should('be.visible');
    cy.get('.focus-period-kind-btn').should('have.length', 3);
    cy.get('.focus-custom-date-input').should('have.attr', 'type', 'date').and('be.focused');
    cy.get('.focus-period-kind-btn').contains('week').click();
    cy.get('.focus-custom-date-input').should('have.attr', 'type', 'week').and('be.focused');
    cy.get('.focus-period-kind-btn').contains('month').click();
    cy.get('.focus-custom-date-input').should('have.attr', 'type', 'month').and('be.focused');
    cy.get('.focus-period-kind-btn').contains('day').click();
    cy.get('@dateRowHeight').then((rowHeight) => {
      cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
        .invoke('outerHeight').should('equal', rowHeight);
    });
    cy.get('.focus-date-option').each(($option) => {
      expect($option.text().trim()).not.to.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d/);
    });
    cy.get('.focus-date-option').contains('Next week').click();
    cy.get('.focus-date-menu').should('not.exist');
    cy.get('.panel-upnext').should('contain', 'Renamed focus task');
    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').should('have.class', 'due-week-period');

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').click({ force: true });
    cy.get('.focus-date-custom-trigger').click();
    cy.get('.focus-date-menu input[aria-label="Custom due day"]')
      .invoke('val', dateInputValue(nextWeek)).trigger('change');
    cy.get('.focus-date-menu').should('not.exist');
    cy.get('.focus-task-row.transitioning.phase-held.whisk-within').should('contain', 'Renamed focus task');
    cy.wait(1350);

    cy.get('.focus-mode').should('contain', 'Renamed focus task').and('contain', 'Aug');
    cy.wait(500);
    cy.reload();
    cy.get('.focus-mode').should('be.visible').and('contain', 'Renamed focus task');

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .should('not.have.class', 'transitioning')
      .find('.focus-row-title').click();
    cy.get('.focus-edit-name').should('have.value', 'Renamed focus task');
    cy.get('.focus-date-menu').should('not.exist');
    cy.get('.focus-edit-cancel').click();

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').click({ force: true });
    cy.get('.focus-edit-name').should('not.exist');
    cy.get('.focus-date-custom-trigger').click();
    cy.get('.focus-date-menu input[aria-label="Custom due day"]')
      .should('have.value', dateInputValue(nextWeek));
    cy.get('.focus-date-option').contains('Clear').click();
    cy.get('.focus-task-row').contains('.focus-task-row', 'Renamed focus task')
      .find('.focus-due-edit').should('have.class', 'no-due-date');
  });

  it('should quick-edit titles and due dates in side panels without centering them', () => {
    enterFocusMode();

    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('.panel-upnext').should('not.have.class', 'is-focused')
      .find('.focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-title').should('have.css', 'pointer-events', 'auto').click();
    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('.panel-upnext .focus-edit-name').type('{selectall}Side-edited ready task{enter}');
    cy.get('.panel-upnext').should('not.have.class', 'is-focused').and('contain', 'Side-edited ready task');
    cy.get('.panel-now').should('have.class', 'is-focused');

    cy.get('.panel-in-progress-queued').should('not.have.class', 'is-focused')
      .find('.focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-due-edit').should('have.css', 'pointer-events', 'auto').click();
    cy.get('.focus-date-menu').should('be.visible');
    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('.panel-in-progress-queued').should('not.have.class', 'is-focused');
  });

  it('should debounce a completed task in place, then whisk it into NOW', () => {
    enterFocusMode();

    // Drive the staged move by the clock rather than racing it
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);

    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check').should('have.css', 'pointer-events', 'auto').click({ force: true });

    // Pending: stays clickable in IN PROGRESS / QUEUED, already wearing its completed status
    cy.get('.panel-in-progress-queued .focus-task-row')
      .should('contain', 'Inflight wip task')
      .find('.focus-row-check').should('have.class', 'checked').and('have.class', 'pending');
    cy.get('.panel-done').should('not.exist');
    cy.get('.panel-now').should('not.contain', 'Inflight wip task');

    // It remains under the pointer for the same 1.5s debounce as the board.
    cy.tick(1499);
    cy.get('.panel-in-progress-queued').should('contain', 'Inflight wip task');
    cy.get('.focus-flight-layer').should('be.empty');

    // Once settled, today's completion stamp puts it in NOW and the move begins.
    cy.tick(1);
    cy.get('.focus-flight-layer .flight-card').should('contain', 'Inflight wip task');
    cy.get('.panel-in-progress-queued .focus-task-row.phase-whisking').should('exist');
    cy.get('.panel-done').should('not.exist');

    // Flight elapses: it lands in NOW, not DONE.
    cy.tick(550);
    cy.get('.panel-now .focus-task-row').should('contain', 'Inflight wip task');
    cy.get('.panel-done').should('not.exist');
    cy.get('.panel-in-progress-queued').should('not.contain', 'Inflight wip task');
    cy.get('.focus-task-row.transitioning').should('not.exist');
    cy.get('.focus-flight-layer').should('be.empty');
  });

  it('should complete an in-progress task, keep it in NOW today, and persist across reload', () => {
    enterFocusMode();

    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check').should('have.css', 'pointer-events', 'auto').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-now .focus-task-row').should('contain', 'Inflight wip task');
    cy.get('.panel-done').should('not.exist');
    cy.get('.panel-in-progress-queued').should('contain', 'Parked selected task')
      .and('not.contain', 'Inflight wip task');
    cy.get('.focus-progress-text').should('contain', '3 / 7 done');

    // Wait for the save to land, then verify the mode and the completion persist
    cy.wait(500);
    cy.reload();
    cy.get('.focus-mode').should('be.visible');
    cy.get('.panel-now .focus-task-row').should('contain', 'Inflight wip task');
  });

  it('should keep the top panes fixed and magnify a side pane from its background', () => {
    enterFocusMode();

    cy.get('.focus-dot').should('not.exist');
    cy.get('.panel-now').should('have.class', 'is-focused');
    cy.get('.panel-upnext .panel-header').click({ force: true });
    cy.get('.panel-upnext').should('have.class', 'is-magnified').and('have.class', 'is-focused');
    cy.get('.panel-in-progress-queued').should('not.have.class', 'is-magnified');
  });

  it('should navigate the week carousel with arrows and full sibling week panels', () => {
    enterFocusMode();

    cy.get('.focus-week-carousel-shell > .focus-week-strip').should('have.length', 3);
    cy.get('.focus-week-strip-previous').should('be.visible');
    cy.get('.focus-week-strip-next').should('be.visible');
    cy.get('.focus-week-strip-current').then(($current) => {
      const currentRect = $current[0].getBoundingClientRect();
      const viewportWidth = $current[0].ownerDocument.defaultView.innerWidth;
      expect(currentRect.width).to.be.closeTo(viewportWidth * 0.95, 2);
      cy.get('.focus-week-strip-previous').then(($previous) => {
        expect($previous[0].getBoundingClientRect().right).to.be.closeTo(viewportWidth * 0.025 - 8, 3);
        expect($previous[0].getBoundingClientRect().height).to.be.lessThan(currentRect.height);
      });
      cy.get('.focus-week-strip-next').then(($next) => {
        expect($next[0].getBoundingClientRect().left).to.be.closeTo(viewportWidth * 0.975 + 8, 3);
        expect($next[0].getBoundingClientRect().height).to.be.lessThan(currentRect.height);
      });
    });
    cy.get('.focus-week-range').invoke('text').as('currentWeekLabel');
    cy.window().trigger('keydown', { key: 'ArrowRight' });
    cy.get('@currentWeekLabel').then((label) => {
      cy.get('.focus-week-range').should('not.have.text', label);
    });
    cy.get('.focus-week-carousel-shell').should('have.class', 'carousel-next');
    cy.window().trigger('keydown', { key: 'ArrowLeft' });
    cy.get('@currentWeekLabel').then((label) => {
      cy.get('.focus-week-range').should('have.text', label);
    });
    cy.get('.focus-week-strip-next').click({ force: true });
    cy.get('.focus-week-carousel-shell').should('have.class', 'carousel-next');
    cy.get('.focus-week-return').should('contain', 'This week').click();
    cy.get('@currentWeekLabel').then((label) => {
      cy.get('.focus-week-range').should('have.text', label);
    });
    cy.get('.focus-week-return').should('not.exist');
  });

  it('should move a started Up Next task into In Progress / Waiting after debounce', () => {
    enterFocusMode();

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-upnext').should('not.contain', 'Selected ready task');
    cy.get('.panel-in-progress-queued').should('contain', 'Selected ready task');
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').should('have.class', 'inflight');
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-section-badge').should('exist');
    cy.get('.panel-in-progress-queued').should('contain', 'Parked selected task');
  });

  it('should keep off-deck in-progress SELECTED work in Waiting / Blocked', () => {
    enterFocusMode();

    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Parked selected task')
      .find('.focus-section-badge').should('contain', 'Ready');
    cy.get('.panel-in-progress-queued .focus-day-header').should('contain', 'Waiting / Blocked');

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
    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Inflight wip task')
      .find('.focus-row-check.unchecked').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-in-progress-queued .focus-task-row').should('contain', 'Inflight wip task');
  });

  it('should complete a task directly from the up-next panel', () => {
    enterFocusMode();

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-in-progress-queued .focus-task-row').contains('.focus-task-row', 'Selected ready task')
      .find('.focus-row-check').click({ force: true });

    cy.wait(2100);
    cy.get('.panel-now').should('contain', 'Selected ready task');
    cy.get('.panel-done').should('not.exist');
    cy.get('.panel-upnext').should('not.contain', 'Selected ready task');
    cy.get('.focus-progress-text').should('contain', '3 / 7 done');

    // Exit to the board and verify the task is checked with a completion badge
    cy.get('.focus-exit-btn').click();
    findTask('Selected ready task').within(() => {
      cy.get('.custom-checkbox').should('have.class', 'checked');
      cy.get('.completion-badge').should('exist');
    });
  });

  it('should quick add a due-today task into the inferred active WIP section and NOW', () => {
    enterFocusMode();

    cy.get('.focus-quick-add-btn').click();
    cy.get('.focus-quick-add-input').type('Buy oat milk{enter}');

    cy.get('.panel-now .focus-task-row').contains('.focus-task-row', 'Buy oat milk')
      .should('contain', 'CURRENT')
      .find('.focus-due-edit').should('have.class', 'due-today').and('contain', 'today');
    cy.get('.panel-upnext').should('not.contain', 'Buy oat milk');

    // Exit to the board and verify it landed in the WIP section
    cy.get('.focus-exit-btn').click();
    cy.get('.wip-column').should('contain', 'Buy oat milk');
    findTask('Buy oat milk').within(() => {
      cy.get('.clock-btn').should('have.class', 'has-due-date');
      cy.get('.task-title').should('have.class', 'due-today');
    });
  });

  it('should choose a quick due period while adding a focus task', () => {
    enterFocusMode();

    cy.get('.focus-quick-add-btn').click();
    cy.get('.focus-quick-add-date-btn').should('contain', 'Today').click();
    cy.get('.focus-quick-add-date-menu').should('be.visible');
    cy.get('.focus-quick-add-date-option').contains('Next week').click();
    cy.get('.focus-quick-add-date-btn').should('contain', 'Week');
    cy.get('.focus-quick-add-input').type('Plan next week{enter}');

    cy.get('.panel-upnext .focus-task-row').contains('.focus-task-row', 'Plan next week')
      .find('.focus-due-edit').should('have.class', 'due-week-period');
    cy.get('.panel-now').should('not.contain', 'Plan next week');
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
    cy.get('.panel-done').should('not.exist');
    cy.get('.focus-week-day-column').should('have.length', 7);

    cy.get('.focus-plan-btn').click();

    cy.get('.kanban-container').should('be.visible');
    cy.get('.view-mode-btn').contains('Plan').should('have.class', 'active');
    cy.get('.todo-stack').should('have.class', 'drawer-collapsed');
  });
});
