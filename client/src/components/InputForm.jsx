import { useState } from 'react';
import useStore from '../store/useStore';
import { getModelService } from '../services/modelService';

const InputForm = () => {
  const {
    model,
    preprocessor,
    genre,
    mood,
    key,
    scaleType,
    progressionLength,
    temperature,
    isGenerating,
    setGenre,
    setMood,
    setKey,
    setScaleType,
    setProgressionLength,
    setTemperature,
    setCurrentProgression,
    setIsGenerating,
  } = useStore();

  const [samplingStrategy, setSamplingStrategy] = useState('temperature');
  const [topK, setTopK] = useState(10);
  const [topP, setTopP] = useState(0.9);

  const genres = ['pop', 'rock', 'jazz', 'blues', 'rnb', 'edm', 'classical', 'progressive'];
  const moods = [
    'uplifting',
    'happy',
    'melancholic',
    'sad',
    'energetic',
    'chill',
    'aggressive',
    'romantic',
    'nostalgic',
    'mysterious',
  ];
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const scaleTypes = ['major', 'minor'];
  const samplingStrategies = [
    { value: 'temperature', label: 'Temperature', description: 'Classic temperature sampling' },
    { value: 'topk', label: 'Top-K', description: 'Sample from top K candidates' },
    { value: 'nucleus', label: 'Nucleus (Top-P)', description: 'Sample from cumulative probability' },
  ];

  const handleGenerate = async () => {
    if (!model || !preprocessor || isGenerating) return;

    setIsGenerating(true);

    try {
      const modelService = getModelService();

      // Prepare sampling parameters
      const samplingParams = {};
      if (samplingStrategy === 'topk') {
        samplingParams.k = topK;
      } else if (samplingStrategy === 'nucleus') {
        samplingParams.p = topP;
      }

      // Generate progression
      const progression = await modelService.generateProgression(
        genre,
        mood,
        key,
        scaleType,
        progressionLength,
        temperature,
        samplingStrategy,
        samplingParams
      );

      // Convert array to object format expected by store
      setCurrentProgression({
        chords: progression,
        metadata: { genre, mood, key, scaleType }
      });
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
            {genres.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Mood Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Mood</label>
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={isGenerating}
          >
            {moods.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Key & Scale Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Key</label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            >
              {keys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scale</label>
            <select
              value={scaleType}
              onChange={(e) => setScaleType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            >
              {scaleTypes.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Progression Length */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Progression Length: <span className="text-blue-400">{progressionLength} chords</span>
          </label>
          <input
            type="range"
            min="4"
            max="8"
            value={progressionLength}
            onChange={(e) => setProgressionLength(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>4</span>
            <span>8</span>
          </div>
        </div>

        {/* Sampling Strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sampling Strategy
          </label>
          <select
            value={samplingStrategy}
            onChange={(e) => setSamplingStrategy(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            disabled={isGenerating}
          >
            {samplingStrategies.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            {samplingStrategies.find(s => s.value === samplingStrategy)?.description}
          </p>
        </div>

        {/* Sampling Parameters */}
        {samplingStrategy === 'topk' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Top-K: <span className="text-green-400">{topK}</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={isGenerating}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>
        )}

        {samplingStrategy === 'nucleus' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Top-P (Nucleus): <span className="text-green-400">{topP.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={isGenerating}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.5</span>
              <span>0.75</span>
              <span>1.0</span>
            </div>
          </div>
        )}

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Temperature: <span className="text-purple-400">{temperature.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !model}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-300 ${
            isGenerating || !model
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
            <span className="font-semibold">💡 Tip:</span> Higher creativity values produce more
            unique progressions, while lower values stick to common patterns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InputForm;
