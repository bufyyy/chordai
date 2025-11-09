import * as tf from '@tensorflow/tfjs';

/**
 * ChordProgressionGenerator
 * Handles chord progression generation using TF.js model
 */
export class ChordProgressionGenerator {
  constructor(model, preprocessor) {
    this.model = model;
    this.preprocessor = preprocessor;
  }

  /**
   * Generate a complete chord progression
   */
  async generateProgression(genre, mood, key, scaleType, length = 4, temperature = 1.0) {
    // If in demo mode, use mock generator
    if (this.model === 'DEMO_MODE') {
      const mockGen = new MockChordGenerator();
      return mockGen.generateProgression(genre, mood, key, scaleType, length);
    }

    const progression = [];
    let seedChords = [];

    for (let i = 0; i < length; i++) {
      const nextChord = await this.generateNextChord(
        seedChords,
        genre,
        mood,
        key,
        scaleType,
        temperature
      );

      if (!nextChord || nextChord === '<END>' || nextChord === '<PAD>' || nextChord === '<UNK>') {
        break;
      }

      progression.push(nextChord);
      seedChords.push(nextChord);
    }

    return progression;
  }

  /**
   * Generate next chord in sequence
   */
  async generateNextChord(seedChords, genre, mood, key, scaleType, temperature = 1.0) {
    // Demo mode check
    if (this.model === 'DEMO_MODE') {
      return null; // Handled by generateProgression
    }

    return tf.tidy(() => {
      // Prepare input
      const input = this.preprocessor.prepareInput(seedChords, genre, mood, key, scaleType);

      // Create tensors
      const chordSequence = tf.tensor2d([input.chordSequence], [1, 12], 'int32');
      const genreId = tf.tensor2d([[input.genreId]], [1, 1], 'int32');
      const moodId = tf.tensor2d([[input.moodId]], [1, 1], 'int32');
      const keyId = tf.tensor2d([[input.keyId]], [1, 1], 'int32');
      const scaleTypeId = tf.tensor2d([[input.scaleTypeId]], [1, 1], 'int32');

      // Predict
      const prediction = this.model.predict([
        chordSequence,
        genreId,
        moodId,
        keyId,
        scaleTypeId,
      ]);

      // Get probabilities for next position
      const position = seedChords.length;
      if (position >= 12) {
        return null;
      }

      // Extract probabilities at position
      const probs = prediction.slice([0, position, 0], [1, 1, -1]).squeeze();
      const probsArray = probs.arraySync();

      // Sample with temperature
      const chordId = this.preprocessor.sampleWithTemperature(probsArray, temperature);
      const chordName = this.preprocessor.decodeChord(chordId);

      return chordName;
    });
  }

  /**
   * Generate variation of existing progression
   */
  async generateVariation(progression, genre, mood, key, scaleType, temperature = 1.2) {
    // If in demo mode, use mock generator
    if (this.model === 'DEMO_MODE') {
      const mockGen = new MockChordGenerator();
      return mockGen.generateVariation(progression, genre, mood, key, scaleType);
    }

    // Use first 2 chords as seed, regenerate the rest
    const seedChords = progression.slice(0, 2);
    const length = progression.length;

    const variation = [...seedChords];

    for (let i = 2; i < length; i++) {
      const nextChord = await this.generateNextChord(
        variation,
        genre,
        mood,
        key,
        scaleType,
        temperature
      );

      if (!nextChord || nextChord === '<END>' || nextChord === '<PAD>') {
        break;
      }

      variation.push(nextChord);
    }

    return variation;
  }

  /**
   * Get chord info (for tooltips)
   */
  getChordInfo(chord, key, scaleType) {
    const info = {
      name: chord,
      romanNumeral: this.getRomanNumeral(chord, key, scaleType),
      function: this.getChordFunction(chord, key, scaleType),
      description: this.getChordDescription(chord),
    };

    return info;
  }

