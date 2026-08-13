import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  extractDateFromText,
  extractDuePeriod,
  formatDuePeriodValue,
  getDuePeriodLabel,
  formatWeekPeriodLabel,
  hasDueDate,
  isoWeekInputFromSunday,
  isPast,
  removeDueDate,
  serializeDuePeriodValue,
  sundayValueFromIsoWeekInput,
  weekIdentity
} from '../../../src/utils/dateHelpers';

describe('canonical due dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 13, 10));
  });
  afterEach(() => vi.useRealTimers());

  it('parses exact days with an explicit year', () => {
    const date = extractDateFromText('Task ! Aug 13 2026');
    expect(date).toEqual(new Date(2026, 7, 13));
    expect(hasDueDate('Task ! Aug 13 2026')).toBe(true);
    expect(extractDuePeriod('Task !!(Aug 13)')).toBeNull();
  });

  it('parses and serializes calendar months', () => {
    const period = extractDuePeriod('Task ! Aug 2026');
    expect(period.kind).toBe('month');
    expect(period.start).toEqual(new Date(2026, 7, 1));
    expect(period.end.getDate()).toBe(31);
    expect(formatDuePeriodValue(period)).toBe('month:2026-08');
    expect(serializeDuePeriodValue('month:2026-08')).toBe('Aug 2026');
    expect(getDuePeriodLabel('Task ! Aug 2026')).toBe('Aug');
  });

  it('names Sunday-Saturday weeks for their majority month and month-relative number', () => {
    const period = extractDuePeriod('Task ! Aug Week #2 2026');
    expect(period.kind).toBe('week');
    expect(period.start).toEqual(new Date(2026, 7, 9));
    expect(period.end.getDate()).toBe(15);
    expect(formatDuePeriodValue(period)).toBe('week:2026-08-09');
    expect(serializeDuePeriodValue('week:2026-08-09')).toBe('Aug Week #2 2026');
    expect(getDuePeriodLabel('Task ! Aug Week #2 2026')).toBe('Aug Week #2');
    expect(formatWeekPeriodLabel(new Date(2026, 7, 9))).toBe('Aug Week #2');
  });

  it('assigns a split week to the month containing at least four days', () => {
    expect(weekIdentity(new Date(2026, 7, 30))).toMatchObject({ year: 2026, monthIndex: 8, number: 1 });
    expect(serializeDuePeriodValue('week:2026-08-30')).toBe('Sep Week #1 2026');
  });

  it('round-trips Sunday weeks through the native ISO week input', () => {
    expect(isoWeekInputFromSunday(new Date(2026, 7, 9))).toBe('2026-W33');
    expect(isoWeekInputFromSunday('2026-08-09')).toBe('2026-W33');
    expect(sundayValueFromIsoWeekInput('2026-W33')).toBe('2026-08-09');
    expect(isoWeekInputFromSunday('2026-08-10')).toBe('');
  });

  it('uses the end of a period for overdue checks', () => {
    expect(isPast('Task ! Aug 12 2026')).toBe(true);
    expect(isPast('Task ! Aug 13 2026')).toBe(false);
    expect(isPast('Task ! Aug Week #2 2026')).toBe(false);
    expect(isPast('Task ! Jul 2026')).toBe(true);
  });

  it('removes only a trailing canonical due suffix', () => {
    expect(removeDueDate('Task (note) ! Aug 13 2026')).toBe('Task (note)');
    expect(removeDueDate('Important! Keep punctuation')).toBe('Important! Keep punctuation');
    expect(removeDueDate('Investigate ! surprising result')).toBe('Investigate ! surprising result');
  });
});
