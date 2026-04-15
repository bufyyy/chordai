import { useEffect, useRef, useState, useMemo } from 'react';
import modelService from '../services/modelService';
import useStore from '../store/useStore';
import { CHORD_PICKER_OPEN_ATTR } from '../constants/ui';

function chordDisplayRoot(display) {
  return modelService.getRootFromDisplay(display) || '?';
}

function ChordPicker({ onSelect, onCancel, mode = 'replace' }) {
  const [filter, setFilter] = useState('');
  const rootRef = useRef(null);
  const setChordPickerOpen = useStore((state) => state.setChordPickerOpen);

  const allChords = modelService.chords || [];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allChords;
    return allChords.filter((c) =>
      modelService.formatChordForDisplay(c).toLowerCase().includes(q)
    );
  }, [allChords, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((raw) => {
      const display = modelService.formatChordForDisplay(raw);
      const root = chordDisplayRoot(display);
      if (!map.has(root)) map.set(root, []);
      map.get(root).push({ raw, display });
    });
    const roots = Array.from(map.keys()).sort((a, b) => {
      if (a === '?') return 1;
      if (b === '?') return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    return roots.map((root) => ({ root, items: map.get(root) }));
  }, [filtered]);

  useEffect(() => {
    rootRef.current?.querySelector('input')?.focus();
  }, []);

  useEffect(() => {
    // Escape handling layer 1:
    // capture-phase listener + stopImmediatePropagation avoids app-level Escape shortcut collisions.
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [onCancel]);

  useEffect(() => {
    // Escape handling layer 2:
    // expose picker-open state so app keyboard shortcuts can stay in React/Zustand state.
    setChordPickerOpen(true);
    return () => setChordPickerOpen(false);
  }, [setChordPickerOpen]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onCancel]);

  return (
    <div
      ref={rootRef}
      {...{ [CHORD_PICKER_OPEN_ATTR]: 'true' }}
      className="absolute left-1/2 top-full z-40 mt-2 h-[min(65vh,28rem)] w-[min(calc(100vw-1.5rem),26rem)] -translate-x-1/2 flex flex-col rounded-xl bg-gray-900 border border-gray-700 p-4 shadow-2xl sm:h-[min(70vh,32rem)]"
      role="dialog"
      aria-label={mode === 'add' ? 'Add chord' : 'Replace chord'}
    >
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <span className="text-sm font-medium text-gray-300">
          {mode === 'add' ? 'Add chord' : 'Replace chord'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded"
        >
          Esc
        </button>
      </div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter chords…"
        className="input w-full text-base py-2.5 mb-3 shrink-0"
        autoComplete="off"
      />
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar text-left pr-1">
        {grouped.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No matching chords.</p>
        ) : (
          grouped.map(({ root, items }) => (
            <div key={root} className="mb-4 last:mb-0">
              <div className="text-xs uppercase tracking-wide text-purple-400 font-semibold mb-2 py-1 sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
                {root}
              </div>
              <ul className="space-y-1">
                {items.map(({ raw, display }) => (
                  <li key={raw}>
                    <button
                      type="button"
                      onClick={() => onSelect(raw)}
                      data-testid={`chord-picker-item-${raw}`}
                      aria-label={display}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-gray-100 hover:bg-white/10 active:bg-white/15"
                    >
                      {modelService.formatDisplayChordWithSymbols(display)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChordPicker;
