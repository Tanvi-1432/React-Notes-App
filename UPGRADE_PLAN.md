# React Notes App — Upgrade Plan

> Decision-complete. An engineer can follow this document top-to-bottom to build every feature without making product or architecture decisions mid-stream.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Current State Audit](#2-current-state-audit)
3. [Feature Priorities & Phase Roadmap](#3-feature-priorities--phase-roadmap)
4. [Data Model](#4-data-model)
5. [Storage Strategy & Migration](#5-storage-strategy--migration)
6. [Component Architecture](#6-component-architecture)
7. [Feature Specifications](#7-feature-specifications)
   - [7.1 Edit Existing Notes](#71-edit-existing-notes)
   - [7.2 Rich Text Formatting](#72-rich-text-formatting)
   - [7.3 Folders & Smart Folders](#73-folders--smart-folders)
   - [7.4 Attachments](#74-attachments)
   - [7.5 Web Clipper / Save From Browser](#75-web-clipper--save-from-browser)
   - [7.6 Advanced Search & OCR](#76-advanced-search--ocr)
   - [7.7 Tasks & Reminders](#77-tasks--reminders)
8. [Design System Additions](#8-design-system-additions)
9. [UI/UX Layout Plan](#9-uiux-layout-plan)
10. [Library Recommendations](#10-library-recommendations)
11. [Accessibility](#11-accessibility)
12. [Testing Plan](#12-testing-plan)
13. [Edge Cases](#13-edge-cases)
14. [Risks & Tradeoffs](#14-risks--tradeoffs)
15. [Acceptance Criteria](#15-acceptance-criteria)

---

## 1. Product Vision

**Tagline:** Your sticky-note board, grown up.

The app stays a personal, tactile, colorful notes board — not a productivity dashboard. Every feature added must feel like it belongs on a real cork board: you can pin things, clip things from the web, check off tasks, and still find anything in seconds. The handmade visual energy (thick borders, bold colors, Archivo Black headings, warm shadows) is a non-negotiable constraint, not a starting point to move away from.

**Core promise:** Fast capture → organized storage → instant retrieval → zero friction editing.

---

## 2. Current State Audit

### What exists
| Feature | Implementation | Notes |
|---|---|---|
| Add note | `AddNote.js` textarea + title input | Title limit: 20 chars. Body limit: 200 chars. Both limits will be lifted in v1. |
| Delete note | `MdDeleteForever` icon in `Note.js` | Immediate, no confirmation. |
| Search | `Search.js` filters on `note.title` + `note.text` | Case-insensitive via `.toLowerCase()`. |
| Dark mode | CSS class toggle `.dark-mode` | Functional but visually thin — just color swap. |
| Persistence | `localStorage` with key `notes-app-data` | Dark mode stored separately under `toggle-dark-mode-data`. |
| Color | `backgroundColorList` random pick at save time | 5 colors: green, blue, orange, yellow, sage. |
| Grid layout | CSS `auto-fit minmax(250px, 1fr)` | Responsive, no sidebar. |

### What does not exist yet
Edit, rich text, folders, attachments, web clip, advanced search, OCR, tasks, reminders, tags, pinning, archiving.

### Current note shape
```json
{
  "id": "nanoid string",
  "title": "string (≤20 chars)",
  "text": "string (≤200 chars)",
  "date": "toLocaleDateString() string",
  "randomBackgroundColor": "#hex"
}
```

### Key constraints to preserve
- No backend in v1–v2.
- Deploy target is GitHub Pages (static host only).
- `nanoid` already in use for IDs.
- `react-icons` already installed.
- `react-scripts` / CRA toolchain.

---

## 3. Feature Priorities & Phase Roadmap

### Phase Legend
- **v1 (Core Upgrade):** Deliver immediately. No new dependencies except one rich-text editor.
- **v2 (Power Features):** Deliver in a second sprint. Introduces IndexedDB and a sidebar.
- **Future:** Requires a backend, native app shell, or browser extension.

### Priority Table

| # | Feature | Phase | Rationale |
|---|---|---|---|
| 1 | Edit existing notes | v1 | Highest user pain point — notes are currently immutable after save. |
| 2 | Lift character limits | v1 | Removes the most obvious constraint. |
| 3 | Rich text formatting | v1 | Natural companion to editing; use a small library. |
| 4 | Tags | v1 | Lightweight metadata; enables smart folders later with no extra work. |
| 5 | Pin / Archive | v1 | Simple flag on the note shape. Zero new infrastructure. |
| 6 | Tasks & Reminders (basic) | v1 | Checklist inside rich text editor covers most of the need. Due date is a note field. |
| 7 | Dark mode polish | v1 | CSS-only work, high visible impact. |
| 8 | Delete confirmation | v1 | Prevents accidental data loss. |
| 9 | Folders & Smart Folders | v2 | Requires sidebar layout change and folder data model. |
| 10 | Attachments (images + links) | v2 | Requires IndexedDB; base64 for images. |
| 11 | Advanced Search + filters | v2 | Builds on folder + tag infrastructure. |
| 12 | Web clipper — in-app "Save Link" | v2 | Pure frontend, fetches OG metadata. |
| 13 | OCR (in-browser, Tesseract.js) | Future | Large WASM bundle; defer until attachment feature is proven. |
| 14 | Browser extension web clipper | Future | Separate build artifact; needs extension store review. |
| 15 | Reminders via push notifications | Future | Requires service worker + user permission grant. |
| 16 | Backend / cloud sync | Future | Separate product decision. |

---

## 4. Data Model

All shapes are plain JSON. v1 uses localStorage. v2 migrates to IndexedDB.

### 4.1 Note (v1 shape)
```ts
interface Note {
  id: string;                        // nanoid — unchanged
  title: string;                     // no hard char limit in v1
  content: string;                   // replaces "text"; stores Tiptap JSON string
  contentPlainText: string;          // denormalized plain text for search indexing
  date: string;                      // ISO-8601 creation date ("2026-06-07")
  updatedDate: string;               // ISO-8601 last-edit date
  randomBackgroundColor: string;     // hex — unchanged
  isPinned: boolean;                 // default false
  isArchived: boolean;               // default false
  tags: string[];                    // e.g. ["work", "ideas"]
  folderId: string | null;           // null = Inbox (no folder)
  tasks: Task[];                     // extracted task list for smart folder logic
  dueDate: string | null;            // ISO-8601 or null
  reminderDate: string | null;       // ISO-8601 or null — v1 stores, v2 fires
  attachments: Attachment[];         // v1: empty []; v2: populated
  clippedFrom: ClipSource | null;    // null unless saved via web clipper
}
```

### 4.2 Task (embedded in Note)
```ts
interface Task {
  id: string;           // nanoid
  label: string;        // task text
  isComplete: boolean;
  dueDate: string | null;
}
```

Tasks are managed through the rich text editor's checklist node. After each save the app extracts all checklist items from the Tiptap JSON and writes them to `note.tasks[]`. This denormalization lets smart folders query tasks without parsing JSON on every render.

### 4.3 Attachment (v2)
```ts
interface Attachment {
  id: string;
  type: 'image' | 'pdf' | 'link' | 'file';
  name: string;                // user-visible filename or link title
  url: string | null;          // for 'link' type
  dataUrl: string | null;      // base64 for images ≤ 500 KB; null for pdf/file
  mimeType: string;
  size: number;                // bytes
  indexedDbKey: string | null; // key into IndexedDB blob store for large files
  addedDate: string;           // ISO-8601
  ocrText: string | null;      // populated in Future phase
}
```

### 4.4 Folder
```ts
interface Folder {
  id: string;
  name: string;
  color: string | null;       // optional accent; matches note color palette
  icon: string | null;        // react-icons name string, e.g. "MdFolder"
  createdDate: string;
  sortOrder: number;
}
```

### 4.5 Smart Folder (static definitions, not persisted)
Smart folders are computed at runtime from the full notes array. They are defined in a config file, not stored in the database.

```ts
interface SmartFolderDef {
  id: string;           // e.g. "pinned", "recent", "tasks", "archived"
  label: string;
  icon: string;
  filter: (note: Note) => boolean;
  sort?: (a: Note, b: Note) => number;
}
```

Built-in smart folder definitions:
| ID | Label | Filter logic |
|---|---|---|
| `all` | All Notes | `!isArchived` |
| `pinned` | Pinned | `isPinned && !isArchived` |
| `recent` | Recently Updated | `!isArchived`, sorted by `updatedDate` desc, last 30 days |
| `tasks` | Tasks | `tasks.length > 0 && !isArchived` |
| `overdue` | Overdue | `tasks.some(t => t.dueDate && !t.isComplete && isPast(t.dueDate))` |
| `attachments` | Has Attachments | `attachments.length > 0 && !isArchived` |
| `clipped` | Web Clips | `clippedFrom !== null && !isArchived` |
| `archived` | Archive | `isArchived === true` |

### 4.6 ClipSource
```ts
interface ClipSource {
  url: string;
  title: string | null;
  excerpt: string | null;
  domain: string;
  savedDate: string;
  previewImageUrl: string | null;   // OG image URL if available (future: cached locally)
}
```

### 4.7 App Settings (localStorage key: `notes-app-settings`)
```ts
interface AppSettings {
  darkMode: boolean;
  sidebarCollapsed: boolean;         // v2
  defaultFolderId: string | null;    // folder auto-selected on open
  sortOrder: 'updatedDesc' | 'createdDesc' | 'titleAsc';
}
```

---

## 5. Storage Strategy & Migration

### v1: Stay on localStorage

localStorage is sufficient while:
- Notes contain only text content (Tiptap JSON is compact).
- No large file attachments.
- Total data stays under ~5 MB (typical localStorage limit).

**What changes in v1:**
- Migrate the `text` field to `content` (Tiptap JSON) and `contentPlainText`.
- Add all new scalar fields with safe defaults.
- Run migration on first load; write back immediately.

**Migration function (pseudocode):**
```
function migrateNote(raw):
  if raw.content exists → already migrated, return raw
  return {
    ...raw,
    content: tiptapJsonFromPlainText(raw.text),
    contentPlainText: raw.text,
    updatedDate: raw.date,
    isPinned: false,
    isArchived: false,
    tags: [],
    folderId: null,
    tasks: [],
    dueDate: null,
    reminderDate: null,
    attachments: [],
    clippedFrom: null,
    // remove: raw.text
  }
```

Run on app load, before `setNotes`. Gate on absence of `content` field to make it idempotent.

### v2: Introduce IndexedDB via `idb`

Use the `idb` library (maintained, 1 KB gzipped wrapper around the raw IndexedDB API). Do not use Dexie — it is larger and the query API is overkill for this app.

**IndexedDB object stores:**
| Store | Key | Purpose |
|---|---|---|
| `notes` | `id` | All note objects (without binary attachment data) |
| `blobs` | `id` | Binary attachment data keyed by `attachment.indexedDbKey` |
| `folders` | `id` | Manual folder list |

**localStorage in v2:** Retain only `notes-app-settings` (settings object). All note/folder data moves to IndexedDB.

**Migration from localStorage to IndexedDB:**
1. On v2 first load, check if IndexedDB store is empty and localStorage key `notes-app-data` exists.
2. Parse localStorage, run v1→v2 migration on each note.
3. Write all notes to IndexedDB `notes` store.
4. Delete localStorage key `notes-app-data`.
5. Set a migration flag in localStorage (`notes-app-migrated-v2: true`) so step 1 is skipped on subsequent loads.

---

## 6. Component Architecture

### v1 Component Tree

```
App
├── AppContext (state: notes, settings, activeFilter, searchText)
├── Header
│   ├── AppTitle ("NOTES")
│   ├── SearchBar                      ← moved into header row
│   └── DarkModeToggle
├── NoteBoard                          ← replaces NotesList
│   ├── BoardToolbar
│   │   ├── SortMenu
│   │   ├── FilterChips (tags, pinned) ← v1 inline filter
│   │   └── NewNoteButton
│   ├── NoteGrid
│   │   ├── AddNoteCard
│   │   └── NoteCard (×N)
│   │       ├── NoteCardHeader (title, pin badge, color dot)
│   │       ├── NoteCardBody (plain text preview, task count badge)
│   │       └── NoteCardFooter (date, tag chips, delete icon)
│   └── EmptyState
└── NoteModal (portal, conditional)
    ├── ModalHeader (title input, color picker, close, save, cancel)
    ├── RichTextEditor (Tiptap instance)
    ├── TagInput
    ├── DueDatePicker
    └── AttachmentBar (v2)
```

### v2 Component Tree additions

```
App
├── AppContext (adds: folders, activeFolderId)
├── Sidebar
│   ├── SidebarHeader (logo, collapse toggle)
│   ├── SmartFolderList
│   │   └── SmartFolderItem (×8)
│   ├── FolderList
│   │   ├── FolderItem (×N, drag-to-reorder)
│   │   └── AddFolderButton
│   └── SidebarFooter (settings link)
├── MainArea
│   ├── Header (now narrower, no search)
│   ├── NoteBoard
│   └── ...
└── NoteModal
    └── AttachmentBar (now active)
        ├── AttachmentThumb (×N)
        └── AddAttachmentButton
```

### State Management Decision

**v1:** React Context + `useReducer`. No external state library.

The app's state is a single flat array of notes plus settings. Context is sufficient. A `notesReducer` handles all actions cleanly:
- `ADD_NOTE`, `UPDATE_NOTE`, `DELETE_NOTE`, `PIN_NOTE`, `ARCHIVE_NOTE`
- `SET_SEARCH`, `SET_FILTER`, `SET_SORT`
- `SET_SETTING`

Do not introduce Zustand or Redux. Add them only if the component tree grows beyond 4 levels of prop threading, which does not happen until v2+.

**v2:** Migrate to Zustand for the folder + note + settings slices. The async IndexedDB reads/writes become much cleaner with Zustand's middleware pattern.

### Custom Hooks

| Hook | Responsibility |
|---|---|
| `useNotes()` | CRUD on notes array; wraps context dispatch |
| `useFolders()` | CRUD on folders; v2 |
| `useSearch(notes, query)` | Returns filtered + ranked results |
| `useSmartFolders(notes)` | Returns computed smart folder counts |
| `useLocalStorage(key, default)` | Typed localStorage read/write |
| `useIndexedDb()` | v2; wraps `idb` open/read/write |
| `useDarkMode()` | Reads/writes dark mode setting |
| `useConfirmDelete()` | Manages confirmation modal state |

---

## 7. Feature Specifications

### 7.1 Edit Existing Notes

#### Behavior
- Clicking anywhere on a NoteCard (except the delete icon) opens the NoteModal in edit mode.
- The NoteModal is a full-screen overlay (portal into `document.body`) that preserves the note's background color as a tinted header band.
- Inside the modal: title input (top), rich text editor (body), tag input, due date picker.
- "Save" button writes changes to state + localStorage, closes modal, updates `updatedDate` to `now`.
- "Cancel" button closes modal with no changes.
- Keyboard: `Escape` triggers cancel behavior.
- If there are unsaved changes and the user presses Escape or clicks outside the modal, show an inline confirmation: "Discard changes?" with "Discard" / "Keep Editing" options. Do not use a browser `confirm()` dialog.
- The NoteCard shows a small "edited" indicator (pencil icon + relative time: "edited 2h ago") when `updatedDate !== date`.

#### Dirty-state detection
Track a `isDirty` boolean: set to `true` on any change inside the modal. Reset on save or confirmed cancel. Use `useRef` to store the original note snapshot at modal-open time.

#### Character limits
Remove the 20-char title limit and 200-char body limit. They are removed permanently in v1. No replacement hard limit — rely on rich text editor's built-in feel.

#### Acceptance Criteria
- [ ] Clicking a note card opens modal pre-filled with all note fields.
- [ ] Saving updates the note in state and localStorage; `updatedDate` is updated.
- [ ] Cancel with no changes closes immediately.
- [ ] Cancel with unsaved changes shows confirmation prompt.
- [ ] Escape key triggers cancel flow.
- [ ] NoteCard shows "edited" indicator after first edit.
- [ ] Title-only notes (empty body) can be saved.
- [ ] Body-only notes (empty title) can be saved with a generated title ("Untitled").

---

### 7.2 Rich Text Formatting

#### Library Decision: Tiptap

Use **Tiptap v2** (`@tiptap/react`, `@tiptap/starter-kit`).

**Why Tiptap over alternatives:**
| Library | Size (gzip) | Reasons against |
|---|---|---|
| Slate.js | ~120 KB | Complex, low-level; requires building all toolbar logic from scratch |
| Quill | ~43 KB | Older codebase; Delta format is harder to query for task extraction |
| react-quill | ~43 KB | Wrapper around Quill; React 18 compatibility issues |
| TipTap v2 | ~38 KB core | ProseMirror-based; excellent React integration; extensions are tree-shakeable |
| Markdown textarea | ~0 KB | No WYSIWYG; requires separate renderer; harder to style on-brand |

**Extensions to install (all tree-shaken from `@tiptap/starter-kit` or separate packages):**
- Bold, Italic, Underline (`@tiptap/extension-underline`)
- Heading levels 1–3
- BulletList, OrderedList, ListItem
- TaskList, TaskItem (`@tiptap/extension-task-list`, `@tiptap/extension-task-item`)
- Code, CodeBlock
- Link (`@tiptap/extension-link`)
- HardBreak (Shift+Enter)
- History (undo/redo)

**What not to install in v1:** Image, Table, Mention, Collaboration. Keep the bundle small.

#### Storage Format
Tiptap outputs a ProseMirror JSON document. Store it as a JSON string in `note.content`. After every save, extract `.contentPlainText` using Tiptap's built-in `.getText()` method. This plain text is used for search, preview cards, and task extraction.

Do not store HTML. HTML is fragile to re-parse and harder to query.

#### Toolbar Design
A floating formatting toolbar appears when text is selected (bubble menu), plus a fixed minimal toolbar at the top of the editor:

**Fixed toolbar icons (left to right):**
`B | I | U | H1 | H2 | • | 1. | ☑ | </> | 🔗 | ↩ | ↪`

All icons use `react-icons/md` equivalents. The toolbar uses the same thick border and background as the note card. No rounded pill styling.

#### Visual Consistency
- Editor area: same background color as the note, no separate white box.
- Cursor and selection colors: respect dark mode.
- Checklist items: bold checkbox squares (CSS `appearance: none` with a drawn border matching the note border style).
- Code blocks: monospace font, slightly darker tint of the note's color.
- Links: underlined, same color as the note text; open in new tab.

#### Acceptance Criteria
- [ ] All listed formatting tools work and persist across reload.
- [ ] Formatted content renders correctly on NoteCard preview (capped at 3 lines, plain text only).
- [ ] Checklist items render with interactive checkboxes inside the modal.
- [ ] Clicking a checklist checkbox outside the modal (on the card) updates the task completion state.
- [ ] Undo/redo works within a session (not persisted across sessions — Tiptap history is in-memory only).
- [ ] Links open in a new tab.
- [ ] Code blocks render in monospace with correct background.

---

### 7.3 Folders & Smart Folders

#### Manual Folders
Users create named folders. Each folder has an optional color (from the note color palette) and optional icon (from a fixed set of ~12 react-icons options).

**Folder operations:**
- Create folder (name required; color and icon optional)
- Rename folder (inline double-click on folder name in sidebar)
- Delete folder — shows confirmation: "Delete folder? Notes inside will move to Inbox." Notes are not deleted.
- Reorder folders (drag handle; use CSS `cursor: grab` only — no drag library needed for simple list reorder)

**Moving a note to a folder:**
- From the NoteModal: a folder picker dropdown (select element styled on-brand) in the modal header.
- From the NoteCard: right-click context menu (v2) or a "move" icon in card footer.

#### Smart Folders

Smart folders are computed views, not real folders. They appear above manual folders in the sidebar under a "Smart" section header.

See the `SmartFolderDef` type and the 8 built-in definitions in [Section 4.5](#45-smart-folder-static-definitions-not-persisted).

Smart folder note counts update reactively with every state change. Performance: computing 8 filters over ≤5000 notes is fast enough to run synchronously in a `useMemo`. No debounce needed.

#### Sidebar Layout

```
┌─────────────────┐
│ ◼ NOTES   [≡]  │  ← sidebar header; [≡] = collapse
├─────────────────┤
│ Smart           │
│  All Notes  47  │
│  Pinned      3  │
│  Recent     12  │
│  Tasks       8  │
│  Overdue     1  │
│  Attachments 0  │
│  Web Clips   5  │
│  Archive     6  │
├─────────────────┤
│ Folders    [+]  │
│  Work       14  │
│  Personal    9  │
│  Ideas       3  │
├─────────────────┤
│  ⚙ Settings     │  ← bottom of sidebar
└─────────────────┘
```

Sidebar width: 220 px. Collapsible to 48 px (icon-only mode) on desktop. On mobile (< 768 px), sidebar becomes a bottom sheet triggered by a hamburger icon in the header. The note board takes full width when sidebar is collapsed.

#### Empty States

Every folder and smart folder must have an empty state. Empty state anatomy:
- Illustration: a simple SVG doodle consistent with the scrapbook style (a blank page, a pin, a magnifying glass). Draw these by hand as inline SVG, not from a library.
- Headline: short and direct. "No notes here yet."
- Sub-copy: action-oriented. "Click the card to start writing."
- Optional CTA button: "New Note" if the context allows creating one.

| Folder | Empty headline | Sub-copy |
|---|---|---|
| All Notes | "Your board is empty" | "Add your first note above." |
| Pinned | "Nothing pinned yet" | "Pin important notes to keep them up here." |
| Archived | "Archive is empty" | "Notes you archive will appear here." |
| Tasks | "No task notes" | "Add a checklist to any note to see it here." |
| Overdue | "All caught up" | "No overdue tasks. Nice." |
| Custom folder | "This folder is empty" | "Move notes here or create one." |

#### Acceptance Criteria
- [ ] User can create, rename, delete manual folders.
- [ ] Deleting a folder moves all its notes to Inbox (folderId: null), not the trash.
- [ ] Sidebar shows live note counts for every folder and smart folder.
- [ ] Selecting a folder/smart folder filters the board instantly.
- [ ] Sidebar collapses to icon rail on desktop; slides up as bottom sheet on mobile.
- [ ] Empty states render for all folders.
- [ ] Folder state persists across reload.

---

### 7.4 Attachments

#### v1 Decision: No Attachments
Attachments require IndexedDB to be safe. Do not add attachments in v1 — the `attachments: []` field is reserved in the data model but unused.

#### v2 Attachment Approach

**What can be attached:**
| Type | Storage | Limit |
|---|---|---|
| Image (JPG, PNG, WebP, GIF) | base64 in IndexedDB blob store | 5 MB per file |
| PDF | IndexedDB blob store (ArrayBuffer) | 10 MB per file |
| Link | URL string in note JSON | N/A |
| Other file (v2 later) | IndexedDB blob store | 10 MB per file |

**localStorage is NOT used for file storage.** All binary data goes into IndexedDB. The `attachment.indexedDbKey` field links the note JSON (stored in IndexedDB `notes` store) to the binary (`blobs` store).

**For images ≤ 100 KB:** Also store a base64 thumbnail (200×200 max) in the `attachment.dataUrl` field on the note object for card preview rendering, avoiding a separate IndexedDB lookup on the grid view.

**Attachment UI:**

In NoteCard (grid view):
- If note has image attachments: show a horizontal strip of up to 3 image thumbnails at the bottom of the card (40×40 px each), bordered with the note's border style.
- If note has non-image attachments: show a pill badge: "📎 2 files".
- If note has links: show a link preview pill with the domain name and favicon.

In NoteModal (editor view):
- `AttachmentBar` renders below the editor.
- Each attachment shows as a tile: thumbnail (for images) or file-type icon (for PDFs/files) + filename + size + delete (×) button.
- A "+ Add" button opens the system file picker. Also accepts drag-and-drop onto the modal.
- For links: a separate "Add Link" input (text field + "Attach" button) that saves as a `link` type attachment.

**Link attachment metadata extraction:**
Fetch the URL via a CORS proxy (or try a direct fetch — many public URLs allow it). Parse `og:title`, `og:description`, `og:image`, and the page `<title>`. If the fetch fails (CORS), fall back to saving just the URL with the domain as the title. Do not block the save on the fetch.

Recommended CORS proxy for v2: `https://corsproxy.io/?` (free, no API key). This is an external dependency — document the risk.

**v2 IndexedDB storage for attachments:**
```
blobs store:
  key: attachment.id (same as attachment.indexedDbKey)
  value: ArrayBuffer (for images/PDFs) or null (for links)
```

**Future upgrade path:**
When a backend is added, migrate blobs from IndexedDB to S3/Cloudflare R2 object storage. The `attachment.url` field is pre-designed for this.

#### Acceptance Criteria (v2)
- [ ] User can attach images and PDFs via file picker or drag-and-drop in modal.
- [ ] Image thumbnails appear on NoteCard.
- [ ] File type icons and filename appear for non-image files.
- [ ] Deleting an attachment removes it from both note JSON and IndexedDB blob store.
- [ ] Link attachments save URL + extracted metadata (title, domain, og:image if available).
- [ ] Total attachment storage per note is enforced at 50 MB with a user-visible error if exceeded.
- [ ] Attachments persist across reload.

---

### 7.5 Web Clipper / Save From Browser

#### v1: In-App "Save Link" Workflow

A "New Clip" button in the NoteBoard toolbar (distinct from "New Note"). Opens a small inline form:
```
[ Paste a URL here... ] [ Clip It ]
```

On submit:
1. Attempt to fetch OG metadata (title, description, og:image, domain) via CORS proxy.
2. Create a new note with:
   - `title`: og:title or page title or domain
   - `content`: Tiptap document containing the URL as a link, plus og:description as a paragraph
   - `clippedFrom`: the `ClipSource` object
   - `tags`: `["clip"]` auto-applied
   - `randomBackgroundColor`: a fixed "clip" color (e.g. `#98B7DB` — the blue from the existing palette)
3. Add note to state immediately (don't wait for fetch to succeed).
4. If fetch succeeds, update the note with richer metadata.

NoteCards from clips show a small "clipped from [domain]" tag in the footer.

#### Future: Browser Extension

A real browser extension (Manifest V3, Chrome + Firefox) is a separate project. Architecture plan:

**Extension UI:**
- Clicking the toolbar icon opens a popup with:
  - Note title (pre-filled from page title)
  - Excerpt (pre-filled from selected text, if any)
  - Folder picker (fetched from extension storage mirror)
  - Tags input
  - "Save to Notes" button

**Extension → App communication:**
- Extension writes the clip data to `chrome.storage.local`.
- When the app is opened in a tab, it reads `chrome.storage.local` on focus and imports any pending clips.
- OR: the extension opens the Notes App tab and passes clip data via URL query params (simpler, v2 extension).

**What metadata the extension saves:**
```ts
{
  url: string,
  title: string,
  selectedText: string | null,
  fullPageText: string | null,   // only if user chose "Save Full Page"
  screenshot: string | null,     // base64, only if user chose "Save Screenshot"
  ogImage: string | null,
  domain: string,
  savedDate: string,
  faviconUrl: string | null
}
```

**Browser extension scope:** Separate repository. Do not include in the main React app build.

#### Acceptance Criteria (v1 in-app)
- [ ] "New Clip" button opens URL input form.
- [ ] Pasting a URL and submitting creates a note immediately.
- [ ] Note title populated from page OG title or domain.
- [ ] Note body contains the URL as a clickable link.
- [ ] Clip notes show a "clipped from" domain badge on the card.
- [ ] If OG fetch fails, note is still created with the bare URL.

---

### 7.6 Advanced Search & OCR

#### v2 Search Upgrade

**Search index fields (searched in priority order):**
1. `title` — exact match boosted
2. `contentPlainText` — full text
3. `tags[]`
4. `attachments[].name`
5. `clippedFrom.url`, `clippedFrom.title`, `clippedFrom.domain`
6. `tasks[].label`

**Search implementation:** Simple substring match with scoring in v2 (no full-text search library needed at this scale). Score each note:
- `+10` if title contains query
- `+5` if tag matches query exactly
- `+3` if content contains query
- `+1` if attachment name or clip source contains query

Sort results by score descending. Implement in a `useSearch` hook using `useMemo` over the notes array.

**Do not use Fuse.js** — its fuzzy matching produces confusing results on short notes and adds 24 KB. Substring match is more predictable for this use case.

**Filters (rendered as chips below the search bar when search is active):**

| Filter | Type | Values |
|---|---|---|
| Folder | select | All + each folder |
| Tag | multi-select chips | All user-defined tags |
| Has tasks | toggle | yes/no |
| Has attachments | toggle | yes/no |
| Date range | two date inputs | Created/updated from–to |
| Sort by | select | Newest first / Oldest first / A–Z / Z–A |

Filters are ephemeral (not persisted). Reset on page reload.

**Search Result Highlighting:**
Wrap matched substrings in `<mark>` elements. Apply a CSS style:
```css
mark {
  background-color: #F7D44C; /* the yellow from the note palette */
  color: inherit;
  border-radius: 2px;
  padding: 0 2px;
}
.dark-mode mark {
  background-color: #a88f00;
}
```

A utility function `highlightText(text, query)` returns a React node array with `<mark>` elements interleaved. Apply to card title and body preview only (not inside the Tiptap editor).

#### OCR Plan

**v1:** No OCR. Search attachment names and manually entered metadata only.

**v2 (in-browser OCR with Tesseract.js):**
- Library: `tesseract.js` (~3 MB WASM, loaded lazily only when an image attachment is added).
- Trigger: When an image is attached to a note, queue it for OCR in a Web Worker.
- Output: Store the OCR text in `attachment.ocrText`.
- Include `ocrText` in the search index.
- Show a "Processing..." badge on the attachment thumb while OCR is running.

**Why not server-side OCR in v2:**
- No backend in v2. Tesseract.js in-browser is the only option without a server.
- The WASM bundle is large but only loads when the feature is used.
- Accuracy is acceptable for printed text; handwriting will be poor (document this limitation).

**Why not defer OCR entirely:**
- Once attachments are in, users expect to find text inside images. OCR is the feature that makes attachments genuinely useful for search.
- Tesseract.js is well-maintained and runs in a Worker without blocking the UI.

**Future (server-side OCR):**
- AWS Textract or Google Vision API for PDF OCR and handwriting recognition.
- Requires a backend. Fits naturally into the Future phase.

#### Acceptance Criteria (v2)
- [ ] Search matches title, body, tags, attachment names, clip source metadata.
- [ ] Filter chips appear below the search bar when search is active.
- [ ] Each filter narrows the result set correctly.
- [ ] Matched text in card title and body preview is highlighted in yellow.
- [ ] Highlighting does not break with special characters in the query.
- [ ] Image attachment OCR text is indexed after processing completes.
- [ ] OCR "Processing..." badge renders while Tesseract.js is running.

---

### 7.7 Tasks & Reminders

#### Tasks

Tasks are implemented as Tiptap checklist items (`TaskList` + `TaskItem` extensions). There is no separate "task UI" outside the editor.

**Extraction for smart folders and badges:**
After every note save, parse the Tiptap JSON and extract all `taskItem` nodes into `note.tasks[]`. This extraction runs synchronously in the `UPDATE_NOTE` reducer. A utility `extractTasksFromTiptap(doc: TiptapJSON): Task[]` handles this.

**NoteCard badges:**
- If `note.tasks.length > 0`: show a small badge in the card footer: `☑ 3/5` (completed/total).
- If any task is overdue: badge turns red.

**Due dates:**
- Per-note due date (not per-task in v1): a date-only input in the NoteModal header.
- Rendered on the card as a pill: `📅 Jun 15`. Red if past due and note has incomplete tasks.
- Individual per-task due dates: v2, rendered as tooltip on each task row.

**Task states:**
| State | Condition |
|---|---|
| Incomplete | `isComplete: false` and (`dueDate` is null or `dueDate` >= today) |
| Complete | `isComplete: true` |
| Overdue | `isComplete: false` and `dueDate` < today |

#### Reminders

**v1: Store only — do not fire.**
The `reminderDate` field is saved with the note. No notification fires in v1. The field is surfaced as a display-only date picker in the NoteModal labeled "Remind me on."

**Why not fire in v1:**
The Web Notifications API requires `Notification.requestPermission()`, which triggers a browser permission prompt. Firing reminders from a tab requires the tab to be open, which makes it unreliable. A service worker is needed for background reminders, which adds significant complexity.

**v2: Service worker polling.**
- Register a service worker that wakes up periodically (every 15 minutes via `setInterval` in the service worker).
- Check `reminderDate` on all notes in IndexedDB.
- If `reminderDate <= now` and the reminder has not been fired (`reminderFired: false`): fire a `showNotification()` with the note title.
- Set `reminderFired: true` on the note after firing.
- Requires a browser notification permission grant (prompt shown to the user once on first reminder set, not on app load).

**Local notification limitations (document these in the UI):**
- Reminders only fire when the browser is open (service worker) or when the tab is active (v1).
- If the browser is closed at the reminder time, the notification fires the next time the browser opens and the service worker activates.
- iOS Safari does not support Web Push in PWA mode as of 2025 (iOS 16.4+ supports it, but only for home screen installed PWAs).
- No email or SMS fallback in v1 or v2 (requires a backend).

**Reminder UI in the NoteModal:**
```
[Remind me on]  [ Jun 20, 2026 ▾ ]  [Remove]
```
- If a reminder is set, show it in the card footer as a small bell icon + date.
- If the reminder is in the past and `reminderFired: false`, show it as a red bell.

#### Acceptance Criteria (v1)
- [ ] Adding a checklist item in the editor saves it as a task in `note.tasks[]`.
- [ ] NoteCard shows task count badge when tasks exist.
- [ ] Overdue badge renders in red when any task is past due.
- [ ] Due date picker in modal saves `note.dueDate`.
- [ ] Reminder date picker saves `note.reminderDate` (stored; not yet fired).
- [ ] Tasks smart folder shows all notes with at least one task.
- [ ] Overdue smart folder shows notes with at least one incomplete overdue task.

---

## 8. Design System Additions

### Color Palette (extended)

Existing:
```
Green:   #A8D672
Blue:    #98B7DB
Orange:  #EB7A53
Yellow:  #F7D44C
Sage:    #B5C99A
Cream:   #f6ecc9  (add-note card)
```

New:
```
Purple:  #C9AEDE  (for variety; 6th note color)
Pink:    #F5A0B5  (7th note color)
Clip:    #98B7DB  (alias of blue; reserved for web clip notes)

Background (light): rgb(220, 216, 211)  — unchanged
Background (dark):  #1a1a1e             — richer than #202124; less grey, more inky
Surface (dark):     #2a2a30             — note cards in dark mode
Border (dark):      #e8e8e8             — slightly warm white, not pure #fff
```

### Typography (no new fonts)

Existing font stack: Archivo Black (headings), Work Sans (UI), Mulish (body text), Noto Sans (metadata). All remain.

New uses:
- Folder names in sidebar: Work Sans 600
- Tag chips: Mulish, small size (0.75rem)
- Attachment filename: Noto Sans
- Due date badge: Noto Sans, monospace fallback for date

### Shadow Scale (replace the single-value shadow with a 3-level scale)

```css
--shadow-sm:  4px 8px 12px -2px rgba(0,0,0,0.18);   /* search bar, toolbar */
--shadow-md: 11px 24px 27px -1px rgba(0,0,0,0.22);   /* note cards (current value, formalized) */
--shadow-lg: 14px 32px 40px -2px rgba(0,0,0,0.30);   /* modal overlay */
```

Dark mode shadows use pure black (`rgba(0,0,0,...)`) at slightly higher opacity since the dark background makes shadows invisible at lower opacity.

### Spacing & Border Scale

```css
--border-width: 3px;        /* all card borders — unchanged */
--border-radius-sm: 3px;    /* buttons, search, small UI */
--border-radius-md: 5px;    /* cards — unchanged */
--border-radius-lg: 8px;    /* modal */
--space-xs: 0.25rem;
--space-sm: 0.5rem;
--space-md: 1rem;
--space-lg: 1.5rem;
--space-xl: 2rem;
```

### Dark Mode Design (v1 upgrade)

Current dark mode is only `background-color: #202124` and `border-color: whitesmoke`. Every element needs an explicit dark-mode rule:

| Element | Light | Dark |
|---|---|---|
| Body background | `rgb(220,216,211)` | `#1a1a1e` |
| Note card background | (color from palette) | 20% darkened version of palette color |
| Note card border | `#000` | `#e8e8e8` |
| Card shadow | `rgba(150,150,150,0.69)` | `rgba(0,0,0,0.55)` |
| Title (`h1`) stroke | black | `#e8e8e8` |
| Title (`h1`) color | `#d6742b` | `#e8843b` (slightly lighter for dark bg) |
| Search bar bg | `rgb(233,233,233)` | `#2a2a30` |
| Search bar border | black | `#e8e8e8` |
| Add-note card bg | `#f6ecc9` | `#2e2c24` (warm dark cream) |
| Save button | bg `whitesmoke`, border black | bg `#3a3a3a`, border `#e8e8e8` |
| Sidebar bg (v2) | `#f0ede8` | `#141418` |
| Modal bg | (note color) | (darkened note color) |

**To darken palette colors for dark mode cards:** Apply `filter: brightness(0.65) saturate(0.9)` in CSS on `.dark-mode .note`. This preserves the hue while making it readable on a dark background. Test all 7 colors.

### Icon Usage (react-icons/md)

| Action | Icon |
|---|---|
| Delete | `MdDeleteForever` (existing) |
| Edit | `MdEdit` |
| Pin | `MdPushPin` / `MdOutlinePushPin` |
| Archive | `MdArchive` / `MdUnarchive` |
| Search | `MdSearch` (existing) |
| Add note | `MdAdd` |
| Add clip | `MdBookmark` |
| Folder | `MdFolder` / `MdFolderOpen` |
| Tag | `MdLabel` |
| Task done | `MdCheckBox` |
| Task not done | `MdCheckBoxOutlineBlank` |
| Attachment | `MdAttachFile` |
| Link | `MdLink` |
| Due date | `MdCalendarToday` |
| Reminder | `MdNotifications` |
| Overdue | `MdNotificationImportant` |
| Close/cancel | `MdClose` |
| Settings | `MdSettings` |
| Dark mode moon | (existing SVG — keep) |
| Light mode sun | (existing SVG — keep) |

---

## 9. UI/UX Layout Plan

### v1: Board-Only Layout (no sidebar)

```
┌──────────────────────────────────────────────────┐
│  NOTES                            [🌙]           │  ← header (unchanged style)
├──────────────────────────────────────────────────┤
│  [🔍 type to search...          ] [⊕ Clip]       │  ← search row + clip button
│  [All ▾] [Pinned] [#tag1] [#tag2]  Sort [▾]     │  ← filter/sort chip row
├──────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │ + New  │ │ Note 1 │ │ Note 2 │ │ Note 3 │     │  ← grid (auto-fit 250px)
│ │        │ │        │ │        │ │        │     │
│ │ [Save] │ │ footer │ │ footer │ │ footer │     │
│ └────────┘ └────────┘ └────────┘ └────────┘     │
└──────────────────────────────────────────────────┘
```

### v1 NoteCard anatomy

```
┌────────────────────────┐  ← 3px solid black border
│ 📌  Note Title         │  ← pin icon (if pinned), title in Work Sans 600
│                        │
│ Body preview text here │  ← first 3 lines of plain text, Mulish
│ clipped from google.com│  ← clip badge (if applicable)
│ ☑ 2/3  #tag  #tag2    │  ← task badge + tag chips
├────────────────────────┤
│ Jun 7  edited 2h ago 🗑│  ← date | edited indicator | delete icon
└────────────────────────┘
```

### v1 NoteModal

```
┌──────────────────────────────────────┐  ← full-screen overlay, z-index 100
│ [note color band across the top]     │
│  Title input  ─────────────────  [×] │  ← close button
├──────────────────────────────────────┤
│ [B][I][U][H1][H2][•][1.][☑][</>][🔗]│  ← formatting toolbar
│                                      │
│  Rich text editor area               │
│  (min-height 50vh, scrolls)          │
│                                      │
├──────────────────────────────────────┤
│ 📅 Due: [Jun 20]   🔔 Remind: [──]  │
│ 📁 Folder: [Inbox ▾]                 │
│ 🏷 Tags: [work ×] [+add tag]         │
├──────────────────────────────────────┤
│ Attachments: (empty in v1)           │
├──────────────────────────────────────┤
│  [Cancel]              [Save Note →] │  ← footer with actions
└──────────────────────────────────────┘
```

### v2: Sidebar + Board Layout

```
┌───────────┬──────────────────────────────────────┐
│ ◼ NOTES   │  NOTES                         [🌙]  │
│           ├──────────────────────────────────────┤
│ Smart     │  [🔍 search...]           [⊕ Clip]   │
│  All  47  │  [All ▾] [Pinned] [#work]  Sort[▾]   │
│  Pinned 3 ├──────────────────────────────────────┤
│  Tasks  8 │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│           │ │+ New │ │Note 1│ │Note 2│ │Note 3││
│ Folders[+]│ │      │ │      │ │      │ │      ││
│  Work  14 │ └──────┘ └──────┘ └──────┘ └──────┘│
│  Ideas  3 │                                      │
│           │                                      │
│ ⚙         │                                      │
└───────────┴──────────────────────────────────────┘
```

Sidebar: 220 px fixed. Main area: flex-grows. On mobile: sidebar becomes a bottom sheet.

### Mobile Layout (< 768px)

- Header: "NOTES" title smaller (3rem), dark mode toggle stays.
- Search bar: full width below header.
- Filter chips: horizontally scrollable single row.
- Grid: single column (`minmax(100%, 1fr)`).
- Sidebar (v2): hidden by default; hamburger icon in header opens it as a bottom drawer (slides up from bottom, 70% screen height, with a drag handle).
- NoteModal: full screen (100vw, 100vh), no border radius.
- Formatting toolbar: horizontally scrollable on mobile.

---

## 10. Library Recommendations

| Library | Version | Purpose | Reasoning |
|---|---|---|---|
| `@tiptap/react` | ^2.x | Rich text editor core | React 18 compatible; ProseMirror-based; tree-shakeable |
| `@tiptap/starter-kit` | ^2.x | Basic formatting extensions | Bundles Bold, Italic, Heading, Lists, Code, History |
| `@tiptap/extension-underline` | ^2.x | Underline formatting | Not in starter-kit by default |
| `@tiptap/extension-task-list` | ^2.x | Checklist support | Required for tasks feature |
| `@tiptap/extension-task-item` | ^2.x | Individual task items | Paired with task-list |
| `@tiptap/extension-link` | ^2.x | Hyperlink support | Required for web clips |
| `idb` | ^8.x | IndexedDB wrapper | v2 only. 1 KB gzip. Well-maintained. |
| `date-fns` | ^3.x | Date formatting and comparison | Needed for overdue detection, relative dates, due date display. Tree-shakeable. Do not use `moment.js`. |
| `nanoid` | (existing) | ID generation | Already installed. |
| `react-icons` | (existing) | Icon set | Already installed. |

**Explicitly excluded:**
- `Fuse.js` — fuzzy search is confusing on short notes; substring match is better.
- `redux`, `zustand` in v1 — Context + useReducer is sufficient.
- `react-beautiful-dnd` — CSS drag handle for simple list reorder is enough.
- `Dexie.js` — heavier than `idb` with no benefit at this scale.
- `moment.js` — deprecated; use `date-fns`.
- `react-modal` — a portal-based modal is 30 lines of code; no library needed.
- `Quill` / `react-quill` — React 18 compatibility issues; Tiptap is better.

---

## 11. Accessibility

### v1 Baseline

- All interactive elements (buttons, icons) have `aria-label` attributes.
- The delete icon `MdDeleteForever` needs: `aria-label="Delete note"` and `role="button"` with `tabIndex={0}` and `onKeyDown` handling for Enter/Space.
- NoteModal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title input.
- Focus trap in NoteModal: when modal opens, focus moves to the title input. When closed, focus returns to the card that was clicked.
- Search input has `aria-label="Search notes"`.
- Color contrast: all text on note card colors must pass WCAG AA (4.5:1 for normal text). Check each palette color.
- Tiptap's editor is natively accessible (ProseMirror uses `contenteditable` with proper ARIA roles).

### v2 Additions

- Sidebar navigation: `<nav>` element with `aria-label="Note folders"`.
- Folder items: `role="treeitem"` inside `role="tree"`.
- Active folder: `aria-selected="true"`.
- Smart folder counts: `<span aria-label="47 notes">47</span>`.
- Keyboard navigation: `↑` / `↓` to move between folder items; `Enter` to select.
- Attachment thumbnails: `alt` text from `attachment.name`.
- Confirm delete dialog: `role="alertdialog"`, focus on the "Discard" button on open.

### Color Contrast Audit (required before v1 ship)

Run each note color through a contrast checker against black text (#000):
| Color | Hex | Contrast vs #000 | WCAG AA? |
|---|---|---|---|
| Green | #A8D672 | ~6.5:1 | Pass |
| Blue | #98B7DB | ~5.0:1 | Pass |
| Orange | #EB7A53 | ~3.4:1 | **Fail** — darken text or lighten color |
| Yellow | #F7D44C | ~8.3:1 | Pass |
| Sage | #B5C99A | ~6.2:1 | Pass |
| Cream | #f6ecc9 | ~10.2:1 | Pass |

Orange (#EB7A53) fails WCAG AA for normal-weight text. Fix: use `font-weight: 600` for all text on orange cards, which raises the effective contrast, or shift the orange to `#E86A40` (darker, still recognizable).

---

## 12. Testing Plan

### Unit Tests (Jest + React Testing Library — already set up)

| Test | What to verify |
|---|---|
| `migrateNote()` | Old shape → new shape; idempotent on already-migrated notes |
| `extractTasksFromTiptap()` | Correctly extracts task items from Tiptap JSON doc |
| `highlightText()` | Returns correct React node array; handles empty query; handles special chars |
| `useSearch()` | Returns correct filtered + scored notes; handles empty query; handles empty notes array |
| `useSmartFolders()` | Correct counts for pinned, archived, tasks, overdue |
| `notesReducer` | All action types; edge cases (delete nonexistent ID, update nonexistent ID) |
| Date utilities | `isPast()`, `formatRelative()` from date-fns |

### Integration Tests (React Testing Library)

| Test | Scenario |
|---|---|
| Add note | Fill title + body in AddNoteCard → Save → note appears in grid |
| Edit note | Click card → modal opens pre-filled → edit → Save → card updates |
| Cancel edit | Open modal → edit → press Escape → confirmation prompt → Discard → modal closes, card unchanged |
| Delete note | Click delete icon → confirmation → Confirm → note removed from grid |
| Search | Type query → only matching cards visible; clear → all cards visible |
| Dark mode | Toggle → dark-mode class on root; persists on reload |
| Pin note | Pin a note → it moves to top of grid; unpinning reverses |
| Archive note | Archive → note disappears from All Notes; appears in Archive smart folder |
| Folder assignment | Assign note to folder → selecting folder in sidebar shows only that note |
| Tag filter | Add tag to note → filter by tag → only tagged notes visible |

### Snapshot Tests
Skip. Snapshot tests break on every UI tweak and provide low signal for a UI-heavy app.

### Manual QA Checklist (before each phase release)
- [ ] localStorage round-trip: add note, reload, verify all fields present.
- [ ] Migration: seed old-format notes into localStorage, reload, verify migration ran.
- [ ] All 7 note colors render correctly in light and dark mode.
- [ ] NoteModal opens and closes without scroll-locking the background.
- [ ] Keyboard navigation through the board and modal.
- [ ] Mobile layout at 375px width (iPhone SE).
- [ ] No console errors in production build.

---

## 13. Edge Cases

| Scenario | Handling |
|---|---|
| User saves a note with no title | Auto-title as "Untitled" + sequence number (e.g., "Untitled 3") |
| User saves a note with no body | Allow. Empty body is valid for a title-only bookmark. |
| localStorage quota exceeded | Catch `QuotaExceededError` in the `useEffect` storage write; show a toast: "Storage full. Delete some notes or export your data." |
| IndexedDB not supported (old browser) | Gracefully fall back to localStorage with a warning banner. |
| Note content is very long (100K+ chars) | Tiptap handles it; card preview truncated to 3 lines. No artificial limit imposed. |
| Deleting a folder with notes inside | Modal: "Move [n] notes to Inbox, then delete?" Notes never silently deleted. |
| Circular tag filter | Tags are plain strings; no hierarchy; no circular risk. |
| OG metadata fetch fails | Note is created with bare URL as title. No retry; no blocking. |
| CORS proxy is down | Same fallback as above; the CORS proxy failure is caught and swallowed. |
| Two tabs open simultaneously | Both tabs write to localStorage independently → last-write-wins. For v1 this is acceptable. For v2 IndexedDB, use a `versionchange` event handler to alert the user to reload. |
| User imports a note with a duplicate ID | Detect collision on import; generate a new `nanoid()` for the duplicate. |
| Checklist item with no text | Filter out empty task items during `extractTasksFromTiptap()`. |
| Reminder date in the past when app loads | Show as overdue in the bell icon; do not re-fire the notification. |
| Very large base64 image (> 5 MB) | Reject at file-picker stage with a user-visible error before writing to IndexedDB. |
| User renames a tag used on many notes | Tags are stored as strings on each note. A "rename tag" operation must iterate all notes and replace the tag string. Confirm before applying. |
| Dark mode toggle during modal open | Modal background color tint must respond to dark mode toggle without closing. |

---

## 14. Risks & Tradeoffs

### Risk 1: Tiptap JSON migration is one-way
**Risk:** Once notes are stored as Tiptap JSON, reverting to plain text requires a migration.
**Mitigation:** Always maintain `contentPlainText` as a denormalized field. If Tiptap is ever removed, this field is the fallback.

### Risk 2: IndexedDB migration loses data if interrupted
**Risk:** If the user closes the tab mid-migration from localStorage → IndexedDB, partial data is written.
**Mitigation:** Write all notes to IndexedDB first, verify the count matches, then delete the localStorage key. Use an IndexedDB transaction so the write is atomic.

### Risk 3: CORS proxy dependency for web clips
**Risk:** `corsproxy.io` is a free third-party service that can go down or block the domain.
**Mitigation:** Wrap the fetch in a try/catch; always fall back to the bare URL. Document the dependency. In future: self-host a proxy function on Cloudflare Workers (free tier).

### Risk 4: Tiptap bundle size
**Risk:** `@tiptap/starter-kit` adds ~38 KB gzip. With all extensions, total could reach ~55 KB.
**Mitigation:** Audit `bundle-analyzer` output after adding Tiptap. Code-split the editor: lazy-load it only when a note modal is opened (`React.lazy` + `Suspense`). This keeps the initial board load fast.

### Risk 5: Tesseract.js WASM is very large (~3 MB)
**Risk:** Users who attach images will download a 3 MB WASM file.
**Mitigation:** Load Tesseract.js lazily only on first image attachment. Show a loading indicator. Warn users on slow connections. Consider making OCR opt-in per attachment ("Run text recognition?").

### Risk 6: localStorage quota with rich text
**Risk:** Tiptap JSON is more verbose than plain text. 100 notes with formatting could approach the 5 MB limit.
**Mitigation:** Monitor stored size. Add a storage usage indicator in settings. Migrate to IndexedDB before v2 features are shipped.

### Risk 7: Color accessibility on orange cards
**Risk:** Documented in Section 11. Orange (#EB7A53) fails WCAG AA.
**Mitigation:** Either darken the color to `#E86A40` or add a CSS rule forcing bold text on orange cards.

### Risk 8: No backend means no cross-device sync
**Risk:** Users expect notes to sync across devices in 2026.
**Mitigation:** Be explicit in the app UI: "Your notes are stored locally." For v1 and v2, offer a manual export/import (JSON download). Frame a backend/sync feature as a future phase in the product roadmap.

---

## 15. Acceptance Criteria

### v1 Ship Criteria

**Must pass all of the following before v1 is considered done:**

- [ ] Existing notes data migrates without loss when the upgraded app loads for the first time.
- [ ] Notes can be added, edited, and deleted.
- [ ] Editing a note updates `updatedDate` and shows an "edited" indicator on the card.
- [ ] Canceling an edit with unsaved changes shows a confirmation prompt (no browser `confirm()`).
- [ ] Rich text formatting (bold, italic, underline, headings, lists, checklist, code, links) works and persists.
- [ ] Adding a checklist item creates a task in `note.tasks[]`.
- [ ] Task count badge renders on NoteCard.
- [ ] Overdue task badge renders in red.
- [ ] Due date field saves and displays on NoteCard.
- [ ] Reminder date field saves (not yet fired).
- [ ] Tag input saves tags; tag chips render on NoteCard.
- [ ] Filter chips filter the board by tag.
- [ ] Pinning a note promotes it to the top of the grid.
- [ ] Archiving a note removes it from the main grid.
- [ ] "New Clip" saves a note from a pasted URL.
- [ ] Clip notes show a "clipped from [domain]" badge.
- [ ] Dark mode is visually polished (all elements have explicit dark-mode styles).
- [ ] Search still works against `contentPlainText`.
- [ ] All 7 note colors render correctly in both modes.
- [ ] No WCAG AA failures on any note color.
- [ ] All interactive elements have `aria-label` or visible label.
- [ ] Focus trap works in NoteModal.
- [ ] App is functional at 375px viewport width.
- [ ] No console errors in production build (`npm run build`).
- [ ] localStorage migration is idempotent (running it twice does not corrupt data).

### v2 Ship Criteria (additive)

- [ ] Sidebar renders with smart folders and manual folders.
- [ ] Sidebar note counts are accurate and update reactively.
- [ ] Manual folders can be created, renamed, and deleted.
- [ ] Deleting a folder moves notes to Inbox, not trash.
- [ ] Notes can be moved between folders.
- [ ] Image and PDF attachments can be added to notes via file picker or drag-and-drop.
- [ ] Image thumbnails render on NoteCard.
- [ ] Link attachments save URL + OG metadata.
- [ ] All attachment data persists in IndexedDB across reload.
- [ ] Search matches tags, attachment names, and clip metadata.
- [ ] Filter chips (folder, tag, has tasks, date range) narrow search results correctly.
- [ ] Matched text is highlighted in the card title and body preview.
- [ ] Image OCR runs in a Web Worker after attachment; `attachment.ocrText` is populated.
- [ ] OCR text is included in search index.
- [ ] IndexedDB migration from localStorage runs once, is atomic, and does not run again.
- [ ] Sidebar collapses to icon rail on desktop.
- [ ] Sidebar opens as a bottom sheet on mobile.

---

*End of plan. No implementation code has been written. All decisions documented above are sufficient for an engineer to proceed to implementation without further product or architecture input.*
