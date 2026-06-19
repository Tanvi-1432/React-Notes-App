import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NoteBoard from './components/NoteBoard';
import NoteModal from './components/NoteModal';
import ConfirmDialog from './components/ConfirmDialog';
import ClipModal from './components/ClipModal';

function AppInner() {
  const { deleteNote } = useAppContext();

  const [modalNote, setModalNote] = useState(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showClip, setShowClip] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function openEditNote(note) {
    setModalNote(note);
    setIsNewNote(false);
  }

  function openNewNote() {
    setModalNote(null);
    setIsNewNote(true);
  }

  function closeModal() {
    setModalNote(null);
    setIsNewNote(false);
  }

  function handleDeleteConfirmed() {
    if (confirmDeleteId) {
      deleteNote(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="board-area">
        <Header onMenuClick={() => setMobileNavOpen(true)} />

        <main className="board-area__main">
          <NoteBoard
            onOpenNote={openEditNote}
            onNewNote={openNewNote}
            onDeleteRequest={(id) => setConfirmDeleteId(id)}
            onClipRequest={() => setShowClip(true)}
          />
        </main>
      </div>

      <AnimatePresence>
        {(modalNote !== null || isNewNote) && (
          <NoteModal
            key="note-modal"
            note={modalNote}
            isNew={isNewNote}
            onClose={closeModal}
          />
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
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClip && (
          <ClipModal key="clip-modal" onClose={() => setShowClip(false)} />
        )}
      </AnimatePresence>
    </div>
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
