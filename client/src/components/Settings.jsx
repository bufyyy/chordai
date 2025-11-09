import { useState, useEffect } from 'react';
import {
  getSettings,
  updateSetting,
  clearHistory,
  clearFavorites,
  clearAllData,
  getStorageUsage,
  exportAllData,
  importData,
  resetOnboarding,
} from '../utils/storage';
import useStore from '../store/useStore';

/**
 * Settings panel component
 * Manages app settings, data, and preferences
 */
function Settings({ isOpen, onClose }) {
  const { addToast } = useStore();
  const [settings, setSettings] = useState(getSettings());
  const [storageUsage, setStorageUsage] = useState('0');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      setStorageUsage(getStorageUsage());
    }
  }, [isOpen]);

  const handleSettingChange = (key, value) => {
    updateSetting(key, value);
    setSettings({ ...settings, [key]: value });
    addToast({
      type: 'success',
      message: 'Setting updated successfully',
    });
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      clearHistory();
      setStorageUsage(getStorageUsage());
      addToast({
        type: 'success',
        message: 'History cleared successfully',
      });
    }
  };

  const handleClearFavorites = () => {
    if (confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
      clearFavorites();
      setStorageUsage(getStorageUsage());
      addToast({
        type: 'success',
        message: 'Favorites cleared successfully',
      });
    }
  };

  const handleClearAllData = () => {
    if (
      confirm(
        'Are you sure you want to clear ALL data including settings? This cannot be undone and you will be logged out.',
      )
    ) {
      clearAllData();
      setStorageUsage(getStorageUsage());
      addToast({
        type: 'success',
        message: 'All data cleared successfully',
      });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleExport = () => {
    try {
      const data = exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chordai-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({
        type: 'success',
        message: 'Data exported successfully',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to export data',
      });
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        importData(data);
        setSettings(getSettings());
        setStorageUsage(getStorageUsage());
        addToast({
          type: 'success',
          message: 'Data imported successfully',
        });
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        addToast({
          type: 'error',
          message: 'Failed to import data. Invalid file format.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetTutorial = () => {
    resetOnboarding();
    addToast({
      type: 'success',
      message: 'Tutorial reset. Reload the page to see it again.',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-white/10">
          {['general', 'audio', 'data'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <SettingItem
                label="Theme"
                description="Choose your preferred color theme"
              >
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="input"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light (Coming soon)</option>
                </select>
              </SettingItem>

              <SettingItem
                label="Auto-save History"
                description="Automatically save progressions to history"
              >
                <input
                  type="checkbox"
                  checked={settings.autoSaveHistory}
                  onChange={(e) => handleSettingChange('autoSaveHistory', e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </SettingItem>

              <SettingItem
                label="Show Tutorial"
                description="Show tutorial on first visit"
              >
                <button
                  onClick={handleResetTutorial}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Reset Tutorial
                </button>
              </SettingItem>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              <SettingItem
                label="Audio Quality"
                description="Higher quality may use more CPU"
              >
                <select
                  value={settings.audioQuality}
                  onChange={(e) => handleSettingChange('audioQuality', e.target.value)}
                  className="input"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </SettingItem>

              <SettingItem
                label="Default Tempo"
                description="Default BPM for playback"
              >
                <input
                  type="number"
                  min="60"
                  max="180"
                  value={settings.defaultTempo}
                  onChange={(e) => handleSettingChange('defaultTempo', parseInt(e.target.value))}
                  className="input w-24"
                />
              </SettingItem>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="glass-darker rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Storage Usage</div>
                <div className="text-2xl font-bold text-white">{storageUsage} KB</div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export All Data
                </button>

                <label className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleClearHistory}
                  className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
                >
                  Clear History
                </button>

                <button
                  onClick={handleClearFavorites}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors"
                >
                  Clear Favorites
                </button>

                <button
                  onClick={handleClearAllData}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingItem({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="font-medium text-white">{label}</div>
        {description && <div className="text-sm text-gray-400 mt-1">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default Settings;
