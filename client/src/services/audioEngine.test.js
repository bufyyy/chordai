import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioEngine } from './audioEngine';

describe('AudioEngine', () => {
  let audioEngine;

  beforeEach(() => {
    audioEngine = new AudioEngine();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create AudioEngine instance', () => {
      expect(audioEngine).toBeDefined();
      expect(audioEngine.initialized).toBe(false);
      expect(audioEngine.isPlaying).toBe(false);
      expect(audioEngine.currentSynthType).toBe('piano');
    });
  });

  describe('chordToMidi', () => {
    it('should convert major chords to MIDI notes', () => {
      const midiNotes = audioEngine.chordToMidi('C', 4);
      expect(midiNotes).toHaveLength(3);
      expect(midiNotes).toEqual([48, 52, 55]); // C4, E4, G4
    });

    it('should convert minor chords to MIDI notes', () => {
      const midiNotes = audioEngine.chordToMidi('Am', 4);
      expect(midiNotes).toHaveLength(3);
      expect(midiNotes).toEqual([57, 60, 64]); // A4, C5, E5
    });

    it('should convert 7th chords correctly', () => {
      const midiNotes = audioEngine.chordToMidi('Cmaj7', 4);
      expect(midiNotes).toHaveLength(4);
      expect(midiNotes).toEqual([48, 52, 55, 59]); // C4, E4, G4, B4
    });

    it('should handle dominant 7th chords', () => {
      const midiNotes = audioEngine.chordToMidi('G7', 4);
      expect(midiNotes).toHaveLength(4);
      expect(midiNotes).toEqual([55, 59, 62, 65]); // G4, B4, D5, F5
    });

    it('should handle suspended chords', () => {
      const sus2 = audioEngine.chordToMidi('Csus2', 4);
      expect(sus2).toEqual([48, 50, 55]); // C4, D4, G4

      const sus4 = audioEngine.chordToMidi('Csus4', 4);
      expect(sus4).toEqual([48, 53, 55]); // C4, F4, G4
    });

    it('should handle diminished chords', () => {
      const dim = audioEngine.chordToMidi('Cdim', 4);
      expect(dim).toEqual([48, 51, 54]); // C4, Eb4, Gb4

      const dim7 = audioEngine.chordToMidi('Cdim7', 4);
      expect(dim7).toHaveLength(4);
    });

    it('should handle augmented chords', () => {
      const aug = audioEngine.chordToMidi('Caug', 4);
      expect(aug).toEqual([48, 52, 56]); // C4, E4, G#4
    });

    it('should handle sharps and flats', () => {
      const cSharp = audioEngine.chordToMidi('C#', 4);
      expect(cSharp[0]).toBe(49); // C#4

      const dFlat = audioEngine.chordToMidi('Db', 4);
      expect(dFlat[0]).toBe(49); // Db4 (same as C#4)
    });

    it('should handle different octaves', () => {
      const c3 = audioEngine.chordToMidi('C', 3);
      const c4 = audioEngine.chordToMidi('C', 4);
      const c5 = audioEngine.chordToMidi('C', 5);

      expect(c4[0] - c3[0]).toBe(12); // 1 octave difference
      expect(c5[0] - c4[0]).toBe(12); // 1 octave difference
    });

    it('should return default C major for invalid chord', () => {
      const invalid = audioEngine.chordToMidi('InvalidChord', 4);
      expect(invalid).toEqual([60, 64, 67]); // Default C major
    });
  });

  describe('midiToFrequency', () => {
    it('should convert MIDI notes to frequencies', () => {
      // Middle C (C4) = MIDI 60 = 261.63 Hz (approximately)
      const freq = audioEngine.midiToFrequency(60);
      expect(freq).toBeDefined();
      expect(typeof freq).toBe('number');
    });
  });

  describe('synth types', () => {
    it('should support multiple synth types', () => {
      const types = ['piano', 'pad', 'synth', 'electric'];

      types.forEach((type) => {
        expect(() => audioEngine.createSynth(type)).not.toThrow();
        expect(audioEngine.currentSynthType).toBe(type);
      });
    });

    it('should default to piano for unknown type', () => {
      audioEngine.createSynth('unknown');
      expect(audioEngine.currentSynthType).toBe('piano');
    });
  });

  describe('playback state', () => {
    it('should track playback state', () => {
      const state = audioEngine.getState();

      expect(state).toBeDefined();
      expect(state.isPlaying).toBe(false);
      expect(state.isLooping).toBe(false);
      expect(state.currentChordIndex).toBe(-1);
      expect(state.synthType).toBe('piano');
      expect(state.initialized).toBe(false);
    });

    it('should toggle loop state', () => {
      expect(audioEngine.isLooping).toBe(false);

      const newState = audioEngine.toggleLoop();
      expect(newState).toBe(true);
      expect(audioEngine.isLooping).toBe(true);

      audioEngine.toggleLoop();
      expect(audioEngine.isLooping).toBe(false);
    });
  });

  describe('MIDI export', () => {
    it('should create MIDI data structure', () => {
      const chords = ['C', 'F', 'G', 'C'];
      const midiData = audioEngine.createMidiData(chords);

      expect(midiData).toBeInstanceOf(Uint8Array);
      expect(midiData.length).toBeGreaterThan(0);

      // Check MIDI header "MThd"
      expect(midiData[0]).toBe(0x4d); // 'M'
      expect(midiData[1]).toBe(0x54); // 'T'
      expect(midiData[2]).toBe(0x68); // 'h'
      expect(midiData[3]).toBe(0x64); // 'd'
    });

    it('should encode variable length values', () => {
      const encoded = audioEngine.encodeVariableLength(127);
      expect(encoded).toEqual([127]);

      const encoded128 = audioEngine.encodeVariableLength(128);
      expect(encoded128).toEqual([0x81, 0x00]);

      const encoded0 = audioEngine.encodeVariableLength(0);
      expect(encoded0).toEqual([0]);
    });

    it('should convert MIDI data to Blob', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const blob = audioEngine.midiDataToBlob(data);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/midi');
    });
  });

  describe('edge cases', () => {
    it('should handle empty chord progression', () => {
      expect(() => audioEngine.createMidiData([])).not.toThrow();
    });

    it('should handle null callbacks', () => {
      expect(() => {
        audioEngine.onChordChange = null;
        audioEngine.onPlaybackEnd = null;
      }).not.toThrow();
    });

    it('should handle rapid start/stop', () => {
      expect(() => {
        audioEngine.stop();
        audioEngine.stop();
        audioEngine.stop();
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should dispose resources properly', () => {
      expect(() => audioEngine.dispose()).not.toThrow();
      expect(audioEngine.initialized).toBe(false);
    });
  });
});
