/**
 * ChordAI Model Utilities for Web
 *
 * JavaScript port of Python preprocessing utilities
 * Handles tokenization, encoding, and decoding for the TF.js model
 */

/**
 * ChordProgressionPreprocessor
 * Handles all preprocessing operations for the model
 */
export class ChordProgressionPreprocessor {
  constructor() {
    this.maxSequenceLength = 12;
    this.chordVocab = null;
    this.genreMapping = null;
    this.moodMapping = null;
    this.keyMapping = null;
    this.scaleTypeMapping = null;
    this.modelConfig = null;

    // Special tokens
    this.PAD_TOKEN = '<PAD>';
    this.START_TOKEN = '<START>';
    this.END_TOKEN = '<END>';
    this.UNK_TOKEN = '<UNK>';
  }

  /**
   * Load vocabularies and mappings from JSON files
   */
  async loadVocabularies(basePath = '/model/metadata') {
    try {
      // Load all vocabularies in parallel
      const [chordVocab, genreMapping, moodMapping, keyMapping, scaleTypeMapping, modelConfig] = await Promise.all([
        fetch(`${basePath}/chord_vocab.json`).then(r => r.json()),
        fetch(`${basePath}/genre_mapping.json`).then(r => r.json()),
        fetch(`${basePath}/mood_mapping.json`).then(r => r.json()),
        fetch(`${basePath}/key_mapping.json`).then(r => r.json()),
        fetch(`${basePath}/scale_type_mapping.json`).then(r => r.json()),
        fetch(`${basePath}/model_config.json`).then(r => r.json())
      ]);

      this.chordVocab = chordVocab;
      this.genreMapping = genreMapping;
      this.moodMapping = moodMapping;
      this.keyMapping = keyMapping;
      this.scaleTypeMapping = scaleTypeMapping;
      this.modelConfig = modelConfig;

      console.log('Vocabularies loaded successfully');
      console.log(`  Chord vocab size: ${chordVocab.vocab_size}`);
      console.log(`  Genres: ${Object.keys(genreMapping).length}`);
      console.log(`  Moods: ${Object.keys(moodMapping).length}`);
      console.log(`  Keys: ${Object.keys(keyMapping).length}`);

      return true;
    } catch (error) {
      console.error('Error loading vocabularies:', error);
      throw error;
    }
  }

  /**
   * Encode a chord name to integer ID
   */
  encodeChord(chordName) {
    if (!this.chordVocab) {
      throw new Error('Vocabularies not loaded. Call loadVocabularies() first.');
    }

    const chordId = this.chordVocab.chord_to_id[chordName];
    if (chordId !== undefined) {
      return chordId;
    }

    // Return UNK token if chord not in vocabulary
    return this.chordVocab.chord_to_id[this.UNK_TOKEN];
  }

  /**
   * Decode integer ID to chord name
   */
  decodeChord(chordId) {
    if (!this.chordVocab) {
      throw new Error('Vocabularies not loaded');
    }

    return this.chordVocab.id_to_chord[chordId.toString()] || this.UNK_TOKEN;
  }

  /**
   * Encode a chord progression (array of chord names) to integer sequence
   */
  encodeProgression(progression) {
    return progression.map(chord => this.encodeChord(chord));
  }

  /**
   * Decode integer sequence to chord progression
   */
  decodeProgression(sequence) {
    return sequence.map(id => this.decodeChord(id));
  }

  /**
   * Pad or truncate sequence to max length
   */
  padSequence(sequence, maxLength = null) {
    const targetLength = maxLength || this.maxSequenceLength;
    const padId = this.chordVocab.chord_to_id[this.PAD_TOKEN];

    if (sequence.length > targetLength) {
      // Truncate
      return sequence.slice(0, targetLength);
    } else if (sequence.length < targetLength) {
      // Pad
      const padding = new Array(targetLength - sequence.length).fill(padId);
      return [...sequence, ...padding];
    }

    return sequence;
  }

