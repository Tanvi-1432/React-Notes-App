import { useState } from 'react';
import { motion } from 'framer-motion';
import { MdAdd } from 'react-icons/md';
import { useAppContext } from '../context/AppContext';

export default function AddNoteCard({ onOpenNew }) {
  const { addNote, backgroundColorList } = useAppContext();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  function randomColor() {
    return backgroundColorList[Math.floor(Math.random() * backgroundColorList.length)];
  }

  function handleSave() {
    if (!title.trim() && !text.trim()) return;
    const plainText = text;
    const doc = {
      type: 'doc',
      content: plainText
        ? plainText.split('\n').map((line) => ({
            type: 'paragraph',
            content: line ? [{ type: 'text', text: line }] : [],
          }))
        : [{ type: 'paragraph', content: [] }],
    };
    addNote({
      title: title.trim() || 'Untitled',
      content: JSON.stringify(doc),
      contentPlainText: plainText,
      tags: [],
      color: randomColor(),
    });
    setTitle('');
    setText('');
    setFocused(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setTitle('');
      setText('');
      setFocused(false);
    }
  }

  return (
    <div
      className={`note-card note-card--new${focused ? ' note-card--new-focused' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <input
        className="add-note__title"
        type="text"
        placeholder="T I T L E"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        aria-label="New note title"
      />

      {focused && (
        <textarea
          className="add-note__body"
          rows={5}
          placeholder="Type to add a note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="New note body"
        />
      )}

      <div className="note-card__footer">
        <motion.button
          type="button"
          className="add-note__open-btn"
          onClick={onOpenNew}
          aria-label="Open new note editor"
          whileTap={{ scale: 0.94 }}
        >
          <MdAdd size="1.1em" /> {focused ? 'Open full editor →' : 'Rich editor'}
        </motion.button>

        {focused && (
          <motion.button
            type="button"
            className="save"
            onClick={handleSave}
            aria-label="Save note"
            whileTap={{ scale: 0.94 }}
          >
            Save
          </motion.button>
        )}
      </div>
    </div>
  );
}