  /**
   * Get Roman numeral for chord
   */
  getRomanNumeral(chord, key, scaleType) {
    // Simplified version - in production, use music theory library
    const root = this.preprocessor.chordUtils?.getRoot(chord) || chord[0];

    const majorScale = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const minorScale = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyIndex = notes.indexOf(key);
    const rootIndex = notes.indexOf(root);

    if (keyIndex === -1 || rootIndex === -1) return '?';

    const degree = (rootIndex - keyIndex + 12) % 12;
    const scaleDegree = Math.floor(degree * 7 / 12);

    return scaleType === 'major' ? majorScale[scaleDegree] : minorScale[scaleDegree];
  }

  /**
   * Get chord function (tonic, dominant, etc.)
   */
  getChordFunction(chord, key, scaleType) {
    const roman = this.getRomanNumeral(chord, key, scaleType);

    if (roman.includes('I') && !roman.includes('V')) return 'Tonic';
    if (roman.includes('V')) return 'Dominant';
    if (roman.includes('IV') || roman.includes('ii')) return 'Subdominant';
    if (roman.includes('vi') || roman.includes('iii')) return 'Tonic/Relative';

    return 'Other';
  }

  /**
   * Get chord description
   */
  getChordDescription(chord) {
    if (chord.includes('maj7')) return 'Major 7th - Jazzy, sophisticated';
    if (chord.includes('m7')) return 'Minor 7th - Smooth, mellow';
    if (chord.includes('7')) return '7th - Bluesy, tension';
    if (chord.includes('sus')) return 'Suspended - Open, floating';
    if (chord.includes('dim')) return 'Diminished - Tense, unstable';
    if (chord.includes('aug')) return 'Augmented - Tense, uplifting';
    if (chord.includes('m')) return 'Minor - Sad, introspective';

    return 'Major - Bright, happy';
  }
}

/**
 * Mock generator for testing without model
 */
export class MockChordGenerator {
  constructor() {
    // Multiple progression patterns per genre/mood combination
    this.progressionPatterns = {
      pop: {
        major: {
          happy: [
            ['I', 'V', 'vi', 'IV'],
            ['I', 'IV', 'V', 'I'],
            ['vi', 'IV', 'I', 'V'],
            ['I', 'V', 'IV', 'V'],
          ],
          uplifting: [
            ['I', 'V', 'vi', 'IV'],
            ['I', 'iii', 'IV', 'V'],
            ['vi', 'IV', 'I', 'V'],
          ],
          melancholic: [
            ['vi', 'IV', 'I', 'V'],
            ['vi', 'ii', 'IV', 'V'],
            ['I', 'vi', 'IV', 'V'],
          ],
          sad: [
            ['vi', 'IV', 'I', 'V'],
            ['vi', 'ii', 'V', 'I'],
          ],
        },
        minor: {
          melancholic: [
            ['i', 'VI', 'III', 'VII'],
            ['i', 'iv', 'VI', 'VII'],
          ],
          sad: [
            ['i', 'VI', 'iv', 'V'],
            ['i', 'VII', 'VI', 'V'],
          ],
        },
      },
      rock: {
        major: {
          energetic: [
            ['I', 'IV', 'V', 'IV'],
            ['I', 'V', 'IV', 'I'],
            ['I', 'bVII', 'IV', 'I'],
          ],
          aggressive: [
            ['I', 'bVII', 'IV', 'I'],
            ['i', 'bVII', 'bVI', 'bVII'],
          ],
        },
        minor: {
          aggressive: [
            ['i', 'VII', 'VI', 'VII'],
            ['i', 'bVI', 'bVII', 'i'],
          ],
        },
      },
      jazz: {
        major: {
          chill: [
            ['Imaj7', 'VIm7', 'IIm7', 'V7'],
            ['Imaj7', 'IVmaj7', 'VIIm7b5', 'III7'],
          ],
          romantic: [
            ['Imaj7', 'IVmaj7', 'IIIm7', 'VIm7'],
            ['IImaj7', 'V7', 'Imaj7', 'VIm7'],
          ],
        },
        minor: {
          mysterious: [
            ['im7', 'iv7', 'VII7', 'IIImaj7'],
            ['im7', 'IVm7', 'VIImaj7', 'IIImaj7'],
          ],
        },
      },
      blues: {
        major: {
          energetic: [
            ['I7', 'IV7', 'I7', 'V7'],
            ['I7', 'IV7', 'V7', 'IV7'],
          ],
        },
      },
      rnb: {
        major: {
          romantic: [
            ['Imaj7', 'VIm7', 'IIm7', 'V7'],
            ['Imaj7', 'IIIm7', 'VIm7', 'IIm7'],
          ],
          chill: [
            ['Imaj7', 'IVmaj7', 'VIm7', 'IIm7'],
          ],
        },
      },
      edm: {
        major: {
          energetic: [
            ['I', 'V', 'vi', 'III'],
            ['I', 'III', 'vi', 'IV'],
          ],
          uplifting: [
            ['I', 'V', 'vi', 'IV'],
            ['vi', 'IV', 'I', 'V'],
          ],
        },
      },
      classical: {
        major: {
          romantic: [
            ['I', 'IV', 'V', 'I'],
            ['I', 'ii', 'V', 'I'],
          ],
        },
        minor: {
          melancholic: [
            ['i', 'iv', 'V', 'i'],
            ['i', 'VI', 'iv', 'V'],
          ],
        },
      },
      progressive: {
        major: {
          mysterious: [
            ['I', 'bVII', 'IV', 'I'],
            ['I', 'bVI', 'bVII', 'IV'],
          ],
        },
        minor: {
          mysterious: [
            ['i', 'VI', 'iv', 'V'],
            ['i', 'bVII', 'bVI', 'V'],
          ],
        },
      },
    };
  }

