# Changelog

## 2026-04-15
- Fixed reviewer follow-ups for playback loop-state consistency and chord-card interaction UX.
  - Added global `isLooping` + `setIsLooping` in store so loop mode is a single source of truth.
  - Updated `ChordPlayer` to read/write loop state from store and updated `App` Space shortcut playback to use store loop state (instead of `audioEngine.isLooping`).
  - Updated chord-card clickability so cards are non-clickable while playback is active (matches behavior and removes no-op cursor state).
  - Location: `client/src/store/useStore.js`, `client/src/components/ChordPlayer.jsx`, `client/src/App.jsx`, `client/src/components/ProgressionDisplay.jsx`

- Applied reviewer-driven hardening for variable-duration playback and edit interactions.
  - Replaced `Tone.Part` arithmetic string times with explicit second offsets to avoid fragile expression parsing.
  - Set `Tone.Part.loopEnd` explicitly for all playback modes using total progression duration (seconds).
  - Made sampler readiness stricter: `samplerLoaded` is no longer forced true after failed `Tone.loaded()` calls; falls back to sampler `onload`.
  - Updated `setChordDuration` to stop active playback (same behavior as other progression mutations) to avoid timing desync.
  - Disabled add/remove/replace/duration edits while playback is active to prevent abrupt mid-playback interruption.
  - Location: `client/src/services/audioEngine.js`, `client/src/store/useStore.js`, `client/src/components/ProgressionDisplay.jsx`

- Fixed variable-duration playback to respect the selected tempo (BPM slider).
  - Progression event timing now uses musical transport time values instead of precomputed absolute seconds.
  - Chord hold durations and non-loop stop timing are now derived from the active `tempo` parameter (`60 / tempo`), so high/low BPM settings audibly change playback speed.
  - Location: `client/src/services/audioEngine.js`

- Fixed variable-duration playback stopping too early (e.g., around chord 2).
  - Non-loop playback stop timer now uses total progression beats (sum of all chord durations), not only last chord beats.
  - Added timeout cleanup in `stop()` to prevent stale timers from interrupting later playback sessions.
  - Location: `client/src/services/audioEngine.js`

- Fixed beat-duration playback behavior so duration edits are audible and default chords no longer leave a trailing silent gap.
  - `audioEngine.playProgression` now accepts/passes `durations` and schedules variable chord timing using `Tone.Part` instead of fixed-step sequence timing.
  - Chord hold time now scales with beat duration (`beats * 4n`, ~95% hold), removing the previous perceived silent beat at default timing.
  - Updated playback call sites to pass progression durations (`ChordPlayer` and `App` keyboard Space shortcut).
  - Location: `client/src/services/audioEngine.js`, `client/src/components/ChordPlayer.jsx`, `client/src/App.jsx`

- Added per-chord beat duration controls in progression cards.
  - Each chord card now shows `- / N beats / +` controls.
  - Wired to store action `setChordDuration(index, beats)` with 1-8 beat clamping behavior.
  - Duration controls are disabled while generation is in progress.
  - Added coverage for duration increment/decrement interactions in `ProgressionDisplay.test.jsx`.
  - Location: `client/src/components/ProgressionDisplay.jsx`, `client/src/components/ProgressionDisplay.test.jsx`

- Added chord insertion/removal controls in progression editor UI.
  - Added `+` insertion buttons after each chord card and an end-of-grid “Add Chord” tile.
  - Added `×` remove button on chord cards (shown only when progression has 2+ chords).
  - Unified picker state to support both replace and add flows with `ChordPicker` `mode`.
  - Wired add/remove actions to store (`addChord`, `removeChord`) with toast feedback.
  - Added tests for remove action and add-via-picker flow in `ProgressionDisplay.test.jsx`.
  - Location: `client/src/components/ProgressionDisplay.jsx`, `client/src/components/ProgressionDisplay.test.jsx`

- Added default per-chord durations in generation flow (`InputForm`) for progression editor compatibility.
  - Generation now initializes progression with `durations: []`.
  - First generated chord now sets `durations: [4]`.
  - Each subsequent generated chord appends a matching `4` beat entry so `durations.length` always matches `chords.length` during incremental generation.
  - Location: `client/src/components/InputForm.jsx`

- Fixed first-click playback on acoustic piano not producing sound.
  - Root cause: playback could return early while sampler buffers were still loading on first interaction.
  - `audioEngine` now waits for sampler readiness (`waitForSamplerReady`) before starting chord/progression playback.
  - Added a safe `Tone.loaded()` await path during acoustic sampler creation (with mock-safe fallback).
  - Location: `client/src/services/audioEngine.js`

