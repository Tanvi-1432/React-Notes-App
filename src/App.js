import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NoteBoard from './components/NoteBoard';
import ConfirmDialog from './components/ConfirmDialog';

const loadNoteModal = () => import('./components/NoteModal');
const loadClipModal = () => import('./components/ClipModal');

const NoteModal = lazy(loadNoteModal);
const ClipModal = lazy(loadClipModal);

function AppInner() {
  const { archiveNote, deleteNote } = useAppContext();

  const [modalNote, setModalNote] = useState(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showClip, setShowClip] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [noteExitIntents, setNoteExitIntents] = useState({});

  function setNoteExitIntent(id, intent) {
    setNoteExitIntents((current) => ({ ...current, [id]: intent }));
  }

  function clearNoteExitIntent(id) {
    setNoteExitIntents((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function openEditNote(note) {
    loadNoteModal();
    setModalNote(note);
    setIsNewNote(false);
  }

  function openNewNote() {
    loadNoteModal();
    setModalNote(null);
    setIsNewNote(true);
  }

  function closeModal() {
    setModalNote(null);
    setIsNewNote(false);
  }

  function handleDeleteConfirmed() {
    if (confirmDeleteId) {
      const id = confirmDeleteId;
      setNoteExitIntent(id, 'delete');
      window.setTimeout(() => deleteNote(id), 45);
      window.setTimeout(() => clearNoteExitIntent(id), 450);
      setConfirmDeleteId(null);
    }
  }

  function handleArchiveRequest(note) {
    const intent = note.isArchived ? 'restore' : 'archive';
    setNoteExitIntent(note.id, intent);
    window.setTimeout(() => archiveNote(note.id), 45);
    window.setTimeout(() => clearNoteExitIntent(note.id), 450);
  }

  function handleDeleteRequest(id) {
    setNoteExitIntent(id, 'delete');
    setConfirmDeleteId(id);
  }

  function handleDeleteCancel() {
    if (confirmDeleteId) clearNoteExitIntent(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  function openClipModal() {
    loadClipModal();
    setShowClip(true);
  }

  return (
    <LayoutGroup id="notes-layout">
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="board-area">
        <Header onMenuClick={() => setMobileNavOpen(true)} />

        <main className="board-area__main">
          <NoteBoard
            exitIntents={noteExitIntents}
            onOpenNote={openEditNote}
            onNewNote={openNewNote}
            onArchiveRequest={handleArchiveRequest}
            onDeleteRequest={handleDeleteRequest}
            onClipRequest={openClipModal}
          />
        </main>
      </div>

      <AnimatePresence>
        {(modalNote !== null || isNewNote) && (
          <Suspense key="note-modal" fallback={null}>
            <NoteModal
              note={modalNote}
              isNew={isNewNote}
              onClose={closeModal}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && (
          <ConfirmDialog
            key="confirm-delete"
            title="Delete note?"
            message="This note will be permanently deleted."
            confirmLabel="Delete"
            cancelLabel="Keep it"
            isDanger
            onConfirm={handleDeleteConfirmed}
            onCancel={handleDeleteCancel}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClip && (
          <Suspense key="clip-modal" fallback={null}>
            <ClipModal onClose={() => setShowClip(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
