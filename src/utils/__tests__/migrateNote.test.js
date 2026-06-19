import { migrateNote, migrateNotes } from '../migrateNote';

const OLD_NOTE = {
  id: 'abc123',
  title: 'My Note',
  text: 'Hello world',
  date: '6/7/2026',
  randomBackgroundColor: '#F7D44C',
};

describe('migrateNote', () => {
  it('converts an old note to the new shape', () => {
    const result = migrateNote(OLD_NOTE);
    expect(result.id).toBe('abc123');
    expect(result.title).toBe('My Note');
    expect(result.contentPlainText).toBe('Hello world');
    expect(result.content).toBeTruthy();
    const doc = JSON.parse(result.content);
    expect(doc.type).toBe('doc');
    expect(result.isPinned).toBe(false);
    expect(result.isArchived).toBe(false);
    expect(result.tags).toEqual([]);
    expect(result.folderId).toBeNull();
    expect(result.tasks).toEqual([]);
    expect(result.dueDate).toBeNull();
    expect(result.reminderDate).toBeNull();
    expect(result.attachments).toEqual([]);
    expect(result.clippedFrom).toBeNull();
    expect(result.randomBackgroundColor).toBe('#F7D44C');
    expect(result.text).toBeUndefined();
  });

  it('is idempotent — running twice does not change the result', () => {
    const first = migrateNote(OLD_NOTE);
    const second = migrateNote(first);
    expect(second.content).toBe(first.content);
    expect(second.contentPlainText).toBe(first.contentPlainText);
    expect(second.id).toBe(first.id);
    expect(second.isPinned).toBe(first.isPinned);
  });

  it('preserves all new fields on an already-migrated note', () => {
    const migrated = { ...migrateNote(OLD_NOTE), isPinned: true, tags: ['work'] };
    const result = migrateNote(migrated);
    expect(result.isPinned).toBe(true);
    expect(result.tags).toEqual(['work']);
  });

  it('fills in missing fields on a partially-migrated note', () => {
    const partial = { ...migrateNote(OLD_NOTE) };
    delete partial.dueDate;
    const result = migrateNote(partial);
    expect(result.dueDate).toBeNull();
  });

  it('handles a note with no text', () => {
    const result = migrateNote({ ...OLD_NOTE, text: '' });
    expect(result.contentPlainText).toBe('');
    const doc = JSON.parse(result.content);
    expect(doc.type).toBe('doc');
  });
});

describe('migrateNotes', () => {
  it('migrates an array of notes', () => {
    const results = migrateNotes([OLD_NOTE, { ...OLD_NOTE, id: 'xyz' }]);
    expect(results).toHaveLength(2);
    results.forEach((n) => expect(n.content).toBeTruthy());
  });

  it('returns empty array for non-array input', () => {
    expect(migrateNotes(null)).toEqual([]);
    expect(migrateNotes(undefined)).toEqual([]);
    expect(migrateNotes('bad')).toEqual([]);
  });
});