- Fixed third-round reviewer findings for transpose/playback consistency and Escape architecture hardening.
  - Fixed `transposeProgression` to stop active playback (same behavior as other chord-structure mutations) and avoid audio/UI desync.
  - Hardened `stopPlaybackIfActive` with `try/catch` around audio engine teardown so store state updates remain resilient on audio errors.
  - Replaced App-level Escape DOM query with Zustand state flag `isChordPickerOpen` (`setChordPickerOpen`) for state-driven guard logic.
  - Added shared UI constant `CHORD_PICKER_OPEN_ATTR` and cross-layer comments documenting Escape handling coordination.
  - Added `formatDisplayChordWithSymbols()` and used it in `ChordPicker` to avoid redundant re-formatting of already-display-form chords.
  - Location: `client/src/store/useStore.js`, `client/src/components/ChordPicker.jsx`, `client/src/App.jsx`, `client/src/services/modelService.js`, `client/src/hooks/useKeyboardShortcuts.js`, `client/src/constants/ui.js`, `client/src/components/ProgressionDisplay.test.jsx`

- Fixed second-round reviewer findings around Escape handling, transpose safety, and UI/test robustness.
  - `ChordPicker` Escape listener now runs in capture phase and calls `stopImmediatePropagation()`; `App` Escape shortcut also ignores open picker dialogs.
  - Prevented vocabulary drift after transpose by keeping original chord when a transposed token is not in model vocabulary.
  - Tightened `isValidChordToken` so unknown tokens are rejected when vocabulary is unavailable.
  - Added playback safety on chord mutations (`replace/add/remove/move`) by stopping active playback before mutating progression structure.
  - Stabilized `ProgressionDisplay` memo dependencies with a shared empty array constant.
  - Added shared `modelService.formatChordWithSymbols()` and reused it in `ProgressionDisplay`, `ChordPicker`, and `ChordPlayer`.
  - Optimized roman numeral conversion by calling `toRomanNumerals` once per progression instead of once per chord.
  - Added `data-testid` hooks for chord cards/picker items and updated tests to use more robust selectors.
  - Location: `client/src/components/ChordPicker.jsx`, `client/src/App.jsx`, `client/src/hooks/useKeyboardShortcuts.js`, `client/src/services/modelService.js`, `client/src/store/useStore.js`, `client/src/components/ProgressionDisplay.jsx`, `client/src/components/ChordPlayer.jsx`, `client/src/components/ProgressionDisplay.test.jsx`

- Fixed reviewer-reported progression editor issues across store/model/UI and tests.
  - Fixed `chordsToRomanNumerals()` to respect detected key mode (`Major`/`Minor`) when computing roman numerals.
  - Fixed chord mutation actions to keep playback highlight index in sync (`currentChordIndex`) after add/remove/move.
  - Added chord token validation and a defensive max progression length cap (`32`) in store mutation actions.
  - Fixed transpose octave drift by clamping progression octave to the supported `1..7` range.
  - Prevented chord editing while generation is active and stabilized card rendering with persistent `chordItemIds` keys.
  - Improved `ChordPicker` Escape handling (`preventDefault` + `stopPropagation`) and added mode-aware labeling.
  - Expanded `ProgressionDisplay` tests for transpose down, roman numeral toggle, chord replace flow, and generation-time edit guard.
  - Location: `client/src/store/useStore.js`, `client/src/services/modelService.js`, `client/src/components/ProgressionDisplay.jsx`, `client/src/components/ChordPicker.jsx`, `client/src/components/ProgressionDisplay.test.jsx`

- Added progression duration support in store state and editing actions for the upcoming progression editor.
  - Added `durations` auto-normalization in `setCurrentProgression()` (defaults to 4 beats/chord for missing legacy data).
  - Added store actions: `addChord`, `removeChord` (with minimum-1 guard), `setChordDuration` (clamped 1-8), and `moveChord`.
  - Updated `replaceChord` and `transposeProgression` to preserve/carry chord durations.
  - Location: `client/src/store/useStore.js`

## 2026-04-02
- Fixed transpose accumulating flats/sharps (C → Db → Ebb...) by simplifying enharmonic spellings after each step.
  - Location: `client/src/services/modelService.js`

- Fixed transpose not incrementing octave when chords cross the B→C boundary.
  - Location: `client/src/store/useStore.js`, `client/src/services/modelService.js`

- Transpose entire progression by semitone (− / +) in the progression info row; key is re-detected and preset roman numerals from the library are cleared.
  - Location: `client/src/services/modelService.js`, `client/src/store/useStore.js`, `client/src/components/ProgressionDisplay.jsx`

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

