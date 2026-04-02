# Changelog

## 2026-04-02
- Fixed playback so extended chord symbols (11th, add11, altered dominants, etc.) no longer fall back to a plain major triad.
  - `chordToMidi` now resolves chords via `@tonaljs/tonal` after the same `s` → `#` vocabulary normalization as the UI, plus manual fallbacks where Tonal has no symbol (e.g. `add11`, `madd11`, `mb9`).
  - Location: `client/src/services/audioEngine.js`

- Per-chord editing: click a chord card to replace it with any chord from the model vocabulary (filterable list, grouped by root).
  - Store action `replaceChord`; stale library `romanNumerals` cleared on edit so notation stays consistent.
  - Added `displayToRawToken` on `modelService` for display ↔ raw token conversion (used by later features).
  - Location: `client/src/store/useStore.js`, `client/src/components/ProgressionDisplay.jsx`, `client/src/components/ChordPicker.jsx`, `client/src/services/modelService.js`

- Fixed individual chord preview in Playback to use the progression’s selected octave (same as “Play progression”).
  - Location: `client/src/components/ChordPlayer.jsx`

- Improved playback instrument realism with new sampler-based piano and expanded presets.
  - Added `acoustic-piano` (Tone Sampler via Salamander samples), `electric-piano`, `organ`, `strings`, and `synth-lead`.
  - Made synth creation async-aware and guarded playback while the piano sampler is still loading.
  - Updated instrument selector UI defaults/options and made it horizontally scrollable for more presets.
  - Location: `client/src/services/audioEngine.js`, `client/src/components/ChordPlayer.jsx`, `client/src/services/audioEngine.test.js`, `client/src/test/setup.js`

- Added a visible `Export as PDF` action button in the progression action bar.
  - Hooks into existing `exportAsPdf()` utility and shows a toast notification after export.
  - Location: `client/src/components/ProgressionDisplay.jsx`

- Fixed shared URL progressions to actually load into the app state.
  - `?p=` is decoded and the resulting chords/metadata are written to Zustand via `setCurrentProgression()`
  - syncs `genre`, `octave`, `count`, and `detectedKey`
  - resets playback state and removes the `p` query param to avoid re-processing
  - Location: `client/src/App.jsx`

- Fixed `Space` shortcut to start/stop audio playback.
  - The shortcut now calls the `AudioEngine` playback methods (instead of only toggling UI state).
  - Location: `client/src/App.jsx`

- Fixed history metadata saving (key/mood/scaleType) so History/Favorites display correctly.
  - Location: `client/src/components/ProgressionDisplay.jsx` (+ `client/src/utils/storage.js` expectations)

- Fixed individual chord button rendering in `ChordPlayer` to use proper chord formatting (raw tokens like `Fs` now display as `F♯`).
  - Location: `client/src/components/ChordPlayer.jsx`

- Fixed progression playback to respect the selected octave (instead of hardcoding octave 4).
  - Location: `client/src/services/audioEngine.js`, `client/src/components/ChordPlayer.jsx`, `client/src/App.jsx`

- Fixed `ProgressionDisplay` chord symbol rendering to replace all `b/#` occurrences (e.g. `m7b5`, double flats).
  - Location: `client/src/components/ProgressionDisplay.jsx`

- Fixed Sidebar History/Favorites panels to refresh when opened (and after new progressions are generated).
  - Location: `client/src/components/Sidebar.jsx`, `client/src/components/HistoryPanel.jsx`, `client/src/components/FavoritesPanel.jsx`

- Fixed `9` chord interval mapping so `9` is treated as dominant 9 and `maj9` as major 9 (removed unreachable branch).
  - Location: `client/src/services/audioEngine.js`

- Applied saved `defaultTempo` setting on app startup (so playback uses the user’s default BPM).
  - Location: `client/src/App.jsx`

- Made `autoSaveHistory` setting actually control whether history is written.
  - Location: `client/src/components/ProgressionDisplay.jsx`

- Made `audioQuality` setting affect playback (latency hint + effect intensity presets).
  - Location: `client/src/services/audioEngine.js`, `client/src/App.jsx`, `client/src/components/Settings.jsx`

- Enabled a real demo-mode fallback: when model loading fails, app now sets `model = 'DEMO_MODE'` and continues.
  - Location: `client/src/components/ModelLoader.jsx`

- Fixed PDF export to generate an actual `.pdf` file (instead of downloading a PNG with print dimensions).
  - Location: `client/src/utils/exportUtils.js`

- Updated tutorial shortcut text to match actual implemented keyboard shortcuts (removed non-existent `R` regenerate key).
  - Location: `client/src/components/Tutorial.jsx`

- Updated tutorial parameter guidance to match current input controls (genre, adventure, count, octave, optional start chord).
  - Location: `client/src/components/Tutorial.jsx`

- Updated footer "How it works" text to match current generation inputs (removed outdated mood/key wording).
  - Location: `client/src/App.jsx`

- Fixed Progression Library filtering so search now respects the selected genre filter.
  - Location: `client/src/components/ProgressionLibrary.jsx`

- Stabilized keyboard shortcut definitions in `App` using memoized callbacks/array to avoid listener re-registration on every render.
  - Location: `client/src/App.jsx`

- Replaced hardcoded favorites localStorage key with shared `STORAGE_KEYS.FAVORITES`.
  - Location: `client/src/components/FavoritesPanel.jsx`, `client/src/utils/storage.js`

- Gated verbose model `[DEBUG]` logs to development mode to prevent console noise in production.
  - Location: `client/src/services/modelService.js`

- Improved model loader retry flow: explicit retry handler now clears error state and retries with explicit cancel flag.
  - Location: `client/src/components/ModelLoader.jsx`

- Added granular model-loading progress stage at 50% so vocab-loading step is surfaced in UI.
  - Location: `client/src/components/ModelLoader.jsx`

- Added start-chord validation against model vocabulary (with `#` → raw sharp token normalization) to prevent invalid PAD-based generations.
  - Location: `client/src/components/InputForm.jsx`

- Improved key detection to analyze all chords in a progression via weighted tonic/mode voting (instead of only the first chord).
  - Location: `client/src/services/modelService.js`

