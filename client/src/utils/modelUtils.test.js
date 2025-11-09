import { describe, it, expect, beforeEach } from 'vitest';
import { ChordProgressionPreprocessor } from './modelUtils';

describe('ChordProgressionPreprocessor', () => {
  let preprocessor;

  beforeEach(() => {
    preprocessor = new ChordProgressionPreprocessor();

    // Mock vocabularies
    preprocessor.chordVocab = {
      chord_to_id: {
        '<PAD>': 0,
        '<START>': 1,
        '<END>': 2,
        '<UNK>': 3,
        'C': 4,
        'Dm': 5,
        'Em': 6,
        'F': 7,
        'G': 8,
        'Am': 9,
      },
      id_to_chord: {
        0: '<PAD>',
        1: '<START>',
        2: '<END>',
        3: '<UNK>',
        4: 'C',
        5: 'Dm',
        6: 'Em',
        7: 'F',
        8: 'G',
        9: 'Am',
      },
    };

    preprocessor.genreMapping = {
      genre_to_id: { pop: 0, rock: 1, jazz: 2 },
      id_to_genre: { 0: 'pop', 1: 'rock', 2: 'jazz' },
    };

    preprocessor.moodMapping = {
      mood_to_id: { uplifting: 0, melancholic: 1, energetic: 2 },
      id_to_mood: { 0: 'uplifting', 1: 'melancholic', 2: 'energetic' },
    };

    preprocessor.keyMapping = {
      key_to_id: { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 },
      id_to_key: { 0: 'C', 1: 'D', 2: 'E', 3: 'F', 4: 'G', 5: 'A', 6: 'B' },
    };

    preprocessor.scaleTypeMapping = {
      scale_type_to_id: { major: 0, minor: 1 },
      id_to_scale_type: { 0: 'major', 1: 'minor' },
    };
  });

  describe('encodeChord', () => {
    it('should encode known chords correctly', () => {
      expect(preprocessor.encodeChord('C')).toBe(4);
      expect(preprocessor.encodeChord('Dm')).toBe(5);
      expect(preprocessor.encodeChord('G')).toBe(8);
    });

    it('should return UNK token for unknown chords', () => {
      expect(preprocessor.encodeChord('Xmaj7')).toBe(3);
      expect(preprocessor.encodeChord('Unknown')).toBe(3);
    });

    it('should handle special tokens', () => {
      expect(preprocessor.encodeChord('<PAD>')).toBe(0);
      expect(preprocessor.encodeChord('<START>')).toBe(1);
      expect(preprocessor.encodeChord('<END>')).toBe(2);
    });
  });

  describe('decodeChord', () => {
    it('should decode chord IDs correctly', () => {
      expect(preprocessor.decodeChord(4)).toBe('C');
      expect(preprocessor.decodeChord(5)).toBe('Dm');
      expect(preprocessor.decodeChord(8)).toBe('G');
    });

    it('should return UNK for invalid IDs', () => {
      expect(preprocessor.decodeChord(999)).toBe('<UNK>');
      expect(preprocessor.decodeChord(-1)).toBe('<UNK>');
    });
  });

  describe('prepareInput', () => {
    it('should prepare input with empty seed', () => {
      const input = preprocessor.prepareInput([], 'pop', 'uplifting', 'C', 'major');

      expect(input.chordSequence).toHaveLength(12);
      expect(input.chordSequence[0]).toBe(1); // <START>
      expect(input.genreId).toBe(0);
      expect(input.moodId).toBe(0);
      expect(input.keyId).toBe(0);
      expect(input.scaleTypeId).toBe(0);
    });

    it('should prepare input with seed chords', () => {
      const input = preprocessor.prepareInput(['C', 'F', 'G'], 'pop', 'uplifting', 'C', 'major');

      expect(input.chordSequence[0]).toBe(1); // <START>
      expect(input.chordSequence[1]).toBe(4); // C
      expect(input.chordSequence[2]).toBe(7); // F
      expect(input.chordSequence[3]).toBe(8); // G
    });

    it('should pad sequences to fixed length', () => {
      const input = preprocessor.prepareInput(['C'], 'pop', 'uplifting', 'C', 'major');

      expect(input.chordSequence).toHaveLength(12);
      // Check padding
      const paddingStart = input.chordSequence.findIndex((id, idx) => idx > 2 && id === 0);
      expect(paddingStart).toBeGreaterThan(0);
    });
  });

  describe('sampleWithTemperature', () => {
    it('should sample deterministically with temperature 0 (greedy)', () => {
      const probs = [0.1, 0.2, 0.6, 0.1]; // Index 2 is highest

      // With very low temperature, should always pick highest probability
      const samples = [];
      for (let i = 0; i < 10; i++) {
        samples.push(preprocessor.sampleWithTemperature(probs, 0.01));
      }

      // All samples should be index 2
      expect(samples.every(s => s === 2)).toBe(true);
    });

    it('should sample from valid probability distribution', () => {
      const probs = [0.25, 0.25, 0.25, 0.25];
      const sample = preprocessor.sampleWithTemperature(probs, 1.0);

      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThan(4);
      expect(Number.isInteger(sample)).toBe(true);
    });
  });

  describe('getters', () => {
    it('should return correct vocabularies', () => {
      expect(preprocessor.getGenres()).toContain('pop');
      expect(preprocessor.getGenres()).toContain('rock');

      expect(preprocessor.getMoods()).toContain('uplifting');
      expect(preprocessor.getMoods()).toContain('melancholic');

      expect(preprocessor.getKeys()).toContain('C');
      expect(preprocessor.getKeys()).toContain('G');

      expect(preprocessor.getScaleTypes()).toContain('major');
      expect(preprocessor.getScaleTypes()).toContain('minor');
    });

    it('should return vocabulary sizes', () => {
      expect(preprocessor.getChordVocabSize()).toBe(10);
      expect(preprocessor.getGenreCount()).toBe(3);
      expect(preprocessor.getMoodCount()).toBe(3);
      expect(preprocessor.getKeyCount()).toBe(7);
      expect(preprocessor.getScaleTypeCount()).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() => preprocessor.encodeChord(null)).not.toThrow();
      expect(() => preprocessor.encodeChord(undefined)).not.toThrow();
    });

    it('should handle empty string chord', () => {
      expect(preprocessor.encodeChord('')).toBe(3); // <UNK>
    });

    it('should handle case sensitivity', () => {
      // Chords should be case-sensitive
      expect(preprocessor.encodeChord('c')).toBe(3); // <UNK>
      expect(preprocessor.encodeChord('C')).toBe(4); // Valid
    });
  });
});
