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
}));

// Mock model service
vi.mock('../services/modelService', () => ({
  default: {
    generateProgression: vi.fn(() => Promise.resolve(['C', 'F', 'G', 'C'])),
    generateVariation: vi.fn(() => Promise.resolve(['C', 'Am', 'F', 'G'])),
  },
}));

describe('ProgressionDisplay', () => {
  const mockSetCurrentProgression = vi.fn();
  const mockSetIsGenerating = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useStore.mockReturnValue({
      model: 'DEMO_MODE',
      preprocessor: {},
      currentProgression: [],
      genre: 'pop',
      mood: 'uplifting',
      key: 'C',
      scaleType: 'major',
      temperature: 1.0,
      isGenerating: false,
      currentChordIndex: -1,
      setCurrentProgression: mockSetCurrentProgression,
      setIsGenerating: mockSetIsGenerating,
    });
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
    beforeEach(() => {
      useStore.mockReturnValue({
        model: 'DEMO_MODE',
        preprocessor: {},
        currentProgression: ['C', 'F', 'G', 'Am'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        temperature: 1.0,
        isGenerating: false,
        currentChordIndex: -1,
        setCurrentProgression: mockSetCurrentProgression,
        setIsGenerating: mockSetIsGenerating,
      });
    });

    it('should render progression chords', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText(/C/)).toBeInTheDocument();
      expect(screen.getByText(/F/)).toBeInTheDocument();
      expect(screen.getByText(/G/)).toBeInTheDocument();
      expect(screen.getByText(/Am/)).toBeInTheDocument();
    });

    it('should display progression metadata', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText(/Key:/)).toBeInTheDocument();
      expect(screen.getByText(/C major/)).toBeInTheDocument();
      expect(screen.getByText(/Genre:/)).toBeInTheDocument();
      expect(screen.getByText(/pop/i)).toBeInTheDocument();
      expect(screen.getByText(/Mood:/)).toBeInTheDocument();
      expect(screen.getByText(/uplifting/i)).toBeInTheDocument();
    });

    it('should display progression notation', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByText('C → F → G → Am')).toBeInTheDocument();
    });

    it('should show action buttons', () => {
      render(<ProgressionDisplay />);

      expect(screen.getByTitle(/Add to favorites/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Copy to clipboard/i)).toBeInTheDocument();
      expect(screen.getByText('Variation')).toBeInTheDocument();
      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      useStore.mockReturnValue({
        model: 'DEMO_MODE',
        preprocessor: {},
        currentProgression: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        temperature: 1.0,
        isGenerating: false,
        currentChordIndex: -1,
        setCurrentProgression: mockSetCurrentProgression,
        setIsGenerating: mockSetIsGenerating,
      });

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve()),
        },
      });
    });

    it('should copy progression to clipboard', async () => {
      render(<ProgressionDisplay />);

      const copyButton = screen.getByTitle(/Copy to clipboard/i);
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('C - F - G - C');
      });
    });

    it('should regenerate progression', async () => {
      render(<ProgressionDisplay />);

      const regenerateButton = screen.getByText('Regenerate');
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(mockSetIsGenerating).toHaveBeenCalledWith(true);
      });
    });

    it('should generate variation', async () => {
      render(<ProgressionDisplay />);

      const variationButton = screen.getByText('Variation');
      fireEvent.click(variationButton);

      await waitFor(() => {
        expect(mockSetIsGenerating).toHaveBeenCalledWith(true);
      });
    });

    it('should disable buttons while generating', () => {
      useStore.mockReturnValue({
        model: 'DEMO_MODE',
        preprocessor: {},
        currentProgression: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        temperature: 1.0,
        isGenerating: true,
        currentChordIndex: -1,
        setCurrentProgression: mockSetCurrentProgression,
        setIsGenerating: mockSetIsGenerating,
      });

      render(<ProgressionDisplay />);

      const regenerateButton = screen.getByText('Regenerate');
      const variationButton = screen.getByText('Variation');

      expect(regenerateButton).toBeDisabled();
      expect(variationButton).toBeDisabled();
    });
  });

  describe('Chord Display', () => {
    it('should highlight currently playing chord', () => {
      useStore.mockReturnValue({
        model: 'DEMO_MODE',
        preprocessor: {},
        currentProgression: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        temperature: 1.0,
        isGenerating: false,
        currentChordIndex: 1, // F is playing
        setCurrentProgression: mockSetCurrentProgression,
        setIsGenerating: mockSetIsGenerating,
      });

      render(<ProgressionDisplay />);

      // Check that chord cards are rendered
      const chordCards = screen.getAllByText(/Chord \d/);
      expect(chordCards).toHaveLength(4);
    });

    it('should display sharp and flat symbols correctly', () => {
      useStore.mockReturnValue({
        model: 'DEMO_MODE',
        preprocessor: {},
        currentProgression: ['C#', 'Db', 'F#m'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        temperature: 1.0,
        isGenerating: false,
        currentChordIndex: -1,
        setCurrentProgression: mockSetCurrentProgression,
        setIsGenerating: mockSetIsGenerating,
      });

      render(<ProgressionDisplay />);

      expect(screen.getByText('C♯')).toBeInTheDocument();
      expect(screen.getByText('D♭')).toBeInTheDocument();
      expect(screen.getByText('F♯m')).toBeInTheDocument();
    });
  });

  describe('Favorites', () => {
    beforeEach(() => {
      useStore.mockReturnValue({
        model: 'DEMO_MODE',
        preprocessor: {},
        currentProgression: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        temperature: 1.0,
        isGenerating: false,
        currentChordIndex: -1,
        setCurrentProgression: mockSetCurrentProgression,
        setIsGenerating: mockSetIsGenerating,
      });
    });

    it('should toggle favorite status', async () => {
      render(<ProgressionDisplay />);

      const favoriteButton = screen.getByTitle(/Add to favorites/i);
      fireEvent.click(favoriteButton);

      await waitFor(() => {
        expect(screen.getByText(/Added to favorites/i)).toBeInTheDocument();
      });
    });
  });
});
