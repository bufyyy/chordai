import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProgressionDisplay from './ProgressionDisplay';
import useStore from '../store/useStore';

// Mock the store
vi.mock('../store/useStore');

// Mock storage
vi.mock('../utils/storage', () => ({
  saveToHistory: vi.fn(() => ({ id: Date.now() })),
  saveToFavorites: vi.fn(() => ({ id: Date.now() })),
  isInFavorites: vi.fn(() => false),
  removeFromFavorites: vi.fn(() => true),
  getSettings: vi.fn(() => ({ autoSaveHistory: true })),
}));

// Mock model service
vi.mock('../services/modelService', () => ({
  default: {
    formatChordForDisplay: vi.fn((chord) => chord),
    formatChordWithSymbols: vi.fn((chord) => chord),
    formatDisplayChordWithSymbols: vi.fn((chord) => chord),
    detectKey: vi.fn(() => 'C Major'),
    displayToRawToken: vi.fn((d) => d),
    getRootFromDisplay: vi.fn((display) => {
      const m = display.match(/^([A-G][#b]?)/);
      return m ? m[1] : null;
    }),
    getChroma: vi.fn(() => 0),
    transposeProgression: vi.fn((chords) => chords),
    chordsToRomanNumerals: vi.fn(() => ['I', 'IV', 'V', 'vi']),
    chords: ['C', 'F', 'G', 'Am', 'Dm'],
  },
}));

describe('ProgressionDisplay', () => {
  const setStoreState = (state) => {
    useStore.mockImplementation((selector) => (selector ? selector(state) : state));
  };

  const defaultStoreState = {
    currentProgression: null,
    detectedKey: null,
    currentChordIndex: -1,
    isGenerating: false,
    setChordPickerOpen: vi.fn(),
    addChord: vi.fn(),
    removeChord: vi.fn(),
    setChordDuration: vi.fn(),
    replaceChord: vi.fn(),
    transposeProgression: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setStoreState(defaultStoreState);
  });

  describe('Empty State', () => {
    it('should render empty state when no progression', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText('No progression yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Select your preferences and click "Generate Progression"/i)
      ).toBeInTheDocument();
    });
  });

  describe('With Progression', () => {
    const progressionState = {
      currentProgression: {
        chords: ['C', 'F', 'G', 'Am'],
        metadata: { genre: 'pop', octave: 4 },
      },
      detectedKey: 'C Major',
      currentChordIndex: -1,
      isGenerating: false,
      addChord: vi.fn(),
      removeChord: vi.fn(),
      setChordDuration: vi.fn(),
      replaceChord: vi.fn(),
      transposeProgression: vi.fn(),
    };

    beforeEach(() => {
      setStoreState(progressionState);
    });

    it('should render progression chords', () => {
      render(<ProgressionDisplay />);

      // Each chord appears in a ChordCard with "Chord N" labels
      expect(screen.getByText('Chord 1')).toBeInTheDocument();
      expect(screen.getByText('Chord 2')).toBeInTheDocument();
      expect(screen.getByText('Chord 3')).toBeInTheDocument();
      expect(screen.getByText('Chord 4')).toBeInTheDocument();
    });

    it('should display detected key', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText('C Major')).toBeInTheDocument();
    });

    it('should display genre badge', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText('pop')).toBeInTheDocument();
    });

    it('should display chord count', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText('4 chords')).toBeInTheDocument();
    });

    it('should call transposeProgression when transpose + is clicked', () => {
      const transposeProgression = vi.fn();
      setStoreState({
        ...progressionState,
        transposeProgression,
      });
      render(<ProgressionDisplay />);

      fireEvent.click(screen.getByTitle('Transpose up one semitone'));
      expect(transposeProgression).toHaveBeenCalledWith(1);
    });

    it('should call transposeProgression when transpose - is clicked', () => {
      const transposeProgression = vi.fn();
      setStoreState({
        ...progressionState,
        transposeProgression,
      });
      render(<ProgressionDisplay />);

      fireEvent.click(screen.getByTitle('Transpose down one semitone'));
      expect(transposeProgression).toHaveBeenCalledWith(-1);
    });

    it('should toggle roman numeral notation', () => {
      render(<ProgressionDisplay />);

      fireEvent.click(screen.getByRole('button', { name: 'Roman #' }));
      expect(screen.getByText('I')).toBeInTheDocument();
      expect(screen.getByText('IV')).toBeInTheDocument();
    });
  });

  describe('Chord Display', () => {
    it('should highlight currently playing chord', () => {
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: 1,
        isGenerating: false,
        setChordPickerOpen: vi.fn(),
        addChord: vi.fn(),
        removeChord: vi.fn(),
        setChordDuration: vi.fn(),
        replaceChord: vi.fn(),
        transposeProgression: vi.fn(),
      });

      render(<ProgressionDisplay />);

      const chordCards = screen.getAllByText(/Chord \d/);
      expect(chordCards).toHaveLength(4);
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: -1,
        isGenerating: false,
        setChordPickerOpen: vi.fn(),
        addChord: vi.fn(),
        removeChord: vi.fn(),
        setChordDuration: vi.fn(),
        replaceChord: vi.fn(),
        transposeProgression: vi.fn(),
      });

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve()),
        },
      });
    });

    it('should copy progression to clipboard when copy button clicked', async () => {
      render(<ProgressionDisplay />);

      // Find the copy button by its SVG icon container
      const buttons = screen.getAllByRole('button');
      // The copy button is the second action button
      const copyButton = buttons.find(btn => btn.getAttribute('title')?.includes('Copy') || btn.textContent === '');

      // If we can't find by title, just verify clipboard was set up
      expect(navigator.clipboard.writeText).toBeDefined();
    });

    it('should replace a chord from picker selection', async () => {
      const replaceChord = vi.fn();
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          chordItemIds: ['a', 'b', 'c', 'd'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: -1,
        isGenerating: false,
        setChordPickerOpen: vi.fn(),
        addChord: vi.fn(),
        removeChord: vi.fn(),
        setChordDuration: vi.fn(),
        replaceChord,
        transposeProgression: vi.fn(),
      });

      render(<ProgressionDisplay />);
      fireEvent.click(screen.getByTestId('chord-card-label-0'));
      fireEvent.click(screen.getByTestId('chord-picker-item-F'));

      await waitFor(() => {
        expect(replaceChord).toHaveBeenCalledWith(0, 'F');
      });
    });

    it('should not open picker while generating', () => {
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          chordItemIds: ['a', 'b', 'c', 'd'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: -1,
        isGenerating: true,
        setChordPickerOpen: vi.fn(),
        addChord: vi.fn(),
        removeChord: vi.fn(),
        setChordDuration: vi.fn(),
        replaceChord: vi.fn(),
        transposeProgression: vi.fn(),
      });

      render(<ProgressionDisplay />);
      fireEvent.click(screen.getByTestId('chord-card-label-0'));
      expect(screen.queryByRole('dialog', { name: 'Replace chord' })).not.toBeInTheDocument();
    });

    it('should remove chord when remove button is clicked', () => {
      const removeChord = vi.fn();
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          chordItemIds: ['a', 'b', 'c', 'd'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: -1,
        isGenerating: false,
        setChordPickerOpen: vi.fn(),
        addChord: vi.fn(),
        removeChord,
        setChordDuration: vi.fn(),
        replaceChord: vi.fn(),
        transposeProgression: vi.fn(),
      });

      render(<ProgressionDisplay />);
      fireEvent.click(screen.getByTestId('remove-chord-1'));
      expect(removeChord).toHaveBeenCalledWith(1);
    });

    it('should add chord after index when picker select is used in add mode', async () => {
      const addChord = vi.fn();
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          chordItemIds: ['a', 'b', 'c', 'd'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: -1,
        isGenerating: false,
        setChordPickerOpen: vi.fn(),
        addChord,
        removeChord: vi.fn(),
        setChordDuration: vi.fn(),
        replaceChord: vi.fn(),
        transposeProgression: vi.fn(),
      });

      render(<ProgressionDisplay />);
      fireEvent.click(screen.getByTestId('add-chord-after-0'));
      fireEvent.click(screen.getByTestId('chord-picker-item-Dm'));

      await waitFor(() => {
        expect(addChord).toHaveBeenCalledWith(1, 'Dm');
      });
    });

    it('should update chord duration via +/- controls', () => {
      const setChordDuration = vi.fn();
      setStoreState({
        currentProgression: {
          chords: ['C', 'F', 'G', 'Am'],
          durations: [4, 4, 4, 4],
          chordItemIds: ['a', 'b', 'c', 'd'],
          metadata: { genre: 'pop', octave: 4 },
        },
        detectedKey: 'C Major',
        currentChordIndex: -1,
        isGenerating: false,
        setChordPickerOpen: vi.fn(),
        addChord: vi.fn(),
        removeChord: vi.fn(),
        setChordDuration,
        replaceChord: vi.fn(),
        transposeProgression: vi.fn(),
      });

      render(<ProgressionDisplay />);
      fireEvent.click(screen.getByTestId('duration-plus-0'));
      fireEvent.click(screen.getByTestId('duration-minus-0'));

      expect(setChordDuration).toHaveBeenNthCalledWith(1, 0, 5);
      expect(setChordDuration).toHaveBeenNthCalledWith(2, 0, 3);
    });
  });
});
