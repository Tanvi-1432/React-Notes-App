import { useMemo } from 'react';
import { isDatePast } from '../utils/dateUtils';

function hasOverdueTask(note) {
  return Array.isArray(note.tasks) &&
    note.tasks.some((t) => !t.isComplete) &&
    note.dueDate &&
    isDatePast(note.dueDate);
}

export function useSmartFolders(notes) {
  return useMemo(() => ({
    all: notes.filter((n) => !n.isArchived).length,
    pinned: notes.filter((n) => n.isPinned && !n.isArchived).length,
    recent: notes.filter((n) => !n.isArchived).length,
    tasks: notes.filter((n) => Array.isArray(n.tasks) && n.tasks.length > 0 && !n.isArchived).length,
    overdue: notes.filter((n) => !n.isArchived && hasOverdueTask(n)).length,
    clips: notes.filter((n) => n.clippedFrom !== null && !n.isArchived).length,
    archived: notes.filter((n) => n.isArchived).length,
  }), [notes]);
}

// Returns a map of folderId -> count of non-archived notes in that folder
export function useFolderCounts(notes) {
  return useMemo(() => {
    const counts = {};
    notes.forEach((n) => {
      if (!n.isArchived && n.folderId) {
        counts[n.folderId] = (counts[n.folderId] || 0) + 1;
      }
    });
    return counts;
  }, [notes]);
}

export function applyFilter(notes, filter) {
  if (!filter || filter === 'all') return notes.filter((n) => !n.isArchived);
  if (filter === 'pinned') return notes.filter((n) => n.isPinned && !n.isArchived);
  if (filter === 'archived') return notes.filter((n) => n.isArchived);
  if (filter === 'tasks') return notes.filter((n) => Array.isArray(n.tasks) && n.tasks.length > 0 && !n.isArchived);
  if (filter === 'clips') return notes.filter((n) => n.clippedFrom !== null && !n.isArchived);
  if (filter === 'overdue') return notes.filter((n) => !n.isArchived && hasOverdueTask(n));
  if (filter.startsWith('folder:')) {
    const folderId = filter.slice(7);
    return notes.filter((n) => !n.isArchived && n.folderId === folderId);
  }
  // tag filter
  return notes.filter((n) => !n.isArchived && Array.isArray(n.tags) && n.tags.includes(filter));
}

/**
 * Sort notes by the given sort order.
 */
export function sortNotes(notes, sortOrder) {
  const sorted = [...notes];
  switch (sortOrder) {
    case 'createdDesc':
      return sorted.sort((a, b) => (b.date > a.date ? 1 : -1));
    case 'titleAsc':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'updatedDesc':
    default:
      return sorted.sort((a, b) => (b.updatedDate > a.updatedDate ? 1 : -1));
  }
}