  async generateProgression(genre, mood, key, scaleType, length = 4, temperature = 1.0, samplingStrategy = 'temperature') {
    // Get progression patterns for genre/mood/scale
    const genrePatterns = this.progressionPatterns[genre] || this.progressionPatterns.pop;
    const scalePatterns = genrePatterns[scaleType] || genrePatterns.major || {};

    // Try to find mood-specific pattern, fallback to any available pattern
    let patterns = scalePatterns[mood];
    if (!patterns || patterns.length === 0) {
      // Fallback to first available mood pattern
      const moods = Object.keys(scalePatterns);
      patterns = moods.length > 0 ? scalePatterns[moods[0]] : [['I', 'V', 'vi', 'IV']];
    }

    // Select pattern based on temperature (higher temp = more random)
    let selectedPattern;
    if (temperature < 0.7) {
      // Low temperature: always pick first (most common) pattern
      selectedPattern = patterns[0];
    } else if (temperature > 1.3) {
      // High temperature: completely random
      selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    } else {
      // Medium temperature: weighted towards first patterns
      const index = Math.floor(Math.random() * Math.min(patterns.length, 2));
      selectedPattern = patterns[index];
    }

    // Extend or trim pattern to match desired length
    let pattern = [...selectedPattern];
    while (pattern.length < length) {
      // Repeat or add variations
      const extraChords = this.getFillerChords(genre, scaleType, pattern.length);
      pattern.push(extraChords);
    }
    pattern = pattern.slice(0, length);

    // Add variations based on temperature
    if (temperature > 1.2 && Math.random() > 0.5) {
      pattern = this.addVariations(pattern, temperature);
    }

    // Convert to actual chords
    const chords = pattern.map(roman => this.romanToChord(roman, key, scaleType));

    return chords;
  }

