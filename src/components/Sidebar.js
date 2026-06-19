import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdNotes, MdPushPin, MdCheckBox, MdLink, MdArchive,
  MdWarning, MdAdd, MdChevronLeft, MdChevronRight,
  MdFolder, MdFolderOpen, MdDelete, MdEdit, MdClose,
} from 'react-icons/md';
import { useAppContext } from '../context/AppContext';
import { useSmartFolders, useFolderCounts } from '../hooks/useSmartFolders';
import ConfirmDialog from './ConfirmDialog';

const SMART_ITEMS = [
  { id: 'all',      label: 'All Notes', Icon: MdNotes },
  { id: 'pinned',   label: 'Pinned',    Icon: MdPushPin },
  { id: 'tasks',    label: 'Tasks',     Icon: MdCheckBox },
  { id: 'clips',    label: 'Web Clips', Icon: MdLink },
  { id: 'overdue',  label: 'Overdue',   Icon: MdWarning },
  { id: 'archived', label: 'Archive',   Icon: MdArchive },
];

function FolderItem({ folder, isActive, count, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    else setDraft(folder.name);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') { setDraft(folder.name); setEditing(false); }
  }

  const dot = folder.color
    ? <span className="sidebar__folder-dot" style={{ background: folder.color }} />
    : null;

  if (editing) {
    return (
      <div className="sidebar__folder-item sidebar__folder-item--editing">
        {dot}
        <input
          ref={inputRef}
          className="sidebar__folder-rename-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          aria-label="Rename folder"
        />
        <button
          type="button"
          className="sidebar__icon-btn"
          onClick={commitRename}
          aria-label="Confirm rename"
        >
          <MdEdit size="0.9em" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`sidebar__folder-item${isActive ? ' sidebar__folder-item--active' : ''}`}
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      aria-label={`Folder: ${folder.name}`}
      aria-current={isActive ? 'true' : undefined}
    >
      {dot || (isActive ? <MdFolderOpen size="1em" className="sidebar__folder-icon" /> : <MdFolder size="1em" className="sidebar__folder-icon" />)}
      <span className="sidebar__item-label">{folder.name}</span>
      {count > 0 && <span className="sidebar__count">{count}</span>}
      <div className="sidebar__folder-actions">
        <button
          type="button"
          className="sidebar__icon-btn"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          aria-label={`Rename ${folder.name}`}
        >
          <MdEdit size="0.85em" />
        </button>
        <button
          type="button"
          className="sidebar__icon-btn sidebar__icon-btn--danger"
          onClick={(e) => { e.stopPropagation(); onDelete(folder.id, folder.name); }}
          aria-label={`Delete ${folder.name}`}
        >
          <MdDelete size="0.85em" />
        </button>
      </div>
    </div>
  );
}

