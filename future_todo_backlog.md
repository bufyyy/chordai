# ChordAI Future TODO Backlog

## P0 - High Impact

- Fix instrument realism.
  - Improve current piano patch (currently sounds like electric piano/Rhodes).
  - Add clearly distinct instrument presets (acoustic piano, EP, pad, organ, strings, synth lead).

- Add per-chord editing for generated progressions.
  - Let users click a chord and replace it with another chord.
  - Recalculate dependent metadata after edits (key detection, notation, etc.).

- Add transpose feature.
  - Transpose full progression by semitones or target key.
  - Preserve chord quality/extensions when transposing.

## P1 - Core Product Features

- Add Roman numeral notation view.
  - Show progression as roman numerals (for example: I-V-vi-IV).
  - Handle major/minor context correctly.

- Show generated progression on instrument visuals.
  - Piano-key view.
  - Guitar fretboard/chord-shape view.
  - Toggle between instruments.

- Add a chord reference tab/library.
  - Include broad chord catalog.
  - Show chord diagrams for guitar/piano.
  - Add filters (root note, quality, extension, instrument, difficulty).

## P2 - Content Expansion

- Expand progression library.
  - Add more songs and more progression examples.
  - Improve metadata coverage and filtering.

- Find and prepare more data for AI model training.
  - Gather more source datasets.
  - Build/define cleaning and normalization pipeline.

## P3 - UX / Visual Identity

- Rework website theme to be more unique.
  - Move away from generic "vibecoded React" look.
  - Refresh typography, spacing, color system, component styling, motion.

## Notes

- Export as PDF button:
  - PDF export logic has already been fixed to generate a real PDF.
  - Add a dedicated visible "Export as PDF" button in UI if needed as a separate task.

