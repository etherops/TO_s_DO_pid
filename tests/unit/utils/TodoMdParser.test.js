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

  // Helper function to extract all sections from the nested structure
  const getAllSections = (data) => {
    const allSections = []
    if (data && data.columns) {
      Object.values(data.columns).forEach(columnData => {
        if (columnData.sections) {
          allSections.push(...columnData.sections)
        }
      })
    }
    return allSections
  }


  describe('parseTodoMdFile', () => {
    it('should parse empty content gracefully', () => {
      const result = parseTodoMdFile('')
      expect(result).toEqual({ fileColumnOrder: [], columns: {} })
    })

    it('should parse null content gracefully', () => {
      const result = parseTodoMdFile(null)
      expect(result).toEqual({ fileColumnOrder: [], columns: {} })
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

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      
      // Check that sections are assigned to correct columns
      expect(data.columns.TODO.sections[0].name).toBe('Section 1')
      expect(data.columns.SCHEDULED.sections[0].name).toBe('Section 2')
      expect(data.columns.ARCHIVE.sections[0].name).toBe('Section 3')
      
      // Check the structure organization
      expect(data.fileColumnOrder).toEqual(['TODO', 'SCHEDULED', 'ARCHIVE'])
      expect(data.columns.TODO.visualColumn).toBe('TODO')
      expect(data.columns.SCHEDULED.visualColumn).toBe('WIP')
      expect(data.columns.ARCHIVE.visualColumn).toBe('DONE')
    })

    it('should handle special H1 format with brackets', () => {
      const content = `# [ ] TODO
## Tasks
* [ ] Task 1`

      const data = parseTodoMdFile(content)
      
      expect(data.fileColumnOrder).toContain('[ ] TODO')  // H1 column name in structure
      expect(data.columns['[ ] TODO'].visualColumn).toBe('TODO')  // Visual column
      expect(data.columns['[ ] TODO'].sections[0].name).toBe('Tasks')  // Section in correct column
    })

    it('should parse H2 large sections correctly', () => {
      const content = `# TODO
## BACKLOG
* [ ] Task 1
* [~] Task 2

## PLANNING
* [x] Task 3`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      
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

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      
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

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
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

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      const items = sections[0].items
      
      expect(items[0].text).toBe('Task with note (this is a note)')
      expect(items[1].text).toBe('Task with due date !!(June 2)')
      expect(items[2].text).toBe('Complex task (note here) !!(May 30)')
    })

    it('should handle multiline notes with escaped newlines', () => {
      const content = `# TODO
## Tasks
* [~] Task with multiline note (line 1\\nline 2\\nline 3)`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      const item = sections[0].items[0]
      
      expect(item.text).toContain('\\n')
      expect(item.displayText).toBe('Task with multiline note')
    })

    it('should map ARCHIVE H1 sections to DONE column', () => {
      const content = `# ARCHIVE
### Old Tasks
* [x] Completed task`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      const section = sections[0]
      
      // Check that ARCHIVE column maps to DONE visual column
      expect(data.fileColumnOrder).toContain('ARCHIVE')
      expect(data.columns.ARCHIVE.visualColumn).toBe('DONE')
      expect(data.columns.ARCHIVE.sections[0]).toBe(section)
    })

    it('should map ICE H1 sections to TODO column', () => {
      const content = `# TODO
## Before Ice
* [ ] Task 1

# ICE
## After Ice
* [ ] Task 2`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      
      // New parser doesn't use on_ice property, ICE maps to TODO
      expect(data.columns.ICE.visualColumn).toBe('TODO')
      expect(data.columns.ICE.sections).toHaveLength(1)
      expect(data.columns.TODO.sections).toHaveLength(1)
      expect(data.fileColumnOrder).toContain('ICE')
      expect(data.fileColumnOrder).toContain('TODO')
    })

    it('should mark small sections in WIP column as archivable', () => {
      const content = `# SCHEDULED
### Week Tasks
* [x] Task 1`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      const section = sections[0]
      
      expect(data.columns.SCHEDULED.visualColumn).toBe('WIP')
      expect(section.headerStyle).toBe('SMALL')
      expect(section.archivable).toBe(true)
    })

    it('should parse the sample fixture file correctly', () => {
      const data = parseTodoMdFile(sampleContent)
      const sections = getAllSections(data)
      
      // Verify we have sections
      expect(sections.length).toBeGreaterThan(0)
      
      // Check for specific sections from the fixture
      const backlogSection = sections.find(s => s.name === 'BACKLOG')
      expect(backlogSection).toBeDefined()
      expect(backlogSection.items.length).toBeGreaterThan(0)
      
      const inProgressSection = sections.find(s => s.name === 'In Progress')
      expect(inProgressSection).toBeDefined()
      
      const archiveSection = sections.find(s => s.name.includes('Sprint'))
      expect(archiveSection).toBeDefined()
      
      // Check that we have sections in different visual columns
      const todoColumns = data.fileColumnOrder.filter(col => data.columns[col].visualColumn === 'TODO')
      const wipColumns = data.fileColumnOrder.filter(col => data.columns[col].visualColumn === 'WIP')
      const doneColumns = data.fileColumnOrder.filter(col => data.columns[col].visualColumn === 'DONE')
      
      expect(todoColumns.length).toBeGreaterThan(0)
      expect(wipColumns.length).toBeGreaterThan(0)
      expect(doneColumns.length).toBeGreaterThan(0)
    })

    it('should handle sections with same name in different columns', () => {
      const content = `# TODO
## BACKLOG
* [ ] Task 1

# ARCHIVE
## BACKLOG
* [x] Task 2`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      
      // Both sections should exist separately
      expect(sections).toHaveLength(2)
      expect(sections[0].name).toBe('BACKLOG')
      expect(sections[1].name).toBe('BACKLOG')
      
      // Check they're in the correct columns by structure
      expect(data.columns.TODO.sections[0].name).toBe('BACKLOG')
      expect(data.columns.ARCHIVE.sections[0].name).toBe('BACKLOG')
      expect(data.columns.TODO.visualColumn).toBe('TODO')
      expect(data.columns.ARCHIVE.visualColumn).toBe('DONE')
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

        const data = parseTodoMdFile(content)
        expect(data.columns[name].visualColumn).toBe(expected)
      })
    })
  })

  describe('renderTodoMdFile', () => {
    it('should handle empty sections array', () => {
      const result = renderTodoMdFile({ fileColumnOrder: [], columns: {} })
      expect(result).toBe('')
    })

    it('should handle null sections array', () => {
      const result = renderTodoMdFile(null)
      expect(result).toBe('')
    })

    it('should render sections with correct markdown format', () => {
      const data = {
        fileColumnOrder: ['TODO', 'SCHEDULED'],
        columns: {
          TODO: {
            visualColumn: 'TODO',
            sections: [
              {
                name: 'BACKLOG',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: [
                  { statusChar: ' ', text: 'Task 1' },
                  { statusChar: '~', text: 'Task 2' }
                ]
              }
            ]
          },
          SCHEDULED: {
            visualColumn: 'WIP',
            sections: [
              {
                name: 'In Progress',
                column: 'WIP',
                headerStyle: 'SMALL',
                items: [
                  { statusChar: 'x', text: 'Task 3' }
                ]
              }
            ]
          }
        }
      }

      const result = renderTodoMdFile(data)
      
      // New parser includes H1 headers
      expect(result).toContain('# TODO')
      expect(result).toContain('## BACKLOG')
      expect(result).toContain('* [ ] Task 1')
      expect(result).toContain('* [~] Task 2')
      expect(result).toContain('# SCHEDULED')
      expect(result).toContain('### In Progress')
      expect(result).toContain('* [x] Task 3')
    })

    it('should preserve special bracket format for TODO column', () => {
      const data = {
        fileColumnOrder: ['[ ] TODO'],
        columns: {
          '[ ] TODO': {
            visualColumn: 'TODO',
            sections: [
              {
                name: 'Tasks',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: [{ statusChar: ' ', text: 'Task 1' }]
              }
            ]
          }
        }
      }

      const result = renderTodoMdFile(data)
      expect(result).toContain('# [ ] TODO')
    })

    it('should maintain section order as provided in array', () => {
      const data = {
        fileColumnOrder: ['TODO'],
        columns: {
          TODO: {
            visualColumn: 'TODO',
            sections: [
              {
                name: 'Section 1',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: []
              },
              {
                name: 'Section 2',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: []
              },
              {
                name: 'Section 3',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: []
              }
            ]
          }
        }
      }

      const result = renderTodoMdFile(data)
      const lines = result.split('\n').filter(l => l.startsWith('##'))
      
      // New parser renders sections in array order
      expect(lines[0]).toBe('## Section 1')
      expect(lines[1]).toBe('## Section 2')
      expect(lines[2]).toBe('## Section 3')
    })

    it('should add proper spacing between sections', () => {
      const data = {
        fileColumnOrder: ['TODO'],
        columns: {
          TODO: {
            visualColumn: 'TODO',
            sections: [
              {
                name: 'Section 1',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: [{ statusChar: ' ', text: 'Task 1' }]
              },
              {
                name: 'Section 2',
                column: 'TODO',
                headerStyle: 'LARGE',
                items: [{ statusChar: ' ', text: 'Task 2' }]
              }
            ]
          }
        }
      }

      const result = renderTodoMdFile(data)
      
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

      const data = parseTodoMdFile(originalContent)
      const rendered = renderTodoMdFile(data)
      
      // Re-parse the rendered content
      const reparsedData = parseTodoMdFile(rendered)
      const sections = getAllSections(data)
      const reparsedSections = getAllSections(reparsedData)
      
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