/**
 * LocalStorage utilities for ChordAI
 * Handles history, favorites, and settings persistence
 */

const STORAGE_KEYS = {
  HISTORY: 'chordai_history',
  FAVORITES: 'chordai_favorites',
  SETTINGS: 'chordai_settings',
  ONBOARDING: 'chordai_onboarding_completed',
};

const MAX_HISTORY_ITEMS = 20;

/**
 * Save progression to history
 */
export function saveToHistory(progression) {
  try {
    const history = getHistory();

    // Create progression entry
    const entry = {
      id: Date.now(),
      chords: progression.chords,
      metadata: {
        genre: progression.genre,
        mood: progression.mood,
        key: progression.key,
        scaleType: progression.scaleType,
        timestamp: new Date().toISOString(),
      },
    };

    // Add to beginning
    history.unshift(entry);

    // Limit to MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    return entry;
  } catch (error) {
    console.error('Error saving to history:', error);
    return null;
  }
}

/**
 * Get history
 */
export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
}

/**
 * Clear history
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
}

/**
 * Delete history item
 */
export function deleteHistoryItem(id) {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting history item:', error);
    return false;
  }
}

/**
 * Save to favorites
 */
export function saveToFavorites(progression) {
  try {
    const favorites = getFavorites();

    // Check if already exists
    const exists = favorites.some(fav => fav.id === progression.id);
    if (exists) {
      return false;
    }

    const entry = {
      id: progression.id || Date.now(),
      chords: progression.chords,
      metadata: progression.metadata || {},
      name: progression.name || `Progression ${favorites.length + 1}`,
      addedAt: new Date().toISOString(),
    };

    favorites.push(entry);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return entry;
  } catch (error) {
    console.error('Error saving to favorites:', error);
    return null;
  }
}

/**
 * Get favorites
 */
export function getFavorites() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading favorites:', error);
    return [];
  }
}

/**
 * Remove from favorites
 */
export function removeFromFavorites(id) {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
}

/**
 * Check if progression is in favorites
 */
export function isInFavorites(id) {
  try {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === id);
  } catch (error) {
    return false;
  }
}

/**
 * Clear favorites
 */
export function clearFavorites() {
  try {
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    return true;
  } catch (error) {
    console.error('Error clearing favorites:', error);
    return false;
  }
}

/**
 * Save settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Get settings
 */
export function getSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : getDefaultSettings();
  } catch (error) {
    console.error('Error reading settings:', error);
    return getDefaultSettings();
  }
}

/**
 * Default settings
 */
export function getDefaultSettings() {
  return {
    theme: 'dark',
    audioQuality: 'high',
    defaultGenre: 'pop',
    defaultMood: 'uplifting',
    defaultKey: 'C',
    defaultScaleType: 'major',
    defaultLength: 4,
    defaultTemperature: 1.0,
    defaultTempo: 120,
    autoSaveHistory: true,
    showTutorial: true,
  };
}

/**
 * Update setting
 */
export function updateSetting(key, value) {
  try {
    const settings = getSettings();
    settings[key] = value;
    return saveSettings(settings);
  } catch (error) {
    console.error('Error updating setting:', error);
    return false;
  }
}

/**
 * Check if onboarding is completed
 */
export function isOnboardingCompleted() {
  try {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export function completeOnboarding() {
  try {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
    return true;
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return false;
  }
}

/**
 * Reset onboarding
 */
export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING);
    return true;
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return false;
  }
}

/**
 * Export all data
 */
export function exportAllData() {
  return {
    history: getHistory(),
    favorites: getFavorites(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import data
 */
export function importData(data) {
  try {
    if (data.history) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.history));
    }
    if (data.favorites) {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));
    }
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

/**
 * Clear all data
 */
export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}

/**
 * Get storage usage (in KB)
 */
export function getStorageUsage() {
  try {
    let total = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        total += new Blob([data]).size;
      }
    });
    return (total / 1024).toFixed(2); // KB
  } catch (error) {
    return '0';
  }
}

export default {
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
};
