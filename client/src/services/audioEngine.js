import * as Tone from 'tone';
import { Chord, Note } from '@tonaljs/tonal';

/**
 * Match model vocabulary — same rule as modelService.formatChordForDisplay (s → # on root, not sus).
 */
function vocabChordToDisplay(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw.replace(/^([A-G]b?)s(?!us)/, '$1#');
}

/**
 * Spell chord tones in ascending MIDI order. Uses the same root placement as the legacy engine:
 * root MIDI = Note.chroma(root) + octave * 12 (e.g. C + octave 4 -> 48, not scientific "C4" == 60).
 */
function noteNamesToAscendingMidi(noteNames, octave) {
  if (!noteNames?.length) return null;
  const rootChroma = Note.chroma(noteNames[0]);
  if (rootChroma === null || rootChroma === undefined) return null;
  const baseMidi = rootChroma + octave * 12;
  const midis = [baseMidi];
  let prev = baseMidi;
  for (let i = 1; i < noteNames.length; i++) {
    const c = Note.chroma(noteNames[i]);
    if (c == null || c === undefined) continue;
    let candidate = c + octave * 12;
    while (candidate <= prev) candidate += 12;
    midis.push(candidate);
    prev = candidate;
  }
  return midis.length ? midis : null;
}

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
    this.currentSynthType = 'acoustic-piano';
    this.currentChordIndex = -1;
    this.onChordChange = null;
    this.onPlaybackEnd = null;
    this.samplerLoaded = false;
    this.playbackStopTimeout = null;

    // Initialize on first user interaction
    this.initialized = false;

    // Settings
    this.audioQuality = 'high';
  }

  applyAudioQuality(quality) {
    const q = quality === 'low' || quality === 'medium' || quality === 'high' ? quality : 'high';
    this.audioQuality = q;

    // Prefer lower latency for "low", higher fidelity for "high"
    const latencyHint =
      q === 'low' ? 'interactive' : q === 'medium' ? 'balanced' : 'playback';
    try {
      // Tone.js exposes the underlying AudioContext via Tone.context
      if (Tone?.context && 'latencyHint' in Tone.context) {
        Tone.context.latencyHint = latencyHint;
      }
    } catch (e) {
      // ignore if not supported in environment
    }

    if (this.reverb) {
      this.reverb.decay = q === 'low' ? 1.5 : q === 'medium' ? 2.0 : 2.5;
      this.reverb.wet.value = q === 'low' ? 0.15 : q === 'medium' ? 0.25 : 0.3;
    }

    if (this.chorus) {
      this.chorus.wet.value = q === 'low' ? 0.1 : q === 'medium' ? 0.15 : 0.2;
    }
  }

  setAudioQuality(quality) {
    this.applyAudioQuality(quality);
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
      await this.createSynth(this.currentSynthType);

      // Apply settings after nodes exist
      this.applyAudioQuality(this.audioQuality);

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing audio:', error);
      throw error;
    }
  }

  /**
   * Create synthesizer based on type
   */
  async createSynth(type = 'acoustic-piano') {
    // Dispose old synth if exists
    if (this.synth) {
      this.synth.dispose();
    }

    switch (type) {
      case 'acoustic-piano': {
        this.samplerLoaded = false;
        this.synth = new Tone.Sampler({
          urls: {
            A1: 'A1.mp3',
            C2: 'C2.mp3',
            'D#2': 'Ds2.mp3',
            'F#2': 'Fs2.mp3',
            A2: 'A2.mp3',
            C3: 'C3.mp3',
            'D#3': 'Ds3.mp3',
            'F#3': 'Fs3.mp3',
            A3: 'A3.mp3',
            C4: 'C4.mp3',
            'D#4': 'Ds4.mp3',
            'F#4': 'Fs4.mp3',
            A4: 'A4.mp3',
            C5: 'C5.mp3',
            'D#5': 'Ds5.mp3',
            'F#5': 'Fs5.mp3',
            A5: 'A5.mp3',
            C6: 'C6.mp3',
            'D#6': 'Ds6.mp3',
            'F#6': 'Fs6.mp3',
            A6: 'A6.mp3',
            C7: 'C7.mp3',
            'D#7': 'Ds7.mp3',
            'F#7': 'Fs7.mp3',
            A7: 'A7.mp3',
            C8: 'C8.mp3',
          },
          baseUrl: 'https://tonejs.github.io/audio/salamander/',
          onload: () => {
            this.samplerLoaded = true;
          },
        }).connect(this.volume);
        try {
          if (typeof Tone.loaded === 'function') {
            await Tone.loaded();
            this.samplerLoaded = true;
          }
        } catch {
          // Some test mocks don't define Tone.loaded; sampler onload flag still handles readiness.
        }
        break;
      }

      case 'electric-piano':
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

      case 'synth-lead':
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

      case 'organ':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine', partialCount: 3 },
          envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.4 },
        }).connect(this.volume);
        this.samplerLoaded = true;
        break;

      case 'strings':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.8, decay: 0.3, sustain: 0.7, release: 3.0 },
        }).connect(this.volume);
        this.samplerLoaded = true;
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
        this.samplerLoaded = true;
        break;

      default:
        await this.createSynth('acoustic-piano');
        return;
    }

    if (type !== 'acoustic-piano') {
      this.samplerLoaded = true;
    }
    this.currentSynthType = type;
  }

  async waitForSamplerReady(timeoutMs = 5000) {
    if (this.currentSynthType !== 'acoustic-piano' || this.samplerLoaded) return true;

    const start = Date.now();
    while (!this.samplerLoaded && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return this.samplerLoaded;
  }

  /**
   * Change synthesizer type
   */
  async changeSynthType(type) {
    await this.initialize();
    await this.createSynth(type);
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
    const displaySymbol = vocabChordToDisplay(chordName);
    const tonalChord = Chord.get(displaySymbol);
    if (!tonalChord.empty && tonalChord.notes?.length) {
      const fromTonal = noteNamesToAscendingMidi(tonalChord.notes, octave);
      if (fromTonal?.length) return fromTonal;
    }

    const noteToMidi = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11,
    };

    // Parse chord name (display form so Fs → F# roots work)
    const rootMatch = displaySymbol.match(/^([A-G][#b]?)/);
    if (!rootMatch) return [60, 64, 67]; // Default to C major

    const root = rootMatch[1];
    const quality = displaySymbol.slice(root.length);

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
    } else if (quality === 'add11') {
      intervals = [0, 4, 7, 17];
    } else if (quality === 'maj9') {
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
    } else if (quality === 'madd11') {
      intervals = [0, 3, 7, 17];
    } else if (quality === 'mb9') {
      intervals = [0, 3, 7, 13];
    } else if (quality === 'm11b9') {
      intervals = [0, 3, 7, 10, 13, 17];
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
    } else if (quality === 'dimb7') {
      intervals = [0, 3, 6, 9];
    } else if (quality === 'dim9') {
      intervals = [0, 3, 6, 14];
    } else if (quality === 'dimb9') {
      intervals = [0, 3, 6, 13];
    } else if (quality === 'dim13b9') {
      intervals = [0, 3, 6, 9, 13, 20];
    } else if (quality === 'dim11b9') {
      intervals = [0, 3, 6, 10, 13, 17];
    } else if (quality === 'dimadd11') {
      intervals = [0, 3, 6, 17];
    } else if (quality === 'dimadd13') {
      intervals = [0, 3, 6, 20];
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
    const samplerReady = await this.waitForSamplerReady();
    if (this.currentSynthType === 'acoustic-piano' && !samplerReady) {
      console.warn('Sampler failed to load in time; skipping chord playback.');
      return;
    }

    const midiNotes = this.chordToMidi(chordName, octave);
    const frequencies = midiNotes.map(midi => this.midiToFrequency(midi));

    this.synth.triggerAttackRelease(frequencies, duration);
  }

  /**
   * Play chord progression
   */
  async playProgression(chords, tempo = 120, loop = false, octave = 4, durations = null) {
    await this.initialize();
    const samplerReady = await this.waitForSamplerReady();
    if (this.currentSynthType === 'acoustic-piano' && !samplerReady) {
      console.warn('Sampler failed to load in time; skipping progression playback.');
      return;
    }

    if (chords.length === 0) {
      throw new Error('No chords to play');
    }

    // Stop any existing playback
    this.stop();

    this.isPlaying = true;
    this.isLooping = loop;
    Tone.Transport.bpm.value = tempo;

    const safeDurations = chords.map((_, index) => {
      const beats = Number(durations?.[index]);
      if (!Number.isFinite(beats)) return 4;
      return Math.max(1, Math.min(8, beats));
    });

    const events = [];
    let currentBeat = 0;
    const secondsPerBeat = 60 / tempo;
    for (let index = 0; index < chords.length; index++) {
      const beats = safeDurations[index];
      events.push({
        time: currentBeat * secondsPerBeat,
        chord: chords[index],
        index,
        beats,
      });
      currentBeat += beats;
    }
    const totalBeats = currentBeat;

    // Create variable-timing part (per-chord beats)
    this.sequence = new Tone.Part(
      (time, event) => {
        const midiNotes = this.chordToMidi(event.chord, octave);
        const frequencies = midiNotes.map(midi => this.midiToFrequency(midi));

        // Hold nearly the full beat span so there is no audible gap.
        const noteDurationSeconds = secondsPerBeat * event.beats * 0.98;
        this.synth.triggerAttackRelease(frequencies, noteDurationSeconds, time);

        // Update current chord index on the main thread
        Tone.Draw.schedule(() => {
          this.currentChordIndex = event.index;
          if (this.onChordChange) {
            this.onChordChange(event.index);
          }
        }, time);
      },
      events
    );

    this.sequence.loop = loop;
    this.sequence.loopEnd = totalBeats * secondsPerBeat;
    this.sequence.start(0);

    if (!loop && events.length > 0) {
      const stopDelayMs = (60 / tempo) * totalBeats * 1000 + 500;
      this.playbackStopTimeout = setTimeout(() => {
        if (!this.isPlaying) return;
        this.stop();
        if (this.onPlaybackEnd) {
          this.onPlaybackEnd();
        }
      }, stopDelayMs);
    }

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
    if (this.playbackStopTimeout) {
      clearTimeout(this.playbackStopTimeout);
      this.playbackStopTimeout = null;
    }

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
    chords.forEach((chord) => {
      const midiNotes = this.chordToMidi(chord, 4);
      const duration = ticksPerBeat * 4; // Whole note

      // Note on events (all at delta 0 — simultaneous)
      midiNotes.forEach(note => {
        events.push(0x00, 0x90, note, 0x64); // Delta 0, Note on, Note, Velocity
      });

      // Note off events — first note carries the duration delta,
      // remaining notes have delta 0 (they all end at the same time)
      midiNotes.forEach((note, noteIdx) => {
        const delta = noteIdx === 0 ? duration : 0;
        events.push(...this.encodeVariableLength(delta), 0x80, note, 0x40);
      });
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
