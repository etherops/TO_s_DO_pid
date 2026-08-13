#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_INDEX = new Map(MONTHS.map((month, index) => [month.toLowerCase(), index]));
const write = process.argv.includes('--write');
const fromBackup = process.argv.includes('--from-backup');
const args = process.argv.slice(2).filter(arg => arg !== '--write' && arg !== '--from-backup');

if (!args.length) {
  console.error('Usage: node scripts/migrate-unified-dates.mjs [--write] [--from-backup] year[@last-current-month]:path ...');
  process.exit(2);
}

const normalizeMonth = value => {
  const key = String(value).slice(0, 3).toLowerCase();
  return MONTH_INDEX.has(key) ? MONTHS[MONTH_INDEX.get(key)] : null;
};

const startOfWeek = date => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const weekStorage = date => {
  const sunday = startOfWeek(date);
  const thursday = new Date(sunday);
  thursday.setDate(sunday.getDate() + 4);
  const ownerYear = thursday.getFullYear();
  const ownerMonth = thursday.getMonth();
  const first = startOfWeek(new Date(ownerYear, ownerMonth, 1));
  let number = 0;
  for (let cursor = new Date(first); cursor <= sunday; cursor.setDate(cursor.getDate() + 7)) {
    const owner = new Date(cursor);
    owner.setDate(cursor.getDate() + 4);
    if (owner.getFullYear() === ownerYear && owner.getMonth() === ownerMonth) number += 1;
  }
  return `${MONTHS[ownerMonth]} Week #${number} ${ownerYear}`;
};

const parseLegacyDate = (raw, defaultYear, lastCurrentMonth = 12) => {
  let value = raw.trim().replace(/^due\s+/i, '').replace(/^(?:Mon|Tue(?:s)?|Wed(?:n)?|Thu(?:r(?:s)?)?|Fri|Sat|Sun)(?:day)?[,]?\s+/i, '');
  let match = value.match(/^month\s+([A-Za-z]+)\s+(\d{4})$/i);
  if (match) {
    const month = normalizeMonth(match[1]);
    return month ? { kind: 'month', storage: `${month} ${match[2]}` } : null;
  }
  match = value.match(/^week\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/i);
  if (match) {
    const month = normalizeMonth(match[1]);
    const date = month && new Date(Number(match[3]), MONTH_INDEX.get(month.toLowerCase()), Number(match[2]));
    return date && date.getDay() === 0 ? { kind: 'week', storage: weekStorage(date) } : null;
  }
  match = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:[,]?\s+(\d{4}))?$/i);
  if (!match) return null;
  const month = normalizeMonth(match[1]);
  const inferredYear = month && MONTH_INDEX.get(month.toLowerCase()) + 1 > lastCurrentMonth
    ? defaultYear - 1
    : defaultYear;
  const year = Number(match[3] || inferredYear);
  const monthIndex = month && MONTH_INDEX.get(month.toLowerCase());
  const day = Number(match[2]);
  const date = month && new Date(year, monthIndex, day);
  return date && date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day
    ? { kind: 'day', storage: `${month} ${day} ${year}` }
    : null;
};

const completionPattern = /\s+\|\s+(?:Mon|Tue(?:s)?|Wed(?:n)?|Thu(?:r(?:s)?)?|Fri|Sat|Sun)(?:day)?[,]?\s+([A-Za-z]+\s+\d{1,2}(?:[,]?\s+\d{4})?)\s*$/i;
const duePattern = /\s*!!\(([^)]*)\)/g;

let failures = 0;
for (const argument of args) {
  const separator = argument.indexOf(':');
  const dateContext = argument.slice(0, separator).split('@').map(Number);
  const defaultYear = dateContext[0];
  const lastCurrentMonth = dateContext[1] || 12;
  const path = resolve(argument.slice(separator + 1));
  const sourcePath = fromBackup ? `${path}.pre-unified-date-20260813.bak` : path;
  const original = readFileSync(sourcePath, 'utf8');
  let changedLines = 0;

  const migrated = original.split('\n').map((line, index) => {
    const task = line.match(/^([*-]\s+\[([ x~-])\]\s+)(.*)$/);
    if (!task) return line;

    const terminal = task[2] === 'x' || task[2] === '-';
    const dueMatches = [...task[3].matchAll(duePattern)];
    if (dueMatches.length > 1) {
      console.error(`${path}:${index + 1}: multiple legacy due dates`);
      failures += 1;
      return line;
    }
    const due = dueMatches[0] ? parseLegacyDate(dueMatches[0][1], defaultYear) : null;
    if (dueMatches[0] && !due) {
      console.error(`${path}:${index + 1}: unrecognized due date: ${dueMatches[0][0]}`);
      failures += 1;
      return line;
    }

    const completionMatch = task[3].match(completionPattern);
    const completion = completionMatch ? parseLegacyDate(completionMatch[1], defaultYear, lastCurrentMonth) : null;
    if (completionMatch && (!completion || completion.kind !== 'day')) {
      console.error(`${path}:${index + 1}: unrecognized completion date: ${completionMatch[0]}`);
      failures += 1;
      return line;
    }

    if (!due && !completion) return line;
    let body = task[3].replace(duePattern, '').replace(completionPattern, '').trimEnd();
    const lifecycle = terminal ? (completion || (due?.kind === 'day' ? due : null)) : (due || completion);
    if (terminal && due && !completion && due.kind !== 'day') {
      console.error(`${path}:${index + 1}: terminal task has only a ${due.kind} period`);
      failures += 1;
      return line;
    }
    if (lifecycle) body += ` ${terminal ? '|' : '!'} ${lifecycle.storage}`;
    const result = `${task[1]}${body}`;
    if (result !== line) changedLines += 1;
    return result;
  }).join('\n');

  console.log(`${write ? 'migrate' : 'would migrate'} ${changedLines} lines: ${path}`);
  if (write && migrated !== original) writeFileSync(path, migrated);
}

if (failures) process.exit(1);
