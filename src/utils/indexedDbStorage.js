import { DEFAULT_SETTINGS, migrateNotes, migrateSettings } from './migrateNote';

const DB_NAME = 'react-notes-app';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';

const KEYS = {
  notes: 'notes',
  settings: 'settings',
  folders: 'folders',
  meta: 'meta',
};

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function readJsonLocalStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readLegacyLocalStorageData() {
  const rawNotes = readJsonLocalStorage('notes-app-data', []);
  const rawSettings = readJsonLocalStorage('notes-app-settings', null);
  const oldDarkMode = readJsonLocalStorage('toggle-dark-mode-data', false) === true;
  const rawFolders = readJsonLocalStorage('notes-app-folders', []);

  return {
    notes: migrateNotes(rawNotes),
    settings: migrateSettings(rawSettings, oldDarkMode),
    folders: Array.isArray(rawFolders) ? rawFolders : [],
  };
}

function hasLegacyLocalStorageData() {
  try {
    return Boolean(
      localStorage.getItem('notes-app-data') ||
      localStorage.getItem('notes-app-settings') ||
      localStorage.getItem('notes-app-folders') ||
      localStorage.getItem('toggle-dark-mode-data')
    );
  } catch {
    return false;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readEntry(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

function writeEntries(db, entries) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    entries.forEach(([key, value]) => {
      store.put({ key, value, updatedAt: new Date().toISOString() });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function loadIndexedDbData() {
  const db = await openDatabase();
  try {
    const [storedNotes, storedSettings, storedFolders, meta] = await Promise.all([
      readEntry(db, KEYS.notes),
      readEntry(db, KEYS.settings),
      readEntry(db, KEYS.folders),
      readEntry(db, KEYS.meta),
    ]);

    const hasStoredAppData = Array.isArray(storedNotes) || storedSettings || Array.isArray(storedFolders);
    if (!hasStoredAppData && hasLegacyLocalStorageData()) {
      const legacyData = readLegacyLocalStorageData();
      await writeEntries(db, [
        [KEYS.notes, legacyData.notes],
        [KEYS.settings, legacyData.settings],
        [KEYS.folders, legacyData.folders],
        [KEYS.meta, {
          migratedFromLocalStorage: true,
          migratedAt: new Date().toISOString(),
          version: DB_VERSION,
        }],
      ]);
      return legacyData;
    }

    return {
      notes: migrateNotes(storedNotes || []),
      settings: migrateSettings(storedSettings || meta?.settings || DEFAULT_SETTINGS),
      folders: Array.isArray(storedFolders) ? storedFolders : [],
    };
  } finally {
    db.close();
  }
}

function saveLocalStorageFallback(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore persistence failures in fallback mode.
  }
}

export async function loadAppData() {
  if (!hasIndexedDb()) {
    return readLegacyLocalStorageData();
  }

  try {
    return await loadIndexedDbData();
  } catch (error) {
    console.warn('IndexedDB unavailable, falling back to localStorage.', error);
    return readLegacyLocalStorageData();
  }
}

export async function saveNotes(notes) {
  if (!hasIndexedDb()) {
    saveLocalStorageFallback('notes-app-data', notes);
    return;
  }

  const db = await openDatabase();
  try {
    await writeEntries(db, [[KEYS.notes, notes]]);
  } finally {
    db.close();
  }
}

export async function saveSettings(settings) {
  if (!hasIndexedDb()) {
    saveLocalStorageFallback('notes-app-settings', settings);
    return;
  }

  const db = await openDatabase();
  try {
    await writeEntries(db, [[KEYS.settings, migrateSettings(settings)]]);
  } finally {
    db.close();
  }
}

export async function saveFolders(folders) {
  if (!hasIndexedDb()) {
    saveLocalStorageFallback('notes-app-folders', folders);
    return;
  }

  const db = await openDatabase();
  try {
    await writeEntries(db, [[KEYS.folders, folders]]);
  } finally {
    db.close();
  }
}