  getFillerChords(genre, scaleType, position) {
    // Add appropriate filler chords based on position
    const fillers = {
      major: ['V', 'IV', 'ii', 'vi'],
      minor: ['V', 'iv', 'VI', 'VII'],
    };
    const options = fillers[scaleType] || fillers.major;
    return options[position % options.length];
  }

  addVariations(pattern, temperature) {
    // Add chord extensions based on temperature
    return pattern.map(roman => {
      if (temperature > 1.5 && Math.random() > 0.7) {
        // Add 7ths
        if (!roman.includes('7')) {
          if (roman.toLowerCase() === roman) {
            return roman + '7';
          } else {
            return roman + 'maj7';
          }
        }
      }
      return roman;
    });
  }

  romanToChord(roman, key, scaleType) {
    // Simplified Roman numeral to chord conversion
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyIndex = notes.indexOf(key);

    const romanNumerals = {
      'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11,
      'i': 0, 'ii': 2, 'iii': 4, 'iv': 5, 'v': 7, 'vi': 9, 'vii': 11,
      'bVII': 10, 'bVI': 8, 'bIII': 3,
    };

    // Extract base roman numeral
    let baseRoman = roman.replace('maj7', '').replace('m7', '').replace('7', '');
    const interval = romanNumerals[baseRoman] || 0;
    const chordRoot = notes[(keyIndex + interval) % 12];

    // Add quality
    if (roman.includes('maj7')) return chordRoot + 'maj7';
    if (roman.includes('m7')) return chordRoot + 'm7';
    if (roman.includes('7')) return chordRoot + '7';
    if (roman.includes('m') || roman === 'i' || roman === 'ii' || roman === 'iii' || roman === 'iv' || roman === 'v' || roman === 'vi' || roman === 'vii') {
      return chordRoot + 'm';
    }

    return chordRoot;
  }

  async generateVariation(progression, genre, mood, key, scaleType, temperature = 1.2) {
    // Keep first 2 chords, vary the rest
    const variation = [...progression];
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Variation strategies based on temperature
    const changeRate = Math.min(0.9, temperature / 2); // Higher temp = more changes

    for (let i = 2; i < variation.length; i++) {
      // Decide whether to modify this chord
      if (Math.random() < changeRate) {
        const originalChord = variation[i];
        const root = originalChord.match(/^[A-G][#b]?/)?.[0] || 'C';
        const rootIndex = notes.indexOf(root);

        // Choose variation type randomly
        const variationType = Math.random();

        if (variationType < 0.3) {
          // Type 1: Add/remove 7th
          if (originalChord.includes('maj7')) {
            variation[i] = root;
          } else if (originalChord.includes('m7')) {
            variation[i] = root + 'm';
          } else if (originalChord.includes('7')) {
            variation[i] = root;
          } else if (originalChord.includes('m')) {
            variation[i] = root + 'm7';
          } else {
            variation[i] = root + '7';
          }
        } else if (variationType < 0.6) {
          // Type 2: Change quality (major <-> minor)
          if (originalChord.includes('m')) {
            variation[i] = root;
          } else {
            variation[i] = root + 'm';
          }
        } else if (variationType < 0.8) {
          // Type 3: Substitute with related chord (up/down a third)
          const direction = Math.random() > 0.5 ? 1 : -1;
          const interval = direction * (Math.random() > 0.5 ? 3 : 4); // minor or major third
          const newRoot = notes[(rootIndex + interval + 12) % 12];
          variation[i] = newRoot + (scaleType === 'minor' ? 'm' : '');
        } else {
          // Type 4: Add extension (sus, add9, etc.)
          const extensions = ['sus4', 'sus2', 'add9', '6'];
          const ext = extensions[Math.floor(Math.random() * extensions.length)];
          variation[i] = root + ext;
        }
      }
    }

    return variation;
  }

  getChordInfo(chord, key, scaleType) {
    return {
      name: chord,
      romanNumeral: 'I',
      function: 'Demo Mode',
      description: 'Using mock chord generator',
    };
  }
}