  /**
   * Prepare model input from user selections
   */
  prepareInput(seedChords, genre, mood, key, scaleType) {
    // Encode seed chords
    let chordSequence;
    if (seedChords && seedChords.length > 0) {
      chordSequence = this.encodeProgression(seedChords);
    } else {
      // Start with START token
      chordSequence = [this.chordVocab.chord_to_id[this.START_TOKEN]];
    }

    // Pad sequence
    const paddedSequence = this.padSequence(chordSequence);

    // Get metadata IDs
    const genreId = this.genreMapping[genre] !== undefined ? this.genreMapping[genre] : 0;
    const moodId = this.moodMapping[mood] !== undefined ? this.moodMapping[mood] : 0;
    const keyId = this.keyMapping[key] !== undefined ? this.keyMapping[key] : 0;
    const scaleTypeId = this.scaleTypeMapping[scaleType] !== undefined ? this.scaleTypeMapping[scaleType] : 0;

    return {
      chordSequence: paddedSequence,
      genreId,
      moodId,
      keyId,
      scaleTypeId
    };
  }

  /**
   * Sample from probability distribution with temperature
   */
  sampleWithTemperature(probabilities, temperature = 1.0) {
    // Apply temperature
    const scaledLogits = probabilities.map(p => Math.log(p + 1e-10) / temperature);

    // Softmax
    const maxLogit = Math.max(...scaledLogits);
    const expLogits = scaledLogits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probs = expLogits.map(e => e / sumExp);

    // Sample
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (random < cumulative) {
        return i;
      }
    }

    return probs.length - 1;
  }

  /**
   * Get available genres
   */
  getGenres() {
    return this.genreMapping ? Object.keys(this.genreMapping) : [];
  }

  /**
   * Get available moods
   */
  getMoods() {
    return this.moodMapping ? Object.keys(this.moodMapping) : [];
  }

  /**
   * Get available keys
   */
  getKeys() {
    return this.keyMapping ? Object.keys(this.keyMapping) : [];
  }

  /**
   * Get available scale types
   */
  getScaleTypes() {
    return this.scaleTypeMapping ? Object.keys(this.scaleTypeMapping) : [];
  }

  /**
   * Validate preprocessor is ready
   */
  isReady() {
    return this.chordVocab !== null &&
           this.genreMapping !== null &&
           this.moodMapping !== null &&
           this.keyMapping !== null &&
           this.scaleTypeMapping !== null;
  }
}

/**
 * Chord notation utilities
 */
export const ChordUtils = {
  /**
   * Parse chord into root and quality
   */
  parseChord(chord) {
    if (!chord || chord.length === 0) {
      return { root: null, quality: null };
    }

    // Check for flat/sharp
    if (chord.length > 1 && (chord[1] === 'b' || chord[1] === '#')) {
      return {
        root: chord.substring(0, 2),
        quality: chord.substring(2)
      };
    }

    return {
      root: chord[0],
      quality: chord.substring(1)
    };
  },

  /**
   * Get root note from chord
   */
  getRoot(chord) {
    const { root } = this.parseChord(chord);
    return root;
  },

  /**
   * Get chord quality
   */
  getQuality(chord) {
    const { quality } = this.parseChord(chord);
    return quality || 'major';
  },

  /**
   * Check if chord is major
   */
  isMajor(chord) {
    const quality = this.getQuality(chord);
    return !quality || quality === '' ||
           quality.startsWith('maj') ||
           quality.startsWith('M') ||
           quality.match(/^(6|7|9|11|13)/);
  },

  /**
   * Check if chord is minor
   */
  isMinor(chord) {
    const quality = this.getQuality(chord);
    return quality.startsWith('m') || quality.startsWith('min');
  },

  /**
   * Format chord for display
   */
  formatChord(chord) {
    return chord.replace('b', '\u266D').replace('#', '\u266F');
  }
};

/**
 * Error handling utility
 */
export class ModelError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ModelError';
    this.code = code;
  }
}

// Error codes
export const ErrorCodes = {
  VOCAB_NOT_LOADED: 'VOCAB_NOT_LOADED',
  MODEL_NOT_LOADED: 'MODEL_NOT_LOADED',
  INVALID_INPUT: 'INVALID_INPUT',
  PREDICTION_FAILED: 'PREDICTION_FAILED'
};

export default ChordProgressionPreprocessor;
