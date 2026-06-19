import {
  MdArchive,
  MdBookmark,
  MdCheckBox,
  MdLabel,
  MdLink,
  MdNotes,
  MdPushPin,
} from 'react-icons/md';
import { useAppContext } from '../context/AppContext';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All', Icon: MdNotes },
  { id: 'pinned', label: 'Pinned', Icon: MdPushPin },
  { id: 'tasks', label: 'Tasks', Icon: MdCheckBox },
  { id: 'clips', label: 'Clips', Icon: MdLink },
  { id: 'archived', label: 'Archive', Icon: MdArchive },
];

const SORT_OPTIONS = [
  { id: 'updatedDesc', label: 'Recently edited' },
  { id: 'createdDesc', label: 'Newest first' },
  { id: 'titleAsc', label: 'A → Z' },
];

export default function BoardToolbar({ onClipRequest }) {
  const { state, setFilter, setSetting } = useAppContext();
  const { activeFilter, notes, settings } = state;

  // Collect all unique tags from non-archived notes
  const allTags = [...new Set(
    notes.filter((n) => !n.isArchived).flatMap((n) => n.tags || [])
  )].sort();

  return (
    <div className="board-toolbar">
      <div className="board-toolbar__filters" role="group" aria-label="Filter notes">
        {FILTER_OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`filter-chip${activeFilter === id ? ' filter-chip--active' : ''}`}
            onClick={() => setFilter(id)}
            aria-pressed={activeFilter === id}
          >
            <Icon size="0.95em" aria-hidden="true" />
            {label}
          </button>
        ))}

        {/* Dynamic tag chips */}
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`filter-chip filter-chip--tag${activeFilter === tag ? ' filter-chip--active' : ''}`}
            onClick={() => setFilter(activeFilter === tag ? 'all' : tag)}
            aria-pressed={activeFilter === tag}
          >
            <MdLabel size="0.9em" aria-hidden="true" />
            #{tag}
          </button>
        ))}
      </div>

      <div className="board-toolbar__right">
        <select
          className="sort-select"
          value={settings.sortOrder}
          onChange={(e) => setSetting({ sortOrder: e.target.value })}
          aria-label="Sort notes"
        >
          {SORT_OPTIONS.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <button
          type="button"
          className="clip-btn"
          onClick={onClipRequest}
          aria-label="Save a web clip"
        >
          <MdBookmark size="1em" /> Clip
        </button>
      </div>
    </div>
  );
}
