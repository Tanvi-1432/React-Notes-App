import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { extractTasksFromTiptap, extractPlainText, parseTiptapContent } from '../utils/tiptapHelpers';
import { nowISO } from '../utils/dateUtils';
import { loadAppData, saveFolders, saveNotes, saveSettings } from '../utils/indexedDbStorage';

// ─── Initial State ────────────────────────────────────────────────────────────

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

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function notesReducer(state, action) {
  switch (action.type) {

    case 'LOAD_NOTES':
      return { ...state, notes: action.payload };

    case 'LOAD_SETTINGS':
      return { ...state, settings: action.payload };

    case 'LOAD_FOLDERS':
      return { ...state, folders: action.payload };

    case 'ADD_NOTE': {
      return { ...state, notes: [action.payload, ...state.notes] };
    }

    case 'UPDATE_NOTE': {
      const { id, changes } = action.payload;
      let extraFields = {};
      if (changes.content !== undefined) {
        const doc = parseTiptapContent(changes.content);
        extraFields.tasks = doc ? extractTasksFromTiptap(doc) : [];
        extraFields.contentPlainText = doc ? extractPlainText(doc) : '';
      }
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === id
            ? { ...n, ...changes, ...extraFields, updatedDate: nowISO() }
            : n
        ),
      };
    }

    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.payload) };

    case 'PIN_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload ? { ...n, isPinned: !n.isPinned } : n
        ),
      };

    case 'ARCHIVE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload ? { ...n, isArchived: !n.isArchived } : n
        ),
      };

    case 'MOVE_NOTE_TO_FOLDER':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.noteId
            ? { ...n, folderId: action.payload.folderId }
            : n
        ),
      };

    case 'ADD_FOLDER': {
      return { ...state, folders: [...state.folders, action.payload] };
    }

    case 'RENAME_FOLDER':
      return {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.payload.id ? { ...f, name: action.payload.name } : f
        ),
      };

    case 'DELETE_FOLDER': {
      // Reassign all notes in that folder to Inbox (folderId: null)
      const deletedId = action.payload;
      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== deletedId),
        notes: state.notes.map((n) =>
          n.folderId === deletedId ? { ...n, folderId: null } : n
        ),
        // If the active filter was this folder, reset to 'all'
        activeFilter: state.activeFilter === `folder:${deletedId}` ? 'all' : state.activeFilter,
      };
    }

    case 'SET_SEARCH':
      return { ...state, searchText: action.payload };

    case 'SET_FILTER':
      return { ...state, activeFilter: action.payload };

    case 'SET_SETTING':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(notesReducer, initialState);
  const [storageReady, setStorageReady] = useState(false);

  // ── Load from IndexedDB on mount, importing legacy localStorage data if needed
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const appData = await loadAppData();
        if (cancelled) return;
        dispatch({ type: 'LOAD_NOTES', payload: appData.notes });
        dispatch({ type: 'LOAD_SETTINGS', payload: appData.settings });
        dispatch({ type: 'LOAD_FOLDERS', payload: appData.folders });
      } catch (error) {
        console.warn('Unable to load stored app data.', error);
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, []);

  // ── Persist notes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageReady) return;
    saveNotes(state.notes).catch((error) => {
      console.warn('Unable to save notes.', error);
    });
  }, [state.notes, storageReady]);

  // ── Persist settings ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageReady) return;
    saveSettings(state.settings).catch((error) => {
      console.warn('Unable to save settings.', error);
    });
  }, [state.settings, storageReady]);

  // ── Persist folders ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageReady) return;
    saveFolders(state.folders).catch((error) => {
      console.warn('Unable to save folders.', error);
    });
  }, [state.folders, storageReady]);

  // ── Sync dark mode class to body ─────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('dark-mode', state.settings.darkMode);
  }, [state.settings.darkMode]);

  // ─── Constants ───────────────────────────────────────────────────────────────

  const backgroundColorList = [
    '#A8D672', '#98B7DB', '#E86A40', '#F7D44C',
    '#B5C99A', '#C9AEDE', '#F5A0B5',
  ];

  // ─── Action Creators ─────────────────────────────────────────────────────────

  function randomColor() {
    return backgroundColorList[Math.floor(Math.random() * backgroundColorList.length)];
  }

  function makeUntitledTitle() {
    const existing = state.notes
      .map((n) => n.title)
      .filter((t) => /^Untitled(\s\d+)?$/.test(t));
    if (!existing.includes('Untitled')) return 'Untitled';
    let n = 2;
    while (existing.includes(`Untitled ${n}`)) n++;
    return `Untitled ${n}`;
  }

  function addNote({
    title,
    content,
    contentPlainText,
    tags,
    color,
    clippedFrom,
    folderId,
    dueDate,
    reminderDate,
  } = {}) {
    const doc = parseTiptapContent(content);
    const now = nowISO();
    const newNote = {
      id: nanoid(),
      title: title || makeUntitledTitle(),
      content: content || JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [] }] }),
      contentPlainText: contentPlainText || (doc ? extractPlainText(doc) : ''),
      date: now,
      updatedDate: now,
      randomBackgroundColor: color || randomColor(),
      isPinned: false,
      isArchived: false,
      tags: tags || [],
      folderId: folderId || null,
      tasks: doc ? extractTasksFromTiptap(doc) : [],
      dueDate: dueDate || null,
      reminderDate: reminderDate || null,
      attachments: [],
      clippedFrom: clippedFrom || null,
    };
    dispatch({ type: 'ADD_NOTE', payload: newNote });
    return newNote;
  }

  function updateNote(id, changes) {
    dispatch({ type: 'UPDATE_NOTE', payload: { id, changes } });
  }

  function deleteNote(id) {
    dispatch({ type: 'DELETE_NOTE', payload: id });
  }

  function pinNote(id) {
    dispatch({ type: 'PIN_NOTE', payload: id });
  }

  function archiveNote(id) {
    dispatch({ type: 'ARCHIVE_NOTE', payload: id });
  }

  function moveNoteToFolder(noteId, folderId) {
    dispatch({ type: 'MOVE_NOTE_TO_FOLDER', payload: { noteId, folderId } });
  }

  function setSearch(text) {
    dispatch({ type: 'SET_SEARCH', payload: text });
  }

  function setFilter(filter) {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }

  function setSetting(patch) {
    dispatch({ type: 'SET_SETTING', payload: patch });
  }

  function addFolder({ name, color = null }) {
    const folder = {
      id: nanoid(),
      name: name.trim(),
      color,
      createdDate: nowISO(),
      sortOrder: state.folders.length,
    };
    dispatch({ type: 'ADD_FOLDER', payload: folder });
    return folder;
  }

  function renameFolder(id, name) {
    dispatch({ type: 'RENAME_FOLDER', payload: { id, name: name.trim() } });
  }

  function deleteFolder(id) {
    dispatch({ type: 'DELETE_FOLDER', payload: id });
  }

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addNote,
        updateNote,
        deleteNote,
        pinNote,
        archiveNote,
        moveNoteToFolder,
        setSearch,
        setFilter,
        setSetting,
        addFolder,
        renameFolder,
        deleteFolder,
        backgroundColorList,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
