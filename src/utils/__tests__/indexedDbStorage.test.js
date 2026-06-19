import { loadAppData, saveFolders, saveNotes, saveSettings } from '../indexedDbStorage';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

function createFakeIndexedDb() {
  const databases = new Map();

  function createDb(data) {
    return {
      objectStoreNames: {
        contains: (name) => data.stores.has(name),
      },
      createObjectStore: (name) => {
        data.stores.set(name, new Map());
      },
      transaction: (storeName) => {
        const tx = {
          objectStore: () => {
            const store = data.stores.get(storeName);
            return {
              get: (key) => {
                const request = {};
                setTimeout(() => {
                  request.result = store.get(key);
                  request.onsuccess?.();
                }, 0);
                return request;
              },
              put: (entry) => {
                store.set(entry.key, entry);
              },
            };
          },
          oncomplete: null,
          onerror: null,
          onabort: null,
          error: null,
        };
        setTimeout(() => tx.oncomplete?.(), 0);
        return tx;
      },
      close: vi.fn(),
    };
  }

  return {
    open: vi.fn((name) => {
      const request = {};
      setTimeout(() => {
        let data = databases.get(name);
        const isNew = !data;
        if (!data) {
          data = { stores: new Map() };
          databases.set(name, data);
        }
        request.result = createDb(data);
        if (isNew) request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);
      return request;
    }),
  };
}

describe('indexedDbStorage fallback and migration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('loads and migrates legacy localStorage data when IndexedDB is unavailable', async () => {
    localStorage.setItem('notes-app-data', JSON.stringify([
      {
        id: 'legacy-note',
        title: 'Legacy',
        text: 'Old note body',
        date: '2026-06-19',
        randomBackgroundColor: '#F7D44C',
      },
    ]));
    localStorage.setItem('notes-app-settings', JSON.stringify({
      darkMode: true,
      sortOrder: 'titleAsc',
    }));
    localStorage.setItem('notes-app-folders', JSON.stringify([
      { id: 'folder-1', name: 'Work', color: '#98B7DB' },
    ]));

    const appData = await loadAppData();

    expect(appData.notes).toHaveLength(1);
    expect(appData.notes[0]).toMatchObject({
      id: 'legacy-note',
      title: 'Legacy',
      contentPlainText: 'Old note body',
      isArchived: false,
      attachments: [],
    });
    expect(appData.notes[0].content).toContain('Old note body');
    expect(appData.settings).toMatchObject({
      darkMode: true,
      sidebarCollapsed: false,
      sortOrder: 'titleAsc',
    });
    expect(appData.folders).toEqual([
      { id: 'folder-1', name: 'Work', color: '#98B7DB' },
    ]);
  });

  it('saves to localStorage when IndexedDB is unavailable', async () => {
    const notes = [{ id: 'note-1', title: 'Saved' }];
    const settings = { darkMode: true, sidebarCollapsed: true, sortOrder: 'updatedDesc' };
    const folders = [{ id: 'folder-1', name: 'Ideas' }];

    await saveNotes(notes);
    await saveSettings(settings);
    await saveFolders(folders);

    expect(JSON.parse(localStorage.getItem('notes-app-data'))).toEqual(notes);
    expect(JSON.parse(localStorage.getItem('notes-app-settings'))).toMatchObject(settings);
    expect(JSON.parse(localStorage.getItem('notes-app-folders'))).toEqual(folders);
  });

  it('saves and loads through IndexedDB when available', async () => {
    const indexedDb = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', indexedDb);

    const notes = [{ id: 'note-1', title: 'IndexedDB note' }];
    const settings = { darkMode: true, sidebarCollapsed: true, sortOrder: 'titleAsc' };
    const folders = [{ id: 'folder-1', name: 'IndexedDB folder' }];

    await saveNotes(notes);
    await saveSettings(settings);
    await saveFolders(folders);

    const appData = await loadAppData();

    expect(indexedDb.open).toHaveBeenCalledWith('react-notes-app', 1);
    expect(appData.notes[0]).toMatchObject({
      id: 'note-1',
      title: 'IndexedDB note',
      isPinned: false,
      attachments: [],
    });
    expect(appData.settings).toMatchObject(settings);
    expect(appData.folders).toEqual(folders);
  });

  it('imports legacy localStorage data into IndexedDB on first load', async () => {
    const indexedDb = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', indexedDb);
    localStorage.setItem('notes-app-data', JSON.stringify([
      { id: 'legacy-note', title: 'Legacy import', text: 'Move me', date: '2026-06-19' },
    ]));

    const imported = await loadAppData();
    localStorage.clear();
    const persisted = await loadAppData();

    expect(imported.notes[0]).toMatchObject({
      id: 'legacy-note',
      title: 'Legacy import',
      contentPlainText: 'Move me',
    });
    expect(persisted.notes[0]).toMatchObject({
      id: 'legacy-note',
      title: 'Legacy import',
      contentPlainText: 'Move me',
    });
  });
});
