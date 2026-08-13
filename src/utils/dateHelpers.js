// utils/dateHelpers.js

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const atStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const atEndOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const parseMonth = (name) => MONTH_NAMES.findIndex(month =>
  month.toLowerCase() === String(name).slice(0, 3).toLowerCase()
);

const validDate = (year, monthIndex, day) => {
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day
    ? atStartOfDay(date)
    : null;
};

export const startOfSundayWeek = (date) => {
  const start = atStartOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

// A Sunday-Saturday week belongs to the month containing its Thursday, which
// is necessarily the month holding at least four of the seven days.
export const majorityMonthForWeek = (sunday) => {
  const thursday = atStartOfDay(sunday);
  thursday.setDate(thursday.getDate() + 4);
  return { year: thursday.getFullYear(), monthIndex: thursday.getMonth() };
};

export const weeksForMajorityMonth = (year, monthIndex) => {
  const first = startOfSundayWeek(new Date(year, monthIndex, 1));
  const weeks = [];
  for (let offset = 0; offset < 42; offset += 7) {
    const sunday = new Date(first);
    sunday.setDate(first.getDate() + offset);
    const owner = majorityMonthForWeek(sunday);
    if (owner.year === year && owner.monthIndex === monthIndex) weeks.push(sunday);
    if (owner.year > year || (owner.year === year && owner.monthIndex > monthIndex)) break;
  }
  return weeks;
};

export const weekIdentity = (sunday) => {
  const start = startOfSundayWeek(sunday);
  const owner = majorityMonthForWeek(start);
  const weeks = weeksForMajorityMonth(owner.year, owner.monthIndex);
  const number = weeks.findIndex(week => week.getTime() === start.getTime()) + 1;
  return { ...owner, number, start };
};

export const formatWeekPeriodLabel = (date, { includeYear = false } = {}) => {
  const identity = weekIdentity(date);
  return `${MONTH_NAMES[identity.monthIndex]} Week #${identity.number}${includeYear ? ` ${identity.year}` : ''}`;
};

const formatDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Native <input type="week"> uses ISO Monday-based week numbers. Our stored
// week starts Sunday, so its following Thursday is the stable ISO anchor.
export const isoWeekInputFromSunday = (dateOrValue) => {
  const sunday = typeof dateOrValue === 'string'
    ? (() => {
        const [year, month, day] = dateOrValue.split('-').map(Number);
        return validDate(year, month - 1, day);
      })()
    : atStartOfDay(dateOrValue);
  if (!sunday || sunday.getDay() !== 0) return '';
  const thursday = new Date(sunday);
  thursday.setDate(sunday.getDate() + 4);
  const weekYear = thursday.getFullYear();
  const januaryFourth = new Date(weekYear, 0, 4);
  const firstThursday = new Date(januaryFourth);
  firstThursday.setDate(januaryFourth.getDate() + (4 - (januaryFourth.getDay() || 7)));
  const week = 1 + Math.round((thursday - firstThursday) / 604800000);
  return `${weekYear}-W${String(week).padStart(2, '0')}`;
};

export const sundayValueFromIsoWeekInput = (value) => {
  const match = String(value || '').match(/^(\d{4})-W(\d{2})$/);
  if (!match) return '';
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(year, 0, 4);
  const monday = new Date(januaryFourth);
  monday.setDate(januaryFourth.getDate() - ((januaryFourth.getDay() + 6) % 7) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  return formatDateValue(sunday);
};

const periodFromStorage = (storage) => {
  let match = storage.match(/^([A-Za-z]+)\s+Week\s+#(\d+)\s+(\d{4})$/i);
  if (match) {
    const monthIndex = parseMonth(match[1]);
    const year = Number(match[3]);
    const weeks = monthIndex === -1 ? [] : weeksForMajorityMonth(year, monthIndex);
    const start = weeks[Number(match[2]) - 1];
    if (!start) return null;
    const end = atEndOfDay(start);
    end.setDate(end.getDate() + 6);
    return { kind: 'week', start, end, raw: storage };
  }

  match = storage.match(/^([A-Za-z]+)\s+(\d{4})$/i);
  if (match) {
    const monthIndex = parseMonth(match[1]);
    const year = Number(match[2]);
    if (monthIndex === -1) return null;
    return {
      kind: 'month',
      start: atStartOfDay(new Date(year, monthIndex, 1)),
      end: atEndOfDay(new Date(year, monthIndex + 1, 0)),
      raw: storage
    };
  }

  match = storage.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/i);
  if (!match) return null;
  const monthIndex = parseMonth(match[1]);
  const start = monthIndex === -1 ? null : validDate(Number(match[3]), monthIndex, Number(match[2]));
  return start ? { kind: 'day', start, end: atEndOfDay(start), raw: storage } : null;
};

/** Parse the canonical trailing due period: ! Aug 13 2026, ! Aug 2026, or ! Aug Week #2 2026. */
export const extractDuePeriod = (text) => {
  if (!text) return null;
  const storage = text.match(/(?:^|\s)!\s+([^|]+?)\s*$/)?.[1]?.trim();
  return storage ? periodFromStorage(storage) : null;
};

export const extractDateFromText = (text) => extractDuePeriod(text)?.start || null;

export const formatDuePeriodValue = (period) => {
  if (!period) return '';
  const year = period.start.getFullYear();
  const month = String(period.start.getMonth() + 1).padStart(2, '0');
  const day = String(period.start.getDate()).padStart(2, '0');
  if (period.kind === 'month') return `month:${year}-${month}`;
  if (period.kind === 'week') return `week:${year}-${month}-${day}`;
  return `${year}-${month}-${day}`;
};

export const serializeDuePeriodValue = (value) => {
  if (!value) return '';
  if (value.startsWith('month:')) {
    const [year, month] = value.slice(6).split('-').map(Number);
    return month >= 1 && month <= 12 ? `${MONTH_NAMES[month - 1]} ${year}` : '';
  }
  if (value.startsWith('week:')) {
    const [year, month, day] = value.slice(5).split('-').map(Number);
    const date = validDate(year, month - 1, day);
    if (!date || date.getDay() !== 0) return '';
    const identity = weekIdentity(date);
    return `${MONTH_NAMES[identity.monthIndex]} Week #${identity.number} ${identity.year}`;
  }
  const [year, month, day] = value.split('-').map(Number);
  return validDate(year, month - 1, day) ? `${MONTH_NAMES[month - 1]} ${day} ${year}` : '';
};

export const setDuePeriod = (text, value) => {
  const base = removeDueDate(text);
  const storage = serializeDuePeriodValue(value);
  return storage ? `${base} ! ${storage}` : base;
};

export const getDuePeriodLabel = (text, { long = false } = {}) => {
  const period = extractDuePeriod(text);
  if (!period) return '';
  if (period.kind === 'month') return period.start.toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });
  if (period.kind === 'week') {
    return formatWeekPeriodLabel(period.start, { includeYear: long });
  }
  return long ? formatDateForTooltip(period.start) : period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const isPast = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return false;
  return period.end < atStartOfDay(new Date());
};

