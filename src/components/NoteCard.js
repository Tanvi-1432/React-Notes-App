import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdDeleteForever, MdPushPin, MdOutlinePushPin,
  MdArchive, MdUnarchive, MdCalendarToday, MdNotifications,
  MdNotificationImportant, MdEdit, MdCheckBox,
} from 'react-icons/md';
import { useAppContext } from '../context/AppContext';
import { highlightText } from '../utils/highlightText';
import { formatShortDate, isDatePast } from '../utils/dateUtils';
import { useSafeMotion } from '../utils/motionConfig';

function TaskBadge({ tasks, dueDate }) {
  if (!tasks || tasks.length === 0) return null;
  const done = tasks.filter((t) => t.isComplete).length;
  const overdue = tasks.some((t) => !t.isComplete) && dueDate && isDatePast(dueDate);
  return (
    <span className={`task-badge${overdue ? ' task-badge--overdue' : ''}`}>
      <MdCheckBox size="0.85em" /> {done}/{tasks.length}
    </span>
  );
}

function DueBadge({ dueDate, tasks }) {
  if (!dueDate) return null;
  const hasIncomplete = Array.isArray(tasks) && tasks.some((t) => !t.isComplete);
  const past = isDatePast(dueDate);
  const isOverdue = past && hasIncomplete;
  return (
    <span className={`due-badge${isOverdue ? ' due-badge--overdue' : ''}`}>
      <MdCalendarToday size="0.75em" /> {formatShortDate(dueDate)}
    </span>
  );
}

function ReminderBadge({ reminderDate }) {
  if (!reminderDate) return null;
  const past = isDatePast(reminderDate);
  return (
    <span className={`reminder-badge${past ? ' reminder-badge--past' : ''}`}
      title={`Reminder: ${formatShortDate(reminderDate)}`}>
      {past ? <MdNotificationImportant size="0.85em" /> : <MdNotifications size="0.85em" />}
      {formatShortDate(reminderDate)}
    </span>
  );
}

export default function NoteCard({ note, onOpen, onDeleteRequest }) {
  const { pinNote, archiveNote, state } = useAppContext();
  const { searchText } = state;
  const { cardVariants, layoutTransition } = useSafeMotion();
  const [pinAnimKey, setPinAnimKey] = useState(0);

  const isEdited = note.updatedDate && note.date && note.updatedDate !== note.date;
  const previewText = (note.contentPlainText || '')
    .split('\n')
    .slice(0, 6)
    .join(' ')
    .slice(0, 200);

  function handleCardClick(e) {
    if (e.target.closest('.note-card__actions') || e.target.closest('.note-card__action-btn')) return;
    onOpen(note);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(note);
    }
  }

  function handlePin(e) {
    e.stopPropagation();
    setPinAnimKey((k) => k + 1);
    pinNote(note.id);
  }

  return (
    <motion.div
      layout
      layoutId={note.id}
      transition={layoutTransition || undefined}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`note-card${note.isPinned ? ' note-card--pinned' : ''}${note.isArchived ? ' note-card--archived' : ''}`}
      style={{ backgroundColor: note.randomBackgroundColor }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Note: ${note.title || 'Untitled'}`}
    >
      {/* Pin indicator */}
      <AnimatePresence>
        {note.isPinned && (
          <motion.div
            key={`pin-${pinAnimKey}`}
            className="note-card__pin-flag"
            aria-label="Pinned"
            initial={{ scale: 1.3, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 0.7 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <MdPushPin size="0.9em" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clip source badge */}
      {note.clippedFrom && (
        <div className="note-card__clip-source">
          clipped from {note.clippedFrom.domain}
        </div>
      )}

      {/* Title */}
      <div className="note-card__title">
        {highlightText(note.title || 'Untitled', searchText)}
        {isEdited && (
          <span className="note-card__edited-indicator" title="Edited">
            <MdEdit size="0.75em" />
          </span>
        )}
      </div>

      {/* Body preview */}
      {previewText && (
        <div className="note-card__body">
          {highlightText(previewText, searchText)}
        </div>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="note-card__tags">
          {note.tags.map((tag) => (
            <span key={tag} className="tag-chip">#{tag}</span>
          ))}
        </div>
      )}

      {/* Badges row */}
      <div className="note-card__badges">
        <TaskBadge tasks={note.tasks} dueDate={note.dueDate} />
        <DueBadge dueDate={note.dueDate} tasks={note.tasks} />
        <ReminderBadge reminderDate={note.reminderDate} />
      </div>

      {/* Footer */}
      <div className="note-card__footer">
        <small className="note-card__date">
          {formatShortDate(note.date)}
          {isEdited && <span className="note-card__edited-text"> · edited</span>}
        </small>

        <div className="note-card__actions">
          <motion.button
            className="note-card__action-btn"
            onClick={handlePin}
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
            title={note.isPinned ? 'Unpin' : 'Pin'}
            whileTap={{ scale: 0.88 }}
          >
            {note.isPinned
              ? <MdPushPin size="1.1em" />
              : <MdOutlinePushPin size="1.1em" />}
          </motion.button>

          <motion.button
            className="note-card__action-btn"
            onClick={(e) => { e.stopPropagation(); archiveNote(note.id); }}
            aria-label={note.isArchived ? 'Unarchive note' : 'Archive note'}
            title={note.isArchived ? 'Unarchive' : 'Archive'}
            whileTap={{ scale: 0.88 }}
          >
            {note.isArchived
              ? <MdUnarchive size="1.1em" />
              : <MdArchive size="1.1em" />}
          </motion.button>

          <motion.button
            className="note-card__action-btn note-card__action-btn--delete"
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(note.id); }}
            aria-label="Delete note"
            title="Delete"
            whileTap={{ scale: 0.88 }}
          >
            <MdDeleteForever size="1.2em" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
