import { useState, useMemo } from 'react';
import { famousProgressions, getProgressionsByGenre, searchProgressions } from '../data/famousProgressions';
import useStore from '../store/useStore';

/**
 * Progression Library component
 * Displays famous chord progressions for inspiration
 */
function ProgressionLibrary({ isOpen, onClose }) {
  const { addToast, setCurrentProgression, setGenre, setMood, setKey, setScaleType } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const filteredProgressions = useMemo(() => {
    let results = famousProgressions;

    if (selectedGenre !== 'all') {
      results = getProgressionsByGenre(selectedGenre);
    }

    if (searchQuery.trim()) {
      results = searchProgressions(searchQuery);
    }

    return results;
  }, [searchQuery, selectedGenre]);

  const handleLoadProgression = (progression) => {
    // Set progression and metadata
    setCurrentProgression({
      id: Date.now(),
      chords: progression.chords,
      romanNumerals: progression.romanNumerals,
      metadata: {
        genre: progression.genre,
        mood: progression.mood,
        key: progression.key,
        scaleType: progression.scaleType,
        source: 'library',
        originalName: progression.name,
        timestamp: new Date().toISOString(),
      },
    });

    // Update form inputs
    setGenre(progression.genre);
    setMood(progression.mood);
    setKey(progression.key);
    setScaleType(progression.scaleType);

    addToast({
      type: 'success',
      message: `Loaded: ${progression.name}`,
    });

    onClose();
  };

  const genres = ['all', 'pop', 'rock', 'jazz', 'blues', 'rnb', 'edm', 'classical', 'progressive'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl max-w-5xl w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Progression Library</h2>
              <p className="text-sm text-gray-400 mt-1">
                Famous chord progressions from hit songs
              </p>
            </div>
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

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by song name, artist, or progression..."
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Genre Filter */}
        <div className="px-6 py-4 border-b border-white/10 overflow-x-auto">
          <div className="flex gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors capitalize ${
                  selectedGenre === genre
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProgressions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No progressions found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredProgressions.map((progression) => (
                <ProgressionCard
                  key={progression.id}
                  progression={progression}
                  onLoad={handleLoadProgression}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-center text-sm text-gray-400">
          Showing {filteredProgressions.length} of {famousProgressions.length} progressions
        </div>
      </div>
    </div>
  );
}

function ProgressionCard({ progression, onLoad }) {
  return (
    <div className="glass-darker rounded-xl p-4 hover:bg-white/10 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{progression.name}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded capitalize">
              {progression.genre}
            </span>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded capitalize">
              {progression.mood}
            </span>
            <span className="text-gray-500">
              {progression.key} {progression.scaleType}
            </span>
          </div>
        </div>
        <button
          onClick={() => onLoad(progression)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Load progression"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </button>
      </div>

      {/* Chords */}
      <div className="flex flex-wrap gap-2 mb-3">
        {progression.chords.map((chord, idx) => (
          <div
            key={idx}
            className="px-3 py-1 bg-gray-700/50 rounded-lg text-sm font-mono"
          >
            {chord}
          </div>
        ))}
      </div>

      {/* Songs */}
      {progression.songs && progression.songs.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Examples:</span> {progression.songs.slice(0, 2).join(', ')}
          {progression.songs.length > 2 && ` +${progression.songs.length - 2} more`}
        </div>
      )}
    </div>
  );
}

export default ProgressionLibrary;
