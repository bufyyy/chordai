import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { getModelService } from '../services/modelService';
import { saveToHistory, saveToFavorites, isInFavorites, removeFromFavorites } from '../utils/storage';

const ChordCard = ({ chord, index, chordInfo, isPlaying }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`glass rounded-xl p-6 transition-all duration-300 ${
          isPlaying
            ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
            : 'hover:scale-105 glass-hover'
        }`}
      >
        {/* Chord Index */}
        <div className="text-xs text-gray-500 mb-2">Chord {index + 1}</div>

        {/* Chord Name */}
        <div className="text-3xl font-bold text-white mb-2">
          {chord.replace('b', '♭').replace('#', '♯')}
        </div>

        {/* Roman Numeral */}
        <div className="text-sm text-purple-400 font-semibold">{chordInfo.romanNumeral}</div>

        {/* Function */}
        <div className="text-xs text-gray-400 mt-1">{chordInfo.function}</div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 w-64 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl -top-2 left-full ml-4 animate-fade-in">
          <div className="text-sm">
            <div className="font-semibold text-white mb-2">{chord}</div>
            <div className="text-gray-400 space-y-1">
              <div>
                <span className="text-purple-400">Function:</span> {chordInfo.function}
              </div>
              <div>
                <span className="text-blue-400">Description:</span> {chordInfo.description}
              </div>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-4 -left-2 w-4 h-4 bg-gray-800 border-l border-t border-gray-700 transform rotate-45" />
        </div>
      )}
    </div>
  );
};

const ProgressionDisplay = () => {
  const {
    model,
    preprocessor,
    currentProgression,
    genre,
    mood,
    key,
    scaleType,
    temperature,
    isGenerating,
    currentChordIndex,
    setCurrentProgression,
    setIsGenerating,
  } = useStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [progressionId, setProgressionId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const chords = currentProgression?.chords || [];

  // Check if current progression is favorited
  useEffect(() => {
    if (chords.length > 0 && progressionId) {
      setIsFavorite(isInFavorites(progressionId));
    }
  }, [chords, progressionId]);

  // Auto-save to history when progression changes
  useEffect(() => {
    if (chords.length > 0) {
      const entry = saveToHistory({
        chords: chords,
        genre,
        mood,
        key,
        scaleType,
      });
      if (entry) {
        setProgressionId(entry.id);
      }
    }
  }, [chords, genre, mood, key, scaleType]);

  const handleRegenerate = async () => {
    if (!model || !preprocessor || isGenerating) return;

    setIsGenerating(true);

    try {
      const modelService = getModelService();
      const progression = await modelService.generateProgression(
        genre,
        mood,
        key,
        scaleType,
        chords.length,
        temperature
      );

      // Convert array to object format
      setCurrentProgression({
        chords: progression,
        metadata: { genre, mood, key, scaleType }
      });
    } catch (error) {
      console.error('Error regenerating:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVariation = async () => {
    if (!model || !preprocessor || isGenerating || chords.length === 0) return;

    setIsGenerating(true);

    try {
      const modelService = getModelService();
      const variation = await modelService.generateVariation(
        chords,
        genre,
        mood,
        key,
        scaleType,
        temperature * 1.2 // Slightly higher temperature for variation
      );

      // Convert array to object format
      setCurrentProgression({
        chords: variation,
        metadata: { genre, mood, key, scaleType }
      });
    } catch (error) {
      console.error('Error generating variation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyProgression = () => {
    const text = chords.join(' - ');
    navigator.clipboard.writeText(text);
    showToastNotification('Copied to clipboard!');
  };

  const handleToggleFavorite = () => {
    if (!progressionId) return;

    if (isFavorite) {
      // Remove from favorites
      if (removeFromFavorites(progressionId)) {
        setIsFavorite(false);
        showToastNotification('Removed from favorites');
      }
    } else {
      // Add to favorites
      const result = saveToFavorites({
        id: progressionId,
        chords: chords,
        metadata: { genre, mood, key, scaleType },
      });
      if (result) {
        setIsFavorite(true);
        showToastNotification('Added to favorites!');
      }
    }
  };

  const showToastNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (chords.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 shadow-xl text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No progression yet</h3>
        <p className="text-gray-500">
          Select your preferences and click "Generate Progression" to get started!
        </p>
      </div>
    );
  }

  // Get chord info for each chord using modelService
  const modelService = getModelService();
  const getChordInfo = (chord) => {
    // Simple chord info for display
    return {
      name: chord,
      romanNumeral: 'I', // Simplified for now
      function: 'Tonic',
      description: model === 'DEMO_MODE' ? 'Demo mode chord' : 'Generated chord',
    };
  };

  const chordInfos = chords.map((chord) => getChordInfo(chord));

  return (
    <div className="glass rounded-2xl p-6 shadow-xl relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold gradient-text">Your Progression</h2>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              isFavorite
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className="w-5 h-5"
              fill={isFavorite ? 'currentColor' : 'none'}
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
          </button>

          <button
            onClick={handleCopyProgression}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
            title="Copy to clipboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          <button
            onClick={handleGenerateVariation}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
          >
            Variation
          </button>

          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Chord Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {chords.map((chord, index) => (
          <ChordCard
            key={index}
            chord={chord}
            index={index}
            chordInfo={chordInfos[index]}
            isPlaying={index === currentChordIndex}
          />
        ))}
      </div>

      {/* Progression Info */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="px-4 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Key:</span>{' '}
          <span className="text-white font-semibold">
            {key} {scaleType}
          </span>
        </div>
        <div className="px-4 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Genre:</span>{' '}
          <span className="text-white font-semibold capitalize">{genre}</span>
        </div>
        <div className="px-4 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Mood:</span>{' '}
          <span className="text-white font-semibold capitalize">{mood}</span>
        </div>
        <div className="px-4 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Length:</span>{' '}
          <span className="text-white font-semibold">{chords.length} chords</span>
        </div>
      </div>

      {/* Progression as text */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <div className="text-gray-400 text-sm mb-2">Progression notation:</div>
        <div className="text-white font-mono text-lg">
          {chords.join(' → ')}
        </div>
      </div>
    </div>
  );
};

export default ProgressionDisplay;
