import { useEffect } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * Handles global keyboard events for app actions
 */
function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Escape handling support:
      // if a higher-priority capture listener handled Escape and prevented default,
      // skip all shortcut actions in this global handler.
      if (event.defaultPrevented) return;
      // Ignore if user is typing in an input
      const isInputFocused =
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable;

      if (isInputFocused) return;

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        const matches =
          shortcut.key === key &&
          (shortcut.ctrl === undefined || shortcut.ctrl === ctrl) &&
          (shortcut.shift === undefined || shortcut.shift === shift) &&
          (shortcut.alt === undefined || shortcut.alt === alt);

        if (matches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

export default useKeyboardShortcuts;
