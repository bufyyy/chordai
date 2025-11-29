import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import modelService from '../services/modelService';

const InputForm = () => {
  const {
    genre,
    adventure,
    octave,
    count,
    isGenerating,
    setGenre,
    setAdventure,
    setOctave,
    setCount,
    setCurrentProgression,
    setDetectedKey,
    setIsGenerating,
  } = useStore();

  const [availableGenres, setAvailableGenres] = useState([]);

  // Fetch genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        // Ensure model is loaded to get mappings
        await modelService.loadModel();
        if (modelService.mappings && modelService.mappings.genre_to_id) {
          const genres = Object.keys(modelService.mappings.genre_to_id);
          setAvailableGenres(genres);
          // Set default genre if current is not in list
          if (!genres.includes(genre) && genres.length > 0) {
            setGenre(genres[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };

    fetchGenres();
  }, [setGenre, genre]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setCurrentProgression({ chords: [] }); // Clear previous
    setDetectedKey(null);

    try {
      let currentChords = [];

      // Generation Loop
      for (let i = 0; i < count; i++) {
        const nextChord = await modelService.predictNextChord(currentChords, genre, adventure);
        currentChords.push(nextChord);

        // Update state progressively
        setCurrentProgression({
          chords: [...currentChords],
          metadata: { genre, adventure, octave }
        });

        // Small delay to visualize the generation (optional, but nice)
        await new Promise(r => setTimeout(r, 100));
      }

      // Detect Key
      const detectedKey = modelService.detectKey(currentChords);
      setDetectedKey(detectedKey);

    } catch (error) {
      console.error('Error generating progression:', error);
      alert('Failed to generate progression. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 gradient-text">Create Your Progression</h2>

      <div className="space-y-6">
        {/* Genre Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={isGenerating}
          >
            {availableGenres.length > 0 ? (
              availableGenres.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))
            ) : (
              <option>Loading genres...</option>
            )}
          </select>
        </div>

        {/* Adventure Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Adventure: <span className="text-purple-400">{adventure}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={adventure}
            onChange={(e) => setAdventure(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Count & Octave */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Count</label>
            <input
              type="number"
              min="1"
              max="16"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Octave</label>
            <input
              type="number"
              min="1"
              max="7"
              value={octave}
              onChange={(e) => setOctave(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-300 ${isGenerating
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </div>
          ) : (
            'Generate Progression'
          )}
        </button>

        {/* Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">💡 Tip:</span> Use the Adventure slider to control how unpredictable the AI should be.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InputForm;
