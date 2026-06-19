import { formatDistanceToNow, isPast, parseISO, isValid } from 'date-fns';

export function formatRelativeDate(isoString) {
  if (!isoString) return '';
  try {
    const date = parseISO(isoString);
    if (!isValid(date)) return isoString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString) {
  if (!isoString) return '';
  try {
    const date = parseISO(isoString);
    if (!isValid(date)) return isoString;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

export function isDatePast(isoString) {
  if (!isoString) return false;
  try {
    const date = parseISO(isoString);
    if (!isValid(date)) return false;
    return isPast(date);
  } catch {
    return false;
  }
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function nowISO() {
  return new Date().toISOString();
}
