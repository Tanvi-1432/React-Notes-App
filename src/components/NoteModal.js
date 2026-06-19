import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import {
  MdClose, MdFormatBold, MdFormatItalic, MdFormatUnderlined,
  MdFormatListBulleted, MdFormatListNumbered, MdCheckBox,
  MdCode, MdLink, MdUndo, MdRedo, MdCalendarToday, MdNotifications,
  MdFolder,
} from 'react-icons/md';
import { useAppContext } from '../context/AppContext';
import { createFocusTrapHandler } from '../utils/focusTrap';
import { useSafeMotion } from '../utils/motionConfig';

const EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
});

function ToolbarButton({ onClick, active, disabled, label, children }) {
  return (
    <motion.button
      type="button"
      className={`editor-toolbar__btn${active ? ' editor-toolbar__btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.button>
  );
}

function EditorToolbar({ editor }) {
  if (!editor) return null;

  function setLink() {
    const url = window.prompt('Enter URL:');
    if (!url) return;
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  }

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Bold"
      ><MdFormatBold /></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Italic"
      ><MdFormatItalic /></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        label="Underline"
      ><MdFormatUnderlined /></ToolbarButton>

      <span className="editor-toolbar__sep" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        label="Heading 1"
      >H1</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="Heading 2"
      >H2</ToolbarButton>

      <span className="editor-toolbar__sep" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        label="Bullet list"
      ><MdFormatListBulleted /></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        label="Numbered list"
      ><MdFormatListNumbered /></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        label="Checklist"
      ><MdCheckBox /></ToolbarButton>

      <span className="editor-toolbar__sep" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        label="Inline code"
      ><MdCode /></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        label="Code block"
      >{ }</ToolbarButton>

      <ToolbarButton
        onClick={setLink}
        active={editor.isActive('link')}
        label="Add link"
      ><MdLink /></ToolbarButton>

      <span className="editor-toolbar__sep" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Undo"
      ><MdUndo /></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Redo"
      ><MdRedo /></ToolbarButton>
    </div>
  );
}

function ColorPicker({ value, options, onChange }) {
  return (
    <div className="color-picker" role="group" aria-label="Note color">
      {options.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-picker__swatch${value === color ? ' color-picker__swatch--active' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`Color ${color}`}
          aria-pressed={value === color}
        />
      ))}
    </div>
  );
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  function addTag(e) {
    e.preventDefault();
    const tag = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      addTag(e);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="tag-input" role="group" aria-label="Tags">
      <div className="tag-input__chips">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip tag-chip--editable">
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="tag-chip__remove"
            >×</button>
          </span>
        ))}
        <input
          className="tag-input__field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          aria-label="Add tag"
        />
      </div>
    </div>
  );
}

export default function NoteModal({ note, isNew, onClose }) {
  const { addNote, updateNote, backgroundColorList, state } = useAppContext();
  const { folders } = state;
  const { modalVariants, backdropVariants, confirmVariants } = useSafeMotion();

  const [title, setTitle] = useState(note?.title || '');
  const [tags, setTags] = useState(note?.tags || []);
  const [color, setColor] = useState(note?.randomBackgroundColor || '#F7D44C');
  const [dueDate, setDueDate] = useState(note?.dueDate || '');
  const [reminderDate, setReminderDate] = useState(note?.reminderDate || '');
  const [folderId, setFolderId] = useState(note?.folderId || '');
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const titleInputRef = useRef(null);
  const modalRef = useRef(null);
  const originalRef = useRef({ title, tags, color, dueDate, reminderDate, folderId });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
    ],
    content: note?.content ? JSON.parse(note.content) : JSON.parse(EMPTY_DOC),
    onUpdate: () => setIsDirty(true),
  });

  useEffect(() => {
    const t = setTimeout(() => titleInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const orig = originalRef.current;
    if (
      title !== orig.title ||
      JSON.stringify(tags) !== JSON.stringify(orig.tags) ||
      color !== orig.color ||
      dueDate !== orig.dueDate ||
      reminderDate !== orig.reminderDate ||
      folderId !== orig.folderId
    ) {
      setIsDirty(true);
    }
  }, [title, tags, color, dueDate, reminderDate, folderId]);

  useEffect(() => {
    const trapHandler = createFocusTrapHandler(modalRef);
    function handleKeyDown(e) {
      trapHandler(e);
      if (e.key === 'Escape') attemptClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  function handleSave() {
    if (!editor) return;
    const content = JSON.stringify(editor.getJSON());
    const contentPlainText = editor.getText();
    const savedTitle = title.trim() || 'Untitled';

    if (isNew) {
      addNote({
        title: savedTitle,
        content,
        contentPlainText,
        tags,
        color,
        folderId: folderId || null,
        dueDate: dueDate || null,
        reminderDate: reminderDate || null,
      });
    } else {
      updateNote(note.id, {
        title: savedTitle,
        content,
        contentPlainText,
        tags,
        randomBackgroundColor: color,
        dueDate: dueDate || null,
        reminderDate: reminderDate || null,
        folderId: folderId || null,
      });
    }
    onClose();
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) attemptClose();
  }

  const modal = (
    <motion.div
      className="modal-overlay"
      onClick={handleBackdropClick}
      role="presentation"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="note-modal"
        ref={modalRef}
        layoutId={!isNew && note ? note.id : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Color band header */}
        <div className="note-modal__header" style={{ backgroundColor: color }}>
          <input
            ref={titleInputRef}
            id="modal-title"
            className="note-modal__title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            aria-label="Note title"
          />
          <div className="note-modal__header-actions">
            <ColorPicker value={color} options={backgroundColorList} onChange={setColor} />
            <motion.button
              type="button"
              className="note-modal__close-btn"
              onClick={attemptClose}
              aria-label="Close"
              whileTap={{ scale: 0.88, rotate: 45 }}
            >
              <MdClose size="1.4em" />
            </motion.button>
          </div>
        </div>

        {/* Toolbar */}
        <EditorToolbar editor={editor} />

        {/* Editor */}
        <div
          className="note-modal__editor"
          style={{ backgroundColor: color }}
        >
          <EditorContent editor={editor} />
        </div>

        {/* Metadata fields */}
        <div className="note-modal__meta">
          <div className="note-modal__meta-row">
            <label className="note-modal__meta-label">
              <MdCalendarToday size="0.9em" /> Due
            </label>
            <input
              type="date"
              className="note-modal__date-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due date"
            />
          </div>

          <div className="note-modal__meta-row">
            <label className="note-modal__meta-label">
              <MdNotifications size="0.9em" /> Remind
            </label>
            <input
              type="date"
              className="note-modal__date-input"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              aria-label="Reminder date"
            />
            {reminderDate && (
              <button
                type="button"
                className="note-modal__clear-date"
                onClick={() => setReminderDate('')}
                aria-label="Clear reminder"
              >×</button>
            )}
          </div>

          <div className="note-modal__meta-row note-modal__meta-row--tags">
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {folders.length > 0 && (
            <div className="note-modal__meta-row">
              <label className="note-modal__meta-label">
                <MdFolder size="0.9em" /> Folder
              </label>
              <select
                className="note-modal__folder-select"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                aria-label="Move to folder"
              >
                <option value="">Inbox</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="note-modal__footer">
          <motion.button
            type="button"
            className="note-modal__btn note-modal__btn--cancel"
            onClick={attemptClose}
            whileTap={{ scale: 0.96 }}
          >
            Cancel
          </motion.button>
          <motion.button
            type="button"
            className="note-modal__btn note-modal__btn--save"
            onClick={handleSave}
            whileTap={{ scale: 0.96 }}
          >
            Save Note →
          </motion.button>
        </div>
      </motion.div>

      {/* Discard confirmation */}
      <AnimatePresence>
        {showDiscard && (
          <motion.div
            className="confirm-overlay"
            role="presentation"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDiscard(false); }}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              className="confirm-dialog"
              variants={confirmVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h2 id="confirm-title" className="confirm-dialog__title">Discard changes?</h2>
              <p id="confirm-message" className="confirm-dialog__message">Your unsaved changes will be lost.</p>
              <div className="confirm-dialog__actions">
                <motion.button
                  type="button"
                  className="confirm-dialog__btn confirm-dialog__btn--danger"
                  onClick={onClose}
                  whileTap={{ scale: 0.96 }}
                >
                  Discard
                </motion.button>
                <motion.button
                  type="button"
                  className="confirm-dialog__btn confirm-dialog__btn--cancel"
                  onClick={() => setShowDiscard(false)}
                  whileTap={{ scale: 0.96 }}
                >
                  Keep Editing
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
