import * as Tone from 'tone';

/**
 * AudioEngine
 * Professional audio playback system with Tone.js
 */
export class AudioEngine {
  constructor() {
    this.synth = null;
    this.reverb = null;
    this.chorus = null;
    this.volume = null;
    this.sequence = null;
    this.isPlaying = false;
    this.isLooping = false;
    this.currentSynthType = 'piano';
    this.currentChordIndex = -1;
    this.onChordChange = null;
    this.onPlaybackEnd = null;

    // Initialize on first user interaction
    this.initialized = false;
  }

  /**
   * Initialize audio context (must be called after user gesture)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await Tone.start();
      console.log('🎵 Audio engine initialized');

      // Create effects chain
      this.reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      }).toDestination();

      this.chorus = new Tone.Chorus({
        frequency: 1.5,
        delayTime: 3.5,
        depth: 0.7,
        wet: 0.2,
      }).connect(this.reverb);

      this.volume = new Tone.Volume(-6).connect(this.chorus);

      // Create default synth
      this.createSynth(this.currentSynthType);

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing audio:', error);
      throw error;
    }
  }

  /**
   * Create synthesizer based on type
   */
  createSynth(type = 'piano') {
    // Dispose old synth if exists
    if (this.synth) {
      this.synth.dispose();
    }

    switch (type) {
      case 'piano':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: 'triangle',
          },
          envelope: {
            attack: 0.008,
            decay: 0.3,
            sustain: 0.1,
            release: 2,
          },
        }).connect(this.volume);
        break;

      case 'pad':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: 'sawtooth',
          },
          envelope: {
            attack: 0.5,
            decay: 0.3,
            sustain: 0.8,
            release: 3,
          },
        }).connect(this.volume);
        break;

      case 'synth':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: 'square',
          },
          envelope: {
            attack: 0.02,
            decay: 0.2,
            sustain: 0.3,
            release: 1,
          },
        }).connect(this.volume);
        break;

      case 'electric':
        this.synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3,
          modulationIndex: 10,
          envelope: {
            attack: 0.01,
            decay: 0.3,
            sustain: 0.2,
            release: 1.5,
          },
          modulation: {
            type: 'square',
          },
        }).connect(this.volume);
        break;

      default:
        this.createSynth('piano');
        return;
    }

    this.currentSynthType = type;
  }

  /**
   * Change synthesizer type
   */
  async changeSynthType(type) {
    await this.initialize();
    this.createSynth(type);
  }

  /**
   * Set volume (-60 to 0 dB)
   */
  setVolume(db) {
    if (this.volume) {
      this.volume.volume.value = db;
    }
  }

  /**
   * Convert chord name to MIDI notes
   */
  chordToMidi(chordName, octave = 4) {
    const noteToMidi = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11,
    };

    // Parse chord name
    const rootMatch = chordName.match(/^([A-G][#b]?)/);
    if (!rootMatch) return [60, 64, 67]; // Default to C major

    const root = rootMatch[1];
    const quality = chordName.slice(root.length);

    const rootMidi = noteToMidi[root];
    if (rootMidi === undefined) return [60, 64, 67];

    const baseMidi = rootMidi + (octave * 12);

    // Define intervals for different chord qualities
    let intervals = [0, 4, 7]; // Major triad by default

    // Major variations
    if (quality === '' || quality === 'maj' || quality === 'M') {
      intervals = [0, 4, 7];
    } else if (quality === 'maj7' || quality === 'M7' || quality === 'Δ7') {
      intervals = [0, 4, 7, 11];
    } else if (quality === '6') {
      intervals = [0, 4, 7, 9];
    } else if (quality === 'add9') {
      intervals = [0, 4, 7, 14];
    } else if (quality === '9' || quality === 'maj9') {
      intervals = [0, 4, 7, 11, 14];
    }
    // Minor variations
    else if (quality === 'm' || quality === 'min') {
      intervals = [0, 3, 7];
    } else if (quality === 'm7' || quality === 'min7') {
      intervals = [0, 3, 7, 10];
    } else if (quality === 'm9' || quality === 'min9') {
      intervals = [0, 3, 7, 10, 14];
    } else if (quality === 'm6' || quality === 'min6') {
      intervals = [0, 3, 7, 9];
    } else if (quality === 'mmaj7' || quality === 'mM7') {
      intervals = [0, 3, 7, 11];
    }
    // Dominant variations
    else if (quality === '7' || quality === 'dom7') {
      intervals = [0, 4, 7, 10];
    } else if (quality === '9' || quality === 'dom9') {
      intervals = [0, 4, 7, 10, 14];
    } else if (quality === '13') {
      intervals = [0, 4, 7, 10, 14, 21];
    } else if (quality === '7sus4') {
      intervals = [0, 5, 7, 10];
    }
    // Suspended
    else if (quality === 'sus2') {
      intervals = [0, 2, 7];
    } else if (quality === 'sus4') {
      intervals = [0, 5, 7];
    }
    // Diminished
    else if (quality === 'dim' || quality === '°') {
      intervals = [0, 3, 6];
    } else if (quality === 'dim7' || quality === '°7') {
      intervals = [0, 3, 6, 9];
    } else if (quality === 'm7b5' || quality === 'ø7') {
      intervals = [0, 3, 6, 10];
    }
    // Augmented
    else if (quality === 'aug' || quality === '+') {
      intervals = [0, 4, 8];
    } else if (quality === 'aug7' || quality === '7+') {
      intervals = [0, 4, 8, 10];
    }

    // Convert intervals to MIDI notes
    const midiNotes = intervals.map(interval => baseMidi + interval);

    return midiNotes;
  }

  /**
   * Convert MIDI notes to frequency
   */
  midiToFrequency(midi) {
    return Tone.Frequency(midi, 'midi').toFrequency();
  }

  /**
   * Play a single chord
   */
  async playChord(chordName, duration = '2n', octave = 4) {
    await this.initialize();

    const midiNotes = this.chordToMidi(chordName, octave);
    const frequencies = midiNotes.map(midi => this.midiToFrequency(midi));

    this.synth.triggerAttackRelease(frequencies, duration);
  }

  /**
   * Play chord progression
   */
  async playProgression(chords, tempo = 120, loop = false) {
    await this.initialize();

    if (chords.length === 0) {
      throw new Error('No chords to play');
    }

    // Stop any existing playback
    this.stop();

    this.isPlaying = true;
    this.isLooping = loop;
    Tone.Transport.bpm.value = tempo;

    let chordIndex = 0;

    // Create sequence
    this.sequence = new Tone.Sequence(
      (time, chord) => {
        const midiNotes = this.chordToMidi(chord, 4);
        const frequencies = midiNotes.map(midi => this.midiToFrequency(midi));

        // Play the chord
        this.synth.triggerAttackRelease(frequencies, '2n', time);

        // Update current chord index on the main thread
        Tone.Draw.schedule(() => {
          this.currentChordIndex = chordIndex;
          if (this.onChordChange) {
            this.onChordChange(chordIndex);
          }

          chordIndex++;

          // Check if we've reached the end
          if (!loop && chordIndex >= chords.length) {
            // Schedule playback end
            setTimeout(() => {
              this.stop();
              if (this.onPlaybackEnd) {
                this.onPlaybackEnd();
              }
            }, 2000); // Wait for last chord to finish
          } else if (chordIndex >= chords.length) {
            chordIndex = 0; // Loop back
          }
        }, time);
      },
      chords,
      '1m' // One measure per chord
    );

    this.sequence.loop = loop;
    this.sequence.start(0);

    Tone.Transport.start();
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.isPlaying) {
      Tone.Transport.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Resume playback
   */
  resume() {
    if (!this.isPlaying) {
      Tone.Transport.start();
      this.isPlaying = true;
    }
  }

  /**
   * Stop playback
   */
  stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel();

    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }

    this.isPlaying = false;
    this.currentChordIndex = -1;

    if (this.onChordChange) {
      this.onChordChange(-1);
    }
  }

  /**
   * Set tempo (BPM)
   */
  setTempo(bpm) {
    Tone.Transport.bpm.value = bpm;
  }

  /**
   * Toggle loop
   */
  toggleLoop() {
    this.isLooping = !this.isLooping;
    if (this.sequence) {
      this.sequence.loop = this.isLooping;
    }
    return this.isLooping;
  }

  /**
   * Export progression to MIDI file
   */
  exportToMidi(chords, fileName = 'progression.mid') {
    try {
      // Create MIDI data structure
      const midiData = this.createMidiData(chords);

      // Convert to binary
      const midiBlob = this.midiDataToBlob(midiData);

      // Download
      const url = URL.createObjectURL(midiBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ MIDI file exported:', fileName);
    } catch (error) {
      console.error('Error exporting MIDI:', error);
      throw error;
    }
  }

  /**
   * Create MIDI data from chords
   */
  createMidiData(chords) {
    const ticksPerBeat = 480;
    const tempo = 500000; // 120 BPM in microseconds per quarter note

    // MIDI header
    const header = [
      0x4D, 0x54, 0x68, 0x64, // "MThd"
      0x00, 0x00, 0x00, 0x06, // Header length
      0x00, 0x00, // Format 0
      0x00, 0x01, // One track
      (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF, // Ticks per beat
    ];

    // Track events
    const events = [];

    // Tempo event
    events.push(0x00, 0xFF, 0x51, 0x03); // Delta time, Meta event, Tempo, Length
    events.push((tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);

    // Add chords
    let currentTick = 0;
    chords.forEach((chord, index) => {
      const midiNotes = this.chordToMidi(chord, 4);
      const duration = ticksPerBeat * 4; // Whole note

      // Note on events
      midiNotes.forEach(note => {
        events.push(0x00, 0x90, note, 0x64); // Delta 0, Note on, Note, Velocity
      });

      // Note off events
      midiNotes.forEach(note => {
        events.push(...this.encodeVariableLength(duration), 0x80, note, 0x40);
      });

      currentTick += duration;
    });

    // End of track
    events.push(0x00, 0xFF, 0x2F, 0x00);

    // Track header
    const trackHeader = [
      0x4D, 0x54, 0x72, 0x6B, // "MTrk"
      (events.length >> 24) & 0xFF,
      (events.length >> 16) & 0xFF,
      (events.length >> 8) & 0xFF,
      events.length & 0xFF,
    ];

    return new Uint8Array([...header, ...trackHeader, ...events]);
  }

  /**
   * Encode variable length value for MIDI
   */
  encodeVariableLength(value) {
    const bytes = [];
    bytes.push(value & 0x7F);

    value >>= 7;
    while (value > 0) {
      bytes.unshift((value & 0x7F) | 0x80);
      value >>= 7;
    }

    return bytes;
  }

  /**
   * Convert MIDI data to Blob
   */
  midiDataToBlob(data) {
    return new Blob([data], { type: 'audio/midi' });
  }

  /**
   * Get current playback state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isLooping: this.isLooping,
      currentChordIndex: this.currentChordIndex,
      synthType: this.currentSynthType,
      initialized: this.initialized,
    };
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stop();

    if (this.synth) this.synth.dispose();
    if (this.reverb) this.reverb.dispose();
    if (this.chorus) this.chorus.dispose();
    if (this.volume) this.volume.dispose();

    this.initialized = false;
  }
}

// Singleton instance
let audioEngineInstance = null;

export function getAudioEngine() {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

export default AudioEngine;
