import { create } from 'zustand';
import modelService from '../services/modelService';
import { getAudioEngine } from '../services/audioEngine';

const clampDurationBeats = (beats) => Math.max(1, Math.min(8, beats));
const clampOctave = (octave) => Math.max(1, Math.min(7, octave));
const MAX_PROGRESSION_CHORDS = 32;
const createChordItemId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isValidChordToken = (chord) => {
  if (typeof chord !== 'string' || !chord.trim()) return false;
  if (!Array.isArray(modelService.chords) || modelService.chords.length === 0) return false;
  return modelService.chords.includes(chord);
};

const stopPlaybackIfActive = (state) => {
  if (!state.isPlaying) return {};
  try {
    getAudioEngine().stop();
  } catch (error) {
    // Keep state transition resilient even if audio engine teardown fails.
    console.error('Failed to stop audio engine during progression mutation:', error);
  }
  return {
    isPlaying: false,
    currentChordIndex: -1,
  };
};

const ensureProgressionDurations = (progression) => {
  if (!progression || !Array.isArray(progression.chords)) return progression;

  const incomingDurations = Array.isArray(progression.durations) ? progression.durations : [];
  const durations = progression.chords.map((_, index) => {
    const duration = Number(incomingDurations[index]);
    return Number.isFinite(duration) ? clampDurationBeats(duration) : 4;
  });

  if (
    incomingDurations.length === durations.length &&
    incomingDurations.every((duration, index) => duration === durations[index])
  ) {
    return progression;
  }

  return {
    ...progression,
    durations,
  };
};

const ensureProgressionChordItemIds = (progression) => {
  if (!progression || !Array.isArray(progression.chords)) return progression;
  const incoming = Array.isArray(progression.chordItemIds) ? progression.chordItemIds : [];
  const chordItemIds = progression.chords.map((_, index) => incoming[index] || createChordItemId());

  if (
    incoming.length === chordItemIds.length &&
    incoming.every((id, index) => id === chordItemIds[index])
  ) {
    return progression;
  }

  return {
    ...progression,
    chordItemIds,
  };
};

const ensureProgressionShape = (progression) =>
  ensureProgressionChordItemIds(ensureProgressionDurations(progression));

