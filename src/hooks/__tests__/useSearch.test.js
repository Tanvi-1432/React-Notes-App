import { renderHook } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { migrateNote } from '../../utils/migrateNote';

function makeNote(overrides) {
  return migrateNote({
    id: 'n1',
    title: 'Default Title',
    text: 'Default body text',
    date: '2026-06-07',
    randomBackgroundColor: '#F7D44C',
    ...overrides,
  });
}

describe('useSearch', () => {
  it('returns all notes when query is empty', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' })];
    const { result } = renderHook(() => useSearch(notes, ''));
    expect(result.current).toHaveLength(2);
  });

  it('returns all notes when query is null', () => {
    const notes = [makeNote({ id: 'a' })];
    const { result } = renderHook(() => useSearch(notes, null));
    expect(result.current).toHaveLength(1);
  });

  it('returns empty array for empty notes with a query', () => {
    const { result } = renderHook(() => useSearch([], 'foo'));
    expect(result.current).toHaveLength(0);
  });

  it('matches by title (case-insensitive)', () => {
    const notes = [
      makeNote({ id: 'a', title: 'Shopping List' }),
      makeNote({ id: 'b', title: 'Work Notes' }),
    ];
    const { result } = renderHook(() => useSearch(notes, 'shopping'));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('a');
  });

  it('matches by body contentPlainText', () => {
    const noteA = { ...makeNote({ id: 'a', title: 'Note A' }), contentPlainText: 'buy groceries today' };
    const noteB = { ...makeNote({ id: 'b', title: 'Note B' }), contentPlainText: 'call the dentist' };
    const { result } = renderHook(() => useSearch([noteA, noteB], 'groceries'));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('a');
  });

  it('matches by tag', () => {
    const noteA = { ...makeNote({ id: 'a' }), tags: ['work', 'urgent'] };
    const noteB = { ...makeNote({ id: 'b' }), tags: ['personal'] };
    const { result } = renderHook(() => useSearch([noteA, noteB], 'work'));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('a');
  });

  it('ranks title match higher than body match', () => {
    const noteTitle = { ...makeNote({ id: 'title-match' }), title: 'Grocery Shopping', contentPlainText: '' };
    const noteBody = { ...makeNote({ id: 'body-match' }), title: 'Random Note', contentPlainText: 'Grocery list here' };
    const { result } = renderHook(() => useSearch([noteBody, noteTitle], 'grocery'));
    expect(result.current[0].id).toBe('title-match');
  });

  it('returns no results when nothing matches', () => {
    const notes = [makeNote({ id: 'a', title: 'Work' })];
    const { result } = renderHook(() => useSearch(notes, 'xyzzy'));
    expect(result.current).toHaveLength(0);
  });
});
