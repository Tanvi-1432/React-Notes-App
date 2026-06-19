import { tiptapDocFromPlainText, extractTasksFromTiptap } from './tiptapHelpers';

export const DEFAULT_SETTINGS = {
  darkMode: false,
  sidebarCollapsed: false,
  defaultFolderId: null,
  sortOrder: 'updatedDesc',
};

/**
 * Migrate a single note from the old shape to the v1 shape.
 * Idempotent: if `content` already exists, returns the note unchanged
 * (but ensures all new fields have defaults in case of a partial migration).
 */
export function migrateNote(raw) {
  const today = new Date().toISOString().split('T')[0];

  if (raw.content !== undefined) {
    // Already migrated — fill in any missing fields added after initial migration
    return {
      isPinned: false,
      isArchived: false,
      tags: [],
      folderId: null,
      tasks: [],
      dueDate: null,
      reminderDate: null,
      attachments: [],
      clippedFrom: null,
      updatedDate: raw.date || today,
      ...raw,
    };
  }

  // Old shape has `text`, no `content`
  const plainText = raw.text || '';
  const doc = tiptapDocFromPlainText(plainText);
  const content = JSON.stringify(doc);
  const tasks = extractTasksFromTiptap(doc);

  return {
    id: raw.id,
    title: raw.title || '',
    content,
    contentPlainText: plainText,
    date: raw.date || today,
    updatedDate: raw.date || today,
    randomBackgroundColor: raw.randomBackgroundColor || '#F7D44C',
    isPinned: false,
    isArchived: false,
    tags: [],
    folderId: null,
    tasks,
    dueDate: null,
    reminderDate: null,
    attachments: [],
    clippedFrom: null,
  };
}

/**
 * Migrate all notes from a legacy or partially upgraded storage payload.
 * Returns the migrated array. Does not write to storage itself.
 */
export function migrateNotes(rawNotes) {
  if (!Array.isArray(rawNotes)) return [];
  return rawNotes.map(migrateNote);
}

function readLegacySettings() {
  return (() => {
    try {
      return JSON.parse(localStorage.getItem('notes-app-settings'));
    } catch {
      return null;
    }
  })();
}

function readLegacyDarkMode() {
  return (() => {
    try {
      return JSON.parse(localStorage.getItem('toggle-dark-mode-data')) === true;
    } catch {
      return false;
    }
  })();
}

/**
 * Migrate app settings from the old separate dark-mode key to the unified settings object.
 * When called without arguments, reads the legacy localStorage keys for backwards compatibility.
 */
export function migrateSettings(existingSettings, oldDarkMode) {
  const settingsToMigrate = existingSettings === undefined ? readLegacySettings() : existingSettings;

  if (settingsToMigrate && typeof settingsToMigrate === 'object') {
    return {
      ...DEFAULT_SETTINGS,
      ...settingsToMigrate,
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    darkMode: oldDarkMode === undefined ? readLegacyDarkMode() : oldDarkMode,
  };
}
