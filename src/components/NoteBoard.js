import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useSearch } from '../hooks/useSearch';
import { applyFilter, sortNotes } from '../hooks/useSmartFolders';
import NoteCard from './NoteCard';
import AddNoteCard from './AddNoteCard';
import BoardToolbar from './BoardToolbar';
import { useSafeMotion } from '../utils/motionConfig';

function EmptyState({ filter, searchText }) {
  const { emptyStateVariants } = useSafeMotion();
  const messages = {
    all: { headline: 'Your board is empty', sub: 'Add your first note above.' },
    pinned: { headline: 'Nothing pinned yet', sub: 'Pin important notes to keep them up here.' },
    archived: { headline: 'Archive is empty', sub: 'Notes you archive will appear here.' },
    tasks: { headline: 'No task notes', sub: 'Add a checklist to any note to see it here.' },
    clips: { headline: 'No web clips yet', sub: 'Use the Clip button to save links.' },
    overdue: { headline: 'All caught up', sub: 'No overdue tasks. Nice.' },
  };

  const isFolder = filter && filter.startsWith('folder:');
  const { headline, sub } = searchText
    ? { headline: `No results for "${searchText}"`, sub: null }
    : isFolder
      ? { headline: 'This folder is empty', sub: 'Move notes here or create a new one.' }
      : (messages[filter] || { headline: 'No notes here', sub: 'Try a different filter.' });

  return (
    <motion.div
      className="empty-state"
      role="status"
      variants={emptyStateVariants}
      initial="hidden"
      animate="visible"
    >
      {!searchText && (
        <svg className="empty-state__icon" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <rect x="12" y="8" width="56" height="64" rx="4" stroke="currentColor" strokeWidth="3" fill="none" />
          <line x1="22" y1="26" x2="58" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="22" y1="38" x2="50" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="22" y1="50" x2="44" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      <h3 className="empty-state__headline">{headline}</h3>
      {sub && <p className="empty-state__sub">{sub}</p>}
    </motion.div>
  );
}

export default function NoteBoard({ onOpenNote, onNewNote, onDeleteRequest, onClipRequest }) {
  const { state } = useAppContext();
  const { notes, searchText, activeFilter, settings } = state;
  const { layoutTransition } = useSafeMotion();

  const searched = useSearch(notes, searchText);
  const filtered = useMemo(() => applyFilter(searched, activeFilter), [searched, activeFilter]);
  const sorted = useMemo(() => {
    const s = sortNotes(filtered, settings.sortOrder);
    if (activeFilter === 'all' || !activeFilter) {
      return [...s.filter((n) => n.isPinned), ...s.filter((n) => !n.isPinned)];
    }
    return s;
  }, [filtered, settings.sortOrder, activeFilter]);

  const showAddCard = (activeFilter === 'all' || !activeFilter || (activeFilter && activeFilter.startsWith('folder:'))) && !searchText;
  const isEmpty = sorted.length === 0;

  return (
    <div className="note-board">
      <BoardToolbar onClipRequest={onClipRequest} />

      <motion.div
        className="notes-grid"
        layout
        transition={layoutTransition || undefined}
      >
        {showAddCard && <AddNoteCard onOpenNew={onNewNote} />}

        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <motion.div
              key="empty"
              className="notes-grid__empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <EmptyState filter={activeFilter} searchText={searchText} />
            </motion.div>
          ) : (
            sorted.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={onOpenNote}
                onDeleteRequest={onDeleteRequest}
              />
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
