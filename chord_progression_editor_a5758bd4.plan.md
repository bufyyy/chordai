---
name: Chord Progression Editor
overview: "Add full chord progression editing capabilities: add/remove/replace chords, and set per-chord beat durations. This touches the data model, store, audio engine, UI, exports, and persistence."
todos:
  - id: store-actions
    content: Add store actions (addChord, removeChord, setChordDuration, moveChord) and auto-fill durations in setCurrentProgression / transposeProgression
    status: pending
  - id: inputform-durations
    content: Update InputForm to include default durations array when generating progressions
    status: pending
  - id: ui-add-remove
    content: Add '+' (add chord) and 'x' (remove chord) buttons to ProgressionDisplay, wire to store actions and ChordPicker
    status: pending
  - id: ui-duration-control
    content: Add per-chord beat selector (- / N / +) inside ChordCard, wire to setChordDuration
    status: pending
  - id: ui-drag-reorder
    content: Implement lightweight drag-and-drop reordering on chord cards, wire to moveChord
    status: pending
  - id: audio-engine-variable
    content: Refactor audioEngine.playProgression to accept durations, switch from Tone.Sequence to Tone.Part for variable timing
    status: pending
  - id: chord-player-durations
    content: Pass durations from ChordPlayer to audioEngine, update progress bar to be time-weighted
    status: pending
  - id: midi-export
    content: Update MIDI export (createMidiData / exportToMidi) to use per-chord durations
    status: pending
  - id: exports-persistence
    content: Thread durations through exportUtils (text, JSON, PNG, PDF, URL sharing) and ensure storage round-trips correctly
    status: pending
  - id: library-history-compat
    content: Ensure library loads, history loads, and favorites loads default durations when missing
    status: pending
  - id: notation-bar
    content: Update notation bar text to reflect non-uniform durations
    status: pending
  - id: tests
    content: Add/update unit tests for store actions, ProgressionDisplay, audioEngine variable timing, and export durations
    status: pending
isProject: false
---

# Chord Progression Editor

## Current State

- Chords are stored as a flat `string[]` of raw model tokens in `currentProgression.chords`
- Per-chord **replace** already works via `ChordPicker.jsx` + `replaceChord` store action
- Playback uses `Tone.Sequence` with a fixed `'1m'` (1 measure = 4 beats) per chord
- No support for add, remove, reorder, or variable duration

## Data Model Change

Add a **`durations: number[]`** parallel array to `currentProgression`, where each entry is the number of **beats** (quarter notes) that chord is held. Default = `4` (one full bar in 4/4 time). Keep `chords: string[]` unchanged to minimize breakage across the codebase.

```js
currentProgression: {
  chords: ['Am', 'G', 'F', 'E'],
  durations: [4, 4, 2, 6],       // NEW: beats per chord
  metadata: { genre, adventure, octave },
  romanNumerals: [...]
}
```

All existing code that reads `chords` continues to work. Only playback, export, and editing UI need to be aware of `durations`.

---

## 1. Store Actions ([useStore.js](client/src/store/useStore.js))

Add new actions alongside existing `replaceChord`:

- **`addChord(index, chord)`** -- insert a chord (with default 4-beat duration) at `index`. If `index === chords.length`, append. Clears `romanNumerals`.
- **`removeChord(index)`** -- remove chord and its duration at `index`. Guard: refuse if only 1 chord remains. Clears `romanNumerals`.
- **`setChordDuration(index, beats)`** -- set `durations[index]` to `beats` (clamped 1--8).
- **`moveChord(fromIndex, toIndex)`** -- reorder a chord (and its duration). Clears `romanNumerals`.

Update **`replaceChord`** to preserve the existing `durations` entry at that index.

Update **`setCurrentProgression`** to auto-fill a `durations` array (all `4`) when one isn't provided, so generated progressions and library loads "just work".

Update **`transposeProgression`** to carry `durations` through unchanged.

---

## 2. Progression Display UI ([ProgressionDisplay.jsx](client/src/components/ProgressionDisplay.jsx))

### 2a. Add Chord

- Render a small **"+" button** after each chord card and at the end of the grid.
- Clicking "+" opens `ChordPicker` in "add" mode at that position.
- On select, calls `addChord(index, rawToken)`.

### 2b. Remove Chord

- Add an **"x" button** in the top-right corner of each `ChordCard`.
- Only visible when there are 2+ chords (never leave an empty progression).
- On click, calls `removeChord(index)`, shows toast "Chord removed".

### 2c. Duration Control

- Below each chord name inside `ChordCard`, show a **beat selector**: a row of small "-" / number / "+" controls.
- Displays the current beat count (e.g., "4 beats"). Range: 1--8.
- Clicking +/- calls `setChordDuration(index, newBeats)`.
- Visually, chord cards with more beats could be **wider** (e.g., `gridColumn: span N` where N is proportional) to give a visual sense of timing. A simpler alternative is to just show the beat count as a badge and keep uniform card widths -- this avoids layout complexity on mobile. I recommend starting with the **badge approach** and optionally adding proportional widths later.

### 2d. Reorder (Drag-and-Drop)

- Implement lightweight drag-and-drop using HTML5 `draggable` + `onDragStart/onDragOver/onDrop` (no library needed for a small list).
- A **grip handle** icon on the left side of each card.
- On drop, calls `moveChord(fromIndex, toIndex)`.

### 2e. Notation Bar Update

