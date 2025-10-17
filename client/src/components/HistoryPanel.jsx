import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { getHistory, deleteHistoryItem, clearHistory } from '../utils/storage';

const HistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const { setCurrentProgression, setGenre, setMood, setKey, setScaleType } = useStore();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = getHistory();
    setHistory(data);
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

  const handleDeleteItem = (id) => {
    if (deleteHistoryItem(id)) {
      loadHistory();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      if (clearHistory()) {
        loadHistory();
      }
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (history.length === 0) {
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">No History Yet</h3>
        <p className="text-gray-500 text-sm">
          Your generated progressions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          History <span className="text-gray-500 text-sm">({history.length})</span>
        </h3>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* History List */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {history.map((item) => (
          <div
            key={item.id}
            className="glass rounded-lg p-4 hover:bg-white/5 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Chords */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {item.chords.map((chord, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-800 rounded text-sm font-semibold text-white"
                    >
                      {chord.replace('b', '♭').replace('#', '♯')}
                    </span>
                  ))}
                </div>

                {/* Metadata */}
                {item.metadata && (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    {item.metadata.key && item.metadata.scaleType && (
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path
                            fillRule="evenodd"
                            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item.metadata.key} {item.metadata.scaleType}
                      </span>
                    )}
                    {item.metadata.genre && (
                      <span className="capitalize">• {item.metadata.genre}</span>
                    )}
                    {item.metadata.mood && (
                      <span className="capitalize">• {item.metadata.mood}</span>
                    )}
                    {item.metadata.timestamp && (
                      <span className="text-gray-500">
                        • {formatDate(item.metadata.timestamp)}
                      </span>
                    )}
                  </div>
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
                  onClick={() => handleDeleteItem(item.id)}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
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

export default HistoryPanel;
