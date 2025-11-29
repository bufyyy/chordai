import { create } from 'zustand';

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

  // Legacy/Unused but kept to avoid breaking other components immediately if referenced
  mood: 'uplifting',
  key: 'C',
  scaleType: 'major',
  progressionLength: 4,
  temperature: 1.0,

  // Generated progression state
  currentProgression: null,
  progressionHistory: [],
  isGenerating: false,
  detectedKey: null,

  // Audio playback state
  isPlaying: false,
  tempo: 120,
  currentChordIndex: -1,

  // Toast notifications
  toasts: [],

  // UI state
  isSettingsOpen: false,
  isLibraryOpen: false,

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

  // Legacy actions
  setMood: (mood) => set({ mood }),
  setKey: (key) => set({ key }),
  setScaleType: (scaleType) => set({ scaleType }),
  setProgressionLength: (length) => set({ progressionLength: length }),
  setTemperature: (temperature) => set({ temperature }),

  // Actions - Progression
  setCurrentProgression: (progression) => {
    set({ currentProgression: progression });
  },

  setDetectedKey: (key) => set({ detectedKey: key }),

  addToHistory: (progression) => {
    const history = get().progressionHistory;
    set({
      progressionHistory: [progression, ...history].slice(0, 20), // Keep last 20
    });
  },

  clearProgression: () => set({ currentProgression: null, detectedKey: null }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  // Actions - Audio
  setIsPlaying: (isPlaying) => set({ isPlaying }),
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
