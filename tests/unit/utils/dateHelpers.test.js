import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  extractDateFromText,
  isPast,
  hasDueDate,
  getDisplayTextWithoutDueDate
} from '../../../src/utils/dateHelpers'

describe('dateHelpers', () => {
  // Use fake timers for consistent test results
  beforeEach(() => {
    vi.useFakeTimers()
    // Set to a specific date for consistent testing
    vi.setSystemTime(new Date('2024-06-02'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper to format a date for our due date syntax
  const formatDateForTask = (date) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[date.getMonth()]} ${date.getDate()}`
  }

  // Helper to create a date relative to "today" (mocked as June 2, 2024)
  const createRelativeDate = (daysOffset) => {
    const date = new Date('2024-06-02')
    date.setDate(date.getDate() + daysOffset)
    return date
  }

  describe('extractDateFromText', () => {
    it('should extract date in Month Day format', () => {
      const text = 'Task !!(May 15)'
      const result = extractDateFromText(text)
      expect(result).toBeInstanceOf(Date)
      expect(result.getMonth()).toBe(4) // May is month 4
      expect(result.getDate()).toBe(15)
    })

    it('should extract date in Day Month format', () => {
      const text = 'Task !!(15 May)'
      const result = extractDateFromText(text)
      expect(result).toBeInstanceOf(Date)
      expect(result.getMonth()).toBe(4)
      expect(result.getDate()).toBe(15)
    })

    it('should handle dates from earlier in the current year as past dates', () => {
      // April 15, 2024 (2 months before our mocked June 2, 2024)
      const text = 'Task !!(Apr 15)'
      const result = extractDateFromText(text)
      expect(result.getFullYear()).toBe(2024) // Should be current year
      expect(result.getMonth()).toBe(3) // April (0-indexed)
      expect(result.getDate()).toBe(15)
    })

    it('should always use current year when no year is specified', () => {
      // Mock January 2, 2024
      vi.setSystemTime(new Date('2024-01-02'))
      
      const text = 'Task !!(Dec 25)'
      const result = extractDateFromText(text)
      expect(result.getFullYear()).toBe(2024) // Always uses current year
      expect(result.getMonth()).toBe(11) // December
      expect(result.getDate()).toBe(25)
      
      // Reset to June 2, 2024 for other tests
      vi.setSystemTime(new Date('2024-06-02'))
    })

    it('should return null for text without due date', () => {
      const text = 'Task without due date'
      const result = extractDateFromText(text)
      expect(result).toBeNull()
    })
  })

  describe('isPast', () => {
    it('should return true for dates in the past', () => {
      // Create a date 5 days ago (May 28, 2024)
      const pastDate = createRelativeDate(-5)
      const dateStr = formatDateForTask(pastDate)
      
      const text = `Task !!(${dateStr})`
      expect(isPast(text)).toBe(true)
    })

    it('should return true for dates many days in the past', () => {
      // Create a date 60 days ago (April 3, 2024)
      const pastDate = createRelativeDate(-60)
      const dateStr = formatDateForTask(pastDate)
      
      const text = `Task !!(${dateStr})`
      expect(isPast(text)).toBe(true)
    })

    it('should return false for today', () => {
      // Use current mocked date (June 2, 2024)
      const today = createRelativeDate(0)
      const dateStr = formatDateForTask(today)
      
      const text = `Task !!(${dateStr})`
      expect(isPast(text)).toBe(false)
    })

    it('should return false for future dates', () => {
      // Create a date 10 days in the future (June 12, 2024)
      const futureDate = createRelativeDate(10)
      const dateStr = formatDateForTask(futureDate)
      
      const text = `Task !!(${dateStr})`
      expect(isPast(text)).toBe(false)
    })

    it('should return false for text without due date', () => {
      const text = 'Task without due date'
      expect(isPast(text)).toBe(false)
    })
  })

  // Note: isToday and isSoon tests are excluded for now.
  // The functionality is tested through e2e tests instead.

  describe('hasDueDate', () => {
    it('should return true for text with due date', () => {
      expect(hasDueDate('Task !!(May 15)')).toBe(true)
      expect(hasDueDate('Task with note (note) !!(May 15)')).toBe(true)
    })

    it('should return false for text without due date', () => {
      expect(hasDueDate('Task without due date')).toBe(false)
      expect(hasDueDate('Task with note (note)')).toBe(false)
    })
  })

  describe('getDisplayTextWithoutDueDate', () => {
    it('should remove due date from text', () => {
      const text = 'Task !!(May 15)'
      expect(getDisplayTextWithoutDueDate(text)).toBe('Task')
    })

    it('should preserve text without due date', () => {
      const text = 'Task without due date'
      expect(getDisplayTextWithoutDueDate(text)).toBe('Task without due date')
    })

    it('should handle text with both note and due date', () => {
      const text = 'Task (with note) !!(May 15)'
      expect(getDisplayTextWithoutDueDate(text)).toBe('Task (with note)')
    })
  })
})