const useStore = create((set, get) => ({
  // Model state
  model: null,
  preprocessor: null,
  isModelLoading: true,
  modelLoadProgress: 0,
  modelError: null,

  // User input state
  genre: 'pop',
  adventure: 50, // 0-100
  octave: 4,
  count: 4,

  // Legacy fields — used by ProgressionLibrary, HistoryPanel, FavoritesPanel
  mood: 'uplifting',
  key: 'C',
  scaleType: 'major',


  // Generated progression state
  currentProgression: null,
  progressionHistory: [],
  isGenerating: false,
  detectedKey: null,

  // Audio playback state
  isPlaying: false,
  isLooping: false,
  tempo: 120,
  currentChordIndex: -1,

  // Toast notifications
  toasts: [],

  // UI state
  isSettingsOpen: false,
  isLibraryOpen: false,
  isSidebarOpen: false,
  isChordPickerOpen: false,

  // Actions - Model
  setModel: (model) => set({ model }),
  setPreprocessor: (preprocessor) => set({ preprocessor }),
  setModelLoading: (isLoading) => set({ isModelLoading: isLoading }),
  setModelLoadProgress: (progress) => set({ modelLoadProgress: progress }),
  setModelError: (error) => set({ modelError: error }),

  // Actions - Input
  setGenre: (genre) => set({ genre }),
  setAdventure: (adventure) => set({ adventure }),
  setOctave: (octave) => set({ octave }),
  setCount: (count) => set({ count }),
  setMood: (mood) => set({ mood }),
  setKey: (key) => set({ key }),
  setScaleType: (scaleType) => set({ scaleType }),


  // Actions - Progression
  setCurrentProgression: (progression) => {
    set({ currentProgression: ensureProgressionShape(progression) });
  },

  setDetectedKey: (key) => set({ detectedKey: key }),

  addToHistory: (progression) => {
    const history = get().progressionHistory;
    set({
      progressionHistory: [progression, ...history].slice(0, 20), // Keep last 20
    });
  },

  clearProgression: () => set({ currentProgression: null, detectedKey: null }),

  replaceChord: (index, newChord) => {
    const state = get();
    const prog = state.currentProgression;
    if (!prog || !prog.chords || index < 0 || index >= prog.chords.length) return;
    if (!isValidChordToken(newChord)) return;

    const safeProg = ensureProgressionShape(prog);
    const updatedChords = [...safeProg.chords];
    updatedChords[index] = newChord;

    set({
      currentProgression: {
        ...safeProg,
        chords: updatedChords,
        romanNumerals: undefined,
      },
      detectedKey: modelService.detectKey(updatedChords),
      ...stopPlaybackIfActive(state),
    });
  },

  addChord: (index, chord) => {
    const state = get();
    const prog = state.currentProgression;
    if (!prog || !Array.isArray(prog.chords)) return;
    if (!isValidChordToken(chord)) return;

    const safeProg = ensureProgressionShape(prog);
    if (safeProg.chords.length >= MAX_PROGRESSION_CHORDS) return;

    const insertIndex = Math.max(0, Math.min(index, safeProg.chords.length));
    const updatedChords = [...safeProg.chords];
    const updatedDurations = [...safeProg.durations];
    const updatedChordItemIds = [...safeProg.chordItemIds];

    updatedChords.splice(insertIndex, 0, chord);
    updatedDurations.splice(insertIndex, 0, 4);
    updatedChordItemIds.splice(insertIndex, 0, createChordItemId());

    const previousIndex = state.currentChordIndex;
    const nextCurrentIndex =
      previousIndex >= 0 && insertIndex <= previousIndex ? previousIndex + 1 : previousIndex;

    set({
      currentProgression: {
        ...safeProg,
        chords: updatedChords,
        durations: updatedDurations,
        chordItemIds: updatedChordItemIds,
        romanNumerals: undefined,
      },
      currentChordIndex: nextCurrentIndex,
      detectedKey: modelService.detectKey(updatedChords),
      ...stopPlaybackIfActive(state),
    });
  },

  removeChord: (index) => {
    const state = get();
    const prog = state.currentProgression;
    if (!prog || !Array.isArray(prog.chords)) return;

    if (prog.chords.length <= 1) return;
    if (index < 0 || index >= prog.chords.length) return;

    const safeProg = ensureProgressionShape(prog);
    const updatedChords = [...safeProg.chords];
    const updatedDurations = [...safeProg.durations];
    const updatedChordItemIds = [...safeProg.chordItemIds];

    updatedChords.splice(index, 1);
    updatedDurations.splice(index, 1);
    updatedChordItemIds.splice(index, 1);

    const previousIndex = state.currentChordIndex;
    let nextCurrentIndex = previousIndex;
    if (previousIndex === index) {
      nextCurrentIndex = Math.min(index, updatedChords.length - 1);
    } else if (previousIndex > index) {
      nextCurrentIndex = previousIndex - 1;
    }

    set({
      currentProgression: {
        ...safeProg,
        chords: updatedChords,
        durations: updatedDurations,
        chordItemIds: updatedChordItemIds,
        romanNumerals: undefined,
      },
      currentChordIndex: nextCurrentIndex,
      detectedKey: modelService.detectKey(updatedChords),
      ...stopPlaybackIfActive(state),
    });
  },

  setChordDuration: (index, beats) => {
    const state = get();
    const prog = state.currentProgression;
    if (!prog || !Array.isArray(prog.chords)) return;
    if (index < 0 || index >= prog.chords.length) return;

    const safeProg = ensureProgressionShape(prog);
    const updatedDurations = [...safeProg.durations];
    updatedDurations[index] = clampDurationBeats(Number(beats) || 4);

    set({
      currentProgression: {
        ...safeProg,
        durations: updatedDurations,
      },
      ...stopPlaybackIfActive(state),
    });
  },

  moveChord: (fromIndex, toIndex) => {
    const state = get();
    const prog = state.currentProgression;
    if (!prog || !Array.isArray(prog.chords)) return;

    const chordCount = prog.chords.length;
    if (
      fromIndex < 0 ||
      fromIndex >= chordCount ||
      toIndex < 0 ||
      toIndex >= chordCount ||
      fromIndex === toIndex
    ) {
      return;
    }

    const safeProg = ensureProgressionShape(prog);
    const updatedChords = [...safeProg.chords];
    const updatedDurations = [...safeProg.durations];
    const updatedChordItemIds = [...safeProg.chordItemIds];

    const [movedChord] = updatedChords.splice(fromIndex, 1);
    const [movedDuration] = updatedDurations.splice(fromIndex, 1);
    const [movedChordItemId] = updatedChordItemIds.splice(fromIndex, 1);
    updatedChords.splice(toIndex, 0, movedChord);
    updatedDurations.splice(toIndex, 0, movedDuration);
    updatedChordItemIds.splice(toIndex, 0, movedChordItemId);

    const previousIndex = state.currentChordIndex;
    let nextCurrentIndex = previousIndex;
    if (previousIndex === fromIndex) {
      nextCurrentIndex = toIndex;
    } else if (fromIndex < previousIndex && previousIndex <= toIndex) {
      nextCurrentIndex = previousIndex - 1;
    } else if (toIndex <= previousIndex && previousIndex < fromIndex) {
      nextCurrentIndex = previousIndex + 1;
    }

    set({
      currentProgression: {
        ...safeProg,
        chords: updatedChords,
        durations: updatedDurations,
        chordItemIds: updatedChordItemIds,
        romanNumerals: undefined,
      },
      currentChordIndex: nextCurrentIndex,
      detectedKey: modelService.detectKey(updatedChords),
      ...stopPlaybackIfActive(state),
    });
  },

  transposeProgression: (semitones) => {
    const state = get();
    const prog = state.currentProgression;
    if (!prog || !prog.chords?.length || semitones === 0) return;
    const safeProg = ensureProgressionShape(prog);

    const oldFirst = safeProg.chords[0];
    const transposed = modelService.transposeProgression(safeProg.chords, semitones);
    const newFirst = transposed[0];

    const oldChroma = modelService.getChroma(oldFirst);
    const newChroma = modelService.getChroma(newFirst);

    let octave = safeProg.metadata?.octave ?? 4;
    if (oldChroma !== null && newChroma !== null) {
      if (semitones > 0 && newChroma < oldChroma) octave += 1;
      if (semitones < 0 && newChroma > oldChroma) octave -= 1;
    }
    octave = clampOctave(octave);

    set({
      currentProgression: {
        ...safeProg,
        chords: transposed,
        durations: safeProg.durations,
        romanNumerals: undefined,
        metadata: { ...safeProg.metadata, octave },
      },
      detectedKey: modelService.detectKey(transposed),
      ...stopPlaybackIfActive(state),
    });
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  // Actions - Audio
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLooping: (isLooping) => set({ isLooping }),
  setTempo: (tempo) => set({ tempo }),
  setCurrentChordIndex: (index) => set({ currentChordIndex: index }),

  // Actions - Toast
  addToast: (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 3000,
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),

  // Actions - UI
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setLibraryOpen: (isOpen) => set({ isLibraryOpen: isOpen }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setChordPickerOpen: (isOpen) => set({ isChordPickerOpen: isOpen }),

  // Helper to get current input
  getCurrentInput: () => {
    const state = get();
    return {
      genre: state.genre,
      adventure: state.adventure,
      octave: state.octave,
      count: state.count,
    };
  },
}));

export default useStore;
