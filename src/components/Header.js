import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MdSearch, MdMenu } from 'react-icons/md';
import { useAppContext } from '../context/AppContext';

const SunIcon = () => (
  <svg width="1.8rem" height="1.8rem" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="5.75" fill="currentColor" />
    <circle cx="3.09" cy="6.86" r="1.71" transform="rotate(-60 3.09 6.86)" fill="currentColor" />
    <circle cx="3.09" cy="17.14" r="1.71" transform="rotate(-120 3.09 17.14)" fill="currentColor" />
    <circle cx="12" cy="22.29" r="1.71" fill="currentColor" />
    <circle cx="20.91" cy="17.14" r="1.71" transform="rotate(-60 20.91 17.14)" fill="currentColor" />
    <circle cx="20.91" cy="6.86" r="1.71" transform="rotate(-120 20.91 6.86)" fill="currentColor" />
    <circle cx="12" cy="1.71" r="1.71" fill="currentColor" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1.8rem" height="1.8rem" viewBox="0 0 50 50" aria-hidden="true">
    <path
      d="M 43.81 29.354 C 43.688 28.958 43.413 28.626 43.046 28.432 C 42.679 28.238 42.251 28.198 41.854 28.321 C 36.161 29.886 30.067 28.272 25.894 24.096 C 21.722 19.92 20.113 13.824 21.683 8.133 C 21.848 7.582 21.697 6.985 21.29 6.578 C 20.884 6.172 20.287 6.022 19.736 6.187 C 10.659 8.728 4.691 17.389 5.55 26.776 C 6.408 36.163 13.847 43.598 23.235 44.451 C 32.622 45.304 41.28 39.332 43.816 30.253 C 43.902 29.96 43.9 29.647 43.81 29.354 Z"
      fill="currentColor"
    />
  </svg>
);

function ThemeWash({ burst, onDone }) {
  useEffect(() => {
    if (!burst) return undefined;
    const timeout = window.setTimeout(onDone, 620);
    return () => window.clearTimeout(timeout);
  }, [burst, onDone]);

  if (!burst || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="theme-wash"
      aria-hidden="true"
      style={{
        backgroundColor: burst.color,
        '--theme-wash-x': `${burst.x}px`,
        '--theme-wash-y': `${burst.y}px`,
      }}
      initial={{
        clipPath: `circle(0px at ${burst.x}px ${burst.y}px)`,
        opacity: 0.72,
      }}
      animate={{
        clipPath: `circle(150vmax at ${burst.x}px ${burst.y}px)`,
        opacity: 0,
      }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    />,
    document.body
  );
}

export default function Header({ onMenuClick }) {
  const { state, setSearch, setSetting } = useAppContext();
  const { darkMode } = state.settings;
  const { searchText } = state;
  const reduceMotion = useReducedMotion();
  const [themeBurst, setThemeBurst] = useState(null);

  function handleThemeToggle(e) {
    const nextDarkMode = !darkMode;
    const rect = e.currentTarget.getBoundingClientRect();

    if (!reduceMotion) {
      setThemeBurst({
        id: Date.now(),
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        color: nextDarkMode ? '#1a1a1e' : '#dcd8d3',
      });
    }

    setSetting({ darkMode: nextDarkMode });
  }

  return (
    <header className="header">
      {/* Hamburger — visible only on mobile */}
      <button
        type="button"
        className="header__menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <MdMenu size="1.5em" />
      </button>

      <h1 className="header__title">NOTES</h1>

      <div className="header__search">
        <MdSearch className="header__search-icon" size="1.2em" aria-hidden="true" />
        <input
          type="text"
          className="header__search-input"
          placeholder="type to search..."
          value={searchText}
          onChange={(e) => setSearch(e.target.value.toLowerCase())}
          aria-label="Search notes"
        />
      </div>

      <motion.button
        type="button"
        className="dark-mode-toggle"
        onClick={handleThemeToggle}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={darkMode}
        whileTap={{ scale: 0.88, rotate: darkMode ? -30 : 30 }}
        transition={{ duration: 0.16 }}
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </motion.button>

      <ThemeWash burst={themeBurst} onDone={() => setThemeBurst(null)} />
    </header>
  );
}
