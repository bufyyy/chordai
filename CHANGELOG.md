# Changelog

## 2026-04-02
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

