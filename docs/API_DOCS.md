# API Documentation

Complete API reference for ChordAI.

## Table of Contents

- [ModelService](#modelservice)
- [AudioEngine](#audioengine)
- [Storage Utilities](#storage-utilities)
- [Preprocessor](#preprocessor)

---

## ModelService

Main service for ML model inference.

### Methods

#### `loadModel(modelPath, metadataPath)`

Load TensorFlow.js model and vocabularies.

**Parameters:**
- `modelPath` (string): Path to model.json
- `metadataPath` (string): Path to metadata directory

**Returns:** `Promise<{success: boolean, mode: string}>`

```javascript
const service = getModelService();
await service.loadModel('/model/model.json', '/model/metadata');
```

#### `generateProgression(genre, mood, key, scaleType, length, temperature, samplingStrategy, samplingParams)`

Generate a chord progression.

**Parameters:**
- `genre` (string): Genre (pop, rock, jazz, etc.)
- `mood` (string): Mood (uplifting, melancholic, etc.)
- `key` (string): Musical key (C, D, E, etc.)
- `scaleType` (string): 'major' or 'minor'
- `length` (number): Number of chords (4-12)
- `temperature` (number): Sampling temperature (0.5-2.0)
- `samplingStrategy` (string): 'temperature', 'topk', or 'nucleus'
- `samplingParams` (object): Additional parameters for sampling

**Returns:** `Promise<string[]>` - Array of chord names

```javascript
const progression = await service.generateProgression(
  'pop',
  'uplifting',
  'C',
  'major',
  4,
  1.0
);
// Returns: ['C', 'G', 'Am', 'F']
```

#### `generateVariation(progression, genre, mood, key, scaleType, temperature, samplingStrategy, keepFirst)`

Generate a variation of existing progression.

**Parameters:**
- `progression` (string[]): Original progression
- `keepFirst` (number): Number of chords to keep (default: 2)
- ...other params same as generateProgression

**Returns:** `Promise<string[]>`

```javascript
const variation = await service.generateVariation(
  ['C', 'G', 'Am', 'F'],
  'pop',
  'uplifting',
  'C',
  'major',
  1.2,
  'temperature',
  2
);
// Keeps first 2 chords, generates new ones
```

---

## AudioEngine

Professional audio playback engine using Tone.js.

### Methods

#### `initialize()`

Initialize audio context (must be called after user gesture).

```javascript
const engine = getAudioEngine();
await engine.initialize();
```

#### `playChord(chordName, duration, octave)`

Play a single chord.

**Parameters:**
- `chordName` (string): Chord name (e.g., 'Cmaj7')
- `duration` (string): Tone.js duration (default: '2n')
- `octave` (number): Octave number (default: 4)

```javascript
await engine.playChord('Cmaj7', '2n', 4);
```

#### `playProgression(chords, tempo, loop)`

Play chord progression.

**Parameters:**
- `chords` (string[]): Array of chord names
- `tempo` (number): BPM (60-180)
- `loop` (boolean): Loop playback

```javascript
await engine.playProgression(
  ['C', 'G', 'Am', 'F'],
  120,
  true
);
```

#### `changeSynthType(type)`

Change synthesizer type.

**Parameters:**
- `type` (string): 'piano', 'pad', 'synth', or 'electric'

```javascript
await engine.changeSynthType('pad');
```

#### `setVolume(db)`, `setTempo(bpm)`, `toggleLoop()`

Control playback parameters.

```javascript
engine.setVolume(-12);
engine.setTempo(140);
engine.toggleLoop(); // Returns new loop state
```

#### `exportToMidi(chords, fileName)`

Export progression as MIDI file.

```javascript
engine.exportToMidi(
  ['C', 'G', 'Am', 'F'],
  'my-progression.mid'
);
```

#### `chordToMidi(chordName, octave)`

Convert chord name to MIDI notes.

**Returns:** `number[]` - Array of MIDI note numbers

```javascript
const notes = engine.chordToMidi('Cmaj7', 4);
// Returns: [48, 52, 55, 59]
```

---

## Storage Utilities

LocalStorage management for history, favorites, and settings.

### History

```javascript
import {
  saveToHistory,
  getHistory,
  clearHistory,
  deleteHistoryItem
} from './utils/storage';

// Save progression
const entry = saveToHistory({
  chords: ['C', 'F', 'G', 'C'],
  genre: 'pop',
  mood: 'uplifting',
  key: 'C',
  scaleType: 'major'
});

// Get all history (max 20 items)
const history = getHistory();

// Delete specific item
deleteHistoryItem(entry.id);

// Clear all
clearHistory();
```

### Favorites

```javascript
import {
  saveToFavorites,
  getFavorites,
  removeFromFavorites,
  isInFavorites
} from './utils/storage';

// Save to favorites
const favorite = saveToFavorites({
  id: Date.now(),
  chords: ['C', 'Am', 'F', 'G'],
  metadata: { genre: 'pop' },
  name: 'My Favorite'
});

// Check if favorited
if (isInFavorites(favorite.id)) {
  removeFromFavorites(favorite.id);
}
```

### Settings

```javascript
import {
  getSettings,
  updateSetting,
  getDefaultSettings
} from './utils/storage';

// Get current settings (or defaults)
const settings = getSettings();

// Update individual setting
updateSetting('theme', 'light');
updateSetting('defaultTempo', 140);

// Get defaults
const defaults = getDefaultSettings();
```

---

## Preprocessor

Handle model input preprocessing.

### Methods

```javascript
import { ChordProgressionPreprocessor } from './utils/modelUtils';

const preprocessor = new ChordProgressionPreprocessor();
await preprocessor.loadVocabularies('/model/metadata');

// Encode chord to ID
const chordId = preprocessor.encodeChord('Cmaj7');

// Decode ID to chord
const chordName = preprocessor.decodeChord(4);

// Prepare model input
const input = preprocessor.prepareInput(
  ['C', 'F'],      // seed chords
  'pop',           // genre
  'uplifting',     // mood
  'C',             // key
  'major'          // scale type
);

// Sample from probability distribution
const chordId = preprocessor.sampleWithTemperature(
  probabilities,
  1.0
);
```

### Vocabularies

```javascript
// Get available options
const genres = preprocessor.getGenres();
// ['pop', 'rock', 'jazz', 'blues', ...]

const moods = preprocessor.getMoods();
const keys = preprocessor.getKeys();
const scaleTypes = preprocessor.getScaleTypes();

// Get vocabulary sizes
const chordVocabSize = preprocessor.getChordVocabSize();
// 279
```

---

## Zustand Store

Global state management.

```javascript
import useStore from './store/useStore';

function MyComponent() {
  const {
    // Model state
    model,
    preprocessor,
    isModelLoading,

    // Generation params
    genre,
    mood,
    key,
    scaleType,
    length,
    temperature,

    // Current state
    currentProgression,
    isGenerating,
    isPlaying,
    currentChordIndex,
    tempo,

    // Actions
    setGenre,
    setMood,
    setCurrentProgression,
    setIsPlaying,
  } = useStore();

  return (
    <div>
      <button onClick={() => setGenre('rock')}>
        Select Rock
      </button>
    </div>
  );
}
```

---

## Error Handling

All async methods should be wrapped in try-catch:

```javascript
try {
  const progression = await modelService.generateProgression(...);
} catch (error) {
  console.error('Generation failed:', error);
  // Fallback to demo mode or show error to user
}
```

---

## Performance Tips

1. **Model Loading**: Call `loadModel()` once on app startup
2. **Audio Init**: Initialize audio engine after first user interaction
3. **Caching**: Use singleton instances (`getModelService()`, `getAudioEngine()`)
4. **Disposal**: Clean up with `dispose()` methods when unmounting

---

## TypeScript Support

While the project uses JavaScript, JSDoc comments provide type hints:

```javascript
/**
 * @param {string} genre - Genre selection
 * @param {number} temperature - Sampling temperature
 * @returns {Promise<string[]>} Generated progression
 */
async function generate(genre, temperature) {
  // ...
}
```

---

For more examples, see the [GitHub repository](#).
