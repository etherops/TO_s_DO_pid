import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseTodoMdFile, renderTodoMdFile } from '../../../src/utils/TodoMdParser'

describe('TodoMdParser', () => {
  let sampleContent

  beforeEach(() => {
    // Load the fixture file
    const fixturePath = join(process.cwd(), 'tests/fixtures/sample.todo.md')
    sampleContent = readFileSync(fixturePath, 'utf-8')
  })

  describe('parseTodoMdFile', () => {
    it('should parse empty content gracefully', () => {
      const result = parseTodoMdFile('')
      expect(result).toEqual([])
    })

    it('should parse null content gracefully', () => {
      const result = parseTodoMdFile(null)
      expect(result).toEqual([])
    })

    it('should parse H1 column headers correctly', () => {
      const content = `# TODO
## Section 1
* [ ] Task 1

# SCHEDULED
## Section 2
* [~] Task 2

# ARCHIVE
## Section 3
* [x] Task 3`

      const sections = parseTodoMdFile(content)
      
      // Check that sections are assigned to correct columns
      const section1 = sections.find(s => s.name === 'Section 1')
      const section2 = sections.find(s => s.name === 'Section 2')
      const section3 = sections.find(s => s.name === 'Section 3')
      
      expect(section1.column).toBe('TODO')
      expect(section2.column).toBe('WIP') // SCHEDULED maps to WIP
      expect(section3.column).toBe('DONE') // ARCHIVE maps to DONE
    })

    it('should handle special H1 format with brackets', () => {
      const content = `# [ ] TODO
## Tasks
* [ ] Task 1`

      const sections = parseTodoMdFile(content)
      const section = sections.find(s => s.name === 'Tasks')
      
      expect(section.fileColumn).toBe('[ ] TODO')  // H1 column name
      expect(section.column).toBe('TODO')  // Visual column
    })

    it('should parse H2 large sections correctly', () => {
      const content = `# TODO
## BACKLOG
* [ ] Task 1
* [~] Task 2

## PLANNING
* [x] Task 3`

      const sections = parseTodoMdFile(content)
      
      expect(sections).toHaveLength(2)
      expect(sections[0].name).toBe('BACKLOG')
      expect(sections[0].headerStyle).toBe('LARGE')
      expect(sections[0].items).toHaveLength(2)
      expect(sections[1].name).toBe('PLANNING')
      expect(sections[1].headerStyle).toBe('LARGE')
      expect(sections[1].items).toHaveLength(1)
    })

    it('should parse H3 small sections correctly', () => {
      const content = `# WIP
### In Progress
* [~] Task 1

### Week: May 4 / June 1
* [x] Task 2`

      const sections = parseTodoMdFile(content)
      
      expect(sections).toHaveLength(2)
      expect(sections[0].name).toBe('In Progress')
      expect(sections[0].headerStyle).toBe('SMALL')
      expect(sections[1].name).toBe('Week: May 4 / June 1')
      expect(sections[1].headerStyle).toBe('SMALL')
    })

    it('should parse task items with different status characters', () => {
      const content = `# TODO
## Tasks
* [ ] Unchecked task
* [~] In progress task
* [x] Completed task
* [-] Cancelled task`

      const sections = parseTodoMdFile(content)
      const items = sections[0].items
      
      expect(items).toHaveLength(4)
      expect(items[0].statusChar).toBe(' ')
      expect(items[0].text).toBe('Unchecked task')
      expect(items[1].statusChar).toBe('~')
      expect(items[1].text).toBe('In progress task')
      expect(items[2].statusChar).toBe('x')
      expect(items[2].text).toBe('Completed task')
      expect(items[3].statusChar).toBe('-')
      expect(items[3].text).toBe('Cancelled task')
    })

    it('should parse tasks with notes and due dates', () => {
      const content = `# TODO
## Tasks
* [ ] Task with note (this is a note)
* [ ] Task with due date !!(June 2)
* [ ] Complex task (note here) !!(May 30)`

      const sections = parseTodoMdFile(content)
      const items = sections[0].items
      
      expect(items[0].text).toBe('Task with note (this is a note)')
      expect(items[1].text).toBe('Task with due date !!(June 2)')
      expect(items[2].text).toBe('Complex task (note here) !!(May 30)')
    })

    it('should handle multiline notes with escaped newlines', () => {
      const content = `# TODO
## Tasks
* [~] Task with multiline note (line 1\\nline 2\\nline 3)`

      const sections = parseTodoMdFile(content)
      const item = sections[0].items[0]
      
      expect(item.text).toContain('\\n')
      expect(item.displayText).toBe('Task with multiline note')
    })

    it('should map ARCHIVE H1 sections to DONE column', () => {
      const content = `# ARCHIVE
### Old Tasks
* [x] Completed task`

      const sections = parseTodoMdFile(content)
      const section = sections[0]
      
      // New parser doesn't use hidden property
      expect(section.fileColumn).toBe('ARCHIVE')
      expect(section.column).toBe('DONE')
    })

    it('should map ICE H1 sections to TODO column', () => {
      const content = `# TODO
## Before Ice
* [ ] Task 1

# ICE
## After Ice
* [ ] Task 2`

      const sections = parseTodoMdFile(content)
      
      // New parser doesn't use on_ice property, ICE maps to TODO
      expect(sections[0].column).toBe('TODO')
      expect(sections[1].column).toBe('TODO')
      expect(sections[1].fileColumn).toBe('ICE')
    })

    it('should mark small sections in WIP column as archivable', () => {
      const content = `# SCHEDULED
### Week Tasks
* [x] Task 1`

      const sections = parseTodoMdFile(content)
      const section = sections[0]
      
      expect(section.column).toBe('WIP')
      expect(section.headerStyle).toBe('SMALL')
      expect(section.archivable).toBe(true)
    })

    it('should parse the sample fixture file correctly', () => {
      const sections = parseTodoMdFile(sampleContent)
      
      // Verify we have sections
      expect(sections.length).toBeGreaterThan(0)
      
      // Check for specific sections from the fixture
      const backlogSection = sections.find(s => s.name === 'BACKLOG')
      expect(backlogSection).toBeDefined()
      expect(backlogSection.column).toBe('TODO')
      expect(backlogSection.items.length).toBeGreaterThan(0)
      
      const inProgressSection = sections.find(s => s.name === 'In Progress')
      expect(inProgressSection).toBeDefined()
      expect(inProgressSection.column).toBe('WIP')
      
      const archiveSection = sections.find(s => s.name.includes('Sprint'))
      expect(archiveSection).toBeDefined()
      expect(archiveSection.column).toBe('DONE')
    })

    it('should handle sections with same name in different columns', () => {
      const content = `# TODO
## BACKLOG
* [ ] Task 1

# ARCHIVE
## BACKLOG
* [x] Task 2`

      const sections = parseTodoMdFile(content)
      
      // Both sections should exist separately
      expect(sections).toHaveLength(2)
      expect(sections[0].name).toBe('BACKLOG')
      expect(sections[0].column).toBe('TODO')
      expect(sections[1].name).toBe('BACKLOG')
      expect(sections[1].column).toBe('DONE')
    })

    it('should categorize columns correctly', () => {
      const testCases = [
        { name: 'TODO', expected: 'TODO' },
        { name: 'BACKLOG', expected: 'TODO' },
        { name: 'INBOX', expected: 'TODO' },
        { name: 'IDEAS', expected: 'TODO' },
        { name: 'WIP', expected: 'WIP' },
        { name: 'SCHEDULED', expected: 'WIP' },
        { name: 'IN PROGRESS', expected: 'WIP' },
        { name: 'ONGOING', expected: 'WIP' },
        { name: 'DONE', expected: 'DONE' },
        { name: 'COMPLETE', expected: 'DONE' },
        { name: 'ARCHIVE', expected: 'DONE' },
        { name: 'UNKNOWN', expected: 'TODO' } // Default case
      ]

      testCases.forEach(({ name, expected }) => {
        const content = `# ${name}
## Section
* [ ] Task`

        const sections = parseTodoMdFile(content)
        expect(sections[0].column).toBe(expected)
      })
    })
  })

  describe('renderTodoMdFile', () => {
    it('should handle empty sections array', () => {
      const result = renderTodoMdFile([])
      expect(result).toBe('')
    })

    it('should handle null sections array', () => {
      const result = renderTodoMdFile(null)
      expect(result).toBe('')
    })

    it('should render sections with correct markdown format', () => {
      const sections = [
        {
          name: 'BACKLOG',
          column: 'TODO',
          headerStyle: 'LARGE',
          fileColumn: 'TODO',
          items: [
            { statusChar: ' ', text: 'Task 1' },
            { statusChar: '~', text: 'Task 2' }
          ]
        },
        {
          name: 'In Progress',
          column: 'WIP',
          headerStyle: 'SMALL',
          fileColumn: 'SCHEDULED',
          items: [
            { statusChar: 'x', text: 'Task 3' }
          ]
        }
      ]

      const result = renderTodoMdFile(sections)
      
      // New parser includes H1 headers when fileColumn is set
      expect(result).toContain('# TODO')
      expect(result).toContain('## BACKLOG')
      expect(result).toContain('* [ ] Task 1')
      expect(result).toContain('* [~] Task 2')
      expect(result).toContain('# SCHEDULED')
      expect(result).toContain('### In Progress')
      expect(result).toContain('* [x] Task 3')
    })

    it('should preserve special bracket format for TODO column', () => {
      const sections = [
        {
          name: 'Tasks',
          column: 'TODO',
          headerStyle: 'LARGE',
          fileColumn: '[ ] TODO',
          items: [{ statusChar: ' ', text: 'Task 1' }]
        }
      ]

      const result = renderTodoMdFile(sections)
      expect(result).toContain('# [ ] TODO')
    })

    it('should maintain section order as provided in array', () => {
      const sections = [
        {
          name: 'Section 1',
          column: 'TODO',
          headerStyle: 'LARGE',
          fileColumn: 'TODO',
          items: []
        },
        {
          name: 'Section 2',
          column: 'TODO',
          headerStyle: 'LARGE',
          fileColumn: 'TODO',
          items: []
        },
        {
          name: 'Section 3',
          column: 'TODO',
          headerStyle: 'LARGE',
          fileColumn: 'TODO',
          items: []
        }
      ]

      const result = renderTodoMdFile(sections)
      const lines = result.split('\n').filter(l => l.startsWith('##'))
      
      // New parser renders sections in array order
      expect(lines[0]).toBe('## Section 1')
      expect(lines[1]).toBe('## Section 2')
      expect(lines[2]).toBe('## Section 3')
    })

    it('should add proper spacing between sections', () => {
      const sections = [
        {
          name: 'Section 1',
          column: 'TODO',
          headerStyle: 'LARGE',
          parentColumn: 'TODO',
          items: [{ statusChar: ' ', text: 'Task 1' }],
          originalIndex: 0
        },
        {
          name: 'Section 2',
          column: 'TODO',
          headerStyle: 'LARGE',
          parentColumn: 'TODO',
          items: [{ statusChar: ' ', text: 'Task 2' }],
          originalIndex: 1
        }
      ]

      const result = renderTodoMdFile(sections)
      
      // Check for blank line between sections
      expect(result).toMatch(/Task 1\n\n## Section 2/)
    })

    it('should roundtrip parse and render correctly', () => {
      // Test that parsing and then rendering produces similar structure
      const originalContent = `# TODO
## BACKLOG
* [ ] Task 1
* [~] Task 2

### Small Section
* [x] Task 3

# SCHEDULED
## In Progress
* [ ] Task 4`

      const sections = parseTodoMdFile(originalContent)
      const rendered = renderTodoMdFile(sections)
      
      // Re-parse the rendered content
      const reparsedSections = parseTodoMdFile(rendered)
      
      // Compare section counts and names
      expect(reparsedSections.length).toBe(sections.length)
      expect(reparsedSections.map(s => s.name).sort()).toEqual(sections.map(s => s.name).sort())
      
      // Compare item counts
      const originalItemCount = sections.reduce((sum, s) => sum + s.items.length, 0)
      const reparsedItemCount = reparsedSections.reduce((sum, s) => sum + s.items.length, 0)
      expect(reparsedItemCount).toBe(originalItemCount)
    })
  })
})