const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Returns a keydown handler that traps Tab/Shift+Tab focus inside `containerRef`.
 */
export function createFocusTrapHandler(containerRef) {
  return function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    if (!containerRef.current) return;

    const focusable = Array.from(containerRef.current.querySelectorAll(FOCUSABLE))
      .filter((el) => !el.closest('[aria-hidden="true"]'));

    if (focusable.length === 0) { e.preventDefault(); return; }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}
