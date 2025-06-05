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
    if (data && data.columnStacks) {
      Object.values(data.columnStacks).forEach(columnData => {
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
      expect(result).toEqual({ columnOrder: [], columnStacks: {} })
    })

    it('should parse null content gracefully', () => {
      const result = parseTodoMdFile(null)
      expect(result).toEqual({ columnOrder: [], columnStacks: {} })
    })

    it('should parse H1 columnStack headers correctly', () => {
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
      
      // Check that sections are assigned to correct columnStacks
      expect(data.columnStacks.TODO.sections[0].name).toBe('Section 1')
      expect(data.columnStacks.SCHEDULED.sections[0].name).toBe('Section 2')
      expect(data.columnStacks.ARCHIVE.sections[0].name).toBe('Section 3')
      
      // Check the structure organization
      expect(data.columnOrder).toEqual(['TODO', 'SCHEDULED', 'ARCHIVE'])
      expect(data.columnStacks.TODO.visualColumn).toBe('TODO')
      expect(data.columnStacks.SCHEDULED.visualColumn).toBe('WIP')
      expect(data.columnStacks.ARCHIVE.visualColumn).toBe('DONE')
    })

    it('should handle special H1 format with brackets', () => {
      const content = `# [ ] TODO
## Tasks
* [ ] Task 1`

      const data = parseTodoMdFile(content)
      
      expect(data.columnOrder).toContain('[ ] TODO')  // H1 columnStack name in structure
      expect(data.columnStacks['[ ] TODO'].visualColumn).toBe('TODO')  // Visual columnStack
      expect(data.columnStacks['[ ] TODO'].sections[0].name).toBe('Tasks')  // Section in correct columnStack
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

    it('should map ARCHIVE H1 sections to DONE columnStack', () => {
      const content = `# ARCHIVE
### Old Tasks
* [x] Completed task`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      const section = sections[0]
      
      // Check that ARCHIVE columnStack maps to DONE visual columnStack
      expect(data.columnOrder).toContain('ARCHIVE')
      expect(data.columnStacks.ARCHIVE.visualColumn).toBe('DONE')
      expect(data.columnStacks.ARCHIVE.sections[0]).toBe(section)
    })

    it('should map ICE H1 sections to TODO columnStack', () => {
      const content = `# TODO
## Before Ice
* [ ] Task 1

# ICE
## After Ice
* [ ] Task 2`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      
      // New parser doesn't use on_ice property, ICE maps to TODO
      expect(data.columnStacks.ICE.visualColumn).toBe('TODO')
      expect(data.columnStacks.ICE.sections).toHaveLength(1)
      expect(data.columnStacks.TODO.sections).toHaveLength(1)
      expect(data.columnOrder).toContain('ICE')
      expect(data.columnOrder).toContain('TODO')
    })

    it('should mark small sections in WIP columnStack as archivable', () => {
      const content = `# SCHEDULED
### Week Tasks
* [x] Task 1`

      const data = parseTodoMdFile(content)
      const sections = getAllSections(data)
      const section = sections[0]
      
      expect(data.columnStacks.SCHEDULED.visualColumn).toBe('WIP')
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
      
      // Check that we have sections in different visual columnStacks
      const todoColumnStacks = data.columnOrder.filter(col => data.columnStacks[col].visualColumn === 'TODO')
      const wipColumnStacks = data.columnOrder.filter(col => data.columnStacks[col].visualColumn === 'WIP')
      const doneColumnStacks = data.columnOrder.filter(col => data.columnStacks[col].visualColumn === 'DONE')
      
      expect(todoColumnStacks.length).toBeGreaterThan(0)
      expect(wipColumnStacks.length).toBeGreaterThan(0)
      expect(doneColumnStacks.length).toBeGreaterThan(0)
    })

    it('should handle sections with same name in different columnStacks', () => {
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
      
      // Check they're in the correct columnStacks by structure
      expect(data.columnStacks.TODO.sections[0].name).toBe('BACKLOG')
      expect(data.columnStacks.ARCHIVE.sections[0].name).toBe('BACKLOG')
      expect(data.columnStacks.TODO.visualColumn).toBe('TODO')
      expect(data.columnStacks.ARCHIVE.visualColumn).toBe('DONE')
    })

    it('should categorize columnStacks correctly', () => {
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
        expect(data.columnStacks[name].visualColumn).toBe(expected)
      })
    })
    it('should preserve unparsable lines as rawText items', () => {
      const content = `# TODO
## Regular Section
<!-- This is a comment -->
* [ ] Normal task
* This is malformed without brackets
Random text line
* [x] Another task`

      const data = parseTodoMdFile(content)
      const section = data.columnStacks.TODO.sections[0]

      // Check that we parsed the valid structure
      expect(section.name).toBe('Regular Section')

      // Check all items in order
      const items = section.items
      expect(items).toHaveLength(5)

      expect(items[0].type).toBe('raw-text')
      expect(items[0].text).toBe('<!-- This is a comment -->')

      expect(items[1].type).toBe('task')
      expect(items[1].text).toBe('Normal task')

      expect(items[2].type).toBe('raw-text')
      expect(items[2].text).toBe('* This is malformed without brackets')

      expect(items[3].type).toBe('raw-text')
      expect(items[3].text).toBe('Random text line')

      expect(items[4].type).toBe('task')
      expect(items[4].text).toBe('Another task')
    })

    it('should preserve columnStack-level info items as rawText sections', () => {
      const content = `# TODO
<!-- Column level comment -->
Random text before first section
Another line
## First Section
* [ ] Task 1
## Second Section
* [ ] Task 2`

      const data = parseTodoMdFile(content)
      const sections = data.columnStacks.TODO.sections

      // Should have 5 sections: 3 rawText sections + 2 regular sections
      expect(sections).toHaveLength(5)

      // First three should be rawText sections
      expect(sections[0].type).toBe('raw-text')
      expect(sections[0].headerStyle).toBe('RAW-TEXT')
      expect(sections[0].name).toBe('')
      expect(sections[0].text).toBe('<!-- Column level comment -->')

      expect(sections[1].type).toBe('raw-text')
      expect(sections[1].text).toBe('Random text before first section')

      expect(sections[2].type).toBe('raw-text')
      expect(sections[2].text).toBe('Another line')

      // Next should be regular sections
      expect(sections[3].type).toBe('section')
      expect(sections[3].name).toBe('First Section')
      expect(sections[3].items.filter(item => item.type === 'task')).toHaveLength(1)

      expect(sections[4].type).toBe('section')
      expect(sections[4].name).toBe('Second Section')
      expect(sections[4].items.filter(item => item.type === 'task')).toHaveLength(1)
    })

    it('should handle multiple columnStack-level rawText sections', () => {
      const content = `# TODO
First column comment
## Section A
* [ ] Task A

# WIP
Second column comment
### Section B
* [~] Task B`

      const data = parseTodoMdFile(content)

      // Check TODO column
      const todoSections = data.columnStacks.TODO.sections
      expect(todoSections).toHaveLength(2) // rawText section + regular section
      expect(todoSections[0].type).toBe('raw-text')
      expect(todoSections[0].text).toBe('First column comment')
      expect(todoSections[1].name).toBe('Section A')

      // Check WIP column
      const wipSections = data.columnStacks.WIP.sections
      expect(wipSections).toHaveLength(2) // rawText section + regular section
      expect(wipSections[0].type).toBe('raw-text')
      expect(wipSections[0].text).toBe('Second column comment')
      expect(wipSections[1].name).toBe('Section B')
    })

    it('should create raw-text columnStacks for lines before first H1', () => {
      const content = `raw text line before any columns
another raw text line
# TODO
## Section
* [ ] Task 1`

      const data = parseTodoMdFile(content)
      
      // Should have 3 columnStacks: 2 raw-text columnStacks + 1 TODO columnStack
      expect(data.columnOrder).toHaveLength(3)
      
      // First two should be raw-text columnStacks
      const firstColumnStackName = data.columnOrder[0]
      const secondColumnStackName = data.columnOrder[1]
      
      expect(firstColumnStackName).toMatch(/^raw-text-\d+$/)
      expect(secondColumnStackName).toMatch(/^raw-text-\d+$/)
      
      // Check the raw-text columnStacks have the correct structure
      const firstColumnStack = data.columnStacks[firstColumnStackName]
      expect(firstColumnStack.type).toBe('raw-text')
      expect(firstColumnStack.visualColumn).toBe('TODO')
      expect(firstColumnStack.text).toBe('raw text line before any columns')
      expect(firstColumnStack.displayText).toBe('raw text line before any columns')
      expect(firstColumnStack.sections).toEqual([])
      
      const secondColumnStack = data.columnStacks[secondColumnStackName]
      expect(secondColumnStack.type).toBe('raw-text')
      expect(secondColumnStack.visualColumn).toBe('TODO')
      expect(secondColumnStack.text).toBe('another raw text line')
      expect(secondColumnStack.displayText).toBe('another raw text line')
      expect(secondColumnStack.sections).toEqual([])
      
      // Third should be regular TODO columnStack
      expect(data.columnOrder[2]).toBe('TODO')
      expect(data.columnStacks.TODO.visualColumn).toBe('TODO')
      expect(data.columnStacks.TODO.sections).toHaveLength(1)
      expect(data.columnStacks.TODO.sections[0].name).toBe('Section')
    })

  })

  describe('renderTodoMdFile', () => {
    it('should handle empty sections array', () => {
      const result = renderTodoMdFile({ columnOrder: [], columnStacks: {} })
      expect(result).toBe('')
    })

    it('should handle null sections array', () => {
      const result = renderTodoMdFile(null)
      expect(result).toBe('')
    })

    it('should render sections with correct markdown format', () => {
      const data = {
        columnOrder: ['TODO', 'SCHEDULED'],
        columnStacks: {
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
        columnOrder: ['[ ] TODO'],
        columnStacks: {
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
        columnOrder: ['TODO'],
        columnStacks: {
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
        columnOrder: ['TODO'],
        columnStacks: {
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

    it('should render raw-text columnStacks correctly', () => {
      const data = {
        columnOrder: ['raw-text-1', 'raw-text-2', 'TODO'],
        columnStacks: {
          'raw-text-1': {
            type: 'raw-text',
            visualColumn: 'TODO',
            text: 'first raw line',
            displayText: 'first raw line',
            sections: []
          },
          'raw-text-2': {
            type: 'raw-text',
            visualColumn: 'TODO',
            text: 'second raw line',
            displayText: 'second raw line',
            sections: []
          },
          'TODO': {
            visualColumn: 'TODO',
            sections: [
              {
                name: 'Tasks',
                headerStyle: 'LARGE',
                items: [{ statusChar: ' ', text: 'Task 1' }]
              }
            ]
          }
        }
      }

      const result = renderTodoMdFile(data)
      const lines = result.split('\n')
      
      // Raw-text columnStacks should be rendered without headers
      expect(lines[0]).toBe('first raw line')
      expect(lines[1]).toBe('') // blank line
      expect(lines[2]).toBe('second raw line')
      expect(lines[3]).toBe('') // blank line
      expect(lines[4]).toBe('# TODO')
      expect(lines[5]).toBe('## Tasks') // no blank line after column header
      expect(lines[6]).toBe('* [ ] Task 1')
    })
  })
})