function AddFolderForm({ onAdd, onCancel, colorList }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, color });
  }

  return (
    <form className="sidebar__add-folder-form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="sidebar__folder-rename-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name…"
        aria-label="New folder name"
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      />
      <div className="sidebar__add-folder-colors">
        {colorList.map((c) => (
          <button
            key={c}
            type="button"
            className={`sidebar__color-swatch${color === c ? ' sidebar__color-swatch--active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(color === c ? null : c)}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
          />
        ))}
      </div>
      <div className="sidebar__add-folder-actions">
        <button type="submit" className="sidebar__add-folder-btn" disabled={!name.trim()}>
          Add
        </button>
        <button type="button" className="sidebar__icon-btn" onClick={onCancel} aria-label="Cancel">
          <MdClose size="1em" />
        </button>
      </div>
    </form>
  );
}

function CollapsedFolderFlyout({
  isOpen,
  anchorRef,
  flyoutRef,
  folders,
  folderCounts,
  activeFilter,
  showAddFolder,
  colorList,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onSelectFolder,
  onShowAddFolder,
  onClose,
}) {
  const [position, setPosition] = useState({ top: 96, left: 64 });

  useEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const panelHeight = 360;
    const viewportPadding = 12;
    const maxTop = Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding);

    setPosition({
      left: rect.right + 10,
      top: Math.min(Math.max(rect.top - 12, viewportPadding), maxTop),
    });
  }, [anchorRef, isOpen, folders.length, showAddFolder]);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => {
      flyoutRef.current?.focus();
    }, 0);

    function handlePointerDown(event) {
      const flyout = flyoutRef.current;
      const anchor = anchorRef.current;
      const clickedFlyout = flyout?.contains(event.target);
      const clickedAnchor = anchor?.contains(event.target);

      if (!clickedFlyout && !clickedAnchor) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, flyoutRef, isOpen, onClose]);

  if (typeof document === 'undefined' || !isOpen) return null;

  return createPortal(
    <motion.div
      ref={flyoutRef}
      className="sidebar-flyout"
      role="dialog"
      aria-label="Folders"
      tabIndex={-1}
      style={{ top: position.top, left: position.left }}
      initial={{ opacity: 0, x: -8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
    >
      <div className="sidebar-flyout__header">
        <div className="sidebar-flyout__title">
          <MdFolderOpen size="1.05em" />
          Folders
        </div>
        <div className="sidebar-flyout__actions">
          <button
            type="button"
            className="sidebar__icon-btn sidebar__add-btn"
            onClick={() => onShowAddFolder((v) => !v)}
            aria-label="Add folder"
            aria-expanded={showAddFolder}
          >
            <MdAdd size="1em" />
          </button>
          <button
            type="button"
            className="sidebar__icon-btn"
            onClick={onClose}
            aria-label="Close folders"
          >
            <MdClose size="1em" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddFolder && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <AddFolderForm
              onAdd={onAddFolder}
              onCancel={() => onShowAddFolder(false)}
              colorList={colorList}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sidebar-flyout__list">
        {folders.length === 0 && !showAddFolder && (
          <p className="sidebar__empty-folders">No folders yet</p>
        )}
        {folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isActive={activeFilter === `folder:${folder.id}`}
            count={folderCounts[folder.id] || 0}
            onSelect={() => onSelectFolder(`folder:${folder.id}`)}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        ))}
      </div>
    </motion.div>,
    document.body
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { state, setFilter, setSetting, addFolder, renameFolder, deleteFolder, backgroundColorList } = useAppContext();
  const { notes, folders, activeFilter, settings } = state;
  const { sidebarCollapsed } = settings;
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [forceExpandedSidebar, setForceExpandedSidebar] = useState(false);
  const folderFlyoutButtonRef = useRef(null);
  const folderFlyoutRef = useRef(null);

  const smartCounts = useSmartFolders(notes);
  const folderCounts = useFolderCounts(notes);

  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showFolderFlyout, setShowFolderFlyout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  useEffect(() => {
    const narrowQuery = window.matchMedia('(max-width: 900px)');
    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const updateViewport = () => {
      setIsNarrowViewport(narrowQuery.matches);
      setIsMobileViewport(mobileQuery.matches);
    };

    updateViewport();
    narrowQuery.addEventListener('change', updateViewport);
    mobileQuery.addEventListener('change', updateViewport);
    return () => {
      narrowQuery.removeEventListener('change', updateViewport);
      mobileQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isNarrowViewport || isMobileViewport || mobileOpen) {
      setForceExpandedSidebar(false);
    }
  }, [isMobileViewport, isNarrowViewport, mobileOpen]);

  function handleAddFolder({ name, color }) {
    addFolder({ name, color });
    setShowAddFolder(false);
  }

  function handleDeleteFolder(id, name) {
    setConfirmDelete({ id, name });
  }

  function confirmDeleteFolder() {
    deleteFolder(confirmDelete.id);
    setConfirmDelete(null);
  }

  function selectFilter(f) {
    setFilter(f);
    setShowFolderFlyout(false);
    onMobileClose?.();
  }

  function handleSidebarToggle() {
    if (isNarrowViewport && !isMobileViewport && !mobileOpen) {
      setForceExpandedSidebar((expanded) => !expanded);
      setShowFolderFlyout(false);
      return;
    }

    setSetting({ sidebarCollapsed: !sidebarCollapsed });
  }

  function closeFolderFlyout() {
    setShowFolderFlyout(false);
    setShowAddFolder(false);
    window.setTimeout(() => folderFlyoutButtonRef.current?.focus(), 0);
  }

  const collapsed = !isMobileViewport && !forceExpandedSidebar && (sidebarCollapsed || isNarrowViewport) && !mobileOpen;
  const showNarrowExpanded = forceExpandedSidebar && isNarrowViewport && !isMobileViewport && !mobileOpen;
  const showCollapseButton = !mobileOpen;

  useEffect(() => {
    if (!collapsed) {
      setShowFolderFlyout(false);
    }
  }, [collapsed]);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar__mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <nav
        className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}${showNarrowExpanded ? ' sidebar--narrow-expanded' : ''}${mobileOpen ? ' sidebar--mobile-open' : ''}`}
        aria-label="Navigation"
      >
        {/* Sidebar header */}
        <div className="sidebar__header">
          {!collapsed && !isNarrowViewport && (
            <span className="sidebar__title">NOTES</span>
          )}
          {showCollapseButton && (
            <button
              type="button"
              className="sidebar__collapse-btn"
              onClick={handleSidebarToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <MdChevronRight size="1.2em" /> : <MdChevronLeft size="1.2em" />}
            </button>
          )}
        </div>

        {/* Smart folders */}
        {!collapsed && (
          <div className="sidebar__section-label">Smart</div>
        )}
        <div className="sidebar__section">
          {SMART_ITEMS.map(({ id, label, Icon }) => {
            const count = smartCounts[id] ?? 0;
            const isActive = activeFilter === id;
            return (
              <button
                key={id}
                type="button"
                className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
                onClick={() => selectFilter(id)}
                aria-label={label}
                aria-current={isActive ? 'true' : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size="1.05em" className="sidebar__item-icon" />
                {!collapsed && (
                  <>
                    <span className="sidebar__item-label">{label}</span>
                    {count > 0 && <span className="sidebar__count">{count}</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Manual folders */}
        {!collapsed && (
          <>
            <div className="sidebar__section-label sidebar__section-label--folders">
              Folders
              <button
                type="button"
                className="sidebar__icon-btn sidebar__add-btn"
                onClick={() => setShowAddFolder((v) => !v)}
                aria-label="Add folder"
              >
                <MdAdd size="1em" />
              </button>
            </div>

            <AnimatePresence>
              {showAddFolder && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  <AddFolderForm
                    onAdd={handleAddFolder}
                    onCancel={() => setShowAddFolder(false)}
                    colorList={backgroundColorList}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sidebar__section">
              {folders.length === 0 && !showAddFolder && (
                <p className="sidebar__empty-folders">No folders yet</p>
              )}
              <AnimatePresence>
                {folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.16 }}
                  >
                    <FolderItem
                      folder={folder}
                      isActive={activeFilter === `folder:${folder.id}`}
                      count={folderCounts[folder.id] || 0}
                      onSelect={() => selectFilter(`folder:${folder.id}`)}
                      onRename={renameFolder}
                      onDelete={handleDeleteFolder}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Collapsed folder flyout */}
        {collapsed && (
          <div className="sidebar__section sidebar__section--collapsed-folders">
            <button
              ref={folderFlyoutButtonRef}
              type="button"
              className={`sidebar__item sidebar__item--folder-flyout${showFolderFlyout ? ' sidebar__item--active' : ''}`}
              onClick={() => setShowFolderFlyout((v) => !v)}
              aria-label="Open folders"
              aria-expanded={showFolderFlyout}
              title="Folders"
            >
              <MdFolderOpen size="1.1em" />
            </button>
          </div>
        )}
      </nav>

      <CollapsedFolderFlyout
        isOpen={showFolderFlyout && collapsed}
        anchorRef={folderFlyoutButtonRef}
        flyoutRef={folderFlyoutRef}
        folders={folders}
        folderCounts={folderCounts}
        activeFilter={activeFilter}
        showAddFolder={showAddFolder}
        colorList={backgroundColorList}
        onAddFolder={handleAddFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
        onSelectFolder={selectFilter}
        onShowAddFolder={setShowAddFolder}
        onClose={closeFolderFlyout}
      />

      {/* Delete folder confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            key="confirm-delete-folder"
            title={`Delete "${confirmDelete.name}"?`}
            message="Notes inside will move to Inbox. They won't be deleted."
            confirmLabel="Delete folder"
            cancelLabel="Keep it"
            isDanger
            onConfirm={confirmDeleteFolder}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
