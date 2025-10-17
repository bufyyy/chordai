import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { getFavorites, removeFromFavorites, clearFavorites } from '../utils/storage';

const FavoritesPanel = () => {
  const [favorites, setFavorites] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const { setCurrentProgression, setGenre, setMood, setKey, setScaleType } = useStore();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const data = getFavorites();
    setFavorites(data);
  };

  const handleLoadProgression = (item) => {
    // Convert to object format expected by store
    setCurrentProgression({
      chords: item.chords,
      metadata: item.metadata || {}
    });
    if (item.metadata) {
      if (item.metadata.genre) setGenre(item.metadata.genre);
      if (item.metadata.mood) setMood(item.metadata.mood);
      if (item.metadata.key) setKey(item.metadata.key);
      if (item.metadata.scaleType) setScaleType(item.metadata.scaleType);
    }
  };

  const handleRemoveItem = (id) => {
    if (removeFromFavorites(id)) {
      loadFavorites();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all favorites?')) {
      if (clearFavorites()) {
        loadFavorites();
      }
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditingName(item.name || '');
  };

  const handleSaveEdit = (item) => {
    // Update the name in localStorage
    const allFavorites = getFavorites();
    const updated = allFavorites.map(fav =>
      fav.id === item.id ? { ...fav, name: editingName } : fav
    );
    localStorage.setItem('chordai_favorites', JSON.stringify(updated));

    setEditingId(null);
    loadFavorites();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">No Favorites Yet</h3>
        <p className="text-gray-500 text-sm">
          Star your favorite progressions to save them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Favorites <span className="text-gray-500 text-sm">({favorites.length})</span>
        </h3>
        {favorites.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Favorites Grid */}
      <div className="grid gap-4 max-h-96 overflow-y-auto custom-scrollbar">
        {favorites.map((item) => (
          <div
            key={item.id}
            className="glass rounded-lg p-4 hover:bg-white/5 transition-all duration-200 group"
          >
            {/* Title/Name */}
            <div className="flex items-center justify-between mb-3">
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Progression name"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(item)}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    ✓
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <h4 className="font-semibold text-white">{item.name || 'Untitled'}</h4>
                  </div>
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all text-gray-400 hover:text-white"
                    title="Rename"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Chords */}
            <div className="flex flex-wrap gap-2 mb-3">
              {item.chords.map((chord, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded text-sm font-semibold text-white"
                >
                  {chord.replace('b', '♭').replace('#', '♯')}
                </span>
              ))}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                {item.metadata?.key && item.metadata?.scaleType && (
                  <span>
                    {item.metadata.key} {item.metadata.scaleType}
                  </span>
                )}
                {item.metadata?.genre && (
                  <span className="capitalize">• {item.metadata.genre}</span>
                )}
                {item.addedAt && (
                  <span className="text-gray-500">• Added {formatDate(item.addedAt)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleLoadProgression(item)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  title="Load progression"
                >
                  Load
                </button>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                  title="Remove from favorites"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPanel;
