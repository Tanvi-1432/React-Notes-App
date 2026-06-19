import { notesReducer } from '../AppContext';
import { migrateNote } from '../../utils/migrateNote';

const initialState = {
  notes: [],
  folders: [],
  settings: {
    darkMode: false,
    sidebarCollapsed: false,
    defaultFolderId: null,
    sortOrder: 'updatedDesc',
  },
  searchText: '',
  activeFilter: 'all',
};

const SAMPLE_NOTE = migrateNote({
  id: 'note1',
  title: 'Test Note',
  text: 'Some content',
  date: '2026-06-07',
  randomBackgroundColor: '#F7D44C',
});

describe('notesReducer', () => {
  it('LOAD_NOTES replaces notes array', () => {
    const state = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE] });
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].id).toBe('note1');
  });

  it('ADD_NOTE prepends a note', () => {
    const withOne = notesReducer(initialState, { type: 'ADD_NOTE', payload: SAMPLE_NOTE });
    const newNote = { ...SAMPLE_NOTE, id: 'note2', title: 'Note 2' };
    const state = notesReducer(withOne, { type: 'ADD_NOTE', payload: newNote });
    expect(state.notes[0].id).toBe('note2');
    expect(state.notes[1].id).toBe('note1');
  });

  it('DELETE_NOTE removes the correct note', () => {
    const state0 = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE, { ...SAMPLE_NOTE, id: 'note2' }] });
    const state1 = notesReducer(state0, { type: 'DELETE_NOTE', payload: 'note1' });
    expect(state1.notes).toHaveLength(1);
    expect(state1.notes[0].id).toBe('note2');
  });

  it('DELETE_NOTE on nonexistent id leaves state unchanged', () => {
    const state0 = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE] });
    const state1 = notesReducer(state0, { type: 'DELETE_NOTE', payload: 'doesnotexist' });
    expect(state1.notes).toHaveLength(1);
  });

  it('UPDATE_NOTE updates the matching note', () => {
    const state0 = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE] });
    const state1 = notesReducer(state0, {
      type: 'UPDATE_NOTE',
      payload: { id: 'note1', changes: { title: 'Updated Title' } },
    });
    expect(state1.notes[0].title).toBe('Updated Title');
  });

  it('UPDATE_NOTE on nonexistent id leaves state unchanged', () => {
    const state0 = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE] });
    const state1 = notesReducer(state0, {
      type: 'UPDATE_NOTE',
      payload: { id: 'ghost', changes: { title: 'Ghost' } },
    });
    expect(state1.notes[0].title).toBe('Test Note');
  });

  it('PIN_NOTE toggles isPinned', () => {
    const state0 = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE] });
    expect(state0.notes[0].isPinned).toBe(false);
    const state1 = notesReducer(state0, { type: 'PIN_NOTE', payload: 'note1' });
    expect(state1.notes[0].isPinned).toBe(true);
    const state2 = notesReducer(state1, { type: 'PIN_NOTE', payload: 'note1' });
    expect(state2.notes[0].isPinned).toBe(false);
  });

  it('ARCHIVE_NOTE toggles isArchived', () => {
    const state0 = notesReducer(initialState, { type: 'LOAD_NOTES', payload: [SAMPLE_NOTE] });
    const state1 = notesReducer(state0, { type: 'ARCHIVE_NOTE', payload: 'note1' });
    expect(state1.notes[0].isArchived).toBe(true);
    const state2 = notesReducer(state1, { type: 'ARCHIVE_NOTE', payload: 'note1' });
    expect(state2.notes[0].isArchived).toBe(false);
  });

  it('SET_SEARCH updates searchText', () => {
    const state = notesReducer(initialState, { type: 'SET_SEARCH', payload: 'hello' });
    expect(state.searchText).toBe('hello');
  });

  it('SET_FILTER updates activeFilter', () => {
    const state = notesReducer(initialState, { type: 'SET_FILTER', payload: 'pinned' });
    expect(state.activeFilter).toBe('pinned');
  });
});
