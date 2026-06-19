import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { useAppContext } from '../../context/AppContext';

vi.mock('../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

vi.mock('../../hooks/useSmartFolders', () => ({
  useSmartFolders: () => ({
    all: 2,
    pinned: 0,
    tasks: 0,
    clips: 0,
    overdue: 0,
    archived: 0,
  }),
  useFolderCounts: () => ({
    'folder-work': 2,
  }),
}));

const contextFns = {
  setFilter: vi.fn(),
  setSetting: vi.fn(),
  addFolder: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
};

function setTabletViewport() {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('max-width: 900px'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderSidebar(overrides = {}) {
  const state = {
    notes: [],
    folders: [
      {
        id: 'folder-work',
        name: 'Work',
        color: '#98B7DB',
      },
    ],
    activeFilter: 'all',
    settings: {
      sidebarCollapsed: false,
    },
    ...overrides.state,
  };

  useAppContext.mockReturnValue({
    state,
    backgroundColorList: ['#98B7DB', '#F7D44C'],
    ...contextFns,
    ...overrides.context,
  });

  return render(<Sidebar mobileOpen={false} onMobileClose={vi.fn()} />);
}

describe('Sidebar collapsed folder flyout', () => {
  beforeEach(() => {
    setTabletViewport();
    Object.values(contextFns).forEach((fn) => fn.mockClear());
  });

  it('opens the folder flyout from the collapsed rail', () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /open folders/i }));

    expect(screen.getByRole('dialog', { name: /folders/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Folder: Work')).toBeInTheDocument();
  });

  it('selects a folder from the flyout', () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /open folders/i }));
    fireEvent.click(screen.getByLabelText('Folder: Work'));

    expect(contextFns.setFilter).toHaveBeenCalledWith('folder:folder-work');
  });

  it('adds a folder from collapsed mode without using the clipped rail', () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /open folders/i }));
    fireEvent.click(screen.getByRole('button', { name: /add folder/i }));
    fireEvent.change(screen.getByLabelText(/new folder name/i), {
      target: { value: 'Ideas' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    expect(contextFns.addFolder).toHaveBeenCalledWith({
      name: 'Ideas',
      color: null,
    });
  });

  it('closes the folder flyout with Escape', async () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /open folders/i }));
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /folders/i })).not.toBeInTheDocument();
    });
  });
});
