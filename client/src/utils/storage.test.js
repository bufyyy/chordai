import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToHistory,
  getHistory,
  clearHistory,
  deleteHistoryItem,
  saveToFavorites,
  getFavorites,
  removeFromFavorites,
  isInFavorites,
  clearFavorites,
  saveSettings,
  getSettings,
  getDefaultSettings,
  updateSetting,
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding,
  exportAllData,
  importData,
  clearAllData,
  getStorageUsage,
} from './storage';

describe('Storage Utils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    localStorage.clear();
    vi.clearAllMocks();

    // Setup localStorage mock behavior
    const storage = {};
    localStorage.getItem.mockImplementation((key) => storage[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      storage[key] = value;
    });
    localStorage.removeItem.mockImplementation((key) => {
      delete storage[key];
    });
    localStorage.clear.mockImplementation(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    });
  });

  describe('History Management', () => {
    it('should save progression to history', () => {
      const progression = {
        chords: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
      };

      const entry = saveToHistory(progression);

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.chords).toEqual(progression.chords);
      expect(entry.metadata.genre).toBe('pop');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve history', () => {
      const progression = {
        chords: ['C', 'Dm', 'Em', 'F'],
        genre: 'rock',
        mood: 'energetic',
        key: 'C',
        scaleType: 'major',
      };

      saveToHistory(progression);
      const history = getHistory();

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].chords).toEqual(progression.chords);
    });

    it('should limit history to MAX_HISTORY_ITEMS', () => {
      // Add 25 items (max is 20)
      for (let i = 0; i < 25; i++) {
        saveToHistory({
          chords: ['C', 'F', 'G', 'C'],
          genre: 'pop',
          mood: 'uplifting',
          key: 'C',
          scaleType: 'major',
        });
      }

      const history = getHistory();
      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('should delete history item by id', () => {
      const entry = saveToHistory({
        chords: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
      });

      const result = deleteHistoryItem(entry.id);
      expect(result).toBe(true);

      const history = getHistory();
      expect(history.find((item) => item.id === entry.id)).toBeUndefined();
    });

    it('should clear all history', () => {
      saveToHistory({
        chords: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
      });

      const result = clearHistory();
      expect(result).toBe(true);

      const history = getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Favorites Management', () => {
    it('should save progression to favorites', () => {
      const progression = {
        id: Date.now(),
        chords: ['C', 'Am', 'F', 'G'],
        metadata: {
          genre: 'pop',
          mood: 'uplifting',
          key: 'C',
          scaleType: 'major',
        },
        name: 'My Favorite',
      };

      const entry = saveToFavorites(progression);

      expect(entry).toBeDefined();
      expect(entry.id).toBe(progression.id);
      expect(entry.chords).toEqual(progression.chords);
      expect(entry.name).toBe('My Favorite');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should not save duplicate favorites', () => {
      const progression = {
        id: 12345,
        chords: ['C', 'Am', 'F', 'G'],
        metadata: { genre: 'pop' },
      };

      saveToFavorites(progression);
      const result = saveToFavorites(progression);

      expect(result).toBe(false);
    });

    it('should retrieve favorites', () => {
      const progression = {
        id: Date.now(),
        chords: ['C', 'Dm', 'G7', 'C'],
        metadata: { genre: 'jazz' },
      };

      saveToFavorites(progression);
      const favorites = getFavorites();

      expect(favorites).toBeInstanceOf(Array);
      expect(favorites.length).toBeGreaterThan(0);
      expect(favorites[0].chords).toEqual(progression.chords);
    });

    it('should check if progression is in favorites', () => {
      const progression = {
        id: 12345,
        chords: ['C', 'F', 'G', 'C'],
        metadata: {},
      };

      saveToFavorites(progression);

      expect(isInFavorites(12345)).toBe(true);
      expect(isInFavorites(99999)).toBe(false);
    });

    it('should remove from favorites', () => {
      const progression = {
        id: 12345,
        chords: ['C', 'F', 'G', 'C'],
        metadata: {},
      };

      saveToFavorites(progression);
      const result = removeFromFavorites(12345);

      expect(result).toBe(true);
      expect(isInFavorites(12345)).toBe(false);
    });

    it('should clear all favorites', () => {
      saveToFavorites({
        id: Date.now(),
        chords: ['C', 'F', 'G', 'C'],
        metadata: {},
      });

      const result = clearFavorites();
      expect(result).toBe(true);

      const favorites = getFavorites();
      expect(favorites).toHaveLength(0);
    });
  });

  describe('Settings Management', () => {
    it('should save settings', () => {
      const settings = {
        theme: 'dark',
        defaultGenre: 'rock',
        defaultTempo: 140,
      };

      const result = saveSettings(settings);
      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve settings with defaults', () => {
      const settings = getSettings();

      expect(settings).toBeDefined();
      expect(settings.theme).toBe('dark');
      expect(settings.defaultGenre).toBe('pop');
      expect(settings.defaultTempo).toBe(120);
    });

    it('should get default settings', () => {
      const defaults = getDefaultSettings();

      expect(defaults.theme).toBe('dark');
      expect(defaults.audioQuality).toBe('high');
      expect(defaults.defaultKey).toBe('C');
      expect(defaults.autoSaveHistory).toBe(true);
    });

    it('should update individual setting', () => {
      const result = updateSetting('theme', 'light');
      expect(result).toBe(true);

      const settings = getSettings();
      expect(settings.theme).toBe('light');
    });
  });

  describe('Onboarding', () => {
    it('should check onboarding completion status', () => {
      expect(isOnboardingCompleted()).toBe(false);
    });

    it('should mark onboarding as completed', () => {
      const result = completeOnboarding();
      expect(result).toBe(true);
      expect(isOnboardingCompleted()).toBe(true);
    });

    it('should reset onboarding', () => {
      completeOnboarding();
      const result = resetOnboarding();

      expect(result).toBe(true);
      expect(isOnboardingCompleted()).toBe(false);
    });
  });

  describe('Data Export/Import', () => {
    it('should export all data', () => {
      saveToHistory({
        chords: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
      });

      saveToFavorites({
        id: Date.now(),
        chords: ['C', 'Am', 'F', 'G'],
        metadata: {},
      });

      const data = exportAllData();

      expect(data).toBeDefined();
      expect(data.history).toBeInstanceOf(Array);
      expect(data.favorites).toBeInstanceOf(Array);
      expect(data.settings).toBeDefined();
      expect(data.exportedAt).toBeDefined();
    });

    it('should import data', () => {
      const data = {
        history: [
          {
            id: 1,
            chords: ['C', 'F', 'G', 'C'],
            metadata: {},
          },
        ],
        favorites: [
          {
            id: 2,
            chords: ['Am', 'F', 'C', 'G'],
            metadata: {},
          },
        ],
        settings: {
          theme: 'light',
        },
      };

      const result = importData(data);
      expect(result).toBe(true);

      expect(getHistory().length).toBeGreaterThan(0);
      expect(getFavorites().length).toBeGreaterThan(0);
    });

    it('should clear all data', () => {
      saveToHistory({
        chords: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
      });

      saveToFavorites({
        id: Date.now(),
        chords: ['C', 'Am', 'F', 'G'],
        metadata: {},
      });

      const result = clearAllData();
      expect(result).toBe(true);

      expect(getHistory()).toHaveLength(0);
      expect(getFavorites()).toHaveLength(0);
    });
  });

  describe('Storage Usage', () => {
    it('should calculate storage usage', () => {
      saveToHistory({
        chords: ['C', 'F', 'G', 'C'],
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
      });

      const usage = getStorageUsage();
      expect(usage).toBeDefined();
      expect(typeof usage).toBe('string');
      expect(parseFloat(usage)).toBeGreaterThanOrEqual(0);
    });
  });
});
