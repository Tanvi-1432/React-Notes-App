import { renderHook } from '@testing-library/react';
import { useSmartFolders, applyFilter, sortNotes } from '../useSmartFolders';
import { migrateNote } from '../../utils/migrateNote';

function makeNote(overrides) {
  return {
    ...migrateNote({
      id: 'n1',
      title: 'Test',
      text: '',
      date: '2026-06-07',
      randomBackgroundColor: '#F7D44C',
    }),
    ...overrides,
  };
}

const NOTES = [
  makeNote({ id: 'a', isPinned: true, isArchived: false }),
  makeNote({ id: 'b', isPinned: false, isArchived: false }),
  makeNote({ id: 'c', isPinned: false, isArchived: true }),
  makeNote({ id: 'd', isPinned: false, isArchived: false, tasks: [{ id: 't1', label: 'Task', isComplete: false, dueDate: null }] }),
  makeNote({ id: 'e', isPinned: false, isArchived: false, clippedFrom: { url: 'http://x.com', domain: 'x.com', title: null, excerpt: null, savedDate: '', previewImageUrl: null } }),
];

describe('useSmartFolders', () => {
  it('counts all non-archived notes', () => {
    const { result } = renderHook(() => useSmartFolders(NOTES));
    // a, b, d, e are not archived
    expect(result.current.all).toBe(4);
  });

  it('counts pinned non-archived notes', () => {
    const { result } = renderHook(() => useSmartFolders(NOTES));
    expect(result.current.pinned).toBe(1);
  });

  it('counts archived notes', () => {
    const { result } = renderHook(() => useSmartFolders(NOTES));
    expect(result.current.archived).toBe(1);
  });

  it('counts notes with tasks', () => {
    const { result } = renderHook(() => useSmartFolders(NOTES));
    expect(result.current.tasks).toBe(1);
  });

  it('counts clipped notes', () => {
    const { result } = renderHook(() => useSmartFolders(NOTES));
    expect(result.current.clips).toBe(1);
  });
});

describe('applyFilter', () => {
  it('all filter excludes archived', () => {
    const result = applyFilter(NOTES, 'all');
    expect(result.every((n) => !n.isArchived)).toBe(true);
    expect(result).toHaveLength(4);
  });

  it('pinned filter returns only pinned non-archived', () => {
    const result = applyFilter(NOTES, 'pinned');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('archived filter returns only archived', () => {
    const result = applyFilter(NOTES, 'archived');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c');
  });

  it('tasks filter returns notes with tasks', () => {
    const result = applyFilter(NOTES, 'tasks');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d');
  });

  it('clips filter returns clipped notes', () => {
    const result = applyFilter(NOTES, 'clips');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e');
  });

  it('tag filter returns notes with matching tag', () => {
    const notes = [
      makeNote({ id: '1', tags: ['work'] }),
      makeNote({ id: '2', tags: ['personal'] }),
    ];
    const result = applyFilter(notes, 'work');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('sortNotes', () => {
  const notes = [
    makeNote({ id: 'a', title: 'Zebra', date: '2026-01-01', updatedDate: '2026-06-07' }),
    makeNote({ id: 'b', title: 'Apple', date: '2026-06-07', updatedDate: '2026-01-01' }),
  ];

  it('sorts by updatedDate descending by default', () => {
    const sorted = sortNotes(notes, 'updatedDesc');
    expect(sorted[0].id).toBe('a');
  });

  it('sorts by createdDate descending', () => {
    const sorted = sortNotes(notes, 'createdDesc');
    expect(sorted[0].id).toBe('b');
  });

  it('sorts by title ascending', () => {
    const sorted = sortNotes(notes, 'titleAsc');
    expect(sorted[0].title).toBe('Apple');
  });
});