- The text notation at the bottom (e.g., `Am4 -> G4 -> F4 -> E4`) should reflect durations when they differ from the default, e.g., `Am4(2) -> G4(6)` or use `x2`, `x6` suffixes.

---

## 3. ChordPicker ([ChordPicker.jsx](client/src/components/ChordPicker.jsx))

- Minor change: accept an optional `mode` prop (`"replace"` or `"add"`). The component itself doesn't need to change behavior, but the title/label could say "Replace chord" vs "Add chord" for clarity.

---

## 4. Audio Engine ([audioEngine.js](client/src/services/audioEngine.js))

### 4a. `playProgression` Signature Change

```js
async playProgression(chords, tempo = 120, loop = false, octave = 4, durations = null)
```

If `durations` is `null`, fall back to 4 beats per chord (backward compatible).

### 4b. Switch from `Tone.Sequence` to `Tone.Part`

`Tone.Sequence` enforces uniform step size. Replace with **`Tone.Part`**, which accepts events at arbitrary times:

```js
// Build events with cumulative time offsets
let currentTime = 0;
const events = chords.map((chord, i) => {
  const beats = durations?.[i] ?? 4;
  const event = { time: `0:${currentTime}:0`, chord, index: i, beats };
  currentTime += beats;
  return event;
});

this.part = new Tone.Part((time, value) => {
  const midiNotes = this.chordToMidi(value.chord, octave);
  const freqs = midiNotes.map(m => this.midiToFrequency(m));
  const noteDuration = Tone.Time(`0:${value.beats}:0`).toSeconds() * 0.8;
  this.synth.triggerAttackRelease(freqs, noteDuration, time);
  // ... chord index callback, end-of-playback logic
}, events);
```

Use `Tone.Time` for beat-relative scheduling so it stays tempo-aware. The total progression length in beats is `sum(durations)`.

### 4c. Loop Logic

For looping, set `this.part.loop = true` and `this.part.loopEnd` to the total duration in beats.

### 4d. End-of-Playback

Replace the hardcoded `setTimeout(..., 2000)` with a delay derived from the last chord's duration at the current tempo:

```js
const lastBeatDuration = (60 / tempo) * lastChordBeats;
setTimeout(() => { this.stop(); ... }, lastBeatDuration * 1000 + 500);
```

### 4e. MIDI Export

Update `createMidiData` to use per-chord durations instead of the fixed `ticksPerBeat * 4`:

```js
chords.forEach((chord, i) => {
  const beats = durations?.[i] ?? 4;
  const duration = ticksPerBeat * beats;
  // ... same note on/off logic but with variable duration
});
```

The `exportToMidi` method needs to accept `durations` as a parameter.

---

## 5. ChordPlayer UI ([ChordPlayer.jsx](client/src/components/ChordPlayer.jsx))

- Pass `currentProgression.durations` to `audioEngine.playProgression(...)`.
- Update **progress bar** to be **time-weighted**: width = `sum(durations[0..currentIndex]) / sum(allDurations) * 100%` instead of simple `(index+1)/length`.
- Update "Playing chord X of Y" text -- no change needed (still chord count), but optionally add beat info: "Playing chord 2 of 4 (beat 5 of 16)".
- Individual chord preview buttons remain unchanged (they play a single chord for a fixed duration).

---

## 6. InputForm ([InputForm.jsx](client/src/components/InputForm.jsx))

- When building `currentProgression` during generation, include `durations: new Array(currentChords.length).fill(4)` to set the default (4 beats per chord).
- Each iteration of the generation loop should extend the durations array as chords are added.

---

## 7. Exports and Persistence

### [exportUtils.js](client/src/utils/exportUtils.js)

- **Text export**: append duration info when non-uniform, e.g., `Am (2 beats) -> G (4 beats)`.
- **JSON export**: include `durations` array.
- **PNG/PDF export**: show beat count under each chord box when durations vary.
- **URL sharing** (`generateShareUrl` / `decodeProgressionFromUrl`): encode/decode `durations` in the base64 payload.

### [storage.js](client/src/utils/storage.js)

- `saveToHistory` and `saveToFavorites` already save the full progression object, so `durations` will be persisted automatically as long as it's part of `currentProgression`.
- When loading old history items that lack `durations`, default to `[4, 4, 4, ...]` matching chord count.

---

## 8. Library and History Loading

### [ProgressionLibrary.jsx](client/src/components/ProgressionLibrary.jsx)

- When loading a famous progression, set `durations` to all-4 (no famous progressions have custom durations).

### [HistoryPanel.jsx](client/src/components/HistoryPanel.jsx) / [FavoritesPanel.jsx](client/src/components/FavoritesPanel.jsx)

- When loading a saved progression, pass through `durations` if present, else default.
- Optionally show a small duration indicator on history cards if the progression has non-uniform durations.

---

## 9. Tests

- **Store tests**: `addChord`, `removeChord`, `setChordDuration`, `moveChord`, edge cases (single chord removal, out-of-bounds).
- **ProgressionDisplay tests**: update existing tests in [ProgressionDisplay.test.jsx](client/src/components/ProgressionDisplay.test.jsx) for new buttons (add, remove, duration controls).
- **AudioEngine tests**: variable-duration playback scheduling, MIDI export with different durations.
- **Export tests**: durations in JSON, URL share round-trip.

---

## Implementation Order

The tasks below are ordered to build on each other incrementally. Each step should leave the app in a working state.