export const isToday = (text) => {
  const period = extractDuePeriod(text);
  return Boolean(period?.kind === 'day' && period.start.getTime() === atStartOfDay(new Date()).getTime());
};

export const isSoon = (text) => {
  const date = extractDateFromText(text);
  if (!date) return false;
  const tomorrow = atStartOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const limit = atEndOfDay(new Date(tomorrow));
  limit.setDate(limit.getDate() + 2);
  return date >= tomorrow && date <= limit;
};

export const hasDueDate = (text) => Boolean(extractDuePeriod(text));

export const formatDateForTooltip = (date) => date
  ? date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  : '';

export const getDueDateTooltip = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return 'No due date';
  if (period.kind === 'day') return formatDateForTooltip(period.start);
  return `Due during ${getDuePeriodLabel(text, { long: true })}`;
};

export const removeDueDate = (text) => {
  const value = String(text || '');
  return extractDuePeriod(value) ? value.replace(/\s+!\s+[^|]+?\s*$/, '').trim() : value.trim();
};
export const getDisplayTextWithoutDueDate = removeDueDate;

export const getMonthYear = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return '';
  return period.kind === 'day'
    ? period.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : period.kind.toUpperCase();
};

export const getDayNumber = (text) => {
  const period = extractDuePeriod(text);
  return !period ? '' : period.kind === 'day' ? period.start.getDate() : getDuePeriodLabel(text);
};

export const getWeekday = (text) => {
  const period = extractDuePeriod(text);
  if (!period) return '';
  return period.kind === 'day' ? period.start.toLocaleDateString('en-US', { weekday: 'short' }) : period.kind === 'week' ? 'SUN–SAT' : 'ANY DAY';
